import { View, StyleSheet, Text, TouchableOpacity, FlatList } from 'react-native';
import React, { useState } from 'react';
import { UserProfile } from '@/components/UserProfile';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/Colors';
import { usePaginatedQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useUserProfile } from '@/hooks/useUserProfile';
import Thread from '@/components/Thread';
import { Doc, Id } from '@/convex/_generated/dataModel';
import { Link, useRouter } from 'expo-router';

type ProfileProps = {
  userId?: Id<'users'>;
  showBackButton?: boolean;
};

export default function Profile({ userId, showBackButton = false }: ProfileProps) {
  const { top } = useSafeAreaInsets();
  const { userProfile } = useUserProfile();
  const router = useRouter();

  const targetUserId = userId || userProfile?._id;

  // 1. Quản lý trạng thái Tab hiện tại
  const [activeTab, setActiveTab] = useState<'posts' | 'replies' | 'reposts' | 'likes'>('posts');

  // 2. Fetch dữ liệu độc lập cho 3 Tab (Dùng 'skip' nếu chưa có targetUserId để tránh lỗi Convex)
  const { results: posts, loadMore: loadPosts } = usePaginatedQuery(
    api.messages.getThreads,
    targetUserId ? { userId: targetUserId, filterType: 'posts' } : 'skip',
    { initialNumItems: 10 }
  );

  const { results: replies, loadMore: loadReplies } = usePaginatedQuery(
    api.messages.getThreads,
    targetUserId ? { userId: targetUserId, filterType: 'replies' } : 'skip',
    { initialNumItems: 10 }
  );

  const { results: reposts, loadMore: loadReposts } = usePaginatedQuery(
    api.messages.getUserReposts,
    targetUserId ? { userId: targetUserId } : 'skip',
    { initialNumItems: 10 }
  );

  const { results: likes, loadMore: loadLikes } = usePaginatedQuery(
    api.messages.getFavoriteThreads,
    targetUserId ? { userId: targetUserId } : 'skip',
    { initialNumItems: 10 }
  );

  // 3. Hàm quyết định dữ liệu nào sẽ được FlatList hiển thị
  const getActiveData = () => {
    switch (activeTab) {
      case 'posts': return posts;
      case 'replies': return replies;
      case 'reposts': return reposts;
      case 'likes': return likes;
      default: return [];
    }
  };

  // 4. Hàm xử lý load thêm dữ liệu khi cuộn xuống đáy
  const handleLoadMore = () => {
    if (activeTab === 'posts') loadPosts(10);
    if (activeTab === 'replies') loadReplies(10);
    if (activeTab === 'reposts') loadReposts(10);
    if (activeTab === 'likes') loadLikes(10);
  };

  // 5. Nội dung thông báo khi Tab trống
  const getEmptyText = () => {
    if (activeTab === 'posts') return 'Chưa có bài đăng nào.';
    if (activeTab === 'replies') return 'Chưa có bình luận nào.';
    if (activeTab === 'reposts') return 'Chưa đăng lại bài nào.';
    if (activeTab === 'likes') {
      const isMyProfile = userProfile?._id === targetUserId;
      return isMyProfile ? 'Bạn chưa yêu thích bài viết nào.' : 'Người này không công khai mục yêu thích.';
    }
    return '';
  };

  return (
    <View style={[styles.container, { paddingTop: top }]}>
      <FlatList
        data={getActiveData()}
        keyExtractor={(item) => item._id}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        renderItem={({ item }) => (
          <Link href={`/feed/${item._id}`} asChild>
<TouchableOpacity>
      <Thread 
        thread={item as any} 
        viewContext={
          activeTab === 'replies' ? 'profileReplies' : 
          activeTab === 'reposts' ? 'profileReposts' : 
          'profile'
        } 
      />
    </TouchableOpacity>
          </Link>
        )}
        ListEmptyComponent={
          <Text style={styles.tabContentText}>{getEmptyText()}</Text>
        }
        ItemSeparatorComponent={() => (
          <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: Colors.border }} />
        )}
        ListHeaderComponent={
          // 👇 ĐÃ THAY <> BẰNG VIEW TẠI ĐÂY ĐỂ FIX LỖI KHOẢNG TRẮNG 👇
          <View style={{ backgroundColor: 'white' }}>
            <UserProfile 
              userId={targetUserId} 
              onSettingsPress={() => router.push('/(auth)/settings' as any)}
              showBackButton={showBackButton} 
            />
            
            <View style={styles.tabContainer}>
              <TouchableOpacity 
                style={[styles.tab, activeTab === 'posts' && styles.activeTab]} 
                onPress={() => setActiveTab('posts')}
              >
                <Text style={[styles.tabText, activeTab === 'posts' && styles.activeTabText]}>
                  Bài đăng
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.tab, activeTab === 'replies' && styles.activeTab]} 
                onPress={() => setActiveTab('replies')}
              >
                <Text style={[styles.tabText, activeTab === 'replies' && styles.activeTabText]}>
                  Bình luận
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.tab, activeTab === 'reposts' && styles.activeTab]} 
                onPress={() => setActiveTab('reposts')}
              >
                <Text style={[styles.tabText, activeTab === 'reposts' && styles.activeTabText]}>
                  Đăng lại
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.tab, activeTab === 'likes' && styles.activeTab]} 
                onPress={() => setActiveTab('likes')}
              >
                <Text style={[styles.tabText, activeTab === 'likes' && styles.activeTabText]}>
                  Yêu thích
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: 'white', flex: 1 },
  tabContentText: { 
    fontSize: 16, 
    marginVertical: 40, 
    color: Colors.border, 
    alignSelf: 'center' 
  },
  // CSS Cho Thanh Tabs
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTab: {
    borderBottomWidth: 1.5,
    borderBottomColor: 'black', // Viền đen đặc trưng của Threads
  },
  tabText: {
    fontSize: 15,
    color: '#999', // Chữ xám mờ khi không chọn
    fontWeight: '500',
  },
  activeTabText: {
    color: 'black',
    fontWeight: 'bold', // Chữ đen đậm khi được chọn
  },
});