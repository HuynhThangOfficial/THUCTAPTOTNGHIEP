import { StyleSheet, TouchableOpacity, View, RefreshControl, Text, Modal, TouchableWithoutFeedback, Switch, ScrollView } from 'react-native';
import { usePaginatedQuery, useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Link, useRouter } from 'expo-router';
import Animated, { useSharedValue, useAnimatedScrollHandler } from 'react-native-reanimated';
import Thread from '@/components/Thread';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ThreadComposer from '@/components/ThreadComposer';
import { useState } from 'react';
import { Colors } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { useMenu } from '@/context/MenuContext';
import { useChannel } from '@/context/ChannelContext';
import ChannelDetailsModal from '@/components/ChannelDetailsModal';

const SORT_OPTIONS = [{ id: 'newest', label: 'Mới nhất' }, { id: 'trending', label: 'Xu Hướng' }];

const Page = () => {
  const { toggleMenu } = useMenu();
  const { activeChannelId, activeChannelName, activeServerId, activeUniversityId } = useChannel();
  const { top } = useSafeAreaInsets();
  const router = useRouter();

  const [sortBy, setSortBy] = useState<'newest' | 'trending'>('newest');
  const [isSortModalVisible, setSortModalVisible] = useState(false);
  const [isBellModalVisible, setBellModalVisible] = useState(false);
  const [isAdvancedSettingsVisible, setAdvancedSettingsVisible] = useState(false);

  // Status thông báo
  const subStatus = useQuery(api.messages.getSubscriptionStatus, activeChannelId ? {
    channelId: activeChannelId,
    serverId: activeServerId ?? undefined,
    universityId: activeUniversityId ?? undefined
  } : "skip");

  // Danh sách kênh cho phần tùy chỉnh
  const serverChannels = useQuery(api.messages.getServerChannelsWithSubStatus, (activeServerId || activeUniversityId) ? {
    serverId: activeServerId ?? undefined,
    universityId: activeUniversityId ?? undefined
  } : "skip");

  const toggleChannel = useMutation(api.messages.toggleChannelSubscription);
  const toggleServer = useMutation(api.messages.toggleServerSubscription);

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

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 2000);
  };

  const currentSortLabel = SORT_OPTIONS.find(opt => opt.id === sortBy)?.label;

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={[styles.stickyHeader, { paddingTop: top + 10 }]}>
        <View style={styles.headerContainer}>
          <TouchableOpacity onPress={toggleMenu} style={styles.leftIconButton}>
            <Ionicons name="menu-outline" size={28} color="gray" />
          </TouchableOpacity>

          {activeChannelName ? (
            <TouchableOpacity style={styles.channelNameBtn} onPress={() => setChannelDetailVisible(true)}>
                <Text style={styles.channelNameText}>
                  #{activeChannelName} <Ionicons name="chevron-forward" size={12} color="#007aff" />
                </Text>
            </TouchableOpacity>
          ) : (<View style={{flex: 1}} />)}

          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {activeChannelId && (
              <TouchableOpacity onPress={() => setBellModalVisible(true)} style={styles.iconButton}>
                <Ionicons
                  name={(subStatus?.channelSubbed || subStatus?.serverSubbed) ? "notifications" : "notifications-outline"}
                  size={26}
                  color={(subStatus?.channelSubbed || subStatus?.serverSubbed) ? "#007aff" : "gray"}
                />
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={() => router.push('/(public)/search' as any)} style={styles.iconButton}>
              <Ionicons name="search-outline" size={28} color="gray" />
            </TouchableOpacity>
          </View>
        </View>

        {activeChannelName !== 'đại-sảnh' && (
          <TouchableOpacity activeOpacity={0.9} onPress={() => router.push('/(auth)/(modal)/create')} style={{ paddingHorizontal: 16, paddingBottom: 10 }}>
              <ThreadComposer isPreview />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.filterRow}>
         <Text style={styles.filterTitle}>Bài Viết</Text>
         <TouchableOpacity style={styles.sortDropdownBtn} onPress={() => setSortModalVisible(true)}>
            <Text style={styles.sortDropdownText}>{currentSortLabel}</Text>
            <Ionicons name="caret-down" size={14} color="gray" />
         </TouchableOpacity>
      </View>

      <Animated.FlatList
        onScroll={scrollHandler}
        data={results}
        renderItem={({ item }) => (
          <Link href={`/feed/${item._id}`} asChild>
            <TouchableOpacity><Thread thread={item as any} /></TouchableOpacity>
          </Link>
        )}
        onEndReached={() => status === 'CanLoadMore' && loadMore(5)}
        ItemSeparatorComponent={() => <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: Colors.border }} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      />

      {/* MODAL 1: CÀI ĐẶT THÔNG BÁO (4 DÒNG CHÍNH) */}
        <Modal visible={isBellModalVisible} transparent animationType="fade">
          <TouchableWithoutFeedback onPress={() => setBellModalVisible(false)}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback>
                <View style={styles.bellMenu}>
                  <Text style={styles.modalTitle}>Cài đặt thông báo</Text>

                  {/* 1. KÊNH HIỆN TẠI */}
                  {activeChannelName !== 'đại-sảnh' && (
                    <TouchableOpacity
                      style={[styles.dropdownItem, subStatus?.channelSubbed && styles.dropdownItemActive]}
                      onPress={() => activeChannelId && toggleChannel({ channelId: activeChannelId })}
                    >
                      <Text style={[styles.dropdownItemText, subStatus?.channelSubbed && styles.dropdownItemTextActive]}>
                        Thông báo kênh này
                      </Text>
                      {subStatus?.channelSubbed && <Ionicons name="checkmark" size={18} color="#007aff" />}
                    </TouchableOpacity>
                  )}

                  {/* 2. BẬT NHANH TOÀN SERVER */}
                  <TouchableOpacity
                    style={styles.dropdownItem}
                    onPress={async () => {
                      const tid = activeServerId || activeUniversityId;
                      if (tid) {
                        await toggleServer({
                          serverId: activeServerId ?? undefined,
                          universityId: activeUniversityId ?? undefined,
                          action: "on"
                        });
                        setBellModalVisible(false);
                      }
                    }}
                  >
                    <Text style={styles.dropdownItemText}>Bật thông báo toàn Server</Text>
                    <Ionicons name="notifications-outline" size={18} color="gray" />
                  </TouchableOpacity>

                  {/* 3. TẮT NHANH TOÀN SERVER (MỚI THÊM) */}
                  <TouchableOpacity
                    style={styles.dropdownItem}
                    onPress={async () => {
                      const tid = activeServerId || activeUniversityId;
                      if (tid) {
                        await toggleServer({
                          serverId: activeServerId ?? undefined,
                          universityId: activeUniversityId ?? undefined,
                          action: "off"
                        });
                        setBellModalVisible(false);
                      }
                    }}
                  >
                    <Text style={[styles.dropdownItemText, { color: '#ff3b30' }]}>Tắt thông báo toàn Server</Text>
                    <Ionicons name="notifications-off-outline" size={18} color="#ff3b30" />
                  </TouchableOpacity>

                  {/* 4. TÙY CHỈNH CHI TIẾT */}
                  <TouchableOpacity
                    style={styles.dropdownItem}
                    onPress={() => { setBellModalVisible(false); setTimeout(() => setAdvancedSettingsVisible(true), 300); }}
                  >
                    <Text style={styles.dropdownItemText}>Tuỳ chỉnh từng kênh</Text>
                    <Ionicons name="chevron-forward" size={16} color="gray" />
                  </TouchableOpacity>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

      {/* MODAL 2: TÙY CHỈNH TỪNG KÊNH (ĐÃ THÊM CHẤM CHẤM CHO TÊN DÀI) */}
      <Modal visible={isAdvancedSettingsVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.bellMenu, { width: 320, maxHeight: '70%' }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15, alignItems: 'center' }}>
              <Text style={styles.modalTitle}>Thông báo từng kênh</Text>
              <TouchableOpacity onPress={() => setAdvancedSettingsVisible(false)}><Ionicons name="close-circle" size={26} color="#ccc" /></TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {serverChannels?.map((channel) => (
                <View key={channel._id} style={styles.channelSettingRow}>
                  {/* 👇 THÊM numberOfLines VÀ ellipsizeMode TẠI ĐÂY 👇 */}
                  <Text
                    style={styles.channelSettingName}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    #{channel.name}
                  </Text>
                  <Switch
                    value={channel.isSubscribed}
                    onValueChange={() => toggleChannel({ channelId: channel._id })}
                    trackColor={{ false: "#d3d3d3", true: "#007aff" }}
                  />
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL SẮP XẾP */}
      <Modal visible={isSortModalVisible} transparent animationType="fade">
         <TouchableWithoutFeedback onPress={() => setSortModalVisible(false)}>
            <View style={styles.modalOverlay}>
               <TouchableWithoutFeedback>
                  <View style={styles.sortMenu}>
                     {SORT_OPTIONS.map((option) => (
                        <TouchableOpacity key={option.id} style={[styles.dropdownItem, sortBy === option.id && styles.dropdownItemActive]} onPress={() => { setSortBy(option.id as any); setSortModalVisible(false); }}>
                           <Text style={[styles.dropdownItemText, sortBy === option.id && styles.dropdownItemTextActive]}>{option.label}</Text>
                           {sortBy === option.id && <Ionicons name="checkmark" size={18} color="#007aff" />}
                        </TouchableOpacity>
                     ))}
                  </View>
               </TouchableWithoutFeedback>
            </View>
         </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

export default Page;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  stickyHeader: { backgroundColor: '#fff', borderBottomColor: '#eee', zIndex: 1000 },
  headerContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, height: 45 },
  iconButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-end' },
  leftIconButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-start' },
  channelNameBtn: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  channelNameText: { fontWeight: 'bold', fontSize: 14, color: '#007aff', backgroundColor: '#f0f8ff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  filterRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#eee' },
  filterTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  sortDropdownBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f5f5f5', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, gap: 6 },
  sortDropdownText: { fontSize: 13, color: '#555', fontWeight: '500' },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)' },

  sortMenu: { width: '70%', backgroundColor: 'white', borderRadius: 16, padding: 12, elevation: 10 },
  bellMenu: { width: 280, backgroundColor: 'white', borderRadius: 16, padding: 12, elevation: 10 },

  modalTitle: { fontSize: 16, fontWeight: 'bold', textAlign: 'center' },
  dropdownItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, borderRadius: 10 },
  dropdownItemActive: { backgroundColor: '#f0f8ff' },
  dropdownItemText: { fontSize: 15, color: '#333' },
  dropdownItemTextActive: { color: '#007aff', fontWeight: 'bold' },
  channelSettingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0', paddingHorizontal: 8 },
  // 👇 THÊM flex: 1 ĐỂ TEXT TỰ CO GIÃN 👇
  channelSettingName: { fontSize: 16, color: '#333', fontWeight: '500', flex: 1, marginRight: 10 }
});