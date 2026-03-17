import ThreadComposer from '@/components/ThreadComposer';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router'; // 👈 THÊM STACK
import { api } from '@/convex/_generated/api';
import Thread from '@/components/Thread';
import { Id, Doc } from '@/convex/_generated/dataModel';
import { useQuery } from 'convex/react';
import { useTranslation } from 'react-i18next'; // 👈 IMPORT DỊCH

const Page = () => {
  const { id } = useLocalSearchParams();
  const { t } = useTranslation(); // 👈 KHỞI TẠO HOOK

  const threadIdString = Array.isArray(id) ? id[0] : id;

  const thread = useQuery(api.messages.getThreadById, { messageId: threadIdString as Id<'messages'> });

  return (
    <View style={styles.container}>
      {/* THIẾT LẬP TIÊU ĐỀ MODAL ĐA NGÔN NGỮ */}
      <Stack.Screen 
        options={{ 
          title: t('reply_modal.title'), 
          headerTitleAlign: 'center',
          headerShadowVisible: false,
          headerBackTitleVisible: false
        }} 
      />

      {thread ? (
        <Thread thread={thread as Doc<'messages'> & { creator: Doc<'users'> }} />
      ) : (
        <ActivityIndicator style={{ marginTop: 20 }} />
      )}

      <ThreadComposer isReply={true} threadId={threadIdString} />
    </View>
  );
};
export default Page;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white'
  }
});