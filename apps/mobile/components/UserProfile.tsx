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
import { useTranslation } from 'react-i18next'; // 👈 Thêm thư viện dịch thuật

// 👇 1. IMPORT THÊM USEUSER TỪ CLERK 👇
import { useUser } from '@clerk/clerk-expo';

const getValidAvatar = (url?: string | null): string => {
  if (isHttpUrl(url)) return url as string;
  return 'https://cdn.discordapp.com/embed/avatars/0.png'; // Ảnh mặc định
};

type UserProfileProps = {
  userId?: string;
  onSettingsPress?: () => void;
  showBackButton?: boolean;
};

export const UserProfile = ({ userId, onSettingsPress, showBackButton = false }: UserProfileProps) => {
  const { t } = useTranslation(); // 👈 Khởi tạo hàm dịch
  const { userProfile } = useUserProfile();
  const router = useRouter();
  
  // 👇 2. LẤY DỮ LIỆU TỪ CLERK ĐỂ CẬP NHẬT INSTANT CHO CHÍNH MÌNH 👇
  const { user: clerkUser } = useUser();

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
      // 👈 Thay bằng hàm t() truyền biến động vào trong text
      await Share.share({ 
        message: t('profile.share_message', { 
          firstName: profile?.first_name || '', 
          lastName: profile?.last_name || '' 
        }) 
      });
    } catch (error) { console.log(error); }
  };

  if (!profile) return null;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        {showBackButton ? (
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color="#000" />
            <Text style={styles.backText}>{t('profile.back')}</Text>
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
          {/* 👇 3. AVATAR: NẾU LÀ MÌNH THÌ LẤY TỪ CLERK CHO MƯỢT 👇 */}
          <Image 
            source={{ uri: getValidAvatar(isSelf ? clerkUser?.imageUrl : profile?.imageUrl) }} 
            style={styles.image} 
          />
          
          <View style={styles.textStack}>
             {/* 👇 4. TÊN HIỂN THỊ: Ưu tiên lấy từ Clerk nếu là tài khoản của mình 👇 */}
             <Text style={styles.name}>
               {isSelf 
                 ? clerkUser?.firstName 
                 : `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim()}
             </Text>
             
             {/* 👇 5. ID NGƯỜI DÙNG: Ưu tiên lấy từ Clerk nếu là tài khoản của mình 👇 */}
             <Text style={styles.usernameText}>
               @{isSelf 
                 ? clerkUser?.username 
                 : (profile?.username || profile?.email?.split('@')[0])}
             </Text>
          </View>
        </View>

        {isSelf && (
          <Link
            href={`/(modal)/edit-profile?biostring=${profile?.bio ? encodeURIComponent(profile?.bio) : ''}&linkstring=${profile?.websiteUrl ? encodeURIComponent(profile?.websiteUrl) : ''}&linkTitlestring=${profile?.linkTitle ? encodeURIComponent(profile?.linkTitle) : ''}&userId=${profile?._id}&imageUrl=${profile?.imageUrl ? encodeURIComponent(profile?.imageUrl) : ''}`}
            asChild>
            <TouchableOpacity style={styles.editButtonTop}>
              <Ionicons name="create-outline" size={20} color="black" />
              <Text style={styles.editButtonText}>{t('profile.edit_profile')}</Text>
            </TouchableOpacity>
          </Link>
        )}
      </View>
    
      <View style={styles.statsRow}>
        <TouchableOpacity onPress={() => router.push({ pathname: '/follow-list', params: { userId: profile?._id, initialTab: 'followers' } })}>
          <Text style={styles.followersText}>
            <Text style={{ fontWeight: 'bold' }}>{profile?.followersCount || 0}</Text> {t('profile.followers')}
          </Text>
        </TouchableOpacity>
        <Text style={styles.dot}>·</Text>
        <TouchableOpacity onPress={() => router.push({ pathname: '/follow-list', params: { userId: profile?._id, initialTab: 'following' } })}>
          <Text style={styles.followersText}>
            <Text style={{ fontWeight: 'bold' }}>{followingCount}</Text> {t('profile.following')}
          </Text>
        </TouchableOpacity>
        <Text style={styles.dot}>·</Text>
        <View style={styles.statItem}>
          <Text style={styles.followersText}>
            <Text style={{ fontWeight: 'bold' }}>{postCount}</Text> {t('profile.posts')}
          </Text>
        </View>
      </View>

      <View style={styles.bioContainer}>
        <Text style={styles.bioText}>{profile?.bio ? profile?.bio : t('profile.no_bio')}</Text>
        
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
                {isFollowing ? t('profile.btn_following') : t('profile.btn_follow')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.messageButton} onPress={handleMessagePress}>
              <Text style={styles.messageButtonText}>{t('profile.btn_message')}</Text>
            </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
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
  
  usernameText: { fontSize: 15, color: '#666', fontWeight: '500' },
  
  editButtonTop: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: Colors.border, marginTop: 10 },
  editButtonText: { fontWeight: '600', fontSize: 14 },
  
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 10, flexWrap: 'wrap' },
  statItem: { flexDirection: 'row', alignItems: 'center' },
  dot: { fontSize: 14, color: 'gray' },
  followersText: { fontSize: 15, color: '#000' },
  
  bioContainer: { marginBottom: 0 },
  bioText: { fontSize: 15, color: '#000', marginBottom: 4, lineHeight: 20 },
  linkRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  linkText: { fontSize: 15, color: '#0095f6', fontWeight: '500' },
  
  buttonRow: { flexDirection: 'row', justifyContent: 'space-evenly', marginTop: 10, gap: 16 },
  
  messageButton: { flex: 1, padding: 10, borderRadius: 5, borderWidth: 1, borderColor: Colors.border, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  messageButtonText: { fontWeight: 'bold', color: '#000' },
  fullButton: { flex: 1, padding: 10, borderRadius: 5, borderWidth: 1, borderColor: '#000', backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  fullButtonText: { fontWeight: 'bold', color: 'white' },
});