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

  // 1. Lấy thông tin người dùng hiện tại để kiểm tra (tránh hiện nút cho chính mình)
  const currentUser = useQuery(api.users.current);
  const isSelf = currentUser?._id === user._id;

  // 2. THAY ĐỔI QUERY: Dùng checkRelationship thay vì isFollowing đơn lẻ
  const relationship = useQuery(api.users.checkRelationship, { targetUserId: user._id });

  const isFollowing = relationship?.isFollowing;    // Mình đang follow họ
  const isFollowedBy = relationship?.isFollowedBy;  // Họ đang follow mình

  // 3. Khai báo các hàm xử lý từ Backend
  const followMutation = useMutation(api.users.followUser);
  const unfollowMutation = useMutation(api.users.unfollowUser);

  // 4. Hàm xử lý khi bấm nút Follow
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

      {/* Chỉ hiện nút nếu KHÔNG phải là chính mình */}
      {!isSelf && (
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
            {/* 👇 LOGIC HIỂN THỊ CHỮ MỚI 👇 */}
            {isFollowing ? 'Đang theo dõi' : (isFollowedBy ? 'Theo dõi lại' : 'Theo dõi')}
          </Text>
        </TouchableOpacity>
      )}
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
    paddingHorizontal: 20, // Giảm padding chút cho chữ dài không bị tràn
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
    fontSize: 13, // Chỉnh size chữ vừa vặn
  },
  followingButtonText: {
    color: '#fff', // Màu trắng khi đã follow
  },
});