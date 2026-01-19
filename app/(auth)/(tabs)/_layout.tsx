import React from 'react';
import { Tabs, useRouter } from 'expo-router';
import { StyleSheet, TouchableOpacity, Text, View } from 'react-native';
import { useAuth } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { usePush } from '@/hooks/usePush';
import * as Haptics from 'expo-haptics';

// --- IMPORTS QUAN TRỌNG ---
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, runOnJS, interpolate, Extrapolation } from 'react-native-reanimated';
import SideMenu from '@/components/SideMenu';
import { MenuProvider, useMenu } from '@/context/MenuContext';

const CreateTabIcon = ({ color, size }: { color: string; size: number }) => (
  <View style={styles.createIconContainer}>
    <Ionicons name="add" size={size} color={color} />
  </View>
);

const TabsWithSwipe = () => {
  const { signOut } = useAuth();
  const router = useRouter();
  usePush();

  const { translateX, openMenu, closeMenu } = useMenu();
  const MENU_WIDTH = 300;

  // --- CẤU HÌNH CỬ CHỈ (GESTURE) ---
  const pan = Gesture.Pan()
    // QUAN TRỌNG: Chỉ kích hoạt khi ngón tay di chuyển NGANG ít nhất 20px.
    // Giúp App phân biệt được bạn đang muốn lướt Feed (dọc) hay mở Menu (ngang).
    .activeOffsetX([-20, 20])

    .onUpdate((event) => {
      // Tính toán vị trí menu khi đang kéo
      const newVal = event.translationX + (translateX.value > 0 ? MENU_WIDTH : 0);
      translateX.value = Math.max(0, Math.min(newVal, MENU_WIDTH));
    })
    .onEnd((event) => {
      // --- SỬA LỖI HOST OBJECT TẠI ĐÂY ---
      // Dùng runOnJS để gọi hàm từ Context một cách an toàn
      if (event.velocityX > 500 || translateX.value > MENU_WIDTH / 2) {
        runOnJS(openMenu)();
      } else {
        runOnJS(closeMenu)();
      }
    });

  // Animation trượt sang phải cho màn hình chính
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    borderRadius: interpolate(translateX.value, [0, MENU_WIDTH], [0, 20], Extrapolation.CLAMP),
    overflow: 'hidden',
  }));

  // Animation mờ dần cho lớp phủ đen
  const overlayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, MENU_WIDTH], [0, 0.5], Extrapolation.CLAMP),
    display: translateX.value === 0 ? 'none' : 'flex',
    zIndex: 9999,
  }));

  return (
    <View style={styles.container}>
      {/* 1. MENU NẰM DƯỚI */}
      <View style={styles.menuContainer}>
        <SideMenu />
      </View>

      {/* 2. TABS NẰM TRÊN (Bọc trong GestureDetector để nhận diện vuốt) */}
      <GestureDetector gesture={pan}>
        <Animated.View style={[styles.mainContainer, animatedStyle]}>
          <Tabs
            screenOptions={{
              tabBarShowLabel: false,
              tabBarActiveTintColor: '#000',
            }}>
            <Tabs.Screen
              name="feed"
              options={{
                title: 'Home',
                tabBarIcon: ({ color, size, focused }) => (
                  <Ionicons name={focused ? 'home' : 'home-outline'} size={size} color={color} />
                ),
                headerRight: () => (
                  <TouchableOpacity onPress={() => signOut()}>
                    <Text style={styles.logoutText}>Log out</Text>
                  </TouchableOpacity>
                ),
                headerShown: false,
              }}
            />
            <Tabs.Screen
              name="messages"
              options={{
                title: 'Messages',
                tabBarIcon: ({ color, size, focused }) => (
                  <Ionicons name={focused ? 'chatbubble-ellipses' : 'chatbubble-ellipses-outline'} size={size} color={color} />
                ),
                headerShown: false,
              }}
            />
            <Tabs.Screen
              name="create"
              options={{
                title: 'Create',
                tabBarIcon: ({ color, size }) => <CreateTabIcon color={color} size={size} />,
              }}
              listeners={{
                tabPress: (e) => {
                  e.preventDefault();
                  Haptics.selectionAsync();
                  router.push('/(modal)/create');
                },
              }}
            />
            <Tabs.Screen
              name="favorites"
              options={{
                title: 'Yêu thích',
                tabBarIcon: ({ color, size, focused }) => (
                  <Ionicons name={focused ? 'heart' : 'heart-outline'} size={size} color={color} />
                ),
              }}
            />
            <Tabs.Screen
              name="profile"
              options={{
                title: 'Profile',
                headerShown: false,
                tabBarIcon: ({ color, size, focused }) => (
                  <Ionicons name={focused ? 'person' : 'person-outline'} size={size} color={color} />
                ),
              }}
            />
          </Tabs>

          {/* Lớp phủ đen để đóng menu khi chạm vào */}
          <Animated.View style={[styles.overlay, overlayStyle]}>
            <TouchableOpacity style={{ flex: 1 }} onPress={() => runOnJS(closeMenu)()} activeOpacity={1} />
          </Animated.View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
};

const Layout = () => {
  return (
    <MenuProvider>
      <TabsWithSwipe />
    </MenuProvider>
  );
};

export default Layout;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1e1f22' }, // Nền tối phía sau menu
  menuContainer: { position: 'absolute', top: 0, bottom: 0, left: 0, width: 300, zIndex: 0 },
  mainContainer: { flex: 1, backgroundColor: 'white' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'black' },

  createIconContainer: {
    backgroundColor: Colors.itemBackground,
    borderRadius: 8,
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },

  logoutText: {
    marginRight: 10,
    color: Colors.primary,
    fontWeight: 'bold',
  },
});