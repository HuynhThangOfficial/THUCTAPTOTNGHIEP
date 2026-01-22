import { StyleSheet, Text, View, Image, TouchableOpacity, Share } from 'react-native';
import { useQuery } from 'convex/react';
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

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Khám phá trang cá nhân của ${profile?.first_name} ${profile?.last_name}!`,
      });
    } catch (error) {
      console.log('Error sharing:', error);
    }
  };

  return (
    <View style={styles.container}>
      {/* --- HEADER (Giữ nguyên) --- */}
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

      {/* --- PHẦN THÔNG TIN USER ĐÃ SỬA ĐỔI --- */}
      <View style={styles.profileContainer}>
        {/* CỘT TRÁI: Avatar -> Tên -> Email */}
        <View style={styles.userInfoColumn}>
          <Image source={{ uri: profile?.imageUrl as string }} style={styles.image} />
          <View style={styles.textStack}>
             <Text style={styles.name}>
               {profile?.first_name} {profile?.last_name}
             </Text>
             <Text style={styles.email}>{profile?.email}</Text>
          </View>
        </View>

        {/* CỘT PHẢI (Vị trí cũ của Avatar): Nút Chỉnh sửa */}
        {isSelf && (
          <Link
            href={`/(modal)/edit-profile?biostring=${
              profile?.bio ? encodeURIComponent(profile?.bio) : ''
            }&linkstring=${profile?.websiteUrl ? encodeURIComponent(profile?.websiteUrl) : ''}&userId=${
              profile?._id
            }&imageUrl=${profile?.imageUrl ? encodeURIComponent(profile?.imageUrl) : ''}`}
            asChild>
            <TouchableOpacity style={styles.editButtonTop}>
              {/* Icon cây bút */}
              <Ionicons name="create-outline" size={20} color="black" />
              <Text style={styles.editButtonText}>Chỉnh sửa</Text>
            </TouchableOpacity>
          </Link>
        )}
      </View>

      <Text style={styles.bio}>{profile?.bio ? profile?.bio : 'Chưa thêm tiểu sử'}</Text>
      <Text style={styles.followers}>
        {profile?.followersCount} người theo dõi · {profile?.websiteUrl}
      </Text>

      {/* --- BUTTON ROW DƯỚI CÙNG --- */}
      {/* Chỉ hiện Follow/Mention cho người khác (Vì nút Edit của mình đã đưa lên trên) */}
      {!isSelf && (
        <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.fullButton}>
              <Text style={styles.fullButtonText}>Theo dõi</Text>
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
  container: {
    flex: 1,
    padding: 16,
    paddingTop: 0,
    backgroundColor: '#fff',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    height: 40,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  backText: { fontSize: 16 },
  rightIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },

  // --- STYLES MỚI CHO PROFILE ---
  profileContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start', // Căn chỉnh lên trên cùng
    marginBottom: 10,
  },
  userInfoColumn: {
    flexDirection: 'column', // Xếp dọc: Ảnh -> Tên -> Email
    gap: 10,
  },
  image: {
    width: 60,  // Tăng kích thước ảnh một chút cho đẹp
    height: 60,
    borderRadius: 30,
  },
  textStack: {
    gap: 2,
  },
  name: {
    fontSize: 20, // Tăng font chữ tên lên
    fontWeight: 'bold',
  },
  email: {
    fontSize: 14,
    color: 'gray',
  },

  // Style cho nút Edit mới nằm ở góc phải
  editButtonTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: 10, // Để nút ngang hàng với Avatar hơn hoặc chỉnh tùy ý
  },
  editButtonText: {
    fontWeight: '600',
    fontSize: 14,
  },

  bio: {
    fontSize: 14,
    marginTop: 8,
    marginBottom: 16,
  },
  followers: {
     fontSize: 14,
     color: 'gray',
     marginBottom: 10,
  },

  // Button Row cũ (chỉ còn dùng cho !isSelf)
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    marginTop: 10,
    gap: 16,
  },
  button: {
    flex: 1,
    padding: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: { fontWeight: 'bold' },
  fullButton: {
    flex: 1,
    padding: 10,
    borderRadius: 5,
    borderWidth: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullButtonText: {
    fontWeight: 'bold',
    color: 'white',
  },
});