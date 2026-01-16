import { View, StyleSheet, Text, TouchableOpacity, FlatList } from 'react-native';
import { UserProfile } from '@/components/UserProfile';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
// ĐÃ XOÁ IMPORT TABS
import { Colors } from '@/constants/Colors';
import { usePaginatedQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useUserProfile } from '@/hooks/useUserProfile';
import Thread from '@/components/Thread';
import { Doc, Id } from '@/convex/_generated/dataModel';
import { Link } from 'expo-router';
import { useRouter } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';

type ProfileProps = {
  userId?: Id<'users'>;
  showBackButton?: boolean;
};

export default function Profile({ userId, showBackButton = false }: ProfileProps) {
  const { top } = useSafeAreaInsets();
  // ĐÃ XOÁ useState activeTab
  const { userProfile } = useUserProfile();
  const router = useRouter();
  const { signOut } = useAuth();

  const { results, status, loadMore } = usePaginatedQuery(
    api.messages.getThreads, // Đảm bảo API này chỉ trả về Threads (không bao gồm replies)
    { userId: userId || userProfile?._id },
    { initialNumItems: 10 }
  );

  // ĐÃ XOÁ hàm handleTabChange

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
            {/* --- USER PROFILE COMPONENT --- */}
            {userId ? (
              <UserProfile 
                userId={userId} 
                onLogout={() => signOut()} 
                showBackButton={showBackButton} 
              />
            ) : (
              <UserProfile 
                userId={userProfile?._id} 
                onLogout={() => signOut()} 
                showBackButton={showBackButton}
              />
            )}
            
            {/* ĐÃ XOÁ <Tabs /> Ở ĐÂY */}
            
            {/* (Tuỳ chọn) Thêm một dòng tiêu đề nhỏ để phân cách nếu muốn */}
            <View style={styles.sectionHeader}>
            </View>
          </>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    flex: 1,
  },
  tabContentText: {
    fontSize: 16,
    marginVertical: 16,
    color: Colors.border,
    alignSelf: 'center',
  },
  // Style tuỳ chọn cho tiêu đề Threads
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  sectionTitle: {
    fontWeight: 'bold',
    fontSize: 16,
  }
});