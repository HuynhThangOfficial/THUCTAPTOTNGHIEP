import {
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  View,
  Text,
  BackHandler,
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
import { useTranslation } from 'react-i18next';

const Page = () => {
  const { id, highlightCommentId, source } = useLocalSearchParams();
  const sourceStr = Array.isArray(source) ? source[0] : source;
  const { t } = useTranslation();

  const thread = useQuery(api.messages.getThreadById, { messageId: id as Id<'messages'> });
  const { userProfile } = useUserProfile();
  const tabBarHeight = useBottomTabBarHeight();
  const router = useRouter();
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (highlightCommentId) {
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: 300, animated: true });
      }, 500);
    }
  }, [highlightCommentId]);

  // 👇 LOGIC BACK THÔNG MINH ĐÃ FIX VÒNG LẶP 👇
  const handleSmartBack = () => {
    if (sourceStr === 'profile' || sourceStr === 'notifications') {
      // 1. Nếu có thể back (nghĩa là màn hình này nằm trên stack cũ) thì back bình thường
      if (router.canGoBack()) {
        router.back();
      } else {
        // 2. Nếu bị kẹt stack (vòng lặp), dùng replace để ghi đè màn hình hiện tại
        // bằng màn hình đích, giúp giải phóng bộ nhớ stack của Feed
        const targetRoute = sourceStr === 'profile'
          ? '/(auth)/(tabs)/profile'
          : '/(auth)/(tabs)/notifications';
        router.replace(targetRoute as any);
      }
    } else {
      router.back();
    }
  };

  // 👇 ĐỒNG BỘ NÚT BACK VẬT LÝ ANDROID 👇
  useEffect(() => {
    const onBackPress = () => {
      handleSmartBack();
      return true; // Chặn hành vi back mặc định của hệ thống
    };

    BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => BackHandler.removeEventListener('hardwareBackPress', onBackPress);
  }, [sourceStr]);

  return (
    <View style={{ flex: 1, backgroundColor: 'white' }}>
      <Stack.Screen
        options={{
          headerTitle: t('post_detail.title'),
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

      <ScrollView ref={scrollViewRef} style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {thread ? (
          <Thread thread={thread as Doc<'messages'> & { creator: Doc<'users'> }} viewContext="feed" />
        ) : (
          <ActivityIndicator style={{ marginTop: 20 }} />
        )}

        {thread?.allowComments !== false ? (
          <Comments
            threadId={id as Id<'messages'>}
            // @ts-ignore
            highlightCommentId={highlightCommentId as string}
          />
        ) : (
          <View style={{ padding: 40, alignItems: 'center', marginTop: 20 }}>
             <Ionicons name="lock-closed" size={48} color="#e0e0e0" style={{ marginBottom: 12 }} />
             <Text style={{ color: 'gray', fontSize: 15, fontWeight: '500', textAlign: 'center' }}>
               {t('post_detail.comments_disabled_msg')}
             </Text>
          </View>
        )}
      </ScrollView>

      {thread?.allowComments !== false && (
        <View style={{ paddingBottom: 10 }}>
          <View style={styles.border} />
          <Link href={`/(modal)/reply/${id}` as any} asChild>
            <TouchableOpacity style={styles.replyButton}>
              <Image
                source={{ uri: userProfile?.imageUrl as string }}
                style={styles.replyButtonImage}
              />
              <Text style={{ color: 'gray' }}>
                 {t('post_detail.add_reply_to', {
                   name: thread?.isAnonymous ? t('post_detail.anonymous_member') : thread?.creator?.first_name
                 })}
              </Text>
            </TouchableOpacity>
          </Link>
        </View>
      )}
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