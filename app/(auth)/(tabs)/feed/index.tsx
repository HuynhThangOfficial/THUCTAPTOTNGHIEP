import { StyleSheet, TouchableOpacity, View, Image, RefreshControl, Text } from 'react-native';
import { usePaginatedQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Link, useNavigation, useRouter } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
} from 'react-native-reanimated';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import Thread from '@/components/Thread';
import { Doc } from '@/convex/_generated/dataModel';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ThreadComposer from '@/components/ThreadComposer';
import { useCallback, useState } from 'react';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import { Colors } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { useMenu } from '@/context/MenuContext'; // 1. Đảm bảo import này
import { useChannel } from '@/context/ChannelContext';

const Page = () => {
  const { toggleMenu } = useMenu(); // 2. Lấy hàm toggleMenu
  const { activeChannelId, activeChannelName } = useChannel();

  const { results, status, loadMore } = usePaginatedQuery(
    api.messages.getThreads,
    { channelId: activeChannelId || undefined },
    { initialNumItems: 5 }
  );

  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const { top } = useSafeAreaInsets();
  const navigation = useNavigation();

  const scrollOffset = useSharedValue(0);
  const isFocused = useIsFocused();

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollOffset.value = event.contentOffset.y;
    },
  });

  const onLoadmore = () => {
    loadMore(5);
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
      ListHeaderComponent={
        <View style={{ paddingBottom: 16 }}>

          {/* --- HEADER --- */}
          <View style={styles.headerContainer}>

            {/* 3. KHÔI PHỤC NÚT HAMBURGER TẠI ĐÂY */}
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

          {/* HIỂN THỊ TÊN KÊNH */}
          <View style={{alignItems: 'center', marginBottom: 10}}>
             <Text style={{fontWeight: 'bold', fontSize: 16, color: '#555'}}>
                #{activeChannelName}
             </Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => router.push('/(auth)/(modal)/create')}
          >
            <ThreadComposer isPreview />
          </TouchableOpacity>
        </View>
      }
      ItemSeparatorComponent={() => (
        <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: Colors.border }} />
      )}
      contentContainerStyle={{ paddingVertical: top }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      ListEmptyComponent={
        <View style={{padding: 20, alignItems: 'center'}}>
            <Text style={{color: 'gray'}}>Chưa có bài viết nào trong kênh này.</Text>
        </View>
      }
    />
  );
};

export default Page;

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 5,
    height: 50,
  },
  logo: {
    width: 45,
    height: 45,
    resizeMode: 'contain',
  },
  // Style cho nút bên phải (Search)
  iconButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  // 4. Style cho nút bên trái (Menu)
  leftIconButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  }
});