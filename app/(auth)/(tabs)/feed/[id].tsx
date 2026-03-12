import {
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  View,
  Text,
} from 'react-native';
import { Link, useLocalSearchParams, Stack, useRouter } from 'expo-router'; // ĐÃ THÊM: Stack, useRouter
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import Thread from '@/components/Thread';
import { Id, Doc } from '@/convex/_generated/dataModel';
import Comments from '@/components/Comments';
import { Ionicons } from '@expo/vector-icons'; // ĐÃ THÊM: Icon mũi tên

import { useUserProfile } from '@/hooks/useUserProfile';
import { Colors } from '@/constants/Colors';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';

const Page = () => {
  const { id } = useLocalSearchParams();
  const thread = useQuery(api.messages.getThreadById, { messageId: id as Id<'messages'> });
  const { userProfile } = useUserProfile();
  const tabBarHeight = useBottomTabBarHeight();

  // 👇 ĐÃ THÊM: Khai báo router để dùng chức năng back
  const router = useRouter();

  return (
    <View style={{ flexGrow: 1, marginBottom: 0, backgroundColor: 'white' }}>

      {/* 👇 ĐÃ THÊM: Cấu hình Header có nút Back 👇 */}
      <Stack.Screen
        options={{
          headerTitle: 'Bài viết',
          headerShown: true, // Bật header lên
          headerShadowVisible: false,
          headerBackTitleVisible: false,
          headerTitleAlign: 'center',
          headerStyle: { backgroundColor: 'white' },
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={{ paddingRight: 15, paddingLeft: 5 }}>
              <Ionicons name="arrow-back" size={24} color="black" />
            </TouchableOpacity>
          ),
        }}
      />
      {/* 👆 ---------------------------------- 👆 */}

      <ScrollView showsVerticalScrollIndicator={false}>
        {thread ? (
          <Thread thread={thread as Doc<'messages'> & { creator: Doc<'users'> }} />
        ) : (
          <ActivityIndicator style={{ marginTop: 20 }} />
        )}
        <Comments threadId={id as Id<'messages'>} />
      </ScrollView>

      <View style={styles.border} />

      <Link href={`/(modal)/reply/${id}`} asChild>
        <TouchableOpacity style={styles.replyButton}>
          <Image
            source={{ uri: userProfile?.imageUrl as string }}
            style={styles.replyButtonImage}
          />
          <Text style={{ color: 'gray' }}>Thêm câu trả lời đến {thread?.creator?.first_name}...</Text>
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
    backgroundColor: Colors.itemBackground, // Hoặc đổi thành '#f2f3f5' nếu muốn giống thanh chat Discord
    borderRadius: 100,
    gap: 10,
  },
  replyButtonImage: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
});