import { View, StyleSheet } from 'react-native';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id, Doc } from '@/convex/_generated/dataModel';
import Thread from '@/components/Thread';

interface CommentsProps {
  threadId: Id<'messages'>;
}

const Comments = ({ threadId }: CommentsProps) => {
  const comments = useQuery(api.messages.getThreadComments, {
    messageId: threadId,
  });

  if (!comments) return <View />;

  // Phân loại bình luận gốc và bình luận con
  const rootComments = comments.filter(c => !c.parentId);
  const childComments = comments.filter(c => c.parentId);

  return (
    <View style={styles.container}>
      {rootComments.map((comment) => (
        <View key={comment._id} style={styles.commentWrapper}>
          <Thread thread={comment as Doc<'messages'> & { creator: Doc<'users'> }} />

          {/* Vùng chứa phản hồi lồng nhau */}
          <View style={styles.repliesContainer}>
            {childComments
              .filter(reply => reply.parentId === comment._id)
              .map((reply) => (
                <Thread key={reply._id} thread={reply as Doc<'messages'> & { creator: Doc<'users'> }} />
              ))}
          </View>
        </View>
      ))}
    </View>
  );
};
export default Comments;

const styles = StyleSheet.create({
  container: {
    paddingBottom: 20,
  },
  commentWrapper: {
    marginBottom: 5,
  },
  repliesContainer: {
    marginLeft: 45, // Đẩy sang phải để tạo thụt lề
    borderLeftWidth: 2, // Vạch kẻ trái chuẩn Facebook
    borderColor: '#e4e6eb',
    paddingLeft: 5,
    marginTop: 2,
  }
});