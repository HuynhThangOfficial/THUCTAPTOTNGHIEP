import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Image,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useUserProfile } from '@/hooks/useUserProfile';
import { Colors } from '@/constants/Colors';
import { Ionicons, MaterialIcons, MaterialCommunityIcons, FontAwesome } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Id } from '@/convex/_generated/dataModel';
import { useChannel } from '@/context/ChannelContext';

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
  const router = useRouter();
  const { editId } = useLocalSearchParams();
  const { userProfile } = useUserProfile();

  // 1. Lấy thông tin mặc định từ Context
  const { activeChannelId, activeChannelName, activeUniversityId } = useChannel();

  const [threadContent, setThreadContent] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [existingMediaIds, setExistingMediaIds] = useState<string[]>([]);
  const [newMediaUris, setNewMediaUris] = useState<string[]>([]);

  // --- STATE QUẢN LÝ CHỌN KÊNH & TRƯỜNG (MỚI) ---
  const [selectedUniId, setSelectedUniId] = useState<Id<'universities'> | null>(activeUniversityId);
  const [selectedUniName, setSelectedUniName] = useState<string>('VAA'); // Mặc định

  const [selectedChannelId, setSelectedChannelId] = useState<Id<'channels'> | null>(activeChannelId);
  const [selectedChannelName, setSelectedChannelName] = useState<string>(activeChannelName || 'Đại sảnh');

  const [isPickerVisible, setPickerVisible] = useState(false);

  // Sync state khi context thay đổi (chỉ khi đang đăng mới)
  useEffect(() => {
    if (!editId) {
        setSelectedUniId(activeUniversityId);
        setSelectedChannelId(activeChannelId);
        setSelectedChannelName(activeChannelName || 'Đại sảnh');
    }
  }, [activeChannelId, activeChannelName, activeUniversityId, editId]);

  // --- QUERY DỮ LIỆU ---
  // 1. Lấy danh sách tất cả các trường (để hiện trong Modal)
  const universities = useQuery(api.university.getUniversities) || [];

  // 2. Lấy danh sách kênh THEO TRƯỜNG ĐANG CHỌN (selectedUniId)
  const channelsData = useQuery(api.university.getChannels, {
    universityId: selectedUniId || undefined
  });
  const groups = channelsData?.groups || [];
  const channels = channelsData?.channels || [];

  // Cập nhật tên trường hiển thị khi selectedUniId thay đổi
  useEffect(() => {
    if (selectedUniId && universities.length > 0) {
        const uni = universities.find(u => u._id === selectedUniId);
        if (uni) setSelectedUniName(uni.slug.toUpperCase());
    }
  }, [selectedUniId, universities]);

  // API Mutations
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

  // ... (Giữ nguyên các hàm xử lý ảnh/camera cũ) ...
  const handleSelectImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsMultipleSelection: true, quality: 0.5 });
    if (!result.canceled) setNewMediaUris([...newMediaUris, ...result.assets.map((asset) => asset.uri)]);
  };
  const handleCamera = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (permission.status !== 'granted') return Alert.alert('Cấp quyền', 'Cần quyền camera.');
    const result = await ImagePicker.launchCameraAsync({ quality: 0.5 });
    if (!result.canceled) setNewMediaUris([...newMediaUris, result.assets[0].uri]);
  };
  const removeMedia = (item: MediaPreviewItem) => {
    if (item.type === 'new') setNewMediaUris(newMediaUris.filter(uri => uri !== item.originalIdOrUri));
    else setExistingMediaIds(existingMediaIds.filter(id => id !== item.originalIdOrUri));
  };
  const handleGif = () => Alert.alert('GIF', 'Tính năng đang phát triển');
  const handleMic = () => Alert.alert('Mic', 'Tính năng đang phát triển');
  const handleHashtag = () => setThreadContent(prev => prev + " #");
  const handlePoll = () => setThreadContent(prev => prev + "\n📊 Poll:\n1. \n2. ");

  // Xử lý khi chọn trường trong Modal
  const handleSelectUniversity = (uniId: Id<'universities'>) => {
    setSelectedUniId(uniId);
    // Khi đổi trường, reset kênh về mặc định hoặc null
    setSelectedChannelId(null);
    setSelectedChannelName("Chọn kênh...");
  };

  const handleSubmit = async () => {
      if (threadContent.trim() === '' && mediaPreviewList.length === 0) return;
      if (editId && !threadToEdit) return;

      setIsUploading(true);

      try {
        const newUploadedIds = await Promise.all(
          newMediaUris.map(async (uri) => {
            try {
              const postUrl = await generateUploadUrl();
              const response = await fetch(uri);
              if (!response.ok) throw new Error("Không thể đọc file ảnh");
              const blob = await response.blob();
              const result = await fetch(postUrl, {
                method: "POST",
                headers: { "Content-Type": "image/jpeg" },
                body: blob,
              });
              const { storageId } = await result.json();
              return storageId;
            } catch (err) {
              console.error("Lỗi upload ảnh:", uri, err);
              throw new Error("Lỗi tải ảnh lên.");
            }
          })
        );

        if (editId) {
          const finalMedia = [
            ...(threadToEdit?.mediaFiles?.filter(id => existingMediaIds.includes(id)) || []),
            ...newUploadedIds
          ];
          await updateThread({
              messageId: editId as Id<'messages'>,
              content: threadContent,
              mediaFiles: finalMedia
          });
        } else {
          // Bắt buộc chọn Kênh và Trường
          if (!isReply && (!selectedChannelId || !selectedUniId)) {
               Alert.alert("Thiếu thông tin", "Vui lòng chọn Trường và Kênh để đăng bài!");
               setIsUploading(false);
               return;
          }

          await addThread({
            threadId: threadId as Id<'messages'>,
            channelId: isReply ? undefined : selectedChannelId!,
            universityId: isReply ? undefined : selectedUniId!, // <--- Gửi trường đã chọn
            content: threadContent,
            mediaFiles: newUploadedIds,
          });
        }

        router.dismiss();
      } catch (error: any) {
        console.error("Lỗi Submit:", error);
        Alert.alert('Không thể lưu', error.message);
      } finally {
        setIsUploading(false);
      }
    };

  // Helper render kênh
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
      <Text style={[
        styles.channelNameText,
        selectedChannelId === channel._id && { color: Colors.submit, fontWeight: 'bold' }
      ]}>
        # {channel.name}
      </Text>
      {selectedChannelId === channel._id && (
        <Ionicons name="checkmark" size={18} color={Colors.submit} />
      )}
    </TouchableOpacity>
  );

  if (isPreview) {
    return (
      <View style={styles.previewContainer}>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Image source={{ uri: userProfile?.imageUrl || defaultAvatar }} style={styles.avatar} />
          <View style={{ flex: 1, justifyContent: 'center' }}>
            <Text style={styles.placeholderText}>
                 Đăng tại: #{selectedChannelName} • {selectedUniName}
            </Text>
            <View style={[styles.mediaIcons, { marginTop: 8 }]}>
               <Ionicons name="images-outline" size={20} color={Colors.border} />
               <Ionicons name="camera-outline" size={20} color={Colors.border} />
               <MaterialIcons name="gif" size={24} color={Colors.border} />
               <Ionicons name="mic-outline" size={20} color={Colors.border} />
            </View>
          </View>
        </View>
      </View>
    );
  }

  if (editId && !threadToEdit) {
    return <View style={[styles.container, { justifyContent: 'center' }]}><ActivityIndicator /></View>;
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <Stack.Screen
        options={{
          headerTitle: editId ? 'Chỉnh Sửa' : (isReply ? 'Phản hồi' : 'Đăng Bài Mới'),
          headerTitleAlign: 'center',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.dismiss()}><Text style={{ fontSize: 16 }}>Hủy</Text></TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity onPress={handleSubmit} disabled={isUploading || (threadContent.trim().length === 0 && mediaPreviewList.length === 0)} style={{ opacity: isUploading ? 0.5 : 1 }}>
              <Text style={styles.postButtonText}>{isUploading ? '...' : (editId ? 'Lưu' : 'Đăng')}</Text>
            </TouchableOpacity>
          ),
        }}
      />
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Image source={{ uri: userProfile?.imageUrl || defaultAvatar }} style={styles.avatar} />
          <View style={{ flex: 1 }}>
            <Text style={styles.username}>{userProfile?.first_name} {userProfile?.last_name}</Text>

            {/* --- NÚT CHỌN KÊNH & TRƯỜNG --- */}
            {editId || isReply ? (
               <Text style={{fontSize: 12, color: 'gray', marginBottom: 5}}>
                  {editId ? "Đang chỉnh sửa bài viết" : "Đang trả lời bình luận"}
               </Text>
            ) : (
                <TouchableOpacity
                  style={styles.channelBadge}
                  onPress={() => setPickerVisible(true)}
                >
                  <Text style={styles.channelBadgeText}>
                    Đăng tại: <Text style={{fontWeight: 'bold'}}>#{selectedChannelName}</Text> • {selectedUniName}
                  </Text>
                  <Ionicons name="chevron-down" size={14} color={Colors.submit} />
                </TouchableOpacity>
            )}

            <TextInput
              style={styles.input}
              placeholder="Bạn đang nghĩ gì?"
              value={threadContent}
              onChangeText={setThreadContent}
              multiline
              autoFocus={!isPreview && !editId}
              editable={!isUploading}
              placeholderTextColor={Colors.border}
            />

            {mediaPreviewList.length > 0 && (
              <ScrollView horizontal style={styles.mediaScroll} showsHorizontalScrollIndicator={false}>
                {mediaPreviewList.map((item, index) => (
                  <View key={index} style={styles.mediaItem}>
                    <Image source={{ uri: item.uri }} style={styles.mediaImage} />
                    <TouchableOpacity style={styles.deleteIconContainer} onPress={() => removeMedia(item)}>
                      <Ionicons name="close" size={16} color="white" />
                    </TouchableOpacity>
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
          </View>
        </View>
      </ScrollView>

      {/* --- MODAL CHỌN KÊNH & TRƯỜNG (MỚI) --- */}
      <Modal visible={isPickerVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Chọn nơi đăng</Text>
            <TouchableOpacity onPress={() => setPickerVisible(false)}>
              <Ionicons name="close-circle" size={28} color="#ccc" />
            </TouchableOpacity>
          </View>

          {/* 1. THANH CHỌN TRƯỜNG (HORIZONTAL SCROLL) */}
          <View style={styles.uniSelectorContainer}>
             <Text style={styles.sectionHeader}>Chọn Trường:</Text>
             <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap: 10}}>
                {universities.map((uni) => (
                   <TouchableOpacity
                      key={uni._id}
                      style={[
                        styles.uniPill,
                        selectedUniId === uni._id && styles.uniPillActive
                      ]}
                      onPress={() => handleSelectUniversity(uni._id)}
                   >
                      <Text style={[
                        styles.uniPillText,
                        selectedUniId === uni._id && styles.uniPillTextActive
                      ]}>
                        {uni.slug.toUpperCase()}
                      </Text>
                   </TouchableOpacity>
                ))}
             </ScrollView>
          </View>

          <View style={styles.divider} />

          {/* 2. DANH SÁCH KÊNH CỦA TRƯỜNG ĐÓ */}
          <FlatList
            data={groups}
            keyExtractor={(item) => item._id}
            contentContainerStyle={{ padding: 16, paddingBottom: 50 }}
            renderItem={({ item: group }) => {
              const subChannels = channels.filter(c => c.parentId === group._id);
              if (subChannels.length === 0) return null;
              return (
                <View style={styles.groupSection}>
                  <Text style={styles.groupTitle}>{group.name}</Text>
                  {subChannels.map(renderChannelItem)}
                </View>
              );
            }}
            ListHeaderComponent={() => {
              const general = channels.filter(c => !c.parentId && c.type === 'channel');
              if (channels.length === 0) {
                  return <Text style={{textAlign:'center', color:'gray', marginTop: 20}}>Không tìm thấy kênh nào.</Text>;
              }
              if (general.length === 0) return null;
              return (
                <View style={styles.groupSection}>
                  <Text style={styles.groupTitle}>CHUNG</Text>
                  {general.map(renderChannelItem)}
                </View>
              )
            }}
          />
        </View>
      </Modal>

    </KeyboardAvoidingView>
  );
};
export default ThreadComposer;

const styles = StyleSheet.create({
  // ... Styles cũ giữ nguyên ...
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

  // --- STYLES CHO BADGE ---
  channelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f8ff',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    alignSelf: 'flex-start',
    marginBottom: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: '#d0eaff'
  },
  channelBadgeText: {
    fontSize: 13,
    color: '#007aff', // Màu xanh dương Apple
  },

  // --- STYLES MODAL ---
  modalContainer: { flex: 1, backgroundColor: 'white' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },

  // Style cho phần chọn Trường
  uniSelectorContainer: { padding: 16, paddingBottom: 10 },
  sectionHeader: { fontSize: 12, fontWeight: 'bold', color: 'gray', marginBottom: 8, textTransform: 'uppercase' },
  uniPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#eee'
  },
  uniPillActive: {
    backgroundColor: 'black',
    borderColor: 'black'
  },
  uniPillText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'gray'
  },
  uniPillTextActive: {
    color: 'white'
  },
  divider: { height: 1, backgroundColor: '#eee', marginHorizontal: 16 },

  // Style cho danh sách kênh
  groupSection: { marginBottom: 20 },
  groupTitle: { fontSize: 13, fontWeight: 'bold', color: 'gray', marginBottom: 8, textTransform: 'uppercase' },
  channelItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#f0f0f0' },
  channelNameText: { fontSize: 16 },
});