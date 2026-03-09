import { View, StyleSheet, Text, TouchableOpacity, FlatList } from 'react-native';
import React from 'react';
import { UserProfile } from '@/components/UserProfile';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/Colors';
import { usePaginatedQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useUserProfile } from '@/hooks/useUserProfile';
import Thread from '@/components/Thread';
import { Doc, Id } from '@/convex/_generated/dataModel';
import { Link, useRouter } from 'expo-router';

type ProfileProps = {
  userId?: Id<'users'>;
  showBackButton?: boolean;
};

export default function Profile({ userId, showBackButton = false }: ProfileProps) {
  const { top } = useSafeAreaInsets();
  const { userProfile } = useUserProfile();
  const router = useRouter();

  const { results, status, loadMore } = usePaginatedQuery(
    api.messages.getThreads,
    { userId: userId || userProfile?._id },
    { initialNumItems: 10 }
  );

  return (
    <View style={[styles.container, { paddingTop: top }]}>
      <FlatList
        data={results}
        renderItem={({ item }) => (
          <Link href={`/feed/${item._id}`} asChild>
            <TouchableOpacity>
              <Thread thread={item as Doc<'messages'> & { creator: Doc<'users'> }} />
            </TouchableOpacity>
          </Link>
        )}
        ListEmptyComponent={
          <Text style={styles.tabContentText}>Bạn chưa đăng gì cả.</Text>
        }
        ItemSeparatorComponent={() => (
          <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: Colors.border }} />
        )}
        ListHeaderComponent={
          <>
            <UserProfile 
              userId={userId || userProfile?._id} 
              // 👇 Chuyển hướng thẳng sang trang Settings riêng biệt 👇
              onSettingsPress={() => router.push('/(auth)/settings' as any)}
              showBackButton={showBackButton} 
            />
            <View style={styles.sectionHeader}></View>
          </>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: 'white', flex: 1 },
  tabContentText: { fontSize: 16, marginVertical: 16, color: Colors.border, alignSelf: 'center' },
  sectionHeader: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border },
});