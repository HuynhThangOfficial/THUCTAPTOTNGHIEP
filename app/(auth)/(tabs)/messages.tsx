import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, TextInput, ScrollView, Modal, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard, ActivityIndicator, Alert } from 'react-native';
import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { useRouter } from 'expo-router';
import { Ionicons, Feather, FontAwesome6 } from '@expo/vector-icons';
import { useUserProfile } from '@/hooks/useUserProfile';
import * as ImagePicker from 'expo-image-picker';

// Xử lý lỗi ảnh null/undefined hoặc chuỗi Storage ID gây crash app
const getValidAvatar = (url?: string | null) => {
  if (url && typeof url === 'string' && url.startsWith('http')) {
    return url;
  }
  return 'https://www.gravatar.com/avatar/?d=mp';
};

const formatTimeShort = (timestamp?: number) => {
  if (!timestamp) return '';
  const diffMs = Date.now() - timestamp;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Vừa xong';
  if (diffMins < 60) return `${diffMins} phút`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} giờ`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} ngày`;
};

const formatTimeAgo = (timestamp?: number) => {
  if (!timestamp) return '';
  const diffMs = Date.now() - timestamp;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Vừa xong';
  if (diffMins < 60) return `${diffMins} phút`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} giờ`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} ngày`;
};

const getRemainingHours = (expiresAt?: number) => {
    if (!expiresAt) return 0;
    const diffMs = expiresAt - Date.now();
    const diffHours = Math.ceil(diffMs / 3600000);
    return diffHours > 0 ? diffHours : 0;
};

interface NoteItem { _id: Id<"notes">; _creationTime: number; userId: Id<"users">; content: string; expiresAt: number; privacy?: string; user: any; }
interface StoryItem { _id: Id<"stories">; _creationTime: number; userId: Id<"users">; mediaUrl: string; mediaType: string; expiresAt: number; user: any; }

const MessagesScreen = () => {
  const router = useRouter();
  const { userProfile } = useUserProfile();
  
  const inbox = useQuery(api.chat.getInbox);
  
  // @ts-ignore
  const allNotes: NoteItem[] = useQuery(api.social.getAllNotes, { viewerId: userProfile?._id }) || [];
  // @ts-ignore
  const allStories: StoryItem[] = useQuery(api.social.getAllStories) || [];

  // @ts-ignore
  const upsertNote = useMutation(api.social.upsertNote);
  // @ts-ignore
  const deleteNote = useMutation(api.social.deleteNote);
  // @ts-ignore
  const createStory = useMutation(api.social.createStory);
  const generateUploadUrl = useMutation(api.chat.generateUploadUrl);

  const myDbNote = allNotes.find((n: NoteItem) => n.userId === userProfile?._id);
  const myDbStories = allStories.filter((s: StoryItem) => s.userId === userProfile?._id);
  const hasStory = myDbStories.length > 0;
  const friendsNotes = allNotes.filter((n: NoteItem) => n.userId !== userProfile?._id);

  // --- STATES ---
  const [inputText, setInputText] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  
  const [isNoteModalVisible, setIsNoteModalVisible] = useState(false); 
  const [isSettingsVisible, setIsSettingsVisible] = useState(false); 
  const [viewingNote, setViewingNote] = useState<NoteItem | null>(null);

  const [tempPrivacy, setTempPrivacy] = useState('Công khai');
  const [tempDuration, setTempDuration] = useState(24);
  const [selectedPrivacy, setSelectedPrivacy] = useState('Công khai');
  const [selectedDuration, setSelectedDuration] = useState(24);

  // --- LOGIC GHI CHÚ ---
  const handleOpenNoteModal = () => {
    setInputText(myDbNote?.content || '');
    if (myDbNote?.privacy) setSelectedPrivacy(myDbNote.privacy);
    setIsNoteModalVisible(true);
  };

  const handleShareNote = async () => {
    if (!userProfile) return;
    if (inputText.trim() !== '') {
      await upsertNote({ 
        userId: userProfile._id as Id<"users">, 
        content: inputText.trim(),
        durationHours: selectedDuration,
        privacy: selectedPrivacy
      });
    }
    setIsNoteModalVisible(false);
  };

  const handleDeleteNoteFromView = async () => {
    if (!userProfile) return;
    await deleteNote({ userId: userProfile._id as Id<"users"> });
    setViewingNote(null);
  };

  const handleSaveSettings = () => {
    setSelectedPrivacy(tempPrivacy);
    setSelectedDuration(tempDuration);
    setIsSettingsVisible(false);
  };

  // --- LOGIC STORY ---
  const handleViewMyStory = () => {
    Alert.alert("Story của bạn", "Tính năng xem Story chi tiết sẽ được phát triển ở phần sau!");
  };

  const handlePostStory = async () => {
    if (!userProfile) return;
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert("Lỗi", "Bạn cần cấp quyền truy cập Thư viện ảnh để đăng Story.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.All, quality: 0.7 });

    if (!result.canceled) {
      setIsUploading(true);
      try {
        const uri = result.assets[0].uri;
        const type = result.assets[0].type === 'video' ? 'video' : 'image';
        const postUrl = await generateUploadUrl();
        const response = await fetch(uri);
        const blob = await response.blob();
        const uploadResult = await fetch(postUrl, { method: 'POST', headers: { 'Content-Type': blob.type }, body: blob });
        const { storageId } = await uploadResult.json();

        await createStory({ userId: userProfile._id as Id<"users">, mediaUrl: storageId, mediaType: type });
      } catch (error) {
        Alert.alert("Lỗi", "Đăng Story thất bại.");
      } finally {
        setIsUploading(false);
      }
    }
  };

  const ListHeader = () => {
    return (
      <View style={styles.headerWrapper}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#8e8e93" />
          <TextInput style={styles.searchInput} placeholder="Tìm kiếm hoặc hỏi Meta AI" placeholderTextColor="#8e8e93" />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.notesContainer}>
          
          <View style={styles.noteItem}>
            <View style={styles.avatarContainer}>
              {/* AVATAR: CÓ STORY -> XEM, CHƯA CÓ -> TẠO MỚI */}
              <TouchableOpacity onPress={hasStory ? handleViewMyStory : handlePostStory} activeOpacity={0.8} style={[styles.storyRing, hasStory && styles.storyRingActive]}>
                <Image source={{ uri: getValidAvatar(userProfile?.imageUrl) }} style={styles.noteAvatar} />
              </TouchableOpacity>

              {/* DẤU CỘNG (+): LUÔN LÀ TẠO STORY MỚI BẤT KỂ ĐÃ CÓ HAY CHƯA */}
              <TouchableOpacity style={styles.addNoteBadge} onPress={handlePostStory} activeOpacity={0.8}>
                <Ionicons name="add" size={14} color="#fff" />
              </TouchableOpacity>

              {/* BONG BÓNG GHI CHÚ: CÓ GHI CHÚ -> XEM CHI TIẾT. CHƯA CÓ -> MỞ MODAL NHẬP */}
              <TouchableOpacity style={styles.noteBubbleWrapper} onPress={() => {
                  if (myDbNote) setViewingNote(myDbNote);
                  else handleOpenNoteModal();
              }} activeOpacity={0.8}>
                <View style={styles.noteBubble}>
                  <Text style={[styles.noteBubbleText, !myDbNote && { color: '#8e8e93' }]} numberOfLines={2}>
                    {myDbNote ? myDbNote.content : "Ghi chú..."}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
            <Text style={styles.noteName} numberOfLines={1}>Tin của bạn</Text>
            
            {(myDbNote || hasStory) && (
               <Text style={styles.elapsedTimeText}>{formatTimeAgo(myDbNote?._creationTime || myDbStories[0]?._creationTime)}</Text>
            )}
          </View>

          {/* GHI CHÚ BẠN BÈ */}
          {friendsNotes.map((note: NoteItem) => (
            <View key={note._id} style={styles.noteItem}>
              <View style={styles.avatarContainer}>
                <TouchableOpacity activeOpacity={0.8} style={styles.storyRing}>
                  <Image source={{ uri: getValidAvatar(note.user?.imageUrl) }} style={styles.noteAvatar} />
                </TouchableOpacity>
                {note.content !== '' && (
                  <TouchableOpacity style={styles.noteBubbleWrapper} onPress={() => setViewingNote(note)} activeOpacity={0.9}>
                    <View style={styles.noteBubble}>
                      <Text style={styles.noteBubbleText} numberOfLines={2}>{note.content}</Text>
                    </View>
                  </TouchableOpacity>
                )}
              </View>
              <Text style={styles.noteName} numberOfLines={1}>{note.user?.first_name || 'User'}</Text>
              <Text style={styles.elapsedTimeText}>{formatTimeAgo(note._creationTime)}</Text>
            </View>
          ))}
        </ScrollView>
        <View style={styles.tabsContainer}>
          <Text style={styles.tabActive}>Tin nhắn</Text>
          <Text style={styles.tabInactive}>Tin nhắn đang chờ</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* HEADER CHÍNH */}
      <View style={styles.header}>
        <View style={styles.spacer} /> 
        <TouchableOpacity style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>{userProfile?.username || 'Đang tải...'}</Text>
          <Ionicons name="chevron-down" size={18} color="#000" style={styles.chevronIcon} />
        </TouchableOpacity>
        <TouchableOpacity><FontAwesome6 name="pen-to-square" size={24} color="#000" /></TouchableOpacity>
      </View>

      <FlatList
        data={inbox}
        keyExtractor={(item) => item._id}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={<View style={styles.emptyContainer}><Text style={styles.emptyText}>Chưa có tin nhắn nào.</Text></View>}
        renderItem={({ item }) => {
          const otherUser = item.otherUser;
          return (
            <TouchableOpacity style={styles.chatRow} onPress={() => router.push(`/(public)/chat/${item._id}` as any)}>
              <Image source={{ uri: getValidAvatar(otherUser?.imageUrl) }} style={styles.chatAvatar} />
              <View style={styles.chatInfo}>
                <Text style={styles.chatName}>{otherUser ? `${otherUser.first_name} ${otherUser.last_name}` : 'Người dùng'}</Text>
                <View style={styles.messageRow}>
                  <Text style={styles.lastMessage} numberOfLines={1}>{item.lastMessageText || 'Đã gửi một tin nhắn'}</Text>
                  <Text style={styles.dot}> · </Text>
                  <Text style={styles.timeText}>{formatTimeShort(item.updatedAt)}</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.cameraBtn}><Feather name="camera" size={24} color="#8e8e93" /></TouchableOpacity>
            </TouchableOpacity>
          );
        }}
      />

      {isUploading && (
        <View style={styles.uploadingOverlay}>
          <ActivityIndicator size="large" color="#007aff" />
          <Text style={{ color: '#007aff', marginTop: 10, fontWeight: 'bold' }}>Đang tải Story lên...</Text>
        </View>
      )}

      {/* =========================================
          MODAL 1: TẠO GHI CHÚ MỚI
      ========================================== */}
      <Modal visible={isNoteModalVisible} transparent animationType="fade" onRequestClose={() => setIsNoteModalVisible(false)}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalContent}>
              
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setIsNoteModalVisible(false)}><Text style={styles.modalCancelText}>Hủy</Text></TouchableOpacity>
                <Text style={styles.modalTitle}>Ghi chú mới</Text>
                <TouchableOpacity onPress={handleShareNote}><Text style={[styles.modalShareText, inputText.trim() === '' && { color: '#A0C4FF' }]}>Chia sẻ</Text></TouchableOpacity>
              </View>

              <View style={styles.modalBody}>
                <View style={styles.modalAvatarContainer}>
                  <Image source={{ uri: getValidAvatar(userProfile?.imageUrl) }} style={styles.modalAvatar} />
                  <View style={styles.modalInputBubble}>
                    <TextInput style={styles.modalInput} placeholder="Chia sẻ suy nghĩ..." placeholderTextColor="#8e8e93" value={inputText} onChangeText={setInputText} maxLength={60} autoFocus multiline />
                  </View>
                </View>

                {/* NÚT MỞ CÀI ĐẶT GHI CHÚ */}
                <TouchableOpacity style={styles.settingsTriggerBtn} onPress={() => {
                  setTempPrivacy(selectedPrivacy);
                  setTempDuration(selectedDuration);
                  setIsSettingsVisible(true);
                }}>
                    <Ionicons name="settings-outline" size={16} color="#555" />
                    <Text style={styles.settingsTriggerText}>Cài đặt ghi chú</Text>
                </TouchableOpacity>
              </View>

            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* =========================================
          MODAL 2: CÀI ĐẶT GHI CHÚ (LÀM SẠCH UI)
      ========================================== */}
      <Modal visible={isSettingsVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setIsSettingsVisible(false)}>
          <View style={styles.settingsContainer}>
              <View style={styles.settingsHeader}>
                  <TouchableOpacity onPress={() => setIsSettingsVisible(false)}><Text style={styles.settingsCancelText}>Hủy</Text></TouchableOpacity>
                  <Text style={styles.settingsTitle}>Cài đặt ghi chú</Text>
                  <TouchableOpacity onPress={handleSaveSettings}><Text style={styles.settingsSaveText}>Lưu</Text></TouchableOpacity>
              </View>

              <ScrollView style={styles.settingsScroll}>
                  {/* Quyền riêng tư */}
                  <Text style={styles.sectionTitle}>Ai có thể xem ghi chú của bạn?</Text>
                  <View style={styles.sectionBlock}>
                      {['Công khai', 'Bạn bè'].map((item, index) => (
                          <TouchableOpacity key={index} style={styles.settingItem} onPress={() => setTempPrivacy(item)}>
                              <Text style={styles.settingItemTitle}>{item}</Text>
                              {tempPrivacy === item && <Ionicons name="checkmark" size={24} color="#007aff" />}
                          </TouchableOpacity>
                      ))}
                  </View>

                  {/* Thời gian hiển thị */}
                  <Text style={styles.sectionTitle}>Hiển thị ghi chú trong</Text>
                  <View style={styles.sectionBlock}>
                      {[24, 12, 6, 3].map((hours, index) => (
                          <TouchableOpacity key={index} style={styles.settingItem} onPress={() => setTempDuration(hours)}>
                              <Text style={styles.settingItemTitle}>{hours} giờ</Text>
                              {tempDuration === hours && <Ionicons name="checkmark" size={24} color="#007aff" />}
                          </TouchableOpacity>
                      ))}
                  </View>
              </ScrollView>
          </View>
      </Modal>

      {/* =========================================
          MODAL 3: XEM GHI CHÚ DẠNG POPUP Ở GIỮA MÀN HÌNH
      ========================================== */}
      <Modal visible={!!viewingNote} transparent animationType="fade" onRequestClose={() => setViewingNote(null)}>
        <TouchableOpacity style={styles.viewNoteOverlay} activeOpacity={1} onPress={() => setViewingNote(null)}>
          <TouchableWithoutFeedback>
            <View style={styles.viewNotePopup}>
              
              {/* Nút Tắt */}
              <TouchableOpacity style={styles.viewNoteCloseBtn} onPress={() => setViewingNote(null)}>
                <Ionicons name="close" size={24} color="#8e8e93" />
              </TouchableOpacity>

              {/* Avatar & Tên & Thời gian đăng */}
              <View style={styles.viewNoteProfileRow}>
                <Image source={{ uri: getValidAvatar(viewingNote?.user?.imageUrl || userProfile?.imageUrl) }} style={styles.viewNotePopupAvatar} />
                <View>
                  <Text style={styles.viewNotePopupName}>{viewingNote?.user?.first_name || userProfile?.username}</Text>
                  <Text style={styles.viewNotePopupTimeAgo}>Đã đăng: {formatTimeAgo(viewingNote?._creationTime)}</Text>
                </View>
              </View>

              {/* Bong bóng nội dung */}
              <View style={styles.viewNoteContentBubble}>
                 <Text style={styles.viewNoteContentText}>{viewingNote?.content}</Text>
              </View>

              {/* Thông tin Chi tiết: Quyền riêng tư & Thời gian hết hạn */}
              <View style={styles.viewNoteInfoBox}>
                <Text style={styles.viewNoteInfoText}>
                  <Ionicons name={viewingNote?.privacy === 'Bạn bè' ? 'people' : 'globe'} size={14} /> Chia sẻ với: {viewingNote?.privacy || 'Công khai'}
                </Text>
                <Text style={styles.viewNoteInfoText}>
                  <Ionicons name="time" size={14} /> Hết hạn sau: {getRemainingHours(viewingNote?.expiresAt)} giờ
                </Text>
              </View>

              {/* Các nút hành động (Chỉ hiện nút nếu là ghi chú của chính mình) */}
              {viewingNote?.userId === userProfile?._id && (
                <View style={styles.viewNoteActions}>
                  <TouchableOpacity style={styles.actionBtnEdit} onPress={() => {
                    setViewingNote(null);
                    handleOpenNoteModal(); // Mở lại modal viết ghi chú
                  }}>
                    <Ionicons name="create-outline" size={18} color="#fff" />
                    <Text style={styles.actionBtnTextEdit}>Thay ghi chú</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.actionBtnDelete} onPress={handleDeleteNoteFromView}>
                    <Ionicons name="trash-outline" size={18} color="red" />
                    <Text style={styles.actionBtnTextDelete}>Xóa</Text>
                  </TouchableOpacity>
                </View>
              )}

            </View>
          </TouchableWithoutFeedback>
        </TouchableOpacity>
      </Modal>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  // TỔNG QUAN APP
  container: { flex: 1, backgroundColor: '#fff' },
  headerWrapper: { backgroundColor: '#fff' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  headerTitleContainer: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#000' },
  spacer: { width: 24 },
  chevronIcon: { marginTop: 4, marginLeft: 4 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0f0f0', marginHorizontal: 16, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginTop: 5 },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 16, color: '#000' },
  notesContainer: { paddingHorizontal: 16, paddingVertical: 15, gap: 16 },
  
  // NOTE & STORY ITEMS
  noteItem: { alignItems: 'center', width: 80 },
  avatarContainer: { position: 'relative', alignItems: 'center', height: 95 },
  storyRing: { borderRadius: 45, borderWidth: 2, borderColor: 'transparent', padding: 2 },
  storyRingActive: { borderColor: '#007aff' }, 
  noteAvatar: { width: 70, height: 70, borderRadius: 35 },
  addNoteBadge: { position: 'absolute', bottom: 12, right: 0, backgroundColor: '#8e8e93', borderRadius: 12, width: 24, height: 24, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff', zIndex: 20 },
  noteBubbleWrapper: { position: 'absolute', top: -15, left: '50%', transform: [{ translateX: -45 }], zIndex: 10, width: 90, alignItems: 'center' },
  noteBubble: { backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4, elevation: 5, minWidth: 70 },
  noteBubbleText: { fontSize: 12, color: '#000', textAlign: 'center', lineHeight: 16 },
  noteName: { fontSize: 12, color: '#8e8e93', textAlign: 'center', marginTop: -5 },
  elapsedTimeText: { fontSize: 11, color: '#8e8e93', marginTop: 2 },

  // CHAT LIST
  tabsContainer: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 15 },
  tabActive: { fontSize: 16, fontWeight: 'bold', color: '#000' },
  tabInactive: { fontSize: 16, fontWeight: '600', color: '#8e8e93' },
  listContent: { paddingBottom: 20 },
  chatRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10 },
  chatAvatar: { width: 60, height: 60, borderRadius: 30, marginRight: 12 },
  chatInfo: { flex: 1, justifyContent: 'center' },
  chatName: { fontSize: 15, color: '#000', marginBottom: 2 },
  messageRow: { flexDirection: 'row', alignItems: 'center' },
  lastMessage: { fontSize: 14, color: '#8e8e93', flexShrink: 1 },
  dot: { fontSize: 14, color: '#8e8e93' },
  timeText: { fontSize: 14, color: '#8e8e93' },
  emptyContainer: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#8e8e93', fontSize: 16 },
  cameraBtn: { paddingLeft: 10 },
  uploadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.8)', justifyContent: 'center', alignItems: 'center', zIndex: 999 },

  // TẠO GHI CHÚ
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '90%', backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  modalCancelText: { fontSize: 16, color: '#000' },
  modalTitle: { fontSize: 16, fontWeight: 'bold', color: '#000' },
  modalShareText: { fontSize: 16, color: '#007aff', fontWeight: 'bold' },
  modalBody: { padding: 30, alignItems: 'center', justifyContent: 'center', minHeight: 200 },
  modalAvatarContainer: { position: 'relative', alignItems: 'center' },
  modalAvatar: { width: 90, height: 90, borderRadius: 45 },
  modalInputBubble: { position: 'absolute', top: -50, backgroundColor: '#fff', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 5, minWidth: 120, maxWidth: 200 },
  modalInput: { fontSize: 14, color: '#000', textAlign: 'center', minHeight: 30 },
  settingsTriggerBtn: { flexDirection: 'row', alignItems: 'center', marginTop: 25, backgroundColor: '#f0f0f0', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20 },
  settingsTriggerText: { color: '#555', fontSize: 13, fontWeight: '600', marginLeft: 6 },

  // CÀI ĐẶT GHI CHÚ
  settingsContainer: { flex: 1, backgroundColor: '#f2f2f7' },
  settingsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 15, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e5ea' },
  settingsCancelText: { fontSize: 17, color: '#007aff' },
  settingsTitle: { fontSize: 17, fontWeight: '600', color: '#000' },
  settingsSaveText: { fontSize: 17, color: '#007aff', fontWeight: '600' },
  settingsScroll: { flex: 1 },
  sectionTitle: { fontSize: 14, color: '#6d6d72', paddingHorizontal: 16, marginTop: 25, marginBottom: 8 },
  sectionBlock: { backgroundColor: '#fff', borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#e5e5ea' },
  settingItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#c6c6c8' },
  settingItemTitle: { fontSize: 17, color: '#000' },

  // VIEW NOTE MODAL (CUSTOM POPUP CENTER)
  viewNoteOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  viewNotePopup: { width: '85%', backgroundColor: '#fff', borderRadius: 24, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 10 },
  viewNoteCloseBtn: { position: 'absolute', top: 15, right: 15, zIndex: 10, padding: 5 },
  viewNoteProfileRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  viewNotePopupAvatar: { width: 50, height: 50, borderRadius: 25, marginRight: 12 },
  viewNotePopupName: { fontSize: 18, fontWeight: 'bold', color: '#000', marginBottom: 2 },
  viewNotePopupTimeAgo: { fontSize: 13, color: '#8e8e93' },
  viewNoteContentBubble: { backgroundColor: '#f2f2f7', padding: 16, borderRadius: 16, marginBottom: 15 },
  viewNoteContentText: { fontSize: 16, color: '#000', lineHeight: 22 },
  viewNoteInfoBox: { backgroundColor: '#f9f9f9', padding: 12, borderRadius: 12, marginBottom: 20, gap: 6 },
  viewNoteInfoText: { fontSize: 14, color: '#555' },
  viewNoteActions: { flexDirection: 'row', gap: 10 },
  actionBtnEdit: { flex: 1, flexDirection: 'row', backgroundColor: '#007aff', paddingVertical: 12, borderRadius: 12, justifyContent: 'center', alignItems: 'center', gap: 6 },
  actionBtnTextEdit: { color: '#fff', fontSize: 15, fontWeight: '600' },
  actionBtnDelete: { flexDirection: 'row', backgroundColor: '#ffe5e5', paddingVertical: 12, paddingHorizontal: 15, borderRadius: 12, justifyContent: 'center', alignItems: 'center', gap: 4 },
  actionBtnTextDelete: { color: 'red', fontSize: 15, fontWeight: '600' }
});

export default MessagesScreen;