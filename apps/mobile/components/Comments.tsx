import { View, StyleSheet, Text } from 'react-native';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id, Doc } from '@/convex/_generated/dataModel';
import Thread from '@/components/Thread';
import { useTranslation } from 'react-i18next'; // 👈 IMPORT I18N

interface CommentsProps {
  threadId: Id<'messages'>;
}

const Comments = ({ threadId }: CommentsProps) => {
  const { t } = useTranslation(); // 👈 KHỞI TẠO HOOK
  const comments = useQuery(api.messages.getThreadComments, {
    messageId: threadId,
  });

  // Đang tải dữ liệu
  if (comments === undefined) return <View />;

  // Xử lý khi không có bình luận nào
  if (comments !== undefined && comments.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>{t('comments.no_comments')}</Text>
      </View>
    );
  }

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
  },
  emptyContainer: {
    paddingVertical: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: 'gray',
    fontSize: 15,
    fontStyle: 'italic',
  }
});