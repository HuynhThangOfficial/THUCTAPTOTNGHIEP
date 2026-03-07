// app/(public)/profile/[id].tsx
import { View, StyleSheet } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { UserProfile } from '@/components/UserProfile';

export default function PublicProfileScreen() {
  const { id } = useLocalSearchParams(); 

  return (
    <View style={styles.container}>
      {/* Ẩn header mặc định để dùng header xịn của component UserProfile */}
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Gọi lại component UserProfile nhưng truyền ID của người cần xem */}
      <UserProfile 
        userId={id as string} 
        showBackButton={true} // Bật nút Back lên
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
});