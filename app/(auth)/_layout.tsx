import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { TouchableOpacity, Text } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler'; // QUAN TRỌNG: Sửa lỗi Crash GestureDetector
import { ChannelProvider } from '@/context/ChannelContext'; // QUAN TRỌNG: Sửa lỗi Kênh

const Layout = () => {
  const router = useRouter();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ChannelProvider>
        <Stack
          screenOptions={{ contentStyle: { backgroundColor: 'white' }, headerShadowVisible: false }}>

          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

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
            }}
          />

          {/* Đăng ký màn hình Chỉnh sửa */}
          <Stack.Screen
            name="(modal)/edit/[editId]"
            options={{
              presentation: 'modal',
              title: 'Chỉnh sửa bài viết',
              headerLeft: () => (
                <TouchableOpacity onPress={() => router.dismiss()}>
                  <Text>Huỷ</Text>
                </TouchableOpacity>
              ),
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
      </ChannelProvider>
    </GestureHandlerRootView>
  );
};
export default Layout;