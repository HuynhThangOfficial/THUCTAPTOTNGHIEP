import React from 'react';
import { Tabs, useRouter } from 'expo-router';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useAuth } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { usePush } from '@/hooks/usePush';
import * as Haptics from 'expo-haptics';
import Animated, { useAnimatedStyle, interpolate, Extrapolation, runOnJS } from 'react-native-reanimated';
import SideMenu from '@/components/SideMenu';
import { MenuProvider, useMenu } from '@/context/MenuContext';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useTranslation } from 'react-i18next'; // 👈 IMPORT DỊCH

// 👇 THÊM 2 IMPORT CỦA CONVEX 👇
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';

const CreateTabIcon = ({ color, size }: { color: string; size: number }) => (
  <View style={styles.createIconContainer}>
    <Ionicons name="add" size={size} color={color} />
  </View>
);

const TabsWithSwipe = () => {
  const { signOut, isSignedIn } = useAuth();
  const router = useRouter();
  const { t } = useTranslation(); // 👈 KHỞI TẠO HOOK

  usePush();
  // Hợp nhất logic useOnlineStatus từ cả 2 nhánh
  useOnlineStatus(isSignedIn);

  const { translateX, closeMenu } = useMenu();
  const MENU_WIDTH = 300;

  // 👇 GỌI API ĐẾM SỐ THÔNG BÁO CHƯA ĐỌC 👇
  const unreadCount = useQuery(api.messages.getUnreadNotificationsCount) || 0;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    borderRadius: interpolate(translateX.value, [0, MENU_WIDTH], [0, 20], Extrapolation.CLAMP),
    shadowOpacity: interpolate(translateX.value, [0, MENU_WIDTH], [0, 0.2], Extrapolation.CLAMP),
  }));

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, MENU_WIDTH], [0, 0.5], Extrapolation.CLAMP),
    display: translateX.value === 0 ? 'none' : 'flex',
    zIndex: 9999,
  }));

  return (
    <View style={styles.container}>
      <View style={styles.menuContainer}>
        <SideMenu />
      </View>

      <Animated.View style={[styles.mainContainer, animatedStyle]}>
        <Tabs
          screenOptions={{
            tabBarShowLabel: false,
            tabBarActiveTintColor: '#000',
          }}>
          <Tabs.Screen
            name="feed"
            options={{
              title: t('tabs.home'), // 👈 Dùng t()
              headerShown: false,
              tabBarIcon: ({ color, size, focused }) => (
                <Ionicons name={focused ? 'home' : 'home-outline'} size={size} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="messages"
            options={{
              title: t('tabs.messages'), // 👈 Dùng t()
              headerShown: false,
              tabBarIcon: ({ color, size, focused }) => (
                <Ionicons name={focused ? 'chatbubble-ellipses' : 'chatbubble-ellipses-outline'} size={size} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="create"
            options={{
              title: t('tabs.create'), // 👈 Dùng t()
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
            name="notifications"
            options={{
              title: t('tabs.notifications'), // 👈 Dùng t()
              // 👇 HIỂN THỊ CHẤM ĐỎ TRÊN TAB BAR 👇
              tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
              tabBarBadgeStyle: { backgroundColor: '#F23F42', fontSize: 10 }, // Đỏ chuẩn Discord
              tabBarIcon: ({ color, size, focused }) => (
                <Ionicons name={focused ? 'notifications' : 'notifications-outline'} size={size} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="profile"
            options={{
              title: t('tabs.profile'), // 👈 Dùng t()
              headerShown: false,
              tabBarIcon: ({ color, size, focused }) => (
                <Ionicons name={focused ? 'person' : 'person-outline'} size={size} color={color} />
              ),
            }}
          />
        </Tabs>

        <Animated.View style={[styles.overlay, overlayStyle]}>
          <TouchableOpacity
            style={{ flex: 1 }}
            onPress={() => runOnJS(closeMenu)()}
            activeOpacity={1}
          />
        </Animated.View>
      </Animated.View>
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
  container: { flex: 1, backgroundColor: '#1e1f22' },
  menuContainer: { position: 'absolute', top: 0, bottom: 0, left: 0, width: 300, zIndex: 0 },
  mainContainer: {
    flex: 1,
    backgroundColor: 'white',
    shadowColor: "#000",
    shadowOffset: { width: -5, height: 0 },
    shadowRadius: 10,
    elevation: 5,
    overflow: 'visible',
  },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'black' },
  createIconContainer: {
    backgroundColor: Colors.itemBackground,
    borderRadius: 8,
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
});