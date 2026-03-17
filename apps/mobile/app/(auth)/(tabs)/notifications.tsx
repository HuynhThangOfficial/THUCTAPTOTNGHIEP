import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator, Alert } from 'react-native';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

export default function NotificationsScreen() {
  const notifications = useQuery(api.messages.getNotifications);
  const markRead = useMutation(api.messages.markNotificationRead);
  const deleteNotif = useMutation(api.messages.deleteNotification); // Gọi API xóa 1 cái
  const deleteAllNotifs = useMutation(api.messages.deleteAllNotifications); // Gọi API xóa tất cả
  const router = useRouter();
  const { t } = useTranslation();

  const handlePress = (item: any) => {
       markRead({ notificationId: item._id });

       if (item.type === 'post') {
         router.push({
           pathname: `/(auth)/(tabs)/feed/${item.messageId}` as any,
           params: { source: 'notifications' }
         });
       }

       if (item.type === 'message') router.push(`/(auth)/(tabs)/messages`);

       // ĐÃ FIX LỖI UNMATCHED ROUTE: Dùng route profile bên trong Feed
       if (item.type === 'follow') router.push(`/(auth)/(tabs)/feed/profile/${item.senderId}` as any);
  };

  const handleClearAll = () => {
    Alert.alert(
      t('common.warning'),
      t('notifications.confirm_delete_all'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.confirm'), style: 'destructive', onPress: () => deleteAllNotifs() }
      ]
    );
  };

  if (notifications === undefined) return <ActivityIndicator style={{marginTop: 20}} />;

  return (
    <View style={styles.container}>
      {/* NÚT XÓA TẤT CẢ */}
      {notifications.length > 0 && (
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.clearAllBtn} onPress={handleClearAll}>
            <Ionicons name="trash-outline" size={16} color="#ff3b30" />
            <Text style={styles.clearAllText}>{t('notifications.delete_all')}</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
       data={notifications}
       keyExtractor={(item) => item._id}
       // 👇 1. Đã cập nhật key khi danh sách trống
       ListEmptyComponent={<Text style={styles.emptyText}>{t('notifications.empty')}</Text>}
       renderItem={({ item }) => {
          let actionText = '';

          // 👇 2. Cập nhật logic nhận diện ngôn ngữ theo chuẩn JSON mới của bạn
          if (item.type === 'post') {
            if (item.channelName) {
              actionText = t('notifications.posted_in_channel', {
                channelName: item.channelName,
                workspaceName: item.workspaceName || '' // Phòng hờ trường hợp chưa có tên workspace
              });
            } else {
              actionText = t('notifications.posted_new');
            }
          }

          if (item.type === 'message') {
            actionText = t('notifications.sent_message');
          }

          if (item.type === 'follow') {
            actionText = t('notifications.started_following');
          }

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

              {/* NÚT XÓA TỪNG THÔNG BÁO */}
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => deleteNotif({ notificationId: item._id })}
              >
                <Ionicons name="close" size={20} color="#a0a0a0" />
              </TouchableOpacity>
            </TouchableOpacity>
          )
       }}
    />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  headerRow: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 5 },
  clearAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, padding: 6, backgroundColor: '#ffebe9', borderRadius: 8 },
  clearAllText: { fontSize: 13, color: '#ff3b30', fontWeight: '600' },
  emptyText: { textAlign: 'center', marginTop: 30, color: 'gray', fontSize: 15 },
  item: { flexDirection: 'row', padding: 16, borderBottomWidth: 1, borderColor: '#f0f0f0', alignItems: 'center' },
  unread: { backgroundColor: '#eef2ff' },
  avatar: { width: 50, height: 50, borderRadius: 25, marginRight: 15 },
  content: { flex: 1, paddingRight: 10 },
  text: { fontSize: 15, color: '#333', lineHeight: 20 },
  bold: { fontWeight: 'bold' },
  unreadDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#007aff', marginLeft: 10 },
  deleteBtn: { padding: 5, marginLeft: 5 },
});