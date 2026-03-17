import { StyleSheet, Text, TextInput, View, TouchableOpacity, Image, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import React, { useState } from 'react';
import { Colors } from '@/constants/Colors';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next'; // 👈 IMPORT DỊCH

const Page = () => {
  const { t } = useTranslation(); // 👈 KHỞI TẠO HOOK
  // 1. Nhận tham số (có fallback để tránh lỗi undefined)
  const { biostring, linkstring, linkTitlestring, userId, imageUrl } = useLocalSearchParams<{
    biostring?: string;
    linkstring?: string;
    linkTitlestring?: string;
    userId: string;
    imageUrl?: string;
  }>();

  // Đặt giá trị mặc định là chuỗi rỗng nếu param không tồn tại
  const [bio, setBio] = useState(biostring || '');
  const [link, setLink] = useState(linkstring || '');
  const [linkTitle, setLinkTitle] = useState(linkTitlestring || '');

  const updateUser = useMutation(api.users.updateUser);
  const generateUploadUrl = useMutation(api.users.generateUploadUrl);
  const updateImage = useMutation(api.users.updateImage);

  const [selectedImage, setSelectedImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [isUpdating, setIsUpdating] = useState(false); // Trạng thái loading (Tuỳ chọn)

  const router = useRouter();

  const onDone = async () => {
    // Tránh việc user bấm Lưu nhiều lần liên tục
    if (isUpdating) return;
    setIsUpdating(true);

    try {
      // 2. Chờ gửi thông tin text lên server xong mới làm bước tiếp theo
      await updateUser({ 
        _id: userId as Id<'users'>, 
        bio, 
        websiteUrl: link, 
        linkTitle: linkTitle 
      });
      
      // 3. Nếu có đổi ảnh thì upload ảnh
      if (selectedImage) {
        await updateProfilePicture();
      }
      
      // Xong xuôi tất cả mới đóng màn hình
      router.dismiss();
    } catch (error) {
      console.error("Lỗi cập nhật profile:", error);
      Alert.alert(t('edit_profile.error_title'), t('edit_profile.update_error'));
    } finally {
      setIsUpdating(false);
    }
  };

  const updateProfilePicture = async () => {
    const postUrl = await generateUploadUrl();
    const response = await fetch(selectedImage!.uri);
    const blob = await response.blob();
    
    // Đảm bảo luôn có Content-Type kể cả khi ImagePicker không trả về
    const mimeType = selectedImage!.mimeType || blob.type || 'image/jpeg';

    const result = await fetch(postUrl, {
      method: 'POST',
      headers: { 'Content-Type': mimeType },
      body: blob,
    });

    const { storageId } = await result.json();
    await updateImage({ storageId, _id: userId as Id<'users'> });
  };

  const selectImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1], // Tỉ lệ 1:1 cho ảnh tròn là quá chuẩn
      quality: 0.5,
    });
    if (!result.canceled) {
      setSelectedImage(result.assets[0]);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{flex: 1}}>
      <ScrollView>
        <Stack.Screen
          options={{
            headerRight: () => (
              <TouchableOpacity onPress={onDone} disabled={isUpdating}>
                <Text style={[styles.doneButtonText, isUpdating && { color: 'gray' }]}>
                  {isUpdating ? t('edit_profile.saving') : t('edit_profile.save')}
                </Text>
              </TouchableOpacity>
            ),
          }}
        />
        
        {/* Avatar */}
        <TouchableOpacity onPress={selectImage} style={{ marginTop: 20 }}>
          <Image 
            source={{ uri: selectedImage ? selectedImage.uri : (imageUrl || 'https://www.gravatar.com/avatar/?d=mp') }} 
            style={styles.image} 
          />
          <Text style={styles.changePhotoText}>{t('edit_profile.change_photo')}</Text>
        </TouchableOpacity>

        {/* Tiểu sử */}
        <View style={styles.section}>
          <Text style={styles.label}>{t('edit_profile.bio_label')}</Text>
          <TextInput
            value={bio}
            onChangeText={setBio}
            placeholder={t('edit_profile.bio_placeholder')}
            multiline
            style={styles.bioInput}
          />
        </View>

        {/* Liên kết */}
        <View style={styles.section}>
          <Text style={styles.label}>{t('edit_profile.link_label')}</Text>
          
          <TextInput 
            value={link} 
            onChangeText={setLink} 
            placeholder="https://example.com" 
            autoCapitalize="none" 
            style={styles.input}
          />

          <View style={styles.divider} />
          
          <Text style={[styles.label, { marginTop: 10 }]}>{t('edit_profile.link_title_label')}</Text>
          <TextInput 
            value={linkTitle} 
            onChangeText={setLinkTitle} 
            placeholder={t('edit_profile.link_title_placeholder')}
            style={styles.input}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};
export default Page;

const styles = StyleSheet.create({
  section: {
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8, // Bo góc mềm hơn
    padding: 12,
    marginHorizontal: 16,
    backgroundColor: '#fff',
  },
  bioInput: {
    height: 80,
    textAlignVertical: 'top',
    fontSize: 16,
  },
  input: {
    fontSize: 16,
    paddingVertical: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: 'bold',
    color: 'gray',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.submit, // Hoặc màu đen
  },
  image: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignSelf: 'center',
  },
  changePhotoText: {
    textAlign: 'center',
    color: '#0095f6',
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 10,
  },
  divider: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 10,
  }
});