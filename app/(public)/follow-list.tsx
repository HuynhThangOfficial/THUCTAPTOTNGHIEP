import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { Ionicons } from '@expo/vector-icons';
import ProfileSearchResult from '@/components/ProfileSearchResult';

export default function FollowListScreen() {
  const { userId, initialTab } = useLocalSearchParams();
  const router = useRouter();

  // 1. Cập nhật State để chấp nhận 3 giá trị
  const [activeTab, setActiveTab] = useState<'followers' | 'following' | 'friends'>(
    (initialTab as 'followers' | 'following' | 'friends') || 'followers'
  );
  const [searchQuery, setSearchQuery] = useState('');

  // 2. Gọi API lấy dữ liệu
  const followers = useQuery(api.users.getFollowers, { userId: userId as Id<'users'> });
  const following = useQuery(api.users.getFollowing, { userId: userId as Id<'users'> });
  const friends = useQuery(api.users.getFriends, { userId: userId as Id<'users'> }); // <--- Query mới

  // 3. Chọn danh sách hiển thị
  const dataList =
    activeTab === 'followers' ? followers :
    activeTab === 'following' ? following :
    friends;

  // 4. Lọc tìm kiếm
  const filteredData = dataList?.filter(user =>
    user.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.last_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* --- HEADER --- */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={26} color="black" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>
           {activeTab === 'followers' ? 'Người theo dõi' :
            activeTab === 'following' ? 'Đang theo dõi' : 'Bạn bè'}
        </Text>
        <View style={{ width: 26 }} />
      </View>

      {/* --- TABS (3 CỘT) --- */}
      <View style={styles.tabContainer}>
        {/* Tab 1: Followers */}
        <TouchableOpacity
          style={[styles.tab, activeTab === 'followers' && styles.activeTab]}
          onPress={() => setActiveTab('followers')}
        >
          <Text style={[styles.tabText, activeTab === 'followers' && styles.activeTabText]}>
            Người theo dõi
            <Text style={styles.countText}> {followers ? `(${followers.length})` : ''}</Text>
          </Text>
        </TouchableOpacity>

        {/* Tab 2: Following */}
        <TouchableOpacity
          style={[styles.tab, activeTab === 'following' && styles.activeTab]}
          onPress={() => setActiveTab('following')}
        >
          <Text style={[styles.tabText, activeTab === 'following' && styles.activeTabText]}>
            Đang theo dõi
            <Text style={styles.countText}> {following ? `(${following.length})` : ''}</Text>
          </Text>
        </TouchableOpacity>

        {/* Tab 3: Friends (Mới) */}
        <TouchableOpacity
          style={[styles.tab, activeTab === 'friends' && styles.activeTab]}
          onPress={() => setActiveTab('friends')}
        >
          <Text style={[styles.tabText, activeTab === 'friends' && styles.activeTabText]}>
            Bạn bè
            <Text style={styles.countText}> {friends ? `(${friends.length})` : ''}</Text>
          </Text>
        </TouchableOpacity>
      </View>

      {/* --- SEARCH BAR --- */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="gray" style={styles.searchIcon} />
        <TextInput
          placeholder="Tìm kiếm..."
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* --- DANH SÁCH --- */}
      {dataList === undefined ? (
        <ActivityIndicator style={{ marginTop: 20 }} size="large" color="black" />
      ) : (
        <FlatList
          data={filteredData}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => <ProfileSearchResult user={item} />}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              {activeTab === 'friends'
                ? 'Chưa có bạn bè nào (Follow chéo).'
                : 'Danh sách trống.'}
            </Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee',
    marginTop: 30,
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  backBtn: { padding: 5 },

  tabContainer: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#eee' },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 14 },
  activeTab: { borderBottomWidth: 2, borderBottomColor: 'black' },
  tabText: { color: 'gray', fontSize: 13, fontWeight: '500', textAlign: 'center' }, // Giảm font size xíu để vừa 3 cột
  activeTabText: { color: 'black', fontWeight: 'bold' },
  countText: { fontSize: 11, opacity: 0.7 }, // Style cho số đếm

  searchContainer: {
    margin: 16, flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f0f0f0', borderRadius: 10, paddingHorizontal: 10, height: 40
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1 },
  emptyText: { textAlign: 'center', marginTop: 30, color: 'gray' }
});

