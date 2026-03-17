import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { Ionicons } from '@expo/vector-icons';
import ProfileSearchResult from '@/components/ProfileSearchResult';
import { useTranslation } from 'react-i18next'; // 👈 IMPORT DỊCH

export default function FollowListScreen() {
  const { userId, initialTab } = useLocalSearchParams();
  const router = useRouter();
  const { t } = useTranslation(); // 👈 KHỞI TẠO HOOK

  // 1. Cập nhật State để chấp nhận 3 giá trị: followers, following, friends
  const [activeTab, setActiveTab] = useState<'followers' | 'following' | 'friends'>(
    (initialTab as 'followers' | 'following' | 'friends') || 'followers'
  );
  const [searchQuery, setSearchQuery] = useState('');

  // 2. Gọi 3 API (bao gồm cả getFriends mới)
  const followers = useQuery(api.users.getFollowers, { userId: userId as Id<'users'> });
  const following = useQuery(api.users.getFollowing, { userId: userId as Id<'users'> });
  const friends = useQuery(api.users.getFriends, { userId: userId as Id<'users'> });

  // 3. Chọn danh sách hiển thị dựa trên Tab
  const dataList =
    activeTab === 'followers' ? followers :
    activeTab === 'following' ? following :
    friends;

  // 4. Logic tìm kiếm
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
           {activeTab === 'followers' ? t('follow_list.tab_followers') :
            activeTab === 'following' ? t('follow_list.tab_following') : t('follow_list.tab_friends')}
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
          <Text style={[styles.tabCount, activeTab === 'followers' && styles.activeTabText]}>
            {followers ? followers.length : 0}
          </Text>
          <Text style={[styles.tabLabel, activeTab === 'followers' && styles.activeTabText]}>
            {t('follow_list.tab_followers')}
          </Text>
        </TouchableOpacity>

        {/* Tab 2: Following */}
        <TouchableOpacity
          style={[styles.tab, activeTab === 'following' && styles.activeTab]}
          onPress={() => setActiveTab('following')}
        >
          <Text style={[styles.tabCount, activeTab === 'following' && styles.activeTabText]}>
            {following ? following.length : 0}
          </Text>
          <Text style={[styles.tabLabel, activeTab === 'following' && styles.activeTabText]}>
            {t('follow_list.tab_following')}
          </Text>
        </TouchableOpacity>

        {/* Tab 3: Friends (MỚI) */}
        <TouchableOpacity
          style={[styles.tab, activeTab === 'friends' && styles.activeTab]}
          onPress={() => setActiveTab('friends')}
        >
          <Text style={[styles.tabCount, activeTab === 'friends' && styles.activeTabText]}>
            {friends ? friends.length : 0}
          </Text>
          <Text style={[styles.tabLabel, activeTab === 'friends' && styles.activeTabText]}>
            {t('follow_list.tab_friends')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* --- SEARCH BAR --- */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="gray" style={styles.searchIcon} />
        <TextInput
          placeholder={t('follow_list.search_placeholder')}
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
                ? t('follow_list.empty_friends')
                : t('follow_list.empty_list')}
            </Text>
          }
          contentContainerStyle={{ paddingBottom: 20 }}
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
    marginTop: 30, // Hoặc dùng SafeAreaView
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  backBtn: { padding: 5 },

  tabContainer: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#eee' },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 10, justifyContent: 'center' },
  activeTab: { borderBottomWidth: 2, borderBottomColor: 'black' },

  // Style chữ cho Tab gọn gàng hơn
  tabCount: { fontSize: 16, fontWeight: 'bold', color: 'gray', marginBottom: 2 },
  tabLabel: { fontSize: 12, color: 'gray', fontWeight: '500' },
  activeTabText: { color: 'black' },

  searchContainer: {
    margin: 16, flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f0f0f0', borderRadius: 10, paddingHorizontal: 10, height: 40
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1 },
  emptyText: { textAlign: 'center', marginTop: 30, color: 'gray' }
});