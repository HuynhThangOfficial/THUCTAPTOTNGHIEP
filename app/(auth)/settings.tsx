import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, Share, Linking, Switch, Modal, FlatList, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { useAuth, useClerk, useUser } from '@clerk/clerk-expo';
import { useRouter, Stack } from 'expo-router';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';

export default function SettingsScreen() {
  const { signOut } = useAuth();
  const { client, setActive } = useClerk();
  const { user } = useUser();
  const router = useRouter();
  
  const [isAccountModalVisible, setAccountModalVisible] = useState(false);

  // 1. Lấy dữ liệu và Mutation từ Convex
  const userProfile = useQuery(api.users.current);
  const updateActiveStatus = useMutation(api.users.updateActiveStatus);

  // 2. Chức năng Đăng xuất
  const handleLogout = () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc chắn muốn đăng xuất khỏi KonKet?', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Đăng xuất', style: 'destructive', onPress: () => {
          router.dismissAll(); 
          signOut();
      }},
    ]);
  };

  // 3. Chức năng Xóa tài khoản
  const handleDeleteAccount = () => {
    Alert.alert(
      'Cảnh báo nguy hiểm', 
      'Hành động này sẽ xóa vĩnh viễn dữ liệu của bạn và không thể khôi phục. Bạn vẫn muốn tiếp tục?', 
      [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Xóa vĩnh viễn', style: 'destructive', onPress: () => {
            Alert.alert("Thông báo", "Vui lòng liên hệ Admin để thực hiện xóa tài khoản an toàn.");
        }},
      ]
    );
  };

  // 4. Chức năng Chia sẻ hồ sơ
  const handleShareProfile = async () => {
    try {
      const profileLink = `https://konket.app/profile/${userProfile?.username || userProfile?._id}`;
      await Share.share({
        message: `Hãy kết nối với mình trên mạng xã hội KonKet nhé! ${profileLink}`,
      });
    } catch (error) {
      console.log('Lỗi chia sẻ:', error);
    }
  };

  // 5. Mở Link Web
  const openWebLink = (url: string) => {
    Linking.openURL(url).catch(() => {
      Alert.alert('Lỗi', 'Không thể mở liên kết này lúc này.');
    });
  };

  // 6. Chuyển đổi tài khoản
  const handleSwitchAccount = async (sessionId: string) => {
    try {
      await setActive({ session: sessionId });
      setAccountModalVisible(false);
      router.replace('/(auth)/(tabs)/feed' as any);
    } catch (err) {
      Alert.alert("Lỗi", "Không thể chuyển đổi tài khoản.");
    }
  };

  const handleAddAccount = () => {
    setAccountModalVisible(false);
    // 👇 ĐÃ FIX ĐƯỜNG DẪN TỪ (public) THÀNH (auth) 👇
    router.push('/' as any); 
  };

  // Component render từng dòng cài đặt
  const SettingsItem = ({ icon, title, onPress, color = '#000', subTitle = "" }: any) => (
    <TouchableOpacity style={styles.itemContainer} onPress={onPress}>
      <Ionicons name={icon} size={24} color={color} style={styles.icon} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.itemText, { color }]}>{title}</Text>
        {subTitle ? <Text style={styles.subText}>{subTitle}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={20} color={Colors.border} style={styles.chevron} />
    </TouchableOpacity>
  );

  return (
    <>
      <Stack.Screen 
        options={{ 
          title: 'Cài đặt',
          headerTitleAlign: 'center',
          headerBackTitleVisible: false,
          headerShadowVisible: false,
        }} 
      />

      <ScrollView style={styles.container}>
        <View style={styles.section}>
          {/* TRẠNG THÁI HOẠT ĐỘNG */}
          <View style={styles.itemContainer}>
            <Ionicons 
              name="ellipse" 
              size={12} 
              color={userProfile?.showActiveStatus ? "#44b669" : "gray"} 
              style={[styles.icon, { marginLeft: 6, marginRight: 21 }]} 
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.itemText}>Trạng thái hoạt động</Text>
              <Text style={styles.subText}>Hiển thị khi bạn đang online</Text>
            </View>
            <Switch
              value={userProfile?.showActiveStatus ?? true}
              onValueChange={async (newValue) => {
                try {
                  await updateActiveStatus({ isEnabled: newValue });
                } catch (error) {
                  console.error("Lỗi cập nhật trạng thái:", error);
                }
              }}
              trackColor={{ false: "#d3d3d3", true: "#44b669" }}
              thumbColor="#fff"
            />
          </View>

          {/* CHUYỂN ĐỔI TÀI KHOẢN */}
          <SettingsItem 
            icon="people-circle-outline" 
            title="Chuyển đổi tài khoản" 
            subTitle={`Đang dùng: @${user?.username || 'user'}`}
            onPress={() => setAccountModalVisible(true)} 
          />
          
          <SettingsItem 
            icon="share-social-outline" 
            title="Chia sẻ hồ sơ" 
            onPress={handleShareProfile} 
          />
        </View>

        <View style={styles.section}>
          <SettingsItem 
            icon="book-outline" 
            title="Nguyên tắc cộng đồng" 
            onPress={() => openWebLink('https://www.google.com/search?q=nguyen+tac+cong+dong')} 
          />
          <SettingsItem 
            icon="document-text-outline" 
            title="Điều khoản dịch vụ" 
            onPress={() => openWebLink('https://www.google.com/search?q=dieu+khoan+dich+vu')} 
          />
          <SettingsItem 
            icon="shield-checkmark-outline" 
            title="Chính sách bảo mật" 
            onPress={() => openWebLink('https://www.google.com/search?q=chinh+sach+bao+mat')} 
          />
        </View>

        <View style={styles.section}>
          <SettingsItem 
            icon="log-out-outline" 
            title="Đăng xuất" 
            onPress={handleLogout} 
            color="red" 
          />
          <SettingsItem 
            icon="trash-outline" 
            title="Xóa tài khoản" 
            onPress={handleDeleteAccount} 
            color="red" 
          />
        </View>
        
        <Text style={styles.versionText}>KonKet Version 1.0.0 (Beta)</Text>
      </ScrollView>

      {/* MODAL CHUYỂN ĐỔI TÀI KHOẢN */}
      <Modal visible={isAccountModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.accountSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chuyển đổi tài khoản</Text>
              <TouchableOpacity onPress={() => setAccountModalVisible(false)}>
                <Ionicons name="close" size={24} color="black" />
              </TouchableOpacity>
            </View>

            <FlatList
              data={client.sessions}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => {
                if (!item.user) return null;
                return (
                  <TouchableOpacity 
                    style={styles.accountItem} 
                    onPress={() => handleSwitchAccount(item.id)}
                  >
                    <Image source={{ uri: item.user.imageUrl }} style={styles.accountAvatar} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.accountName}>
                        {item.user.fullName || item.user.username}
                      </Text>
                      <Text style={styles.accountEmail}>
                        {item.user.primaryEmailAddress?.emailAddress}
                      </Text>
                    </View>
                    {item.id === client.lastActiveSessionId && (
                      <Ionicons name="checkmark-circle" size={24} color="#007aff" />
                    )}
                  </TouchableOpacity>
                );
              }}
            />

            <TouchableOpacity style={styles.addAccountBtn} onPress={handleAddAccount}>
              <Ionicons name="add-circle-outline" size={24} color="#007aff" />
              <Text style={styles.addAccountText}>Thêm tài khoản khác</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f2f2f2' },
  section: { backgroundColor: '#fff', marginTop: 20, borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: Colors.border },
  itemContainer: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, backgroundColor: '#fff', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border },
  icon: { marginRight: 15 },
  itemText: { fontSize: 16, flex: 1 },
  subText: { fontSize: 12, color: 'gray', marginTop: 2 },
  chevron: { marginLeft: 'auto' },
  versionText: { textAlign: 'center', color: 'gray', fontSize: 12, marginVertical: 20 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  accountSheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 40, maxHeight: '60%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, borderBottomWidth: 0.5, borderBottomColor: '#eee' },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  accountItem: { flexDirection: 'row', alignItems: 'center', padding: 15, borderBottomWidth: 0.5, borderBottomColor: '#f9f9f9' },
  accountAvatar: { width: 45, height: 45, borderRadius: 22.5, marginRight: 15 },
  accountName: { fontSize: 16, fontWeight: '600' },
  accountEmail: { fontSize: 13, color: 'gray' },
  addAccountBtn: { flexDirection: 'row', alignItems: 'center', padding: 20, gap: 10 },
  addAccountText: { fontSize: 16, color: '#007aff', fontWeight: '600' },
});