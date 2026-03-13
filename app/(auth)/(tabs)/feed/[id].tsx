import {
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  View,
  Text,
  BackHandler, // 👇 ĐÃ THÊM: Xử lý nút Back cứng của Android
} from 'react-native';
import React, { useRef, useEffect } from 'react';
import { Link, useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import Thread from '@/components/Thread';
import { Id, Doc } from '@/convex/_generated/dataModel';
import Comments from '@/components/Comments';
import { Ionicons } from '@expo/vector-icons';
import { useUserProfile } from '@/hooks/useUserProfile';
import { Colors } from '@/constants/Colors';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';

const Page = () => {
  // Lấy dữ liệu từ màn hình trước truyền qua
  const { id, highlightCommentId, source } = useLocalSearchParams();
  
  // Đảm bảo source luôn là chuỗi (tránh lỗi mảng của Expo Router)
  const sourceStr = Array.isArray(source) ? source[0] : source;

  const thread = useQuery(api.messages.getThreadById, { messageId: id as Id<'messages'> });
  const { userProfile } = useUserProfile();
  const tabBarHeight = useBottomTabBarHeight();
  const router = useRouter();
  const scrollViewRef = useRef<ScrollView>(null);

  // 1. TỰ ĐỘNG CUỘN XUỐNG BÌNH LUẬN
  useEffect(() => {
    if (highlightCommentId) {
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: 300, animated: true });
      }, 500);
    }
  }, [highlightCommentId]);

  // 👇 2. HÀM QUAY LẠI THÔNG MINH (Giữ nguyên State) 👇
  const handleSmartBack = () => {
    if (sourceStr === 'profile') {
      // Dùng NAVIGATE để quay về Tab Profile đang chạy ngầm, KHÔNG dùng PUSH
      router.navigate('/(auth)/(tabs)/profile');
    } else {
      router.back();
    }
  };

  // 👇 3. XỬ LÝ NÚT BACK VẬT LÝ TRÊN ANDROID 👇
  useEffect(() => {
    const onBackPress = () => {
      if (sourceStr === 'profile') {
        router.navigate('/(auth)/(tabs)/profile');
        return true; // Báo cho Android biết mình đã tự xử lý back
      }
      return false; // Trả lại quyền back mặc định
    };

    BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => BackHandler.removeEventListener('hardwareBackPress', onBackPress);
  }, [sourceStr]);

  return (
    // 👇 SỬA LỖI 1: Đổi flexGrow: 1 thành flex: 1 để giới hạn chiều cao bằng đúng màn hình
    <View style={{ flex: 1, backgroundColor: 'white' }}> 

      <Stack.Screen
        options={{
          headerTitle: 'Bài viết',
          headerShown: true, 
          headerShadowVisible: false,
          headerBackTitleVisible: false,
          headerTitleAlign: 'center',
          headerStyle: { backgroundColor: 'white' },
          headerLeft: () => (
            <TouchableOpacity onPress={handleSmartBack} style={{ paddingRight: 15, paddingLeft: 5 }}>
              <Ionicons name="arrow-back" size={24} color="black" />
            </TouchableOpacity>
          ),
        }}
      />

      {/* 👇 SỬA LỖI 2: Thêm style={{ flex: 1 }} vào ScrollView để nó tự động co lại, chừa chỗ cho thanh Bình luận ở dưới 👇 */}
      <ScrollView ref={scrollViewRef} style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {thread ? (
          <Thread thread={thread as Doc<'messages'> & { creator: Doc<'users'> }} />
        ) : (
          <ActivityIndicator style={{ marginTop: 20 }} />
        )}
        
        <Comments 
          threadId={id as Id<'messages'>} 
          // @ts-ignore
          highlightCommentId={highlightCommentId as string} 
        />
      </ScrollView>

      {/* KHUNG BÌNH LUẬN (Bây giờ sẽ luôn bị ghim chặt ở dưới cùng) */}
      <View style={styles.border} />

      <Link href={`/(modal)/reply/${id}` as any} asChild>
        <TouchableOpacity style={styles.replyButton}>
          <Image
            source={{ uri: userProfile?.imageUrl as string }}
            style={styles.replyButtonImage}
          />
          <Text style={{ color: 'gray' }}>
             {/* Text ẩn danh thông minh */}
             Thêm câu trả lời đến {thread?.isAnonymous ? 'Thành viên ẩn danh' : thread?.creator?.first_name}...
          </Text>
        </TouchableOpacity>
      </Link>
    </View>
  );
};

export default Page;

const styles = StyleSheet.create({
  border: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
    marginVertical: 2,
  },
  replyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    margin: 10,
    backgroundColor: Colors.itemBackground,
    borderRadius: 100,
    gap: 10,
  },
  replyButtonImage: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
});