import { StyleSheet, Text, View, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import React, { useState } from 'react';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { Colors } from '@/constants/Colors';
import ProfileSearchResult from '@/components/ProfileSearchResult'; // Tái sử dụng component hiển thị user

// Định nghĩa các loại Tab
type TabType = 'followers' | 'following' | 'friends';

const FollowListPage = () => {
  const { userId, initialTab } = useLocalSearchParams<{ userId: string, initialTab: TabType }>();
  const [activeTab, setActiveTab] = useState<TabType>(initialTab || 'followers');
  const router = useRouter();

  // 1. Gọi cả 3 API (Convex sẽ tự cache, không lo chậm)
  const followers = useQuery(api.users.getFollowers, { userId: userId as Id<'users'> });
  const following = useQuery(api.users.getFollowing, { userId: userId as Id<'users'> });
  const friends = useQuery(api.users.getFriends, { userId: userId as Id<'users'> }); // <--- Query mới

  // 2. Chọn dữ liệu hiển thị dựa trên Tab
  const data = 
    activeTab === 'followers' ? followers :
    activeTab === 'following' ? following :
    friends;

  const isLoading = data === undefined;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerTitle: userTitle(activeTab), headerShadowVisible: false }} />
      
      {/* --- THANH TAB --- */}
      <View style={styles.tabContainer}>
        <TabButton 
          title="Người theo dõi" 
          count={followers?.length} 
          isActive={activeTab === 'followers'} 
          onPress={() => setActiveTab('followers')} 
        />
        <TabButton 
          title="Đang theo dõi" 
          count={following?.length} 
          isActive={activeTab === 'following'} 
          onPress={() => setActiveTab('following')} 
        />
        <TabButton 
          title="Bạn bè" 
          count={friends?.length} 
          isActive={activeTab === 'friends'} 
          onPress={() => setActiveTab('friends')} 
        />
      </View>

      {/* --- DANH SÁCH --- */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#000" />
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <ProfileSearchResult user={item} />
          )}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText}>Chưa có ai trong danh sách này</Text>
            </View>
          }
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      )}
    </View>
  );
};

// Component con: Nút Tab
const TabButton = ({ title, count, isActive, onPress }: { title: string, count?: number, isActive: boolean, onPress: () => void }) => (
  <TouchableOpacity 
    style={[styles.tabButton, isActive && styles.activeTabButton]} 
    onPress={onPress}
  >
    <Text style={[styles.tabText, isActive && styles.activeTabText]}>
      {title} <Text style={{ fontSize: 12, opacity: 0.7 }}>{count !== undefined ? `(${count})` : ''}</Text>
    </Text>
  </TouchableOpacity>
);

// Helper: Đổi tiêu đề Header
const userTitle = (tab: TabType) => {
  switch (tab) {
    case 'followers': return 'Người theo dõi';
    case 'following': return 'Đang theo dõi';
    case 'friends': return 'Bạn bè';
    default: return 'Danh sách';
  }
};

export default FollowListPage;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTabButton: {
    borderBottomColor: '#000', // Gạch chân màu đen khi active
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'gray',
  },
  activeTabText: {
    color: '#000',
    fontWeight: 'bold',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 50,
  },
  emptyText: {
    color: 'gray',
    fontSize: 15,
  },
});