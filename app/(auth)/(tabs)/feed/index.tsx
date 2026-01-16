import { StyleSheet, TouchableOpacity, View, Image, RefreshControl, Text } from 'react-native';
import { usePaginatedQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Link, useNavigation, useRouter } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  runOnJS,
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

const Page = () => {
  const { results, status, loadMore } = usePaginatedQuery(
    api.messages.getThreads,
    {},
    { initialNumItems: 5 }
  );

  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const { top } = useSafeAreaInsets();
  const navigation = useNavigation();
  
  const scrollOffset = useSharedValue(0);
  const tabBarHeight = useBottomTabBarHeight();
  const isFocused = useIsFocused();

  const updateTabbar = () => {
    let newMarginBottom = 0;
    if (scrollOffset.value >= 0 && scrollOffset.value <= tabBarHeight) {
      newMarginBottom = -scrollOffset.value;
    } else if (scrollOffset.value > tabBarHeight) {
      newMarginBottom = -tabBarHeight;
    }
    // Kiểm tra navigation.getParent() tồn tại trước khi setOptions để tránh lỗi crash
    const parent = navigation.getParent();
    if (parent) {
      parent.setOptions({ tabBarStyle: { marginBottom: newMarginBottom } });
    }
  };

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      if (isFocused) {
        scrollOffset.value = event.contentOffset.y;
        runOnJS(updateTabbar)();
      }
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

  useFocusEffect(
    useCallback(() => {
      return () => {
        const parent = navigation.getParent();
        if (parent) {
          parent.setOptions({ tabBarStyle: { marginBottom: 0 } });
        }
      };
    }, [])
  );

  // --- XỬ LÝ SỰ KIỆN TÌM KIẾM ---
  const handleSearchPress = () => {
    // Điều hướng đến file search mới tạo ở thư mục (public)
    // Dùng 'as any' để bypass lỗi TypeScript nếu Expo chưa kịp cập nhật types
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
          
          {/* --- HEADER CHỨA LOGO VÀ NÚT SEARCH --- */}
          <View style={styles.headerContainer}>
            {/* View rỗng bên trái để cân bằng layout (giúp Logo nằm giữa) */}
            <View style={styles.headerSpacer} />
            
            <Image
              source={require('@/assets/images/KonKet-logo.png')}
              style={styles.logo}
            />

            {/* Nút Tìm kiếm bên phải */}
            <TouchableOpacity 
              onPress={handleSearchPress} 
              style={styles.iconButton}
            >
              <Ionicons name="search-outline" size={28} color="gray" />
            </TouchableOpacity>
          </View>
          {/* --- KẾT THÚC HEADER --- */}

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
    />
  );
};

export default Page;

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between', // Đẩy các phần tử ra xa nhau
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 10,
    height: 50,
  },
  logo: {
    width: 45, // Tăng kích thước logo một chút cho cân đối
    height: 45,
    resizeMode: 'contain',
  },
  iconButton: {
    width: 40, 
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-end', // Căn icon về phía bên phải
  },
  headerSpacer: {
    width: 40, // Bằng kích thước nút iconButton để Logo luôn ở giữa
  }
});