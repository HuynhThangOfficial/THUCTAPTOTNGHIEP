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

  // Scroll handler giữ lại nếu bạn muốn dùng animation sau này
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
    // Thực tế nên gọi refetch nếu convex hỗ trợ, hoặc chờ update
    setTimeout(() => {
      setRefreshing(false);
    }, 2000);
  };

  const handleSearchPress = () => {
    router.push('/(public)/search' as any);
  };

  return (
    <View style={styles.container}>
      {/* === PHẦN CỐ ĐỊNH (STICKY HEADER) ===
        Nằm ngoài FlatList nên sẽ luôn hiển thị ở trên cùng
      */}
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
           <View style={{alignItems: 'center', marginBottom: 8}}>
              <Text style={styles.channelNameText}>
                 #{activeChannelName}
              </Text>
           </View>
        )}

        {/* Hàng 3: Composer Preview (Nút đăng bài) */}
        {/* Giữ nguyên logic cũ: Bọc TouchableOpacity để push sang modal create */}
        <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => router.push('/(auth)/(modal)/create')}
            style={{ paddingHorizontal: 16, paddingBottom: 10 }}
        >
            <ThreadComposer isPreview />
        </TouchableOpacity>
      </View>

      {/* === PHẦN DANH SÁCH CUỘN (SCROLLABLE) ===
      */}
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
        // Bỏ paddingVertical: top vì Header đã handle việc này
        contentContainerStyle={{ paddingBottom: 20 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={{padding: 40, alignItems: 'center'}}>
              <Text style={{color: 'gray'}}>Chưa có bài viết nào trong kênh này.</Text>
          </View>
        }
      />
    </View>
  );
};

export default Page;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff', // Hoặc màu nền xám nhẹ nếu muốn tách biệt bài viết
  },
  // Style cho phần Header dính
  stickyHeader: {
    backgroundColor: '#fff',
    borderBottomColor: '#eee',
    zIndex: 100,
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
  channelNameText: {
    fontWeight: 'bold',
    fontSize: 14,
    color: '#007aff', // Màu xanh nổi bật hơn chút
    backgroundColor: '#f0f8ff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden'
  }
});