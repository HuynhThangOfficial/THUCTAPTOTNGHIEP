import { View, Text, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, StyleSheet, Image } from 'react-native';
import React, { useState } from 'react';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { Ionicons } from '@expo/vector-icons';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// --- HÀM XỬ LÝ TRẠNG THÁI HOẠT ĐỘNG ---
const formatLastSeen = (timestamp?: number) => {
  if (!timestamp) return 'Đang hoạt động'; // Mặc định nếu không có dữ liệu
  
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);

  // 1. Dưới 1 phút
  if (diffMins < 1) return 'Đang hoạt động';
  
  // 2. Dưới 60 phút
  if (diffMins < 60) return `Hoạt động ${diffMins} phút trước`;
  
  // 3. Dưới 24 giờ (Kiểm tra xem có phải hôm qua không)
  if (diffHours < 24) {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.getDate() === yesterday.getDate()) {
       return 'Hoạt động hôm qua';
    }
    return `Hoạt động ${diffHours} giờ trước`;
  }

  // 4. Hôm qua (Trường hợp quá 24h nhưng vẫn nằm trong ngày hôm qua)
  const yesterdayStrict = new Date(now);
  yesterdayStrict.setDate(yesterdayStrict.getDate() - 1);
  if (date.getDate() === yesterdayStrict.getDate() && date.getMonth() === yesterdayStrict.getMonth()) {
     return 'Hoạt động hôm qua';
  }

  // 5. Cũ hơn (Hiển thị ngày tháng năm)
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `Hoạt động vào ${day}/${month}/${year}`;
};

const ChatRoom = () => {
  const { id } = useLocalSearchParams(); 
  const { userProfile } = useUserProfile();
  const router = useRouter();
  const [text, setText] = useState('');
  
  // Lấy chiều cao thanh trạng thái (tai thỏ / đục lỗ)
  const { top } = useSafeAreaInsets();

  const messages = useQuery(api.chat.getMessages, { conversationId: id as Id<'conversations'> });
  const otherUser = useQuery(api.chat.getConversationInfo, { conversationId: id as Id<'conversations'> });
  const send = useMutation(api.chat.sendMessage);

  const handleSend = async () => {
    if (!text.trim()) return;
    await send({ conversationId: id as Id<'conversations'>, content: text });
    setText('');
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* HEADER ĐÃ FIX PADDING ĐỂ KHÔNG ĐỤNG STATUS BAR */}
      <View style={[styles.header, { paddingTop: top + 10 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{top:10, bottom:10, left:10, right:10}}>
          <Ionicons name="chevron-back" size={28} color="#000" />
        </TouchableOpacity>
        
        {otherUser ? (
          <View style={styles.headerUserInfo}>
            <Image source={{ uri: otherUser.imageUrl || 'https://www.gravatar.com/avatar/?d=mp' }} style={styles.headerAvatar} />
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerName}>{otherUser.first_name} {otherUser.last_name}</Text>
              {/* HIỂN THỊ TRẠNG THÁI HOẠT ĐỘNG */}
<Text style={styles.statusText}>
                {formatLastSeen(otherUser.lastSeen)}
              </Text>
            </View>
          </View>
        ) : (
          <Text style={styles.headerName}>Đang tải...</Text>
        )}
      </View>

      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#f2f3f5' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FlatList
          data={messages}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ padding: 16, paddingBottom: 20 }}
          renderItem={({ item }) => {
            const isMe = item.senderId === userProfile?._id;
            return (
              <View style={[styles.bubble, isMe ? styles.myBubble : styles.theirBubble]}>
                <Text style={{ color: isMe ? '#fff' : '#000', fontSize: 15 }}>{item.content}</Text>
              </View>
            );
          }}
        />

        <View style={styles.inputContainer}>
          <TextInput 
            style={styles.input} 
            placeholder="Nhập tin nhắn..." 
            value={text} 
            onChangeText={setText} 
            multiline
          />
          <TouchableOpacity style={styles.sendBtn} onPress={handleSend}>
            <Ionicons name="send" size={18} color="#fff" style={{ marginLeft: 2 }} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 10, 
    paddingBottom: 12, 
    borderBottomWidth: 1, 
    borderColor: '#eee', 
    backgroundColor: '#fff' 
  },
  backBtn: { padding: 5, marginRight: 5 },
  headerUserInfo: { flexDirection: 'row', alignItems: 'center' },
  headerAvatar: { width: 40, height: 40, borderRadius: 20, marginRight: 12 },
  headerTextContainer: { flexDirection: 'column', justifyContent: 'center' },
  headerName: { fontSize: 16, fontWeight: 'bold' },
  statusText: { fontSize: 12, color: 'gray', marginTop: 2 }, // Style cho trạng thái hoạt động
  
  bubble: { padding: 12, borderRadius: 18, maxWidth: '75%', marginBottom: 8 },
  myBubble: { backgroundColor: '#007aff', alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  theirBubble: { backgroundColor: '#fff', alignSelf: 'flex-start', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: '#eee' },
  
  inputContainer: { flexDirection: 'row', padding: 10, paddingBottom: Platform.OS === 'ios' ? 20 : 10, backgroundColor: '#fff', borderTopWidth: 1, borderColor: '#eee', alignItems: 'center' },
  input: { flex: 1, backgroundColor: '#f0f0f0', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, marginRight: 10, fontSize: 15, maxHeight: 100 },
  sendBtn: { backgroundColor: '#007aff', width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' }
});

export default ChatRoom;