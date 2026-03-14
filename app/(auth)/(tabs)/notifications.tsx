import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useRouter, Stack } from 'expo-router';

export default function NotificationsScreen() {
  const notifications = useQuery(api.messages.getNotifications);
  const markRead = useMutation(api.messages.markNotificationRead);
  const router = useRouter();

  const handlePress = (item: any) => {
       markRead({ notificationId: item._id });

       if (item.type === 'post') {
         // 👇 TRUYỀN THÊM source: 'notifications' ĐỂ BÁO CHO TRANG CHI TIẾT BIẾT 👇
         router.push({
           pathname: `/(auth)/(tabs)/feed/${item.messageId}` as any,
           params: { source: 'notifications' }
         });
       }

       if (item.type === 'message') router.push(`/(auth)/(tabs)/messages`);
       if (item.type === 'follow') router.push(`/(public)/profile/${item.senderId}` as any);
    };

  if (notifications === undefined) return <ActivityIndicator style={{marginTop: 20}} />;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Thông báo', headerShadowVisible: false }} />
      <FlatList
         data={notifications}
         ListEmptyComponent={<Text style={styles.emptyText}>Chưa có thông báo nào.</Text>}
         keyExtractor={item => item._id}
         renderItem={({ item }) => {
            let actionText = '';

            // 👇 LOGIC HIỂN THỊ KÊNH VÀ SERVER Ở ĐÂY 👇
            if (item.type === 'post') {
              if (item.channelName && item.workspaceName) {
                actionText = `đã đăng bài trong #${item.channelName} • ${item.workspaceName}`;
              } else {
                actionText = `đã đăng một bài viết mới`;
              }
            }
            if (item.type === 'message') actionText = 'đã gửi tin nhắn cho bạn';
            if (item.type === 'follow') actionText = 'đã bắt đầu theo dõi bạn';

            return (
              <TouchableOpacity style={[styles.item, !item.isRead && styles.unread]} onPress={() => handlePress(item)}>
                <Image source={{ uri: item.sender?.imageUrl || 'https://via.placeholder.com/40' }} style={styles.avatar} />
                <View style={styles.content}>
                   <Text style={styles.text}>
                     <Text style={styles.bold}>{item.sender?.first_name} {item.sender?.last_name} </Text>
                     {actionText}
                   </Text>
                </View>
                {!item.isRead && <View style={styles.unreadDot} />}
              </TouchableOpacity>
            )
         }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  emptyText: { textAlign: 'center', marginTop: 30, color: 'gray', fontSize: 15 },
  item: { flexDirection: 'row', padding: 16, borderBottomWidth: 1, borderColor: '#f0f0f0', alignItems: 'center' },
  unread: { backgroundColor: '#eef2ff' }, // Nền xanh nhạt cho thông báo chưa đọc
  avatar: { width: 50, height: 50, borderRadius: 25, marginRight: 15 },
  content: { flex: 1 },
  text: { fontSize: 15, color: '#333', lineHeight: 22 },
  bold: { fontWeight: 'bold', color: '#000' },
  unreadDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#5865F2', marginLeft: 10 } // Chấm xanh bên phải
});