import { StyleSheet, Text, View, Image, TouchableOpacity, Share, Linking } from 'react-native';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Colors } from '@/constants/Colors';
import { Link, useRouter } from 'expo-router';
import { useUserProfile } from '@/hooks/useUserProfile';
import { Id } from '@/convex/_generated/dataModel';
import { Ionicons } from '@expo/vector-icons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

type UserProfileProps = {
  userId?: string;
  onLogout?: () => void;
  showBackButton?: boolean;
};

export const UserProfile = ({ userId, onLogout, showBackButton = false }: UserProfileProps) => {
  const profile = useQuery(api.users.getUserById, { userId: userId as Id<'users'> });
  const { userProfile } = useUserProfile();
  const isSelf = userProfile?._id === userId;
  const router = useRouter();

  // 1. LOGIC FOLLOW & STATS
  const isFollowing = useQuery(api.users.isFollowing, { targetUserId: userId as Id<'users'> });
  const followingList = useQuery(api.users.getFollowing, { userId: userId as Id<'users'> });
  const followingCount = followingList?.length || 0;
  
  // Lấy số lượng bài viết (Mới)
  const postCount = useQuery(api.users.getPostCount, { userId: userId as Id<'users'> }) || 0;

  const followMutation = useMutation(api.users.followUser);
  const unfollowMutation = useMutation(api.users.unfollowUser);

  const handleToggleFollow = async () => {
    if (!userId) return;
    if (isFollowing) {
      await unfollowMutation({ targetUserId: userId as Id<'users'> });
    } else {
      await followMutation({ targetUserId: userId as Id<'users'> });
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Khám phá trang cá nhân của ${profile?.first_name} ${profile?.last_name}!`,
      });
    } catch (error) { console.log(error); }
  };

  return (
    <View style={styles.container}>
      {/* --- HEADER --- */}
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
            <TouchableOpacity onPress={handleShare}>
              <Ionicons name="share-outline" size={24} color="black" />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={onLogout}>
            <Ionicons name="log-out-outline" size={24} color="black" />
          </TouchableOpacity>
        </View>
      </View>

      {/* --- PROFILE INFO --- */}
      <View style={styles.profileContainer}>
        <View style={styles.userInfoColumn}>
          <Image source={{ uri: profile?.imageUrl as string }} style={styles.image} />
          <View style={styles.textStack}>
             <Text style={styles.name}>{profile?.first_name} {profile?.last_name}</Text>
             <Text style={styles.email}>{profile?.email}</Text>
          </View>
        </View>

        {isSelf && (
          <Link
            href={`/(modal)/edit-profile?biostring=${
              profile?.bio ? encodeURIComponent(profile?.bio) : ''
            }&linkstring=${
              profile?.websiteUrl ? encodeURIComponent(profile?.websiteUrl) : ''
            }&linkTitlestring=${
              profile?.linkTitle ? encodeURIComponent(profile?.linkTitle) : ''
            }&userId=${profile?._id}&imageUrl=${
              profile?.imageUrl ? encodeURIComponent(profile?.imageUrl) : ''
            }`}
            asChild>
            <TouchableOpacity style={styles.editButtonTop}>
              <Ionicons name="create-outline" size={20} color="black" />
              <Text style={styles.editButtonText}>Chỉnh sửa</Text>
            </TouchableOpacity>
          </Link>
        )}
      </View>
    
      {/* --- STATS ROW (SỐ LIỆU) --- */}
      <View style={styles.statsRow}>

        {/* 2. Người theo dõi (Bấm được) */}
        <TouchableOpacity onPress={() => router.push({ pathname: '/(public)/follow-list', params: { userId: profile?._id, initialTab: 'followers' } })}>
          <Text style={styles.followersText}>
            <Text style={{ fontWeight: 'bold' }}>{profile?.followersCount || 0}</Text> người theo dõi
          </Text>
        </TouchableOpacity>

        <Text style={styles.dot}>·</Text>

        {/* 3. Đang theo dõi (Bấm được) */}
        <TouchableOpacity onPress={() => router.push({ pathname: '/(public)/follow-list', params: { userId: profile?._id, initialTab: 'following' } })}>
          <Text style={styles.followersText}>
            <Text style={{ fontWeight: 'bold' }}>{followingCount}</Text> đang theo dõi
          </Text>
        </TouchableOpacity>
                <Text style={styles.dot}>·</Text>

                {/* 1. Số bài viết (Chỉ hiển thị, không bấm được) */}
        <View style={styles.statItem}>
          <Text style={styles.followersText}>
            <Text style={{ fontWeight: 'bold' }}>{postCount}</Text> bài viết
          </Text>
        </View>
      
      </View>

      {/* --- BIO & LINK --- */}
      <View style={styles.bioContainer}>
        <Text style={styles.bioText}>{profile?.bio ? profile?.bio : 'Chưa thêm tiểu sử'}</Text>
        
        {profile?.websiteUrl && (
          <TouchableOpacity 
            style={styles.linkRow}
            onPress={() => {
              let url = profile.websiteUrl;
              if (!url) return;
              if (!url.startsWith('http://') && !url.startsWith('https://')) url = 'https://' + url;
              Linking.openURL(url).catch(err => console.error("Err", err));
            }}
          >
            <Ionicons name="link-outline" size={16} color="gray" style={{ marginRight: 4 }} />
            <Text style={[styles.linkText, profile.linkTitle ? { fontWeight: 'bold', color: '#0095f6' } : undefined]} numberOfLines={1} ellipsizeMode="tail">
              {profile.linkTitle || profile.websiteUrl}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* --- BUTTONS (Cho người khác) --- */}
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
            <TouchableOpacity style={styles.button}>
              <Text style={styles.buttonText}>Nhắn tin</Text>
            </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, paddingTop: 0, backgroundColor: '#fff' },
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
  
  // Style Stats
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 10, flexWrap: 'wrap' },
  statItem: { flexDirection: 'row', alignItems: 'center' }, // Style cho mục không bấm được
  dot: { fontSize: 14, color: 'gray' },
  followersText: { fontSize: 15, color: '#000' },
  
  // Style Bio
  bioContainer: { marginBottom: 16 },
  bioText: { fontSize: 15, color: '#000', marginBottom: 4, lineHeight: 20 },
  linkRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  linkText: { fontSize: 15, color: '#0095f6', fontWeight: '500', flex: 1 },
  
  buttonRow: { flexDirection: 'row', justifyContent: 'space-evenly', marginTop: 5, gap: 16 },
  button: { flex: 1, padding: 10, borderRadius: 5, borderWidth: 1, borderColor: Colors.border, justifyContent: 'center', alignItems: 'center' },
  buttonText: { fontWeight: 'bold' },
  fullButton: { flex: 1, padding: 10, borderRadius: 5, borderWidth: 1, borderColor: '#000', backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  fullButtonText: { fontWeight: 'bold', color: 'white' },
});