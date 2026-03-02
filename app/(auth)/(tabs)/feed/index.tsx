import { StyleSheet, TouchableOpacity, View, RefreshControl, Text, FlatList, Modal, TouchableWithoutFeedback } from 'react-native';
import { usePaginatedQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Link, useRouter } from 'expo-router';
import Animated, { useSharedValue, useAnimatedScrollHandler } from 'react-native-reanimated';
import Thread from '@/components/Thread';
import { Doc } from '@/convex/_generated/dataModel';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ThreadComposer from '@/components/ThreadComposer';
import { useState } from 'react';
import { Colors } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { useMenu } from '@/context/MenuContext';
import { useChannel } from '@/context/ChannelContext';
import ChannelDetailsModal from '@/components/ChannelDetailsModal';

const SORT_OPTIONS = [
  { id: 'newest', label: 'Mới nhất' },
  { id: 'trending', label: 'Xu Hướng' },
];

const Page = () => {
  const { toggleMenu } = useMenu();
  const { activeChannelId, activeChannelName } = useChannel();
  const { top } = useSafeAreaInsets();
  const router = useRouter();

  const [sortBy, setSortBy] = useState<'newest' | 'trending'>('newest');
  const [isSortModalVisible, setSortModalVisible] = useState(false);

  const { results, status, loadMore } = usePaginatedQuery(
    api.messages.getThreads,
    { channelId: activeChannelId || undefined, sortBy },
    { initialNumItems: 5 }
  );

  const [refreshing, setRefreshing] = useState(false);
  const [isChannelDetailVisible, setChannelDetailVisible] = useState(false);

  const scrollOffset = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => { scrollOffset.value = event.contentOffset.y; },
  });

  const onLoadmore = () => {
    if (status === 'CanLoadMore') loadMore(5);
  };

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 2000);
  };

  const handleSearchPress = () => router.push('/(public)/search' as any);

  const currentSortLabel = SORT_OPTIONS.find(opt => opt.id === sortBy)?.label;

  return (
    <View style={styles.container}>

      {/* === PHẦN HEADER CỐ ĐỊNH (ĐÃ BỎ LOGO, CHỈ CÓ 1 HÀNG) === */}
      <View style={[styles.stickyHeader, { paddingTop: top + 10 }]}>

        {/* Hàng 1: Menu - Tên Kênh - Search */}
        <View style={styles.headerContainer}>
          <TouchableOpacity onPress={toggleMenu} style={styles.leftIconButton}>
            <Ionicons name="menu-outline" size={28} color="gray" />
          </TouchableOpacity>

          {/* Tên Kênh ở giữa */}
          {activeChannelName ? (
            <TouchableOpacity
              style={styles.channelNameBtn}
              onPress={() => setChannelDetailVisible(true)}
              activeOpacity={0.6}
              hitSlop={{top: 10, bottom: 10, left: 20, right: 20}}
            >
                <Text style={styles.channelNameText}>
                  #{activeChannelName} <Ionicons name="chevron-forward" size={12} color="#007aff" />
                </Text>
            </TouchableOpacity>
          ) : (
             <View style={{flex: 1}} /> /* Spacer giữ chỗ */
          )}

          <TouchableOpacity onPress={handleSearchPress} style={styles.iconButton}>
            <Ionicons name="search-outline" size={28} color="gray" />
          </TouchableOpacity>
        </View>

        {/* Hàng 2: Ô đăng bài (Ẩn nếu là đại sảnh) */}
        {activeChannelName !== 'đại-sảnh' && (
          <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => router.push('/(auth)/(modal)/create')}
              style={{ paddingHorizontal: 16, paddingBottom: 10 }}
          >
              <ThreadComposer isPreview />
          </TouchableOpacity>
        )}
      </View>

      {/* === THANH SẮP XẾP BÀI VIẾT === */}
      <View style={styles.filterRow}>
         <Text style={styles.filterTitle}>Bài Viết</Text>
         <TouchableOpacity
            style={styles.sortDropdownBtn}
            onPress={() => setSortModalVisible(true)}
         >
            <Text style={styles.sortDropdownText}>{currentSortLabel}</Text>
            <Ionicons name="caret-down" size={14} color="gray" />
         </TouchableOpacity>
      </View>

      {/* === DANH SÁCH BÀI VIẾT === */}
      <Animated.FlatList
        showsVerticalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        data={results}
        renderItem={({ item }) => (
          <Link href={`/feed/${item._id}`} asChild>
            <TouchableOpacity>
              <Thread thread={item as Doc<'messages'> & { creator: Doc<'users'> }} />
            </TouchableOpacity>
          </Link>
        )}
        onEndReached={onLoadmore}
        onEndReachedThreshold={0.5}
        ItemSeparatorComponent={() => (
          // 👇 GIỮ ĐƯỜNG KẺ MỎNG NHƯ GIAO DIỆN CŨ 👇
          <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: Colors.border }} />
        )}
        contentContainerStyle={{ paddingBottom: 20 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={{padding: 40, alignItems: 'center'}}>
              <Text style={{color: 'gray'}}>Chưa có bài viết nào trong kênh này.</Text>
          </View>
        }
      />

      {/* === MODAL DROPDOWN SẮP XẾP === */}
      <Modal visible={isSortModalVisible} transparent animationType="fade">
         <TouchableWithoutFeedback onPress={() => setSortModalVisible(false)}>
            <View style={styles.modalOverlay}>
               <TouchableWithoutFeedback>
                  <View style={styles.dropdownMenu}>
                     {SORT_OPTIONS.map((option) => (
                        <TouchableOpacity
                           key={option.id}
                           style={[styles.dropdownItem, sortBy === option.id && styles.dropdownItemActive]}
                           onPress={() => {
                              setSortBy(option.id as any);
                              setSortModalVisible(false);
                           }}
                        >
                           <Text style={[styles.dropdownItemText, sortBy === option.id && styles.dropdownItemTextActive]}>
                              {option.label}
                           </Text>
                           {sortBy === option.id && (
                              <Ionicons name="checkmark" size={18} color="#007aff" />
                           )}
                        </TouchableOpacity>
                     ))}
                  </View>
               </TouchableWithoutFeedback>
            </View>
         </TouchableWithoutFeedback>
      </Modal>

      {/* === MODAL CHI TIẾT KÊNH === */}
      {activeChannelId && (
        <ChannelDetailsModal
           visible={isChannelDetailVisible}
           onClose={() => setChannelDetailVisible(false)}
           channelId={activeChannelId}
        />
      )}
    </View>
  );
};

export default Page;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },

  stickyHeader: { backgroundColor: '#fff', borderBottomColor: '#eee', zIndex: 1000, position: 'relative' },
  headerContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 5, height: 45 },
  iconButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-end' },
  leftIconButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-start' },

  channelNameBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', zIndex: 1001 },
  channelNameText: { fontWeight: 'bold', fontSize: 14, color: '#007aff', backgroundColor: '#f0f8ff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, overflow: 'hidden' },

  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#eee'
  },
  filterTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  sortDropdownBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f5f5f5', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, gap: 6 },
  sortDropdownText: { fontSize: 13, color: '#555', fontWeight: '500' },

  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.2)' },
  dropdownMenu: { width: 250, backgroundColor: 'white', borderRadius: 12, padding: 8, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 10, elevation: 5 },
  dropdownItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8 },
  dropdownItemActive: { backgroundColor: '#f0f8ff' },
  dropdownItemText: { fontSize: 15, color: '#333' },
  dropdownItemTextActive: { color: '#007aff', fontWeight: 'bold' }
});