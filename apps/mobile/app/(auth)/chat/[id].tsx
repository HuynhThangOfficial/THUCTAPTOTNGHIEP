"use client";

import { View, Text, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, StyleSheet, Image, Modal, Alert, ActivityIndicator, Keyboard } from 'react-native';
import React, { useState, useEffect, useRef } from 'react';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import Toast from 'react-native-root-toast';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import { useTranslation } from 'react-i18next';
// 👇 THÊM BỘ NÉN ẢNH CỦA EXPO 👇
import * as ImageManipulator from 'expo-image-manipulator';

// --- CÁC HÀM TIỆN ÍCH ---
const isHttpUrl = (url?: string | null): boolean => {
  if (!url) return false;
  return url.startsWith('http://') || url.startsWith('https://');
};

const getValidAvatar = (url?: string | null): string => {
  if (isHttpUrl(url)) return url as string;
  return 'https://www.gravatar.com/avatar/?d=mp';
};

const DEFAULT_ANON_AVATAR = 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y';

const formatTimeDivider = (timestamp: number, t: any) => {
  const date = new Date(timestamp);
  const now = new Date();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const timeStr = `${hours}:${minutes}`;

  if (date.toDateString() === now.toDateString()) return timeStr;
  
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return t('chat.yesterday_time', { time: timeStr });

  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year} ${timeStr}`;
};

const formatTimeAgo = (timestamp: number, t: any) => {
  const now = new Date();
  const postDate = new Date(timestamp);
  const diffMs = now.getTime() - postDate.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return t('chat.just_now');
  if (diffMins < 60) return t('chat.mins_short', { count: diffMins });
  if (diffHours < 24) return t('chat.hours_short', { count: diffHours });
  if (diffDays < 7) return t('chat.days_short', { count: diffDays });

  const day = postDate.getDate();
  const month = postDate.getMonth() + 1;
  return `${day} ${t('chat.month_short')} ${month}`;
};

const EMOJIS = ['❤️', '😂', '😮', '😢', '😡', '👍'];

const SharedPostPreview = ({ postId }: { postId: string }) => {
  const thread = useQuery(api.messages.getThreadById, { messageId: postId as Id<'messages'> });
  const router = useRouter();
  const { t } = useTranslation();

  if (thread === undefined) {
    return (
      <View style={[styles.sharedPostPreviewCard, { justifyContent: 'center', alignItems: 'center', height: 100 }]}>
        <ActivityIndicator size="small" color="#888" />
      </View>
    );
  }

  if (thread === null) {
    return (
      <View style={[styles.sharedPostPreviewCard, { paddingVertical: 20 }]}>
        <Text style={{ fontStyle: 'italic', color: 'gray', textAlign: 'center' }}>{t('chat.post_not_exist')}</Text>
      </View>
    );
  }

  // @ts-ignore
  const isAnon = thread.isAnonymous === true;
  const displayAvatar = isAnon ? DEFAULT_ANON_AVATAR : getValidAvatar(thread.creator?.imageUrl);
  const displayName = isAnon ? t('chat.anonymous_member') : `${thread.creator?.first_name || t('chat.default_user')}`;

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      style={styles.sharedPostPreviewCard}
      onPress={() => router.push(`/(auth)/(tabs)/feed/${postId}` as any)}
    >
      <View style={styles.sharedPostHeader}>
        <Image source={{ uri: displayAvatar }} style={styles.sharedPostAvatar} />
        <Text style={styles.sharedPostUsername}>{displayName}</Text>
        <Text style={styles.sharedPostTime}>• {formatTimeAgo(thread._creationTime, t)}</Text>
      </View>
      
      <Text style={styles.sharedPostContent} numberOfLines={3}>
        {thread.content}
      </Text>
      
      <View style={styles.sharedPostStats}>
        <View style={styles.sharedStatItem}>
          <Ionicons name={thread.isLiked ? "heart" : "heart-outline"} size={15} color={thread.isLiked ? "red" : "gray"} />
          <Text style={[styles.sharedStatText, thread.isLiked && { color: "red" }]}>{thread.likeCount || 0}</Text>
        </View>
        
        <View style={styles.sharedStatItem}>
          <Ionicons name="chatbubble-outline" size={15} color="gray" />
          <Text style={styles.sharedStatText}>{thread.commentCount || 0}</Text>
        </View>
        
        <View style={styles.sharedStatItem}>
          <Ionicons name={thread.isReposted ? "repeat" : "repeat-outline"} size={17} color={thread.isReposted ? "#00BA7C" : "gray"} />
          <Text style={[styles.sharedStatText, thread.isReposted && { color: "#00BA7C" }]}>{thread.retweetCount || 0}</Text>
        </View>
        
        <View style={styles.sharedStatItem}>
          <Feather name="send" size={14} color="gray" />
          <Text style={styles.sharedStatText}>{thread.shareCount || 0}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const ChatRoom = () => {
  const { id } = useLocalSearchParams(); 
  const { userProfile } = useUserProfile();
  const router = useRouter();
  const { top, bottom } = useSafeAreaInsets();
  const { t } = useTranslation();
  
  const [text, setText] = useState('');
  const [replyingTo, setReplyingTo] = useState<any>(null);
  
  const [activeMessage, setActiveMessage] = useState<any>(null);
  const [isMeActive, setIsMeActive] = useState(false);
  const [menuStep, setMenuStep] = useState<'main' | 'delete' | null>(null);
  const [isPinnedExpanded, setIsPinnedExpanded] = useState(false);
  
  const [viewerImage, setViewerImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const [isGalleryVisible, setIsGalleryVisible] = useState(false);
  const [recentPhotos, setRecentPhotos] = useState<MediaLibrary.Asset[]>([]);
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);

  const flatListRef = useRef<FlatList>(null);

  const messages = useQuery(api.chat.getMessages, { conversationId: id as Id<'conversations'> });
  const otherUser = useQuery(api.chat.getConversationInfo, { conversationId: id as Id<'conversations'> });
  // @ts-ignore
  const rawConvo = useQuery(api.chat.getRawConversation, { conversationId: id as Id<'conversations'> });
  
  const send = useMutation(api.chat.sendMessage);
  const unsend = useMutation(api.chat.unsendMessage);
  const toggleReaction = useMutation(api.chat.toggleReaction);
  const markConvAsRead = useMutation(api.chat.markConversationAsRead);
  const updateTyping = useMutation(api.chat.setTypingStatus);
  const togglePin = useMutation(api.chat.togglePinMessage);
  const deleteForSelfApi = useMutation(api.chat.deleteForSelf);
  const generateUploadUrl = useMutation(api.chat.generateUploadUrl); 
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const filteredMessages = messages?.filter(m => !m.deletedBy?.includes(userProfile?._id as Id<"users">)) || [];
  const reversedMessages = [...filteredMessages].reverse(); 

  const pinnedMessages = filteredMessages.filter(m => m.isPinned && !m.isDeleted && !m.isSystem);

  useEffect(() => {
    if (id && messages && messages.length > 0) {
      markConvAsRead({ conversationId: id as Id<'conversations'> });
    }
  }, [messages?.length, id]);

  const loadPhotos = async () => {
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status === 'granted') {
      const media = await MediaLibrary.getAssetsAsync({ mediaType: 'photo', first: 60, sortBy: ['creationTime'] });
      setRecentPhotos(media.assets);
    }
  };

  const toggleGallery = () => {
    if (!isGalleryVisible) { Keyboard.dismiss(); loadPhotos(); }
    setIsGalleryVisible(!isGalleryVisible);
  };

  const toggleSelectPhoto = (uri: string) => {
    if (selectedPhotos.includes(uri)) setSelectedPhotos(selectedPhotos.filter(p => p !== uri));
    else setSelectedPhotos([...selectedPhotos, uri]);
  };

  // 👇 ĐÃ THÊM LOGIC NÉN ẢNH BẰNG EXPO-IMAGE-MANIPULATOR 👇
  const uploadSingleImage = async (uri: string) => {
    const compressedImage = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 1080 } }],
      { compress: 0.4, format: ImageManipulator.SaveFormat.JPEG }
    );

    const postUrl = await generateUploadUrl();
    const response = await fetch(compressedImage.uri);
    const blob = await response.blob();
    const result = await fetch(postUrl, { method: 'POST', headers: { 'Content-Type': blob.type }, body: blob });
    const { storageId } = await result.json();
    return storageId;
  };

  const handleTakeAndSendPhoto = async () => {
    // 👇 CHỈNH LẠI CHẤT LƯỢNG CAMERA CÒN 0.4 👇
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.4 });
    if (!result.canceled) {
      setIsGalleryVisible(false); setIsUploading(true);
      try {
        const storageId = await uploadSingleImage(result.assets[0].uri);
        await send({ conversationId: id as Id<'conversations'>, content: t('chat.image_label'), imageId: storageId, replyToMessageId: replyingTo?._id });
        setReplyingTo(null);
      } catch (error) {} finally { setIsUploading(false); }
    }
  };

  const handleSendSelectedImages = async () => {
    if (selectedPhotos.length === 0) return;
    setIsGalleryVisible(false); setIsUploading(true);
    const photosToSend = [...selectedPhotos]; setSelectedPhotos([]); 
    try {
      for (const uri of photosToSend) {
        const storageId = await uploadSingleImage(uri);
        await send({ conversationId: id as Id<'conversations'>, content: t('chat.image_label'), imageId: storageId, replyToMessageId: replyingTo?._id });
      }
      setReplyingTo(null);
    } catch (error) {} finally { setIsUploading(false); }
  };

  const handleTextChange = (newText: string) => {
    setText(newText);
    updateTyping({ conversationId: id as Id<'conversations'>, isTyping: true });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => { updateTyping({ conversationId: id as Id<'conversations'>, isTyping: false }); }, 2000);
  };

  const handleSend = async () => {
    if (!text.trim()) return;
    await send({ conversationId: id as Id<'conversations'>, content: text, replyToMessageId: replyingTo?._id });
    setText(''); setReplyingTo(null); updateTyping({ conversationId: id as Id<'conversations'>, isTyping: false });
  };

  const openActionMenu = (item: any, isMe: boolean) => {
    if (item.isDeleted || item.isSystem) return; 
    setActiveMessage(item); setIsMeActive(isMe); setMenuStep('main');
  };

  const closeActionMenu = () => { setMenuStep(null); setTimeout(() => setActiveMessage(null), 300); };

  const handleAction = async (action: string) => {
    if (!activeMessage) return;
    switch (action) {
      case 'reply': setReplyingTo(activeMessage); closeActionMenu(); break;
      case 'copy': await Clipboard.setStringAsync(activeMessage.content); Toast.show(t('chat.copied')); closeActionMenu(); break;
      case 'pin': await togglePin({ messageId: activeMessage._id, conversationId: id as Id<'conversations'> }); closeActionMenu(); break;
      case 'report': Alert.alert(t('chat.report_title'), t('chat.report_sent')); closeActionMenu(); break;
      case 'delete': if (isMeActive) setMenuStep('delete'); break;
    }
  };

  const handleDeleteForAll = async () => { if (activeMessage && isMeActive) await unsend({ messageId: activeMessage._id }); closeActionMenu(); };
  const handleDeleteForSelf = async () => { if (activeMessage) await deleteForSelfApi({ messageId: activeMessage._id }); closeActionMenu(); };
  const handleSelectEmoji = async (emoji: string) => { if (!activeMessage) return; await toggleReaction({ messageId: activeMessage._id, emoji }); closeActionMenu(); };

  const scrollToMessage = (messageId: string) => {
    const index = reversedMessages.findIndex(m => m._id === messageId);
    if (index !== -1) { flatListRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 }); setIsPinnedExpanded(false); }
  };

  const isOtherPersonTyping = rawConvo?.typingUserId && rawConvo.typingUserId !== userProfile?._id;
  const galleryData = [{ id: 'camera' } as any, ...recentPhotos];

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <Stack.Screen options={{ headerShown: false }} />
      
      <View style={[styles.header, { paddingTop: top + 10 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{top:10, bottom:10, left:10, right:10}}>
          <Ionicons name="chevron-back" size={28} color="#000" />
        </TouchableOpacity>
        {otherUser ? (
          <View style={styles.headerUserInfo}>
            <Image source={{ uri: getValidAvatar(otherUser.imageUrl) }} style={styles.headerAvatar} />
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerName}>{otherUser.first_name} {otherUser.last_name}</Text>
              {/* 👇 ĐÃ XÓA TRẠNG THÁI ONLINE VÀ THAY BẰNG @USERNAME 👇 */}
              {otherUser.username && (
                <Text style={styles.statusText}>@{otherUser.username}</Text>
              )}
            </View>
          </View>
        ) : <Text style={styles.headerName}>{t('chat.loading')}</Text>}
      </View>

      {pinnedMessages.length > 0 && (
        <View style={styles.pinnedBannerWrapper}>
          {isPinnedExpanded ? (
            <View style={styles.expandedPinnedList}>
              <View style={styles.expandedHeader}>
                <Text style={styles.expandedTitle}>{t('chat.pinned_count', { count: pinnedMessages.length })}</Text>
                <TouchableOpacity onPress={() => setIsPinnedExpanded(false)} style={styles.collapseBtn}>
                  <Ionicons name="chevron-up" size={20} color="#555" />
                </TouchableOpacity>
              </View>
              {pinnedMessages.slice().reverse().map(pm => (
                <TouchableOpacity key={pm._id} onPress={() => scrollToMessage(pm._id)} style={styles.expandedPinnedItem}>
                  <Ionicons name="pin" size={16} color="#888" style={{ marginRight: 10 }} />
                  <Text numberOfLines={1} style={styles.expandedPinnedContent}>{pm.imageUrl ? t('chat.image_bracket') : pm.content}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <TouchableOpacity style={styles.pinnedBannerContainer} activeOpacity={0.8} onPress={() => pinnedMessages.length > 1 ? setIsPinnedExpanded(true) : scrollToMessage(pinnedMessages[0]._id)}>
              <View style={styles.pinnedIconBg}><Ionicons name="pin" size={14} color="#000" /></View>
              <View style={styles.pinnedTextContainer}>
                <Text style={styles.pinnedContentSimple} numberOfLines={1}>{pinnedMessages[pinnedMessages.length - 1].imageUrl ? t('chat.image_bracket') : pinnedMessages[pinnedMessages.length - 1].content}</Text>
              </View>
              {pinnedMessages.length > 1 && <Ionicons name="chevron-down" size={20} color="#888" />}
            </TouchableOpacity>
          )}
        </View>
      )}

      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#fff' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FlatList
          ref={flatListRef}
          data={reversedMessages}
          inverted={true}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ padding: 16, paddingBottom: 20 }}
          onScrollToIndexFailed={info => {
            const wait = new Promise(resolve => setTimeout(resolve, 500));
            wait.then(() => { flatListRef.current?.scrollToIndex({ index: info.index, animated: true, viewPosition: 0.5 }); });
          }}
          renderItem={({ item, index }) => {
            const olderItem = index < reversedMessages.length - 1 ? reversedMessages[index + 1] : null;
            const newerItem = index > 0 ? reversedMessages[index - 1] : null;

            const showTimeDivider = !olderItem || (item._creationTime - olderItem._creationTime > 3600000);
            const isFirstInGroup = !olderItem || olderItem.senderId !== item.senderId || (item._creationTime - olderItem._creationTime > 120000) || showTimeDivider;
            const isLastInGroup = !newerItem || newerItem.senderId !== item.senderId || (newerItem._creationTime - item._creationTime > 120000);

            const isSharedPost = item.content && item.content.trim().startsWith('https://konket.app/feed/');
            const postId = isSharedPost ? item.content.trim().split('/').pop() : null;

            // 👇 LOGIC DỊCH TIN NHẮN HỆ THỐNG TỪ BACKEND
            if (item.isSystem) {
              let sysText = item.content;
              if (item.content.startsWith('SYS_PINNED|')) {
                sysText = t('chat.sys_pinned', { name: item.content.split('|')[1] });
              } else if (item.content.startsWith('SYS_UNPINNED|')) {
                sysText = t('chat.sys_unpinned', { name: item.content.split('|')[1] });
              }

              return (
                  <>
                    {showTimeDivider && (
                      <View style={styles.timeDividerContainer}>
                        <Text style={styles.timeDividerText}>{formatTimeDivider(item._creationTime, t)}</Text>
                      </View>
                    )}
                    <View style={styles.systemMessageContainer}>
                        <Text style={styles.systemMessageText}>{sysText}</Text>
                    </View>
                  </>
              );
            }

            const isMe = item.senderId === userProfile?._id;
            const repliedMsg = item.replyToMessageId ? messages?.find(m => m._id === item.replyToMessageId) : null;
            const uniqueEmojis = item.reactions ? [...new Set(item.reactions.map((r: any) => r.emoji))] : [];
            const isLastOverallMessage = index === 0; 
            const hasReactions = uniqueEmojis.length > 0 && !item.isDeleted;

            return (
              <>
                {showTimeDivider && (
                  <View style={styles.timeDividerContainer}>
                    <Text style={styles.timeDividerText}>{formatTimeDivider(item._creationTime, t)}</Text>
                  </View>
                )}

                <View style={[
                  styles.bubbleWrapper, 
                  isMe ? { alignItems: 'flex-end' } : { alignItems: 'flex-start' },
                  { marginBottom: isLastInGroup ? 8 : 2 },
                  hasReactions && { marginBottom: 20 }
                ]}>
                  
                  {item.isPinned && !item.isDeleted && (
                    <View style={[styles.pinnedBubbleIndicator, isMe ? { marginRight: 5 } : { marginLeft: 5 }]}>
                      <Text style={styles.pinnedBubbleText}>{t('chat.pinned_badge')}</Text>
                      <Ionicons name="pin" size={12} color="#888" style={{marginLeft: 2, transform: [{rotate: '45deg'}]}} />
                    </View>
                  )}

                  <View style={styles.bubbleContainer}>
                    <TouchableOpacity 
                      activeOpacity={0.7}
                      onLongPress={() => openActionMenu(item, isMe)}
                      style={[
                        styles.bubble, 
                        isMe ? styles.myBubble : styles.theirBubble,
                        item.isDeleted && styles.deletedBubble,
                        item.imageUrl && !item.isDeleted && { padding: 4, backgroundColor: isMe ? '#007aff' : '#f0f0f0', borderWidth: 0 },
                        isSharedPost && !item.isDeleted && { padding: 0, backgroundColor: 'transparent', borderWidth: 0 },
                        isMe && { borderTopRightRadius: isFirstInGroup ? 18 : 4, borderBottomRightRadius: isLastInGroup ? 18 : 4 },
                        !isMe && { borderTopLeftRadius: isFirstInGroup ? 18 : 4, borderBottomLeftRadius: isLastInGroup ? 18 : 4 },
                      ]}
                    >
                      {repliedMsg && !item.isDeleted && (
                        <View style={[styles.replyBoxInside, isMe ? { backgroundColor: 'rgba(255,255,255,0.2)' } : { backgroundColor: 'rgba(0,0,0,0.05)' }]}>
                          <Text style={[styles.replyTextInside, isMe ? { color: '#eee' } : { color: '#555' }]} numberOfLines={2}>
                            {repliedMsg.isDeleted ? t('chat.msg_recalled') : (repliedMsg.imageUrl ? t('chat.image_bracket') : repliedMsg.content)}
                          </Text>
                        </View>
                      )}

                      {isSharedPost && !item.isDeleted && postId ? (
                        <SharedPostPreview postId={postId} />
                      ) : item.imageUrl && !item.isDeleted ? (
                        <TouchableOpacity activeOpacity={0.9} onPress={() => setViewerImage(item.imageUrl)}>
                          <Image source={{ uri: item.imageUrl }} style={{ width: 220, height: 280, borderRadius: 14 }} resizeMode="cover" />
                        </TouchableOpacity>
                      ) : (
                        <Text style={{ color: item.isDeleted ? '#888' : (isMe ? '#fff' : '#000'), fontSize: 15, fontStyle: item.isDeleted ? 'italic' : 'normal' }}>
                          {item.content}
                        </Text>
                      )}
                    </TouchableOpacity>

                    {!item.isDeleted && (
                       <TouchableOpacity style={[styles.miniReactIcon, isMe ? { left: -30 } : { right: -30 }]} onPress={() => openActionMenu(item, isMe)}>
                           <Ionicons name="happy-outline" size={20} color="gray" />
                       </TouchableOpacity>
                    )}

                    {hasReactions && (
                      <View style={[styles.reactionsBadge, isMe ? { right: 8 } : { left: 8 }]}>
                        <Text style={{ fontSize: 13 }}>{uniqueEmojis.join(' ')}</Text>
                      </View>
                    )}
                  </View>

                  {isMe && isLastOverallMessage && (
                    <Text style={[styles.messageStatusText, hasReactions && { marginTop: 12 }]}>
                      {item.status === 'read' ? t('chat.status_read') : item.status === 'delivered' ? t('chat.status_delivered') : t('chat.status_sent')}
                    </Text>
                  )}
                </View>
              </>
            );
          }}
          ListHeaderComponent={() => isOtherPersonTyping ? <View style={styles.typingIndicatorContainer}><Text style={styles.typingText}>{t('chat.typing')}</Text></View> : null}
        />

        {replyingTo && (
          <View style={styles.replyBanner}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, color: '#007aff', fontWeight: 'bold' }}>{t('chat.replying_to')}</Text>
              <Text style={{ fontSize: 14, color: '#555' }} numberOfLines={1}>{replyingTo.isDeleted ? t('chat.msg_recalled') : (replyingTo.imageUrl ? t('chat.image_bracket') : replyingTo.content)}</Text>
            </View>
            <TouchableOpacity onPress={() => setReplyingTo(null)} style={{ padding: 5 }}><Ionicons name="close-circle" size={24} color="#888" /></TouchableOpacity>
          </View>
        )}

        {!isGalleryVisible && (
          <View style={styles.inputContainer}>
            <TouchableOpacity style={styles.attachBtn} onPress={toggleGallery}><Ionicons name="image-outline" size={28} color="#007aff" /></TouchableOpacity>
            <TextInput style={styles.input} placeholder={t('chat.input_placeholder')} value={text} onChangeText={handleTextChange} onFocus={() => setIsGalleryVisible(false)} multiline />
            <TouchableOpacity style={styles.sendBtn} onPress={handleSend}><Ionicons name="send" size={18} color="#fff" style={{ marginLeft: 2 }} /></TouchableOpacity>
          </View>
        )}

        {isGalleryVisible && (
          <View style={styles.galleryContainer}>
            <View style={styles.galleryHeader}>
              <TouchableOpacity onPress={() => setIsGalleryVisible(false)} style={{ padding: 5 }}><Ionicons name="close" size={24} color="#555" /></TouchableOpacity>
              <Text style={{ fontWeight: 'bold', fontSize: 16 }}>{t('chat.select_photo_count', { count: selectedPhotos.length })}</Text>
              <TouchableOpacity onPress={handleSendSelectedImages} disabled={selectedPhotos.length === 0} style={{ padding: 5 }}>
                <Ionicons name="send" size={24} color={selectedPhotos.length > 0 ? '#007aff' : '#ccc'} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={galleryData}
              numColumns={3}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                if (item.id === 'camera') return <TouchableOpacity style={styles.galleryCameraBtn} onPress={handleTakeAndSendPhoto}><Ionicons name="camera" size={32} color="#555" /><Text style={{ color: '#555', marginTop: 5, fontSize: 12 }}>{t('chat.take_photo')}</Text></TouchableOpacity>;
                const asset = item as MediaLibrary.Asset;
                const isSelected = selectedPhotos.indexOf(asset.uri);
                return (
                  <TouchableOpacity style={styles.galleryThumbnailContainer} onPress={() => toggleSelectPhoto(asset.uri)} activeOpacity={0.8}>
                    <Image source={{ uri: asset.uri }} style={styles.galleryThumbnail} />
                    <View style={isSelected > -1 ? styles.selectedBadge : styles.unselectedBadge}>{isSelected > -1 && <Text style={styles.selectedBadgeText}>{isSelected + 1}</Text>}</View>
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        )}
      </KeyboardAvoidingView>

      {/* MODALS */}
      {isUploading && (
        <View style={styles.uploadingOverlay}>
          <ActivityIndicator size="large" color="#007aff" />
          <Text style={{ color: '#007aff', marginTop: 10, fontWeight: 'bold' }}>{t('chat.sending_image')}</Text>
        </View>
      )}

      {viewerImage && (
        <Modal transparent animationType="fade" visible={!!viewerImage} onRequestClose={() => setViewerImage(null)}>
          <View style={styles.imageViewerContainer}>
            <TouchableOpacity style={styles.imageViewerCloseBtn} onPress={() => setViewerImage(null)}><Ionicons name="close" size={30} color="#fff" /></TouchableOpacity>
            <Image source={{ uri: viewerImage }} style={styles.imageViewerImage} resizeMode="contain" />
          </View>
        </Modal>
      )}

      {activeMessage && menuStep === 'main' && (
        <Modal transparent animationType="fade" visible={true} onRequestClose={closeActionMenu}>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={closeActionMenu}>
            <View style={[styles.actionMenuWrapper, isMeActive ? { alignItems: 'flex-end' } : { alignItems: 'flex-start' }]}>
              <View style={styles.emojiBar}>
                {EMOJIS.map(emoji => <TouchableOpacity key={emoji} onPress={() => handleSelectEmoji(emoji)} style={styles.emojiBtn}><Text style={styles.emojiTextLg}>{emoji}</Text></TouchableOpacity>)}
                <TouchableOpacity style={styles.emojiBtn}><Ionicons name="add" size={24} color="gray" /></TouchableOpacity>
              </View>
              <View style={[styles.bubble, isMeActive ? styles.myBubble : styles.theirBubble, { marginVertical: 8, padding: activeMessage.imageUrl ? 4 : 12 }]}>
                {activeMessage.imageUrl ? <Image source={{ uri: activeMessage.imageUrl }} style={{ width: 150, height: 200, borderRadius: 14 }} resizeMode="cover" /> : <Text style={{ color: isMeActive ? '#fff' : '#000', fontSize: 15 }}>{activeMessage.content}</Text>}
              </View>
              <View style={styles.actionList}>
                <TouchableOpacity style={styles.actionItem} onPress={() => handleAction('reply')}><Text style={styles.actionText}>{t('chat.action_reply')}</Text><Ionicons name="arrow-undo" size={20} color="#000" /></TouchableOpacity>
                <View style={styles.dividerHorizontal} />
                {!activeMessage.imageUrl && <><TouchableOpacity style={styles.actionItem} onPress={() => handleAction('copy')}><Text style={styles.actionText}>{t('chat.action_copy')}</Text><Ionicons name="copy" size={20} color="#000" /></TouchableOpacity><View style={styles.dividerHorizontal} /></>}
                <TouchableOpacity style={styles.actionItem} onPress={() => handleAction('pin')}><Text style={styles.actionText}>{activeMessage.isPinned ? t('chat.action_unpin') : t('chat.action_pin')}</Text><Ionicons name={activeMessage.isPinned ? "bookmark" : "bookmark-outline"} size={20} color="#000" /></TouchableOpacity>
                {isMeActive ? <><View style={styles.dividerHorizontal} /><TouchableOpacity style={styles.actionItem} onPress={() => handleAction('delete')}><Text style={[styles.actionText, { color: 'red' }]}>{t('chat.action_delete')}</Text><Ionicons name="trash-outline" size={20} color="red" /></TouchableOpacity></> : <><View style={styles.dividerHorizontal} /><TouchableOpacity style={styles.actionItem} onPress={() => handleAction('report')}><Text style={[styles.actionText, { color: 'red' }]}>{t('chat.action_report')}</Text><Ionicons name="warning-outline" size={20} color="red" /></TouchableOpacity></>}
              </View>
            </View>
          </TouchableOpacity>
        </Modal>
      )}

      {activeMessage && menuStep === 'delete' && (
        <Modal transparent animationType="slide" visible={true} onRequestClose={() => setMenuStep('main')}>
          <TouchableOpacity style={[styles.modalOverlay, { justifyContent: 'flex-end', paddingBottom: bottom + 20 }]} activeOpacity={1} onPress={() => setMenuStep('main')}>
            <View style={styles.deleteMenuContainer}>
              <TouchableOpacity style={styles.deleteMenuItem} onPress={handleDeleteForAll}><Text style={[styles.deleteText, { color: 'red' }]}>{t('chat.delete_for_all')}</Text></TouchableOpacity>
              <View style={styles.dividerHorizontalFull} />
              <TouchableOpacity style={styles.deleteMenuItem} onPress={handleDeleteForSelf}><Text style={[styles.deleteText, { color: 'red' }]}>{t('chat.delete_for_self')}</Text></TouchableOpacity>
            </View>
            <TouchableOpacity style={[styles.deleteMenuContainer, { marginTop: 10 }]} onPress={closeActionMenu}><View style={styles.deleteMenuItem}><Text style={styles.deleteTextBold}>{t('chat.cancel')}</Text></View></TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  timeDividerContainer: { alignItems: 'center', marginVertical: 15 },
  timeDividerText: { fontSize: 12, color: '#888', fontWeight: '500' },
  systemMessageContainer: { alignSelf: 'center', marginVertical: 10, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 10, backgroundColor: '#e4e6eb' },
  systemMessageText: { fontSize: 12, color: '#65676b', fontWeight: '500', textAlign: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingBottom: 12, borderBottomWidth: 1, borderColor: '#eee', backgroundColor: '#fff', zIndex: 10 },
  backBtn: { padding: 5, marginRight: 5 },
  headerUserInfo: { flexDirection: 'row', alignItems: 'center' },
  headerAvatar: { width: 40, height: 40, borderRadius: 20, marginRight: 12 },
  headerTextContainer: { flexDirection: 'column', justifyContent: 'center' },
  headerName: { fontSize: 16, fontWeight: 'bold' },
  statusText: { fontSize: 12, color: 'gray', marginTop: 2 }, 
  pinnedBannerWrapper: { backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, elevation: 2, zIndex: 5 },
  pinnedBannerContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  pinnedIconBg: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  pinnedTextContainer: { flex: 1 },
  pinnedContentSimple: { fontSize: 15, color: '#333', fontWeight: '600' },
  expandedPinnedList: { padding: 10 },
  expandedHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 10, marginBottom: 5 },
  expandedTitle: { fontSize: 13, fontWeight: 'bold', color: '#000' },
  collapseBtn: { padding: 5 },
  expandedPinnedItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#eee' },
  expandedPinnedContent: { flex: 1, fontSize: 14, color: '#333' },
  pinnedBubbleIndicator: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  pinnedBubbleText: { fontSize: 11, color: '#888', fontWeight: '500' },
  bubbleWrapper: { marginBottom: 8 },
  bubbleContainer: { position: 'relative', flexDirection: 'row', alignItems: 'center' },
  bubble: { padding: 12, borderRadius: 18, maxWidth: '75%', zIndex: 1 },
  myBubble: { backgroundColor: '#007aff' }, 
  theirBubble: { backgroundColor: '#f0f0f0', borderWidth: 0 },
  deletedBubble: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#ccc', elevation: 0, shadowOpacity: 0 }, 
  sharedPostPreviewCard: {
    backgroundColor: '#fff', 
    borderRadius: 16,
    padding: 14,
    width: 280,
    borderWidth: 1,
    borderColor: '#eee', 
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    elevation: 2,
  },
  sharedPostHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8
  },
  sharedPostAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8
  },
  sharedPostUsername: {
    fontWeight: 'bold',
    fontSize: 14,
    color: '#000'
  },
  sharedPostTime: {
    fontSize: 12,
    color: 'gray',
    marginLeft: 6
  },
  sharedPostContent: {
    fontSize: 14,
    color: '#000',
    marginBottom: 12,
    lineHeight: 20
  },
  sharedPostStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between', // 👇 ĐÃ SỬA LỖI TẠI ĐÂY 👇
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.1)'
  },
  sharedStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  sharedStatText: {
    fontSize: 13,
    fontWeight: '500',
    color: 'gray'
  },
  miniReactIcon: { position: 'absolute', bottom: 5, padding: 5 },
  replyBoxInside: { borderRadius: 8, padding: 8, marginBottom: 8, borderLeftWidth: 3, borderLeftColor: '#007aff' },
  replyTextInside: { fontSize: 13 },
  replyBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#eef2f5', padding: 10, borderTopWidth: 1, borderColor: '#ddd' },
  reactionsBadge: { position: 'absolute', bottom: -12, backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: '#eee', elevation: 3, zIndex: 2, minWidth: 30, alignItems: 'center' },
  messageStatusText: { fontSize: 11, color: 'gray', alignSelf: 'flex-end', paddingRight: 4, marginTop: 2 },
  typingIndicatorContainer: { padding: 10, alignItems: 'flex-start' },
  typingText: { fontSize: 12, color: 'gray', fontStyle: 'italic' },
  inputContainer: { flexDirection: 'row', padding: 10, paddingBottom: Platform.OS === 'ios' ? 20 : 10, backgroundColor: '#fff', borderTopWidth: 1, borderColor: '#eee', alignItems: 'center' },
  attachBtn: { marginRight: 10, padding: 4 }, 
  input: { flex: 1, backgroundColor: '#f0f0f0', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, marginRight: 10, fontSize: 15, maxHeight: 100 },
  sendBtn: { backgroundColor: '#007aff', width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  galleryContainer: { height: 350, backgroundColor: '#fff', borderTopWidth: 1, borderColor: '#eee' },
  galleryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 10, borderBottomWidth: 1, borderColor: '#eee' },
  galleryCameraBtn: { width: '33.3%', height: 125, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f6f8', borderWidth: 1, borderColor: '#fff' },
  galleryThumbnailContainer: { width: '33.3%', height: 125, borderWidth: 1, borderColor: '#fff' },
  galleryThumbnail: { width: '100%', height: '100%' },
  unselectedBadge: { position: 'absolute', top: 5, right: 5, width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: '#fff', backgroundColor: 'rgba(0,0,0,0.2)' },
  selectedBadge: { position: 'absolute', top: 5, right: 5, width: 22, height: 22, borderRadius: 11, backgroundColor: '#007aff', justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: '#fff' },
  selectedBadgeText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  uploadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.8)', justifyContent: 'center', alignItems: 'center', zIndex: 999 },
  imageViewerContainer: { flex: 1, backgroundColor: '#000', justifyContent: 'center' },
  imageViewerCloseBtn: { position: 'absolute', top: 50, right: 20, zIndex: 10 },
  imageViewerImage: { width: '100%', height: '80%' },
  modalOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', paddingHorizontal: 20 },
  actionMenuWrapper: { width: '100%' },
  emojiBar: { flexDirection: 'row', backgroundColor: '#fff', padding: 10, borderRadius: 30, alignItems: 'center', gap: 10, elevation: 5 },
  emojiBtn: { padding: 5 },
  emojiTextLg: { fontSize: 26 },
  actionList: { backgroundColor: '#fff', borderRadius: 15, width: 220, overflow: 'hidden', elevation: 5 },
  actionItem: { flexDirection: 'row', justifyContent: 'space-between', padding: 15, alignItems: 'center' },
  actionText: { fontSize: 16 },
  dividerHorizontal: { height: 1, backgroundColor: '#eee', marginHorizontal: 15 },
  deleteMenuContainer: { width: '100%', alignSelf: 'center', backgroundColor: '#f9f9f9', borderRadius: 14, overflow: 'hidden' },
  deleteMenuItem: { paddingVertical: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  dividerHorizontalFull: { height: 1, backgroundColor: '#eee', width: '100%' },
  deleteText: { fontSize: 17, fontWeight: '400' },
  deleteTextBold: { fontSize: 17, fontWeight: '600', color: '#007aff' }
});

export default ChatRoom;