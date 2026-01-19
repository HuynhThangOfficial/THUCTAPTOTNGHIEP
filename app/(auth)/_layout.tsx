import { Stack, useRouter } from 'expo-router';
import { TouchableOpacity, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

const Layout = () => {
  const router = useRouter();

  return (
    // GestureHandlerRootView cần thiết để cử chỉ hoạt động ở các lớp con
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack screenOptions={{ contentStyle: { backgroundColor: 'white' }, headerShadowVisible: false }}>

        {/* Màn hình chính (Tabs) - Header sẽ được ẩn để Tabs tự quản lý */}
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

        {/* --- CÁC MODAL (Quan trọng: Phải khai báo ở đây để router.push hoạt động) --- */}
        <Stack.Screen
          name="(modal)/create"
          options={{
            presentation: 'modal',
            title: 'Tạo bài đăng',
            headerRight: () => (
              <TouchableOpacity>
                <Ionicons name="ellipsis-horizontal-circle" size={24} color="#000" />
              </TouchableOpacity>
            ),
            headerShown: true, // Hiện header cho modal create
          }}
        />
        <Stack.Screen
          name="(modal)/edit-profile"
          options={{
            presentation: 'modal',
            title: 'Chỉnh sửa trang cá nhân',
            headerTitleAlign: 'center',
            headerLeft: () => (
              <TouchableOpacity onPress={() => router.dismiss()}>
                <Text>Huỷ</Text>
              </TouchableOpacity>
            ),
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="(modal)/reply/[id]"
          options={{
            presentation: 'modal',
            title: 'Reply',
            headerLeft: () => (
              <TouchableOpacity onPress={() => router.dismiss()}>
                <Text>Huỷ</Text>
              </TouchableOpacity>
            ),
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="(modal)/image/[url]"
          options={{
            presentation: 'fullScreenModal',
            headerShown: false,
          }}
        />
      </Stack>
    </GestureHandlerRootView>
  );
};
export default Layout;