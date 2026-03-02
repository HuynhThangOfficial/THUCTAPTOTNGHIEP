import ThreadComposer from '@/components/ThreadComposer';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { api } from '@/convex/_generated/api';
import Thread from '@/components/Thread';
import { Id, Doc } from '@/convex/_generated/dataModel';
import { useQuery } from 'convex/react';

const Page = () => {
  const { id } = useLocalSearchParams();

  const threadIdString = Array.isArray(id) ? id[0] : id;

  const thread = useQuery(api.messages.getThreadById, { messageId: threadIdString as Id<'messages'> });

  return (

    <View style={styles.container}>
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