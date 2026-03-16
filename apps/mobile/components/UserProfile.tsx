import { StyleSheet, Text, View, Image, TouchableOpacity, Share, Linking } from 'react-native';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Colors } from '@/constants/Colors';
import { Link, useRouter } from 'expo-router';
import { useUserProfile } from '@/hooks/useUserProfile';
import { Id } from '@/convex/_generated/dataModel';
import { Ionicons } from '@expo/vector-icons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { isHttpUrl } from '@/convex/utils';

const getValidAvatar = (url?: string | null): string => {
  if (isHttpUrl(url)) return url as string;
  return 'https://www.gravatar.com/avatar/?d=mp';
};

type UserProfileProps = {
  userId?: string;
  onSettingsPress?: () => void;
  showBackButton?: boolean;
};

export const UserProfile = ({ userId, onSettingsPress, showBackButton = false }: UserProfileProps) => {
  const { userProfile } = useUserProfile();
  const router = useRouter();

  const currentId = userId || userProfile?._id;
  const isSelf = userProfile?._id === currentId;

  const profile = useQuery(api.users.getUserById, currentId ? { userId: currentId as Id<'users'> } : "skip");
  
  const isFollowing = useQuery(api.users.isFollowing, currentId ? { targetUserId: currentId as Id<'users'> } : "skip");
  const followingList = useQuery(api.users.getFollowing, currentId ? { userId: currentId as Id<'users'> } : "skip");
  const followingCount = followingList?.length || 0;
  const postCount = useQuery(api.users.getPostCount, currentId ? { userId: currentId as Id<'users'> } : "skip") || 0;

  const followMutation = useMutation(api.users.followUser);
  const unfollowMutation = useMutation(api.users.unfollowUser);
  const startChat = useMutation(api.chat.getOrCreateConversation);

  const handleToggleFollow = async () => {
    if (!currentId) return;
    if (isFollowing) {
      await unfollowMutation({ targetUserId: currentId as Id<'users'> });
    } else {
      await followMutation({ targetUserId: currentId as Id<'users'> });
    }
  };

  const handleMessagePress = async () => {
    if (!currentId) return;
    try {
      const conversationId = await startChat({ otherUserId: currentId as Id<'users'> });
      router.push(`/(auth)/chat/${conversationId}` as any);
    } catch (error) { console.error(error); }
  };

  const handleShare = async () => {
    try {
      await Share.share({ message: `Khám phá trang cá nhân của ${profile?.first_name} ${profile?.last_name}!` });
    } catch (error) { console.log(error); }
  };

  if (!profile) return null;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        {showBackButton ? (
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color="#000" />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
        ) : (
          <MaterialCommunityIcons name="web" size={24} color="black" />
        )}
        <View style={styles.rightIcons}>
          {isSelf && (
            <>
              <TouchableOpacity onPress={handleShare}>
                <Ionicons name="share-outline" size={24} color="black" />
              </TouchableOpacity>
              <TouchableOpacity onPress={onSettingsPress}>
                <Ionicons name="settings-outline" size={26} color="black" />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      <View style={styles.profileContainer}>
        <View style={styles.userInfoColumn}>
          <Image source={{ uri: getValidAvatar(profile?.imageUrl) }} style={styles.image} />
          <View style={styles.textStack}>
             <Text style={styles.name}>{profile?.first_name} {profile?.last_name}</Text>
             <Text style={styles.email}>{profile?.email}</Text>
          </View>
        </View>

        {isSelf && (
          <Link
            href={`/(modal)/edit-profile?biostring=${profile?.bio ? encodeURIComponent(profile?.bio) : ''}&linkstring=${profile?.websiteUrl ? encodeURIComponent(profile?.websiteUrl) : ''}&linkTitlestring=${profile?.linkTitle ? encodeURIComponent(profile?.linkTitle) : ''}&userId=${profile?._id}&imageUrl=${profile?.imageUrl ? encodeURIComponent(profile?.imageUrl) : ''}`}
            asChild>
            <TouchableOpacity style={styles.editButtonTop}>
              <Ionicons name="create-outline" size={20} color="black" />
              <Text style={styles.editButtonText}>Chỉnh sửa</Text>
            </TouchableOpacity>
          </Link>
        )}
      </View>
    
      <View style={styles.statsRow}>
        <TouchableOpacity onPress={() => router.push({ pathname: '/follow-list', params: { userId: profile?._id, initialTab: 'followers' } })}>
          <Text style={styles.followersText}>
            <Text style={{ fontWeight: 'bold' }}>{profile?.followersCount || 0}</Text> người theo dõi
          </Text>
        </TouchableOpacity>
        <Text style={styles.dot}>·</Text>
        <TouchableOpacity onPress={() => router.push({ pathname: '/follow-list', params: { userId: profile?._id, initialTab: 'following' } })}>
          <Text style={styles.followersText}>
            <Text style={{ fontWeight: 'bold' }}>{followingCount}</Text> đang theo dõi
          </Text>
        </TouchableOpacity>
        <Text style={styles.dot}>·</Text>
        <View style={styles.statItem}>
          <Text style={styles.followersText}>
            <Text style={{ fontWeight: 'bold' }}>{postCount}</Text> bài viết
          </Text>
        </View>
      </View>

      <View style={styles.bioContainer}>
        <Text style={styles.bioText}>{profile?.bio ? profile?.bio : 'Chưa thêm tiểu sử'}</Text>
        
        {profile?.websiteUrl && (
          <TouchableOpacity 
            style={styles.linkRow}
            onPress={() => {
              let url = profile.websiteUrl;
              if (!url) return;
              if (!isHttpUrl(url)) url = 'https://' + url;
              Linking.openURL(url);
            }}
          >
            <Ionicons name="link-outline" size={16} color="gray" style={{ marginRight: 4 }} />
            <Text style={[styles.linkText, profile.linkTitle ? { fontWeight: 'bold', color: '#0095f6' } : undefined]} numberOfLines={1}>
              {profile.linkTitle || profile.websiteUrl}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {!isSelf && (
        <View style={styles.buttonRow}>
            <TouchableOpacity 
              style={[styles.fullButton, isFollowing && { backgroundColor: '#fff', borderWidth: 1, borderColor: Colors.border }]}
              onPress={handleToggleFollow}
            >
              <Text style={[styles.fullButtonText, isFollowing && { color: '#000' }]}>
                {isFollowing ? 'Đang theo dõi' : 'Theo dõi'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.messageButton} onPress={handleMessagePress}>
              <Text style={styles.messageButtonText}>Nhắn tin</Text>
            </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  // 👇 Đã ép sát bottom và bỏ mọi flex 👇
  container: { paddingHorizontal: 16, paddingTop: 0, paddingBottom: 5, backgroundColor: '#fff', flex: 0 }, 
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, height: 40 },
  backButton: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  backText: { fontSize: 16 },
  rightIcons: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  
  profileContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  userInfoColumn: { flexDirection: 'column', gap: 10 },
  image: { width: 60, height: 60, borderRadius: 30 },
  textStack: { gap: 2 },
  name: { fontSize: 20, fontWeight: 'bold' },
  email: { fontSize: 14, color: 'gray' },
  
  editButtonTop: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: Colors.border, marginTop: 10 },
  editButtonText: { fontWeight: '600', fontSize: 14 },
  
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 10, flexWrap: 'wrap' },
  statItem: { flexDirection: 'row', alignItems: 'center' },
  dot: { fontSize: 14, color: 'gray' },
  followersText: { fontSize: 15, color: '#000' },
  
  bioContainer: { marginBottom: 0 }, // Đã set về 0 để không cắn xuống dưới
  bioText: { fontSize: 15, color: '#000', marginBottom: 4, lineHeight: 20 },
  linkRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  linkText: { fontSize: 15, color: '#0095f6', fontWeight: '500' }, // Chắc chắn đã mất flex: 1
  
  buttonRow: { flexDirection: 'row', justifyContent: 'space-evenly', marginTop: 10, gap: 16 },
  
  messageButton: { flex: 1, padding: 10, borderRadius: 5, borderWidth: 1, borderColor: Colors.border, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  messageButtonText: { fontWeight: 'bold', color: '#000' },
  fullButton: { flex: 1, padding: 10, borderRadius: 5, borderWidth: 1, borderColor: '#000', backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  fullButtonText: { fontWeight: 'bold', color: 'white' },
});