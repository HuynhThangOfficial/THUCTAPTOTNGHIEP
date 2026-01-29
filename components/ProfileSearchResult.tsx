import { StyleSheet, Text, View, Image, TouchableOpacity } from 'react-native';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Doc } from '@/convex/_generated/dataModel';
import { Colors } from '@/constants/Colors';
import { useRouter } from 'expo-router';

type ProfileSearchResultProps = {
  user: Doc<'users'>;
};

const ProfileSearchResult = ({ user }: ProfileSearchResultProps) => {
  const router = useRouter();

  // 1. Lấy trạng thái follow hiện tại
  const isFollowing = useQuery(api.users.isFollowing, { targetUserId: user._id });

  // 2. Khai báo các hàm xử lý từ Backend
  const followMutation = useMutation(api.users.followUser);
  const unfollowMutation = useMutation(api.users.unfollowUser);

  // 3. Hàm xử lý khi bấm nút Follow
  const handleToggleFollow = async () => {
    if (isFollowing) {
      await unfollowMutation({ targetUserId: user._id });
    } else {
      await followMutation({ targetUserId: user._id });
    }
  };

  return (
    <TouchableOpacity 
      style={styles.container} 
      onPress={() => {
        // QUAN TRỌNG: Điều hướng sang màn hình Public Profile mới tạo
        // (Không dùng navigate sang Tabs để tránh lỗi nút Back)
        router.push({
          pathname: '/(public)/profile/[id]',
          params: { id: user._id }
        });
      }}
    >
      <Image source={{ uri: user?.imageUrl }} style={styles.image} />
      
      <View style={styles.infoContainer}>
        <Text style={styles.name}>
          {user.first_name} {user.last_name}
        </Text>
        <Text style={styles.username}>@{user.username}</Text>
        <Text style={styles.followers}>{user.followersCount} người theo dõi</Text>
      </View>
      
      {/* Nút Follow (Hoạt động độc lập) */}
      <TouchableOpacity 
        style={[
          styles.followButton, 
          isFollowing && styles.followingButton // Đổi nền đen nếu đã follow
        ]} 
        onPress={handleToggleFollow}
      >
        <Text style={[
          styles.followButtonText, 
          isFollowing && styles.followingButtonText // Đổi chữ trắng nếu đã follow
        ]}>
          {isFollowing ? 'Đang theo dõi' : 'Follow'}
        </Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

export default ProfileSearchResult;

const styles = StyleSheet.create({
  container: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#fff',
  },
  image: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  infoContainer: {
    flex: 1,
    gap: 6,
  },
  name: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  username: {
    fontSize: 14,
    color: 'gray',
  },
  followers: {
    fontSize: 14,
    color: 'gray',
  },
  followButton: {
    padding: 8,
    paddingHorizontal: 24,
    borderRadius: 10,
    borderColor: Colors.border,
    borderWidth: 1,
    backgroundColor: '#fff',
  },
  followingButton: {
    backgroundColor: '#000', // Màu đen khi đã follow
    borderColor: '#000',
  },
  followButtonText: {
    fontWeight: 'bold',
    color: '#000',
  },
  followingButtonText: {
    color: '#fff', // Màu trắng khi đã follow
  },
});