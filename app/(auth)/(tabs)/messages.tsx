import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useRouter } from 'expo-router';
import { Ionicons, Feather, FontAwesome6 } from '@expo/vector-icons';
import { useUserProfile } from '@/hooks/useUserProfile';

// --- HÀM RÚT GỌN THỜI GIAN CHUẨN INSTAGRAM (VD: 5 phút, 2 giờ, 4 tuần) ---
const formatTimeShort = (timestamp?: number) => {
  if (!timestamp) return '';
  const diffMs = Date.now() - timestamp;
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return 'Vừa xong';
  if (diffMins < 60) return `${diffMins} phút`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} giờ`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} ngày`;
  const diffWeeks = Math.floor(diffDays / 7);
  return `${diffWeeks} tuần`;
};

// --- DỮ LIỆU GIẢ LẬP CHO PHẦN GHI CHÚ (NOTES) ---
const MOCK_NOTES = [
  { id: '1', name: 'Vanessa Tran', note: 'gu tui mỹ đen lai mà bà @_sudauqu...', avatar: 'https://i.pravatar.cc/150?img=5' },
  { id: '2', name: 'Bản đồ', note: '', avatar: 'https://cdn-icons-png.flaticon.com/512/854/854878.png' },
];

const MessagesScreen = () => {
  const router = useRouter();
  const { userProfile } = useUserProfile();
  
  // Gọi API lấy danh sách hộp thư
  const inbox = useQuery(api.chat.getInbox);

  // --- COMPONENT HEADER CỦA FLATLIST (Chứa Search, Notes, Tabs) ---
  const ListHeader = () => {
    return (
      <View style={styles.headerWrapper}>
        {/* 1. THANH TÌM KIẾM */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#8e8e93" />
          <TextInput 
            style={styles.searchInput} 
            placeholder="Tìm kiếm hoặc hỏi Meta AI" 
            placeholderTextColor="#8e8e93"
          />
        </View>

        {/* 2. KHU VỰC GHI CHÚ (NOTES) */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.notesContainer}>
          {/* Ghi chú của tôi */}
          <TouchableOpacity style={styles.noteItem}>
            <View style={styles.avatarContainer}>
              <Image source={{ uri: userProfile?.imageUrl || 'https://www.gravatar.com/avatar/?d=mp' }} style={styles.noteAvatar} />
              <View style={styles.addNoteBadge}>
                <Ionicons name="add" size={14} color="#fff" />
              </View>
              <View style={styles.noteBubble}>
                <Text style={styles.noteBubbleText} numberOfLines={2}>Quan điểm không giống ai...</Text>
              </View>
            </View>
            <Text style={styles.noteName} numberOfLines={1}>Ghi chú của bạn</Text>
          </TouchableOpacity>

          {/* Các ghi chú khác */}
          {MOCK_NOTES.map((note) => {
            return (
              <TouchableOpacity key={note.id} style={styles.noteItem}>
                <View style={styles.avatarContainer}>
                  <Image source={{ uri: note.avatar }} style={styles.noteAvatar} />
                  
                  {/* Dùng toán tử điều kiện an toàn hơn để tránh rớt string */}
                  {note.note !== '' ? (
                    <View style={styles.noteBubble}>
                      <Text style={styles.noteBubbleText} numberOfLines={2}>{note.note}</Text>
                    </View>
                  ) : (
                    <View />
                  )}
                </View>
                <Text style={styles.noteName} numberOfLines={1}>{note.name}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* 3. TABS (Tin nhắn / Tin nhắn đang chờ) */}
        <View style={styles.tabsContainer}>
          <Text style={styles.tabActive}>Tin nhắn</Text>
          <Text style={styles.tabInactive}>Tin nhắn đang chờ</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      
      {/* === HEADER CHÍNH === */}
      <View style={styles.header}>
        <View style={styles.spacer} /> 
        <TouchableOpacity style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>{userProfile?.username || 'Đang tải...'}</Text>
          <Ionicons name="chevron-down" size={18} color="#000" style={styles.chevronIcon} />
        </TouchableOpacity>
        <TouchableOpacity>
          <FontAwesome6 name="pen-to-square" size={24} color="#000" />
        </TouchableOpacity>
      </View>

      {/* === DANH SÁCH HỘP THƯ === */}
      <FlatList
        data={inbox}
        keyExtractor={(item) => item._id}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Chưa có tin nhắn nào.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const isUnread = false; 
          const otherUser = item.otherUser;
          
          return (
            <TouchableOpacity 
              style={styles.chatRow}
              onPress={() => router.push(`/(public)/chat/${item._id}` as any)}
            >
              <Image 
                source={{ uri: otherUser?.imageUrl || 'https://www.gravatar.com/avatar/?d=mp' }} 
                style={styles.chatAvatar} 
              />
              
              <View style={styles.chatInfo}>
                <Text style={[styles.chatName, isUnread ? styles.textBold : null]}>
                  {otherUser ? `${otherUser.first_name} ${otherUser.last_name}` : 'Người dùng'}
                </Text>
                
                <View style={styles.messageRow}>
                  <Text 
                    style={[styles.lastMessage, isUnread ? styles.textBold : null, isUnread ? {color: '#000'} : null]} 
                    numberOfLines={1}
                  >
                    {item.lastMessageText || 'Đã gửi một tin nhắn'}
                  </Text>
                  <Text style={styles.dot}> · </Text>
                  <Text style={styles.timeText}>{formatTimeShort(item.updatedAt)}</Text>
                </View>
              </View>
              
              <TouchableOpacity style={styles.cameraBtn}>
                <Feather name="camera" size={24} color="#8e8e93" />
              </TouchableOpacity>
            </TouchableOpacity>
          );
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  headerWrapper: { backgroundColor: '#fff' },
  
  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  headerTitleContainer: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#000' },
  spacer: { width: 24 },
  chevronIcon: { marginTop: 4, marginLeft: 4 },
  
  // Search
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0f0f0', marginHorizontal: 16, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginTop: 5 },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 16, color: '#000' },
  
  // Notes
  notesContainer: { paddingHorizontal: 16, paddingVertical: 20, gap: 16 },
  noteItem: { alignItems: 'center', width: 80 },
  avatarContainer: { position: 'relative', marginBottom: 8 },
  noteAvatar: { width: 75, height: 75, borderRadius: 40 },
  addNoteBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#8e8e93', borderRadius: 12, width: 24, height: 24, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
  noteBubble: { position: 'absolute', top: -15, left: -5, backgroundColor: '#fff', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3, maxWidth: 90 },
  noteBubbleText: { fontSize: 11, color: '#000', textAlign: 'center' },
  noteName: { fontSize: 12, color: '#8e8e93', textAlign: 'center' },
  
  // Tabs
  tabsContainer: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 15 },
  tabActive: { fontSize: 16, fontWeight: 'bold', color: '#000' },
  tabInactive: { fontSize: 16, fontWeight: '600', color: '#8e8e93' },
  
  // Chat Row
  listContent: { paddingBottom: 20 },
  chatRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10 },
  chatAvatar: { width: 60, height: 60, borderRadius: 30, marginRight: 12 },
  chatInfo: { flex: 1, justifyContent: 'center' },
  chatName: { fontSize: 15, color: '#000', marginBottom: 2 },
  messageRow: { flexDirection: 'row', alignItems: 'center' },
  lastMessage: { fontSize: 14, color: '#8e8e93', flexShrink: 1 },
  dot: { fontSize: 14, color: '#8e8e93' },
  timeText: { fontSize: 14, color: '#8e8e93' },
  textBold: { fontWeight: 'bold' },
  cameraBtn: { paddingLeft: 10 },
  
  emptyContainer: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#8e8e93', fontSize: 16 }
});

export default MessagesScreen;