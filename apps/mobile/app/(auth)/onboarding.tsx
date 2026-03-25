import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useUser } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useTranslation } from 'react-i18next'; 

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, isLoaded } = useUser();
  const { userProfile } = useUserProfile(); 
  const syncUser = useMutation(api.users.updateUser);
  const { t } = useTranslation(); 

  const [loading, setLoading] = useState(false);
  
  const [displayName, setDisplayName] = useState(user?.firstName || '');
  const [username, setUsername] = useState(user?.username || '');

  const [avatarUri, setAvatarUri] = useState<string | null>(user?.imageUrl || null);
  const [avatarBase64, setAvatarBase64] = useState<string | null>(null);

  const handlePickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.3,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      setAvatarUri(result.assets[0].uri);
      setAvatarBase64(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  const onFinish = async () => {
    if (!username.trim() || !displayName.trim()) {
      return Alert.alert(t('onboarding.error'), t('onboarding.fill_required_fields'));
    }
    
    if (!isLoaded || !user) return;
    setLoading(true);
    
    try {
      let latestImageUrl = user.imageUrl;

      // 1. Up ảnh đại diện nếu có chọn mới
      if (avatarBase64) {
        await user.setProfileImage({ file: avatarBase64 });
        await user.reload(); // 👇 LÀM MỚI USER ĐỂ LẤY LINK ẢNH MỚI
        latestImageUrl = user.imageUrl; // Cập nhật link mới nhất
      }

      // 2. Cập nhật thông tin lên Clerk
      await user.update({
        username: username.trim(),
        firstName: displayName.trim(),
      });
      await user.reload(); // 👇 LÀM MỚI LẦN NỮA CHO CHẮC CÚ
      
      // 3. Đồng bộ chuẩn xác sang Convex
      if (userProfile?._id) {
        await syncUser({
          _id: userProfile._id,
          first_name: displayName.trim(),
          username: username.trim(),
          imageUrl: latestImageUrl // Đã lấy được link ảnh mới tinh
        });
      }
      
      router.replace('/(auth)/(tabs)/feed' as any);
      
    } catch (err: any) {
      console.error(err);
      Alert.alert(t('onboarding.error'), err.errors?.[0]?.message || t('onboarding.id_taken_or_invalid'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={{ paddingTop: insets.top + 50, alignItems: 'center', paddingHorizontal: 25, paddingBottom: 40 }}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={[styles.title, { color: Colors.primary }]}>{t('onboarding.complete_profile')}</Text>
      <Text style={styles.subtitle}>{t('onboarding.setup_desc')}</Text>

      <View style={styles.avatarContainer}>
        <View style={styles.avatarCircle}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={{ width: '100%', height: '100%' }} />
          ) : (
            <Ionicons name="person" size={50} color="#ccc" />
          )}
        </View>
        <TouchableOpacity style={styles.editBtn} onPress={handlePickImage}>
          <Ionicons name="pencil" size={16} color="black" />
        </TouchableOpacity>
      </View>

      <View style={styles.inputWrapper}>
        <Text style={styles.label}>{t('onboarding.display_name_label')}</Text>
        <TextInput 
          style={styles.input} 
          value={displayName} 
          onChangeText={setDisplayName} 
          placeholder={t('onboarding.display_name_placeholder')} 
        />
      </View>

      <View style={styles.inputWrapper}>
        <Text style={styles.label}>{t('onboarding.username_label')}</Text>
        <TextInput 
          style={[styles.input, { color: '#666' }]} 
          value={username} 
          onChangeText={setUsername} 
          autoCapitalize="none" 
        />
      </View>

      <TouchableOpacity style={styles.button} onPress={onFinish} disabled={loading}>
        {loading ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>{t('onboarding.enter_app')}</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white' },
  title: { fontSize: 26, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 40, paddingHorizontal: 15 },
  avatarContainer: { position: 'relative', marginBottom: 30 },
  avatarCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#f0f0f0', overflow: 'hidden', borderWidth: 2, borderColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  editBtn: { position: 'absolute', bottom: 0, right: 0, backgroundColor: 'white', padding: 8, borderRadius: 20, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1 },
  inputWrapper: { width: '100%', marginBottom: 20 },
  label: { fontSize: 13, color: '#666', marginBottom: 8, fontWeight: '500' },
  input: { width: '100%', backgroundColor: '#F9F9F9', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#E0E0E0', fontSize: 16 },
  button: { width: '100%', backgroundColor: Colors.primary, borderRadius: 25, paddingVertical: 16, alignItems: 'center', marginTop: 20 },
  buttonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
});