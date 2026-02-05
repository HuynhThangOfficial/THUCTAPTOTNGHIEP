import { StyleSheet, TouchableOpacity, View, Image, RefreshControl, Text, FlatList } from 'react-native';
import { usePaginatedQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Link, useNavigation, useRouter } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
} from 'react-native-reanimated';
import Thread from '@/components/Thread';
import { Doc } from '@/convex/_generated/dataModel';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ThreadComposer from '@/components/ThreadComposer';
import { useState } from 'react';
import { useIsFocused } from '@react-navigation/native';
import { Colors } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { useMenu } from '@/context/MenuContext';
import { useChannel } from '@/context/ChannelContext';
import ChannelDetailsModal from '@/components/ChannelDetailsModal';

const Page = () => {
  const { toggleMenu } = useMenu();
  const { activeChannelId, activeChannelName } = useChannel();

  const { results, status, loadMore } = usePaginatedQuery(
    api.messages.getThreads,
    { channelId: activeChannelId || undefined },
    { initialNumItems: 5 }
  );

  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const { top } = useSafeAreaInsets();

  // State quản lý Modal
  const [isChannelDetailVisible, setChannelDetailVisible] = useState(false);

  const scrollOffset = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollOffset.value = event.contentOffset.y;
    },
  });

  const onLoadmore = () => {
    if (status === 'CanLoadMore') loadMore(5);
  };

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 2000);
  };

  const handleSearchPress = () => {
    router.push('/(public)/search' as any);
  };

  return (
    <View style={styles.container}>

      {/* === PHẦN HEADER CỐ ĐỊNH (STICKY) === */}
      {/* Tăng zIndex lên 1000 để chắc chắn nó luôn nhận cảm ứng */}
      <View style={[styles.stickyHeader, { paddingTop: top + 10 }]}>

        {/* Hàng 1: Menu - Logo - Search */}
        <View style={styles.headerContainer}>
          <TouchableOpacity onPress={toggleMenu} style={styles.leftIconButton}>
            <Ionicons name="menu-outline" size={28} color="gray" />
          </TouchableOpacity>

          <Image
            source={require('@/assets/images/KonKet-logo.png')}
            style={styles.logo}
          />

          <TouchableOpacity
            onPress={handleSearchPress}
            style={styles.iconButton}
          >
            <Ionicons name="search-outline" size={28} color="gray" />
          </TouchableOpacity>
        </View>

        {/* Hàng 2: Tên Kênh */}
        {activeChannelName && (
           <TouchableOpacity
             style={styles.channelNameBtn} // Tach style ra
             onPress={() => {
                 setChannelDetailVisible(true);
             }}
             activeOpacity={0.6}
             hitSlop={{top: 10, bottom: 10, left: 50, right: 50}} // Mở rộng vùng bấm
           >
              <Text style={styles.channelNameText}>
                 #{activeChannelName} <Ionicons name="chevron-forward" size={12} color="#007aff" />
              </Text>
           </TouchableOpacity>
        )}

        {/* Hàng 3: Composer Preview (Nút đăng bài) */}
        <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => router.push('/(auth)/(modal)/create')}
            style={{ paddingHorizontal: 16, paddingBottom: 10 }}
        >
            <ThreadComposer isPreview />
        </TouchableOpacity>
      </View>

      {/* === PHẦN DANH SÁCH CUỘN (SCROLLABLE) === */}
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

      {/* === DI CHUYỂN MODAL XUỐNG CUỐI CÙNG === */}
      {/* Để đảm bảo không bị che khuất về mặt Logic View */}
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
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  // Style cho Header dính
  stickyHeader: {
    backgroundColor: '#fff',
    borderBottomColor: '#eee',
    zIndex: 1000,
    position: 'relative',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 5,
    height: 45,
  },
  logo: {
    width: 40,
    height: 40,
    resizeMode: 'contain',
  },
  iconButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  leftIconButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  channelNameBtn: {
    alignItems: 'center',
    marginBottom: 8,
    zIndex: 1001,
    paddingVertical: 5,
  },
  channelNameText: {
    fontWeight: 'bold',
    fontSize: 14,
    color: '#007aff',
    backgroundColor: '#f0f8ff',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden'
  }
});