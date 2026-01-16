import { usePaginatedQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import Thread from '@/components/Thread';
import { FlatList } from 'react-native';

export default function FavoritesScreen() {
  const { results, status, loadMore } = usePaginatedQuery(
    api.messages.getFavoriteThreads,
    {},
    { initialNumItems: 10 }
  );

  // Lọc bỏ những thread không có thông tin người tạo (creator)
  const filteredThreads = results.filter((item) => item.creator !== null);

  return (
    <FlatList
      data={filteredThreads}
      // Sử dụng 'as any' ở đây để bỏ qua thông báo lỗi type cũ của kết quả query
      renderItem={({ item }) => <Thread thread={item as any} />}
      onEndReached={() => loadMore(5)}
      keyExtractor={(item) => item._id}
    />
  );
}