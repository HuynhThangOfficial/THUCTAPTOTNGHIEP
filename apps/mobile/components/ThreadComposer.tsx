import React, { useState, useEffect, useMemo } from 'react';
import { StyleSheet, Text, View, Image, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Alert, ActivityIndicator, Modal, FlatList, Switch } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useUserProfile } from '@/hooks/useUserProfile';
import { Colors } from '@/constants/Colors';
import { Ionicons, MaterialIcons, MaterialCommunityIcons, FontAwesome } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Id } from '@/convex/_generated/dataModel';
import { useChannel } from '@/context/ChannelContext';
import { useTranslation } from 'react-i18next'; // 👈 IMPORT I18N

type ThreadComposerProps = {
  isPreview?: boolean;
  isReply?: boolean;
  threadId?: string;
};

type MediaPreviewItem = {
  type: 'existing' | 'new';
  uri: string;
  originalIdOrUri: string;
};

const ThreadComposer = ({ isPreview, isReply, threadId }: ThreadComposerProps) => {
  const { t } = useTranslation(); // 👈 KHỞI TẠO HOOK DỊCH
  const router = useRouter();
  const { editId } = useLocalSearchParams();
  const { userProfile } = useUserProfile();

  const { activeChannelId, activeChannelName, activeUniversityId, activeServerId } = useChannel();

  const [threadContent, setThreadContent] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [existingMediaIds, setExistingMediaIds] = useState<string[]>([]);
  const [newMediaUris, setNewMediaUris] = useState<string[]>([]);

  // State quản lý bình luận
  const [allowComments, setAllowComments] = useState(true);

  const [selectedUniId, setSelectedUniId] = useState<Id<'universities'> | null>(activeUniversityId);
  const [selectedServerId, setSelectedServerId] = useState<Id<'servers'> | null>(activeServerId);
  const [selectedWorkspaceName, setSelectedWorkspaceName] = useState<string>('');

  const [selectedChannelId, setSelectedChannelId] = useState<Id<'channels'> | null>(activeChannelId);
  const [selectedChannelName, setSelectedChannelName] = useState<string>(activeChannelName || t('composer.select_channel'));

  const [isPickerVisible, setPickerVisible] = useState(false);

  useEffect(() => {
    if (!editId) {
        setSelectedUniId(activeUniversityId);
        setSelectedServerId(activeServerId);

        if (activeChannelName === 'đại-sảnh') {
            setSelectedChannelId(null);
            setSelectedChannelName(t('composer.select_channel'));
        } else {
            setSelectedChannelId(activeChannelId);
            setSelectedChannelName(activeChannelName || t('composer.select_channel'));
        }
    }
  }, [activeChannelId, activeChannelName, activeUniversityId, activeServerId, editId, t]);

  const workspaces = useQuery(api.university.getAllPostableWorkspaces);
  const channelsData = useQuery(api.university.getChannels, {
    universityId: selectedUniId || undefined,
    serverId: selectedServerId || undefined
  });
  const groups = channelsData?.groups || [];
  const channels = channelsData?.channels || [];
  const universities = useQuery(api.university.getUniversities) || [];

  useEffect(() => {
    if (selectedUniId && universities.length > 0) {
        const uni = universities.find(u => u._id === selectedUniId);
        if (uni) setSelectedWorkspaceName(uni.slug.toUpperCase());
    } else if (selectedServerId && workspaces?.servers) {
        const srv = workspaces.servers.find(s => s._id === selectedServerId);
        if (srv) setSelectedWorkspaceName(srv.name);
    }
  }, [selectedUniId, selectedServerId, universities, workspaces]);

  const addThread = useMutation(api.messages.addThread);
  const updateThread = useMutation(api.messages.updateThread);
  const generateUploadUrl = useMutation(api.messages.generateUploadUrl);
  const threadToEdit = useQuery(api.messages.getThreadById, editId ? { messageId: editId as Id<'messages'> } : 'skip');
  const defaultAvatar = 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y';

  useEffect(() => {
    if (threadToEdit) {
      setThreadContent(threadToEdit.content);
      if (threadToEdit.mediaFiles) setExistingMediaIds(threadToEdit.mediaFiles);
    }
  }, [threadToEdit]);

  const mediaPreviewList: MediaPreviewItem[] = useMemo(() => {
    const existing: MediaPreviewItem[] = (threadToEdit?.mediaFiles || []).map((url) => ({
      type: 'existing', uri: url, originalIdOrUri: url,
    }));
    const newItems: MediaPreviewItem[] = newMediaUris.map((uri) => ({
      type: 'new', uri: uri, originalIdOrUri: uri,
    }));
    const filteredExisting = existing.filter(item => existingMediaIds.includes(item.originalIdOrUri));
    return [...filteredExisting, ...newItems];
  }, [threadToEdit?.mediaFiles, newMediaUris, existingMediaIds]);

  const handleSelectImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsMultipleSelection: true, quality: 0.5 });
    if (!result.canceled) setNewMediaUris([...newMediaUris, ...result.assets.map((asset) => asset.uri)]);
  };
  const handleCamera = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (permission.status !== 'granted') return Alert.alert(t('composer.permission'), t('composer.camera_permission_required'));
    const result = await ImagePicker.launchCameraAsync({ quality: 0.5 });
    if (!result.canceled) setNewMediaUris([...newMediaUris, result.assets[0].uri]);
  };
  const removeMedia = (item: MediaPreviewItem) => {
    if (item.type === 'new') setNewMediaUris(newMediaUris.filter(uri => uri !== item.originalIdOrUri));
    else setExistingMediaIds(existingMediaIds.filter(id => id !== item.originalIdOrUri));
  };
  const handleGif = () => Alert.alert('GIF', t('composer.feature_in_development'));
  const handleMic = () => Alert.alert('Mic', t('composer.feature_in_development'));
  const handleHashtag = () => setThreadContent(prev => prev + " #");
  const handlePoll = () => setThreadContent(prev => prev + "\n📊 Poll:\n1. \n2. ");

  const selectWorkspace = (type: 'uni' | 'srv', id: any) => {
    if (type === 'uni') {
      setSelectedUniId(id);
      setSelectedServerId(null);
    } else {
      setSelectedServerId(id);
      setSelectedUniId(null);
    }
    setSelectedChannelId(null);
    setSelectedChannelName(t('composer.select_channel'));
  };

  const handleSubmit = async () => {
      if (threadContent.trim() === '' && mediaPreviewList.length === 0) return;
      if (editId && !threadToEdit) return;

      if (!isReply && (!selectedChannelId || selectedChannelName === 'đại-sảnh' || selectedChannelName === t('composer.select_channel'))) {
           Alert.alert(t('composer.error'), t('composer.cannot_post_in_lobby'));
           return;
      }

      setIsUploading(true);
      try {
        const newUploadedIds = await Promise.all(
          newMediaUris.map(async (uri) => {
            const postUrl = await generateUploadUrl();
            const response = await fetch(uri);
            const blob = await response.blob();
            const result = await fetch(postUrl, { method: "POST", body: blob });
            const { storageId } = await result.json();
            return storageId;
          })
        );

        if (editId) {
          const finalMedia = [...(threadToEdit?.mediaFiles?.filter(id => existingMediaIds.includes(id)) || []), ...newUploadedIds];
          await updateThread({ messageId: editId as Id<'messages'>, content: threadContent, mediaFiles: finalMedia });
        } else {
          await addThread({
            threadId: (isReply && threadId) ? (threadId as Id<'messages'>) : undefined,
            channelId: isReply ? undefined : selectedChannelId!,
            universityId: isReply ? undefined : (selectedUniId || undefined),
            serverId: isReply ? undefined : (selectedServerId || undefined),
            content: threadContent,
            mediaFiles: newUploadedIds,
            allowComments: isReply ? undefined : allowComments,
          });
        }
        router.dismiss();
      } catch (error: any) {
        Alert.alert(t('composer.cannot_save'), error.message);
      } finally {
        setIsUploading(false);
      }
    };

  const renderChannelItem = (channel: any) => (
    <TouchableOpacity
      key={channel._id}
      style={styles.channelItem}
      onPress={() => {
        setSelectedChannelId(channel._id);
        setSelectedChannelName(channel.name);
        setPickerVisible(false);
      }}
    >
      <Text style={[styles.channelNameText, selectedChannelId === channel._id && { color: Colors.submit, fontWeight: 'bold' }]}>
        # {channel.name}
      </Text>
      {selectedChannelId === channel._id && <Ionicons name="checkmark" size={18} color={Colors.submit} />}
    </TouchableOpacity>
  );

  if (isPreview) {
    return (
      <View style={styles.previewContainer}>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Image source={{ uri: userProfile?.imageUrl || defaultAvatar }} style={styles.avatar} />
          <View style={{ flex: 1, justifyContent: 'center' }}>
            <Text style={styles.placeholderText}>{t('composer.posting_in')} #{selectedChannelName} • {selectedWorkspaceName}</Text>
            <View style={[styles.mediaIcons, { marginTop: 8 }]}>
               <Ionicons name="images-outline" size={20} color={Colors.border} /><Ionicons name="camera-outline" size={20} color={Colors.border} />
               <MaterialIcons name="gif" size={24} color={Colors.border} /><Ionicons name="mic-outline" size={20} color={Colors.border} />
            </View>
          </View>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <Stack.Screen options={{
          headerTitle: editId ? t('composer.edit_title') : (isReply ? t('composer.reply_title') : t('composer.new_post_title')),
          headerTitleAlign: 'center',
          headerLeft: () => (<TouchableOpacity onPress={() => router.dismiss()}><Text style={{ fontSize: 16 }}>{t('composer.cancel')}</Text></TouchableOpacity>),
          headerRight: () => (
            <TouchableOpacity onPress={handleSubmit} disabled={isUploading || (threadContent.trim().length === 0 && mediaPreviewList.length === 0)} style={{ opacity: isUploading ? 0.5 : 1 }}>
              <Text style={styles.postButtonText}>{isUploading ? '...' : (editId ? t('composer.save') : t('composer.post'))}</Text>
            </TouchableOpacity>
          ),
      }} />
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Image source={{ uri: userProfile?.imageUrl || defaultAvatar }} style={styles.avatar} />
          <View style={{ flex: 1 }}>
            <Text style={styles.username}>
              {userProfile?.first_name}
              {userProfile?.last_name ? ` ${userProfile.last_name}` : ''}
            </Text>
            {!isReply && !editId ? (
                <TouchableOpacity
                  style={[styles.channelBadge, selectedChannelName === t('composer.select_channel') && { borderColor: 'red', backgroundColor: '#ffe6e6' }]}
                  onPress={() => setPickerVisible(true)}
                >
                  <Text style={[styles.channelBadgeText, selectedChannelName === t('composer.select_channel') && { color: 'red' }]}>
                    {selectedChannelName === t('composer.select_channel') ? t('composer.warning_select_channel') : <>{t('composer.posting_in')} <Text style={{fontWeight: 'bold'}}>#{selectedChannelName}</Text> • {selectedWorkspaceName}</>}
                  </Text>
                  <Ionicons name="chevron-down" size={14} color={selectedChannelName === t('composer.select_channel') ? 'red' : Colors.submit} />
                </TouchableOpacity>
            ) : ( <Text style={{fontSize: 12, color: 'gray', marginBottom: 5}}>{editId ? t('composer.editing_post') : t('composer.replying_comment')}</Text> )}

            <TextInput style={styles.input} placeholder={t('composer.whats_on_your_mind')} value={threadContent} onChangeText={setThreadContent} multiline autoFocus={!isPreview && !editId} editable={!isUploading} placeholderTextColor={Colors.border} />

            {mediaPreviewList.length > 0 && (
              <ScrollView horizontal style={styles.mediaScroll} showsHorizontalScrollIndicator={false}>
                {mediaPreviewList.map((item, index) => (
                  <View key={index} style={styles.mediaItem}>
                    <Image source={{ uri: item.uri }} style={styles.mediaImage} />
                    <TouchableOpacity style={styles.deleteIconContainer} onPress={() => removeMedia(item)}><Ionicons name="close" size={16} color="white" /></TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}

            <View style={styles.mediaIcons}>
              <TouchableOpacity onPress={handleSelectImage}><Ionicons name="images-outline" size={24} color={Colors.border} /></TouchableOpacity>
              <TouchableOpacity onPress={handleCamera}><Ionicons name="camera-outline" size={24} color={Colors.border} /></TouchableOpacity>
              <TouchableOpacity onPress={handleGif}><View style={styles.gifIcon}><Text style={styles.gifText}>GIF</Text></View></TouchableOpacity>
              <TouchableOpacity onPress={handleMic}><Ionicons name="mic-outline" size={24} color={Colors.border} /></TouchableOpacity>
              <TouchableOpacity onPress={handleHashtag}><FontAwesome name="hashtag" size={20} color={Colors.border} /></TouchableOpacity>
              <TouchableOpacity onPress={handlePoll}><MaterialCommunityIcons name="chart-bar" size={24} color={Colors.border} /></TouchableOpacity>
            </View>

            {/* CÔNG TẮC BẬT TẮT BÌNH LUẬN */}
            {!isReply && !editId && (
              <View style={styles.toggleCommentContainer}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name={allowComments ? "chatbubble-ellipses-outline" : "lock-closed-outline"} size={22} color="gray" />
                  <Text style={styles.toggleCommentText}>
                    {allowComments ? t('composer.allow_comments') : t('composer.comments_disabled')}
                  </Text>
                </View>
                <Switch
                  value={allowComments}
                  onValueChange={setAllowComments}
                  trackColor={{ false: '#767577', true: '#5865F2' }}
                />
              </View>
            )}

          </View>
        </View>
      </ScrollView>

      <Modal visible={isPickerVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t('composer.choose_destination')}</Text>
            <TouchableOpacity onPress={() => setPickerVisible(false)}><Ionicons name="close-circle" size={28} color="#ccc" /></TouchableOpacity>
          </View>
          <ScrollView style={{flex: 1}}>
              <View style={styles.uniSelectorContainer}>
                 <Text style={styles.sectionHeader}>{t('composer.school')}</Text>
                 <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap: 10, paddingVertical: 5}}>
                    {universities.map((uni) => (
                       <TouchableOpacity key={uni._id} style={[styles.uniPill, selectedUniId === uni._id && styles.uniPillActive]} onPress={() => selectWorkspace('uni', uni._id)}>
                          <Text style={[styles.uniPillText, selectedUniId === uni._id && styles.uniPillTextActive]}>{uni.slug.toUpperCase()}</Text>
                       </TouchableOpacity>
                    ))}
                 </ScrollView>
                 <Text style={[styles.sectionHeader, {marginTop: 15}]}>{t('composer.your_servers')}</Text>
                 <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap: 10, paddingVertical: 5}}>
                    {workspaces?.servers.map((srv) => (
                       <TouchableOpacity key={srv._id} style={[styles.uniPill, selectedServerId === srv._id && styles.uniPillActive]} onPress={() => selectWorkspace('srv', srv._id)}>
                          <Text style={[styles.uniPillText, selectedServerId === srv._id && styles.uniPillTextActive]}>{srv.name}</Text>
                       </TouchableOpacity>
                    ))}
                 </ScrollView>
              </View>
              <View style={styles.divider} />
              <View style={{padding: 16}}>
                {groups.map((group) => {
                  const subChannels = channels.filter(c => c.parentId === group._id && c.name !== 'đại-sảnh');
                  if (subChannels.length === 0) return null;
                  return (
                    <View key={group._id} style={styles.groupSection}>
                      <Text style={styles.groupTitle}>{group.name}</Text>
                      {subChannels.map(renderChannelItem)}
                    </View>
                  );
                })}
                {channels.filter(c => !c.parentId && c.type === 'channel' && c.name !== 'đại-sảnh').map(renderChannelItem)}
                {channels.length === 0 && <Text style={{textAlign:'center', color:'gray', marginTop: 20}}>{t('composer.no_channels_found')}</Text>}
              </View>
          </ScrollView>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};
export default ThreadComposer;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white' },
  previewContainer: { padding: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: Colors.border, backgroundColor: 'white' },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  placeholderText: { color: Colors.border, fontSize: 16 },
  username: { fontWeight: 'bold', fontSize: 16, marginBottom: 4 },
  input: { fontSize: 16, color: 'black', textAlignVertical: 'top', minHeight: 40 },
  postButtonText: { color: Colors.submit, fontWeight: 'bold', fontSize: 16 },
  mediaScroll: { marginTop: 10, marginBottom: 10 },
  mediaItem: { position: 'relative', marginRight: 10 },
  mediaImage: { width: 100, height: 150, borderRadius: 10 },
  deleteIconContainer: { position: 'absolute', top: 5, right: 5, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 12, padding: 4 },
  mediaIcons: { flexDirection: 'row', gap: 20, marginTop: 10, alignItems: 'center' },
  gifIcon: { borderWidth: 1.5, borderColor: Colors.border, borderRadius: 4, paddingHorizontal: 2 },
  gifText: { fontSize: 10, fontWeight: 'bold', color: Colors.border },
  channelBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0f8ff', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16, alignSelf: 'flex-start', marginBottom: 8, gap: 6, borderWidth: 1, borderColor: '#d0eaff' },
  channelBadgeText: { fontSize: 13, color: '#007aff' },
  modalContainer: { flex: 1, backgroundColor: 'white' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  uniSelectorContainer: { padding: 16, paddingBottom: 10 },
  sectionHeader: { fontSize: 11, fontWeight: '900', color: 'gray', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 },
  uniPill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f5f5f5', borderWidth: 1, borderColor: '#eee' },
  uniPillActive: { backgroundColor: 'black', borderColor: 'black' },
  uniPillText: { fontSize: 13, fontWeight: '700', color: 'gray' },
  uniPillTextActive: { color: 'white' },
  divider: { height: 1, backgroundColor: '#eee' },
  groupSection: { marginBottom: 20 },
  groupTitle: { fontSize: 12, fontWeight: 'bold', color: 'gray', marginBottom: 8, textTransform: 'uppercase' },
  channelItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#f0f0f0' },
  channelNameText: { fontSize: 16 },
  toggleCommentContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 20, paddingTop: 15, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  toggleCommentText: { marginLeft: 8, fontSize: 15, fontWeight: '500', color: '#333' }
});