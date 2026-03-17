import React, { useState } from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity, ScrollView, Alert, SafeAreaView, TextInput, ActivityIndicator, Modal, Share } from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { Doc, Id } from '@/convex/_generated/dataModel';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Colors } from '@/constants/Colors';
import { Link, useRouter } from 'expo-router';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useActionSheet } from '@expo/react-native-action-sheet';
import ImageView from "react-native-image-viewing";
import { isHttpUrl } from '@/convex/utils';
import { useTranslation } from 'react-i18next'; // 👈 IMPORT DỊCH

const getValidAvatar = (url?: string | null): string => {
  if (url && isHttpUrl(url)) return url;
  return 'https://www.gravatar.com/avatar/?d=mp';
};

const DEFAULT_ANON_AVATAR = 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y';

type ThreadProps = {
  thread: Doc<'messages'> & {
    creator: Doc<'users'>;
    isLiked?: boolean;
    isReposted?: boolean;
    isServerAdmin?: boolean;
    amIAdmin?: boolean;
    allowComments?: boolean;
  };
  viewContext?: 'feed' | 'profileReplies' | 'profileReposts' | 'profile';
};

// Truyền hàm `t` vào để dịch thứ ngày tháng
const formatTimeAgo = (timestamp: number, t: any) => {
  const now = new Date();
  const postDate = new Date(timestamp);
  const diffMs = now.getTime() - postDate.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return t('thread.just_now');
  if (diffMins < 60) return t('thread.minutes_ago', { count: diffMins });
  if (diffHours < 24) return t('thread.hours_ago', { count: diffHours });
  if (diffDays < 7) return t('thread.days_ago', { count: diffDays });

  const day = postDate.getDate();
  const month = postDate.getMonth() + 1;
  const year = postDate.getFullYear();
  const currentYear = now.getFullYear();

  return year === currentYear ? `${day} ${t('thread.month_short')} ${month}` : `${day} ${t('thread.month_short')} ${month}, ${year}`;
};

const Thread = ({ thread, viewContext = 'feed' }: ThreadProps) => {
  const { t } = useTranslation(); // 👈 KHỞI TẠO HOOK
  const { content, mediaFiles, likeCount, commentCount, retweetCount, shareCount, creator, isLiked, isServerAdmin, amIAdmin, isReposted, allowComments } = thread;

  const { userProfile } = useUserProfile();
  const { showActionSheetWithOptions } = useActionSheet();
  const router = useRouter();

  const [visible, setVisible] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const [isReplyingInline, setIsReplyingInline] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);

  const [isShareMenuVisible, setIsShareMenuVisible] = useState(false);
  const [shareSearchQuery, setShareSearchQuery] = useState('');
  const [sentStatus, setSentStatus] = useState<Record<string, 'sending' | 'sent'>>({});

  const likeThread = useMutation(api.messages.likeThread);
  const toggleRepost = useMutation(api.messages.toggleRepost);
  const deleteThread = useMutation(api.messages.deleteThread);
  const addReply = useMutation(api.messages.addThread);
  const startChat = useMutation(api.chat.getOrCreateConversation);

  const sendShareMessage = useMutation(api.messages.sendShareMessage);
  const shareSuggestions = useQuery(api.messages.getShareSuggestions, { searchQuery: shareSearchQuery });
  const incrementShare = useMutation(api.messages.incrementShareCount);

  const editHistory = useQuery(api.messages.getEditHistory, { messageId: thread._id });
  const channelInfo = useQuery(api.university.getChannelDetails, thread.channelId ? { channelId: thread.channelId } : "skip");

  const isOwner = userProfile?._id === thread.userId;
  const isComment = !!thread.threadId;

  const parentThread = useQuery(api.messages.getThreadById, isComment && thread.threadId ? { messageId: thread.threadId as Id<'messages'> } : "skip");

  // @ts-ignore
  const isAnon = thread.isAnonymous === true;
  const displayAvatar = isAnon ? DEFAULT_ANON_AVATAR : getValidAvatar(creator?.imageUrl);
  const displayName = isAnon ? t('thread.anonymous_member') : `${creator?.first_name || t('thread.default_user')} ${creator?.last_name || ''}`.trim();

  // @ts-ignore
  const isParentAnon = parentThread?.isAnonymous === true;
  const parentDisplayName = isParentAnon ? t('thread.anonymous_member') : (parentThread?.creator?.first_name || t('thread.default_user'));
  const parentDisplayAvatar = isParentAnon ? DEFAULT_ANON_AVATAR : getValidAvatar(parentThread?.creator?.imageUrl);

  const images = (mediaFiles || []).filter(url => url).map((url) => ({ uri: url as string }));

  const openImageViewer = (index: number) => {
    setCurrentImageIndex(index);
    setVisible(true);
  };

  const handleRepost = async () => {
    try { await toggleRepost({ messageId: thread._id }); } catch (error) { console.error(error); }
  };

  const showHistory = () => {
    if (!editHistory || editHistory.length === 0) {
      Alert.alert(t('thread.edit_history'), t('thread.no_edit_history'));
      return;
    }
    const historyList = editHistory.map((h, index) => {
      const date = new Date(h._creationTime);
      const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const dateString = date.toLocaleDateString();
      let versionLabel = index === 0 ? t('thread.latest_version') : t('thread.version_num', { num: editHistory.length - index });
      let details = "";
      if (h.isTextModified) details += `\n${t('thread.edited_content')} ${h.oldContent ? `"${h.oldContent}"` : '""'}`;
      if (h.imageChangeLog && h.imageChangeLog.length > 0) details += `\n🖼️ ${h.imageChangeLog}`;
      return `${versionLabel} (${timeString} - ${dateString}):${details}`;
    }).join('\n\n----------------\n\n');
    Alert.alert(t('thread.change_history'), historyList);
  };

  const onActionPress = () => {
    let options = isOwner ? [t('thread.opt_edit'), t('thread.opt_history'), t('thread.opt_delete'), t('thread.opt_cancel')] :
                  amIAdmin ? [t('common.report', 'Báo cáo'), t('thread.opt_history'), t('thread.opt_delete_admin'), t('thread.opt_cancel')] :
                  [t('common.report', 'Báo cáo'), t('thread.opt_history'), t('thread.opt_cancel')];
    let icons = isOwner ? [
        <Ionicons name="pencil-outline" size={24} color="black" />, <Ionicons name="time-outline" size={24} color="black" />, <Ionicons name="trash-outline" size={24} color="red" />, <Ionicons name="close-outline" size={24} color="black" />,
      ] : amIAdmin ? [
        <Ionicons name="alert-circle-outline" size={24} color="black" />, <Ionicons name="time-outline" size={24} color="black" />, <Ionicons name="trash-outline" size={24} color="red" />, <Ionicons name="close-outline" size={24} color="black" />,
      ] : [
        <Ionicons name="alert-circle-outline" size={24} color="black" />, <Ionicons name="time-outline" size={24} color="black" />, <Ionicons name="close-outline" size={24} color="black" />,
      ];

    showActionSheetWithOptions(
      { options, icons, cancelButtonIndex: options.length - 1, destructiveButtonIndex: isOwner || amIAdmin ? 2 : undefined, title: isComment ? t('thread.comment_options') : t('thread.post_options'), titleTextStyle: { fontWeight: 'bold' } },
      (selectedIndex?: number) => {
        if (selectedIndex === 0 && isOwner) router.push(`/(auth)/(modal)/edit/${thread._id}`);
        else if (selectedIndex === 1) showHistory();
        else if (selectedIndex === 2 && (isOwner || amIAdmin)) handleDelete();
      }
    );
  };

  const handleDelete = () => {
    Alert.alert(t('thread.confirm_delete_title'), t('thread.confirm_delete_msg'), [
      { text: t('thread.opt_cancel'), style: 'cancel' },
      { text: t('thread.opt_delete'), style: 'destructive', onPress: async () => { await deleteThread({ messageId: thread._id }); } },
    ]);
  };

  const submitInlineReply = async () => {
    if (!replyText.trim()) return;
    setIsSendingReply(true);
    try {
      await addReply({ content: replyText, threadId: thread.threadId || thread._id, parentId: thread._id });
      setReplyText(''); setIsReplyingInline(false);
    } catch (e) { Alert.alert(t('common.error', 'Lỗi'), t('thread.error_reply')); } finally { setIsSendingReply(false); }
  };

  const handleNativeShare = async () => {
    try {
      const postUrl = `https://konket.app/feed/${thread._id}`;
      await Share.share({ message: t('thread.share_text', { url: postUrl }), url: postUrl });
      setIsShareMenuVisible(false);
      await incrementShare({ messageId: thread._id });
    } catch (error) { console.log(error); }
  };

  const handleSendToUser = async (targetUserId: Id<'users'>) => {
    setSentStatus(prev => ({ ...prev, [targetUserId]: 'sending' }));
    try {
      const conversationId = await startChat({ otherUserId: targetUserId });
      const postUrl = `https://konket.app/feed/${thread._id}`;
      await sendShareMessage({ conversationId, content: postUrl });
      await incrementShare({ messageId: thread._id });
      setSentStatus(prev => ({ ...prev, [targetUserId]: 'sent' }));
    } catch (error) {
      Alert.alert(t('common.error', 'Lỗi'), t('thread.error_send'));
      setSentStatus(prev => { const next = {...prev}; delete next[targetUserId]; return next; });
    }
  };

  const handleNavigateToDetail = () => {
    const fromSource = viewContext !== 'feed' ? 'profile' : 'feed';
    if (isComment && thread.threadId) {
      router.push({ pathname: `/(auth)/(tabs)/feed/${thread.threadId}` as any, params: { highlightCommentId: thread._id, source: fromSource } });
    } else {
      router.push({ pathname: `/(auth)/(tabs)/feed/${thread._id}` as any, params: { source: fromSource } });
    }
  };

  const ImageHeader = ({ imageIndex }: { imageIndex: number }) => (
    <SafeAreaView style={styles.imageHeader}>
      <TouchableOpacity style={styles.closeImageButton} onPress={() => setVisible(false)}><Ionicons name="close" size={28} color="white" /></TouchableOpacity>
    </SafeAreaView>
  );

  const renderHeaderRow = (name: string, isAnonFlag: boolean, isMainAdmin: boolean = false) => {
    const textNode = (
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Text style={styles.username}>{name}</Text>
        {!isAnonFlag && isMainAdmin && <View style={styles.adminBadge}><Text style={styles.adminBadgeText}>{t('thread.admin_badge')}</Text></View>}
      </View>
    );

    if (isAnonFlag) return textNode;

    return (
      <Link href={`/feed/profile/${creator?._id}` as any} asChild>
        <TouchableOpacity>{textNode}</TouchableOpacity>
      </Link>
    );
  };

  // =======================================================
  // 🎨 GIAO DIỆN 1: BÌNH LUẬN TRONG PROFILE (CÓ ĐƯỜNG KẺ)
  // =======================================================
  if (viewContext === 'profileReplies' && isComment) {
    return (
      <TouchableOpacity activeOpacity={0.8} onPress={handleNavigateToDetail} style={styles.mainWrapper}>
        {parentThread ? (
          <View style={styles.parentThreadRow}>
            <Image source={{ uri: parentDisplayAvatar }} style={styles.avatarSmall} />
            <View style={{ flex: 1 }}>
              <View style={styles.postHeaderRow}>
                {renderHeaderRow(parentDisplayName, isParentAnon)}
                <Text style={styles.inlineTimestamp}>• {formatTimeAgo(parentThread._creationTime, t)}</Text>
              </View>
              <Text style={styles.contentSmall} numberOfLines={2}>{parentThread.content}</Text>
            </View>
          </View>
        ) : (
          <Text style={{ color: 'gray', fontStyle: 'italic', marginBottom: 10 }}>{t('thread.original_deleted')}</Text>
        )}

        {parentThread && <View style={styles.verticalLine} />}

        <View style={styles.childThreadRow}>
          <Image source={{ uri: displayAvatar }} style={styles.avatar} />
          <View style={{ flex: 1 }}>
            <View style={styles.postHeaderRow}>
              {renderHeaderRow(displayName, isAnon)}
              <Text style={styles.inlineTimestamp}>• {formatTimeAgo(thread._creationTime, t)}</Text>
            </View>
            <Text style={styles.content}>{content}</Text>
            <View style={styles.actions}>
              <View style={styles.actionButton}><Ionicons name={isLiked ? "heart" : "heart-outline"} size={18} color={isLiked ? "red" : "gray"} /><Text style={[styles.actionText, {fontSize: 12}]}>{likeCount}</Text></View>

              {allowComments === false ? (
                 <View style={styles.actionButton}><Ionicons name="lock-closed-outline" size={18} color="gray" /><Text style={[styles.actionText, {fontSize: 12}]}>{t('thread.locked')}</Text></View>
              ) : (
                 <View style={styles.actionButton}><Ionicons name="chatbubble-outline" size={18} color="gray" /><Text style={[styles.actionText, {fontSize: 12}]}>{commentCount}</Text></View>
              )}

              <View style={styles.actionButton}><Ionicons name="repeat-outline" size={18} color="gray" /><Text style={[styles.actionText, {fontSize: 12}]}>{retweetCount}</Text></View>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  // =======================================================
  // 🎨 GIAO DIỆN CHÍNH (BÌNH THƯỜNG / ĐĂNG LẠI / GỐC)
  // =======================================================
  return (
    <View style={viewContext !== 'feed' ? [styles.mainWrapper, { padding: 15 }] : styles.container}>

      <View style={{ flexDirection: 'row', flex: 1 }}>
        {isAnon ? (
           <Image source={{ uri: displayAvatar }} style={styles.avatar} />
        ) : (
           <Link href={`/feed/profile/${creator?._id}` as any} asChild>
              <TouchableOpacity>
                <Image source={{ uri: displayAvatar }} style={styles.avatar} />
              </TouchableOpacity>
           </Link>
        )}

        <View style={{ flex: 1 }}>
          <View style={styles.header}>
            <View style={styles.headerText}>
              <View style={styles.postHeaderRow}>
                {renderHeaderRow(displayName, isAnon, isServerAdmin)}
                <Text style={styles.inlineTimestamp}>• {formatTimeAgo(thread._creationTime, t)}</Text>

                {editHistory && editHistory.length > 0 && (
                  <Text style={{ fontSize: 11, color: '#65676b', marginLeft: 4 }}>{t('thread.edited')}</Text>
                )}
              </View>

              {isComment && parentThread && (
                 <Text style={styles.replyingToText}>
                   {t('thread.replying_to')} <Text style={{color: '#007aff'}}>{isParentAnon ? `@${t('thread.anonymous_member')}` : `@${parentThread.creator?.username || parentThread.creator?.first_name}`}</Text>
                 </Text>
              )}

              {!isComment && channelInfo && channelInfo.name !== 'đại-sảnh' && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap', marginTop: 2 }}>
                   <Text style={{ fontSize: 12, color: isAnon ? '#FF5252' : '#5865F2', fontWeight: 'bold' }}>
                     #{channelInfo.name} {isAnon && t('thread.anonymous_channel')}
                     {/* @ts-ignore */}
                     {!isAnon && (channelInfo.universityName ? ` • ${channelInfo.universityName}` : channelInfo.serverName ? ` • ${channelInfo.serverName}` : '')}
                   </Text>
                </View>
              )}
            </View>
            <TouchableOpacity onPress={onActionPress}><Ionicons name="ellipsis-horizontal" size={24} color={Colors.border} /></TouchableOpacity>
          </View>

          <TouchableOpacity activeOpacity={0.8} onPress={handleNavigateToDetail}>
            <View style={isComment && viewContext === 'feed' ? styles.commentBubble : {}}>
               <Text style={styles.content}>{content}</Text>
            </View>
          </TouchableOpacity>

          {mediaFiles && mediaFiles.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.mediaContainer}>
              {mediaFiles.map((imageUrl, index) => {
                if (!imageUrl) return null;
                return (
                  <TouchableOpacity key={index} onPress={() => openImageViewer(index)}>
                    <Image source={{ uri: imageUrl }} style={styles.mediaImage} />
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          <View style={styles.actions}>
            <View style={styles.actionButton}>
              <TouchableOpacity onPress={() => likeThread({ messageId: thread._id })}><Ionicons name={isLiked ? "heart" : "heart-outline"} size={20} color={isLiked ? "red" : "black"} /></TouchableOpacity>
              <Text style={[styles.actionText, { color: isLiked ? "red" : "black" }]}>{likeCount}</Text>
            </View>

            {allowComments === false ? (
              <View style={[styles.actionButton, { opacity: 0.5 }]}>
                <Ionicons name="lock-closed-outline" size={20} color="gray" />
                <Text style={styles.actionText}>{t('thread.locked')}</Text>
              </View>
            ) : (
              <TouchableOpacity style={styles.actionButton} onPress={isComment ? () => setIsReplyingInline(!isReplyingInline) : handleNavigateToDetail}>
                <Ionicons name="chatbubble-outline" size={20} color="black" />
                <Text style={styles.actionText}>{commentCount}</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.actionButton} onPress={handleRepost}>
              <Ionicons name={isReposted ? "repeat" : "repeat-outline"} size={20} color={isReposted ? "#00BA7C" : "black"} />
              <Text style={[styles.actionText, isReposted && { color: "#00BA7C", fontWeight: 'bold' }]}>{retweetCount}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={() => setIsShareMenuVisible(true)}>
              <Feather name="send" size={19} color="black" />
              {/* @ts-ignore */}
              <Text style={styles.actionText}>{shareCount || 0}</Text>
            </TouchableOpacity>
          </View>

          {isReplyingInline && allowComments !== false && (
            <View style={styles.inlineReplyContainer}>
              <TextInput style={styles.inlineInput} placeholder={t('thread.reply_placeholder')} value={replyText} onChangeText={setReplyText} autoFocus multiline />
              <TouchableOpacity onPress={submitInlineReply} disabled={isSendingReply || !replyText.trim()}>
                {isSendingReply ? <ActivityIndicator size="small" color="#0866ff" /> : <Ionicons name="send" size={20} color={replyText.trim() ? '#0866ff' : 'gray'} />}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      <Modal visible={isShareMenuVisible} transparent animationType="slide" onRequestClose={() => { setIsShareMenuVisible(false); setShareSearchQuery(''); setSentStatus({}); }}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => { setIsShareMenuVisible(false); setShareSearchQuery(''); setSentStatus({}); }}>
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHandle} />
            <View style={styles.searchBox}>
              <Ionicons name="search" size={20} color="gray" />
              <TextInput placeholder={t('thread.search_friends')} style={styles.searchInput} value={shareSearchQuery} onChangeText={setShareSearchQuery} autoCapitalize="none" />
              {shareSearchQuery.length > 0 && (<TouchableOpacity onPress={() => setShareSearchQuery('')}><Ionicons name="close-circle" size={20} color="gray" /></TouchableOpacity>)}
            </View>

            {!shareSearchQuery && (
              <View style={styles.shareToolsRow}>
                 <TouchableOpacity style={styles.shareToolBtn} onPress={handleNativeShare}><View style={styles.shareToolIcon}><Ionicons name="copy-outline" size={24} color="black" /></View><Text style={styles.shareToolText}>{t('thread.copy_link')}</Text></TouchableOpacity>
                 <TouchableOpacity style={styles.shareToolBtn} onPress={handleNativeShare}><View style={styles.shareToolIcon}><Ionicons name="share-social-outline" size={24} color="black" /></View><Text style={styles.shareToolText}>{t('thread.share_via')}</Text></TouchableOpacity>
              </View>
            )}

            <ScrollView style={styles.userListScroll}>
              {shareSuggestions && shareSuggestions.length > 0 ? (
                shareSuggestions.map((user) => (
                  <View key={user._id} style={styles.userRowItem}>
                    <Image source={{ uri: getValidAvatar(user.imageUrl) }} style={styles.userRowAvatar} />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.userRowName}>{user.first_name} {user.last_name}</Text>
                      <Text style={styles.userRowUsername}>@{user.username}</Text>
                    </View>
                    <TouchableOpacity style={[styles.sendBtn, sentStatus[user._id] === 'sent' && styles.sentBtnStyle]} onPress={() => handleSendToUser(user._id)} disabled={!!sentStatus[user._id]}>
                      {sentStatus[user._id] === 'sending' ? <ActivityIndicator size="small" color="#fff" /> : sentStatus[user._id] === 'sent' ? <Text style={styles.sendBtnTextSent}>{t('thread.sent')}</Text> : <Text style={styles.sendBtnText}>{t('thread.send')}</Text>}
                    </TouchableOpacity>
                  </View>
                ))
              ) : (<Text style={styles.emptySearchText}>{t('thread.no_users_found')}</Text>)}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      <ImageView images={images} imageIndex={currentImageIndex} visible={visible} onRequestClose={() => setVisible(false)} />
    </View>
  );
};

export default Thread;

const styles = StyleSheet.create({
  mainWrapper: { flexDirection: 'column', paddingHorizontal: 15, paddingVertical: 12, backgroundColor: '#fff' },
  container: { padding: 15, flexDirection: 'row' },
  parentThreadRow: { flexDirection: 'row', alignItems: 'flex-start', opacity: 0.7 },
  childThreadRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 4 },
  verticalLine: { width: 2, height: 20, backgroundColor: '#e0e0e0', marginLeft: 19, marginVertical: 2 },
  avatarSmall: { width: 30, height: 30, borderRadius: 15, marginRight: 15 },
  contentSmall: { fontSize: 14, color: '#333', marginBottom: 4 },
  repostHeader: { flexDirection: 'row', alignItems: 'center', marginLeft: 50, marginBottom: 6 },
  repostHeaderText: { fontSize: 13, color: 'gray', fontWeight: '500' },
  replyingToText: { fontSize: 13, color: 'gray', marginTop: 2, marginBottom: 6 },
  header: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6, justifyContent: 'space-between' },
  avatar: { width: 40, height: 40, borderRadius: 20, marginRight: 10 },
  headerText: { flex: 1, flexDirection: 'column' },
  postHeaderRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  username: { fontWeight: 'bold', fontSize: 15 },
  inlineTimestamp: { color: '#777', fontSize: 13, marginLeft: 6 },
  adminBadge: { backgroundColor: '#E3F2FD', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginLeft: 6 },
  adminBadgeText: { color: '#1976D2', fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' },
  content: { fontSize: 15, marginBottom: 10, lineHeight: 22, color: '#111' },
  mediaImage: { width: 200, height: 200, borderRadius: 10, marginBottom: 10 },
  mediaContainer: { flexDirection: 'row', gap: 14, paddingRight: 40 },
  actions: { flexDirection: 'row', marginTop: 4, gap: 20, alignItems: 'center' },
  actionButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionText: { marginLeft: 2, fontSize: 13, color: 'gray' },
  imageHeader: { position: 'absolute', top: 0, width: '100%', zIndex: 1, alignItems: 'flex-end', paddingHorizontal: 20 },
  closeImageButton: { padding: 10, marginTop: 10 },
  commentBubble: { backgroundColor: '#f0f2f5', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, alignSelf: 'flex-start', maxWidth: '100%' },
  inlineReplyContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 10 },
  inlineInput: { flex: 1, backgroundColor: '#f0f2f5', borderRadius: 18, paddingHorizontal: 15, paddingVertical: 8, fontSize: 14 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, height: '70%', paddingBottom: 40 },
  modalHandle: { width: 40, height: 5, backgroundColor: '#ddd', borderRadius: 5, alignSelf: 'center', marginBottom: 15 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0f2f5', borderRadius: 10, paddingHorizontal: 12, height: 40, marginBottom: 15 },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 16 },
  shareToolsRow: { flexDirection: 'row', gap: 20, borderBottomWidth: 1, borderBottomColor: '#f0f0f0', paddingBottom: 15, marginBottom: 10 },
  shareToolBtn: { alignItems: 'center', gap: 8 },
  shareToolIcon: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#f0f2f5', justifyContent: 'center', alignItems: 'center' },
  shareToolText: { fontSize: 12, fontWeight: '500' },
  userListScroll: { flex: 1 },
  userRowItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  userRowAvatar: { width: 44, height: 44, borderRadius: 22 },
  userRowName: { fontSize: 15, fontWeight: '600' },
  userRowUsername: { fontSize: 13, color: 'gray' },
  sendBtn: { backgroundColor: '#0095f6', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 8, minWidth: 80, alignItems: 'center' },
  sendBtnText: { color: 'white', fontWeight: '600' },
  sentBtnStyle: { backgroundColor: '#f0f2f5' },
  sendBtnTextSent: { color: '#000', fontWeight: '600' },
  emptySearchText: { textAlign: 'center', color: 'gray', marginTop: 20, fontStyle: 'italic' }
});