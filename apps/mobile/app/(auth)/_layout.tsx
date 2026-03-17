import React, { useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter, useSegments } from 'expo-router'; // Thêm useSegments
import { TouchableOpacity, Text } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler'; // QUAN TRỌNG: Sửa lỗi Crash GestureDetector
import { ChannelProvider } from '@/context/ChannelContext'; // QUAN TRỌNG: Sửa lỗi Kênh
import { useUser } from '@clerk/clerk-expo'; // Thêm useUser để check thông tin đăng nhập

const Layout = () => {
  const router = useRouter();
  const segments = useSegments();
  const { user, isLoaded } = useUser();

useEffect(() => {
    if (!isLoaded || !user) return;

    // CHỈ CHẶN NẾU: Chưa có Tên hiển thị (firstName) HOẶC Chưa có ID (username)
    // Không chặn chữ "user_" nữa để người dùng dùng tên ngẫu nhiên cho nhanh
    const needsOnboarding = !user.firstName || !user.username;
    const inOnboarding = (segments as string[]).includes('onboarding');

    if (needsOnboarding && !inOnboarding) {
      router.replace('/(auth)/onboarding' as any);
    }
  }, [user, isLoaded, segments]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ChannelProvider>
        <Stack
          screenOptions={{ contentStyle: { backgroundColor: 'white' }, headerShadowVisible: false }}>

          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

          {/* 👇 KHAI BÁO MÀN HÌNH ONBOARDING (BƯỚC 5 CHO GMAIL) 👇 */}
          <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />

          {/* 👇 ĐIỂM DANH CÁC TRANG CHỨC NĂNG (VIP) Ở ĐÂY 👇 */}
          <Stack.Screen name="chat/[id]" options={{ title: 'Đoạn chat', headerTitleAlign: 'center' }} />
          <Stack.Screen name="search" options={{ title: 'Tìm kiếm', headerTitleAlign: 'center' }} />
          <Stack.Screen name="follow-list" options={{ title: 'Theo dõi', headerTitleAlign: 'center' }} />
          <Stack.Screen name="likes-list" options={{ title: 'Lượt thích', headerTitleAlign: 'center' }} />
          <Stack.Screen name="profile/[id]" options={{ title: 'Hồ sơ', headerTitleAlign: 'center' }} />
          <Stack.Screen name="settings" options={{ title: 'Cài đặt', headerTitleAlign: 'center' }} />
          {/* 👆 KẾT THÚC ĐIỂM DANH 👆 */}

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