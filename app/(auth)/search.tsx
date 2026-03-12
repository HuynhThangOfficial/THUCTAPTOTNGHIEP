import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ScrollView, Image, Alert } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { api } from '@/convex/_generated/api';
import { useQuery, useMutation } from 'convex/react';
import ProfileSearchResult from '@/components/ProfileSearchResult';
import { Colors } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { useChannel } from '@/context/ChannelContext';
import Thread from '@/components/Thread';

const SEARCH_TABS = [
  { id: 'users', label: 'Tìm người dùng' },
  { id: 'servers', label: 'Tìm máy chủ' },
  { id: 'channel_posts', label: 'Bài đăng trong kênh' },
  { id: 'server_posts', label: 'Bài đăng trong máy chủ' },
];

export default function SearchScreen() {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('users');
  const router = useRouter();

  const { activeChannelId, activeServerId, setActiveServerId, setActiveUniversityId, setActiveChannelId } = useChannel();
  const joinServerMutation = useMutation(api.university.joinServer);

  const userList = useQuery(api.users.searchUsers, search === '' ? 'skip' : { search });
  const serverList = useQuery(api.university.searchServers, search === '' ? 'skip' : { search });
  const channelPostList = useQuery(api.messages.searchMessages, (search === '' || !activeChannelId) ? 'skip' : { search, channelId: activeChannelId });
  const serverPostList = useQuery(api.messages.searchMessages, (search === '' || !activeServerId) ? 'skip' : { search, serverId: activeServerId });

  // 1. Hàm Xử lý khi nhấn nút TẠO THÀNH VIÊN MỚI (THAM GIA)
  const handleJoinServer = async (server: any) => {
      try {
        // Bước 1: Gọi API tham gia máy chủ
        await joinServerMutation({ serverId: server._id });

        // Bước 2: Đóng trang tìm kiếm ngay lập tức
        router.back();

        // Bước 3: Đợi 150ms để màn hình đóng hẳn và dữ liệu Backend kịp đồng bộ
        // rồi mới kích hoạt thanh Server (đảm bảo không bị chệch nhịp)
        setTimeout(() => {
          setActiveServerId(server._id);
          setActiveUniversityId(null as any);
          setActiveChannelId(null as any);
        }, 100);

      } catch (error: any) {
        Alert.alert("Lỗi", error.message);
      }
    };

  // 2. Hàm Xử lý khi nhấn vào tên Server ĐÃ THAM GIA RỒI
  const handleGoToServer = (server: any) => {
    // 👇 THỨ TỰ QUAN TRỌNG: BẬT SERVER LÊN TRƯỚC RỒI MỚI TẮT ĐẠI HỌC
    setActiveServerId(server._id);
    setActiveUniversityId(null as any);
    setActiveChannelId(null as any);

    router.back();
  };

  const renderServerItem = ({ item }: { item: any }) => (
    <View style={styles.resultItem}>

      {/* PHẦN BÊN TRÁI: ẢNH VÀ TÊN */}
      <TouchableOpacity
        style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}
        activeOpacity={item.isJoined ? 0.2 : 1}
        onPress={() => {
          if (item.isJoined) {
            handleGoToServer(item); // Chỉ cho phép đi tới nếu đã tham gia
          }
        }}
      >
        <Image source={{ uri: item.icon || 'https://via.placeholder.com/50' }} style={styles.serverAvatar} />
        <View style={{ flex: 1 }}>
          <Text style={styles.resultName}>{item.name}</Text>
          <Text style={styles.resultSub}>Máy chủ</Text>
        </View>
      </TouchableOpacity>

      {/* PHẦN BÊN PHẢI: NÚT HOẶC TRẠNG THÁI */}
      {item.isJoined ? (
         <View style={{ flexDirection: 'row', alignItems: 'center', paddingLeft: 10 }}>
            <Ionicons name="checkmark-circle" size={16} color="#2e8b57" />
            <Text style={{ color: '#2e8b57', marginLeft: 4, fontWeight: 'bold', fontSize: 12 }}>Đã tham gia</Text>
         </View>
      ) : (
         <TouchableOpacity
            style={{ backgroundColor: '#5865F2', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, marginLeft: 10 }}
            onPress={() => handleJoinServer(item)}
         >
            <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 13 }}>Tham gia</Text>
         </TouchableOpacity>
      )}
    </View>
  );

  const getListData = () => {
    switch (activeTab) {
      case 'users': return userList;
      case 'servers': return serverList;
      case 'channel_posts': return channelPostList;
      case 'server_posts': return serverPostList;
      default: return [];
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerTitle: () => (
            <View style={styles.searchBarWrapper}>
              <View style={styles.searchBarContainer}>
                <TextInput
                  style={styles.searchInput}
                  placeholder={`Tìm kiếm ${SEARCH_TABS.find(t => t.id === activeTab)?.label.toLowerCase().replace('tìm ', '')}`}
                  value={search}
                  onChangeText={setSearch}
                  autoFocus={true}
                  placeholderTextColor="gray"
                  returnKeyType="search"
                />
                {search.length > 0 && (
                  <TouchableOpacity onPress={() => setSearch('')} style={styles.clearButton}>
                    <Ionicons name="close-circle" size={18} color="gray" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ),
          headerTintColor: 'black',
          headerBackTitleVisible: false,
          headerShadowVisible: false,
          headerStyle: { backgroundColor: 'white' },
        }}
      />

      <View style={styles.tabsWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScrollContainer}>
          {SEARCH_TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <TouchableOpacity key={tab.id} style={[styles.tabButton, isActive && styles.activeTabButton]} onPress={() => { setActiveTab(tab.id); setSearch(''); }}>
                <Text style={[styles.tabText, isActive && styles.activeTabText]}>{tab.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <FlatList
        data={getListData()}
        keyExtractor={(item: any) => item._id}
        ItemSeparatorComponent={() => <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: Colors.border }} />}
        ListEmptyComponent={() => {
          if (activeTab === 'channel_posts' && !activeChannelId) return <Text style={styles.emptyText}>Vui lòng chọn một kênh trước khi tìm kiếm</Text>;
          if (activeTab === 'server_posts' && !activeServerId) return <Text style={styles.emptyText}>Vui lòng tham gia một máy chủ trước khi tìm kiếm</Text>;
          return <Text style={styles.emptyText}>{search === '' ? `Hãy ${SEARCH_TABS.find(t => t.id === activeTab)?.label.toLowerCase()}` : 'Không tìm thấy kết quả nào'}</Text>;
        }}
        renderItem={(props) => {
          if (activeTab === 'users') return <ProfileSearchResult key={props.item._id} user={props.item} />;
          if (activeTab === 'servers') return renderServerItem(props);
          if (activeTab === 'channel_posts' || activeTab === 'server_posts') return <Thread thread={props.item} />;
          return null;
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white' },
  searchBarWrapper: { flexDirection: 'row', alignItems: 'center', marginRight: 100, marginLeft: -20, flex: 1 },
  searchBarContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f2f3f5', borderRadius: 8, paddingHorizontal: 12, height: 38, width: '100%' },
  searchInput: { flex: 1, fontSize: 16, color: 'black', paddingVertical: 0 },
  clearButton: { marginLeft: 5 },
  emptyText: { fontSize: 16, textAlign: 'center', marginTop: 30, color: 'gray', paddingHorizontal: 20 },
  tabsWrapper: { backgroundColor: 'white', paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border },
  tabsScrollContainer: { paddingHorizontal: 15, gap: 10 },
  tabButton: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, backgroundColor: '#f2f3f5' },
  activeTabButton: { backgroundColor: '#e0eaff' },
  tabText: { fontSize: 14, color: '#4f5660', fontWeight: '500' },
  activeTabText: { color: '#5865F2', fontWeight: 'bold' },
  resultItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 15 },
  serverAvatar: { width: 44, height: 44, borderRadius: 12, marginRight: 15, backgroundColor: '#f2f3f5' },
  resultName: { fontSize: 16, fontWeight: 'bold', color: 'black' },
  resultSub: { fontSize: 13, color: 'gray', marginTop: 2 },
});