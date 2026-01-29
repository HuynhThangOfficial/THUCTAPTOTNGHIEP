import { StyleSheet, Text, TextInput, View, TouchableOpacity, Image, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import React, { useState } from 'react';
import { Colors } from '@/constants/Colors';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import * as ImagePicker from 'expo-image-picker';
import * as Sentry from '@sentry/react-native';

const Page = () => {
  // 1. Nhận thêm tham số linkTitlestring từ URL
  const { biostring, linkstring, linkTitlestring, userId, imageUrl } = useLocalSearchParams<{
    biostring: string;
    linkstring: string;
    linkTitlestring: string; // <--- Thêm
    userId: string;
    imageUrl: string;
  }>();

  const [bio, setBio] = useState(biostring);
  const [link, setLink] = useState(linkstring);
  const [linkTitle, setLinkTitle] = useState(linkTitlestring); // <--- State mới

  const updateUser = useMutation(api.users.updateUser);
  const generateUploadUrl = useMutation(api.users.generateUploadUrl);
  const updateImage = useMutation(api.users.updateImage);

  const [selectedImage, setSelectedImage] = useState<ImagePicker.ImagePickerAsset | null>(null);

  const router = useRouter();

  const onDone = async () => {
    // 2. Gửi linkTitle lên server
    updateUser({ 
      _id: userId as Id<'users'>, 
      bio, 
      websiteUrl: link, 
      linkTitle: linkTitle // <--- Thêm
    });
    
    if (selectedImage) {
      await updateProfilePicture();
    }
    router.dismiss();
  };

  const updateProfilePicture = async () => {
    const postUrl = await generateUploadUrl();
    const response = await fetch(selectedImage!.uri);
    const blob = await response.blob();
    const result = await fetch(postUrl, {
      method: 'POST',
      headers: { 'Content-Type': selectedImage!.mimeType! },
      body: blob,
    });
    const { storageId } = await result.json();
    await updateImage({ storageId, _id: userId as Id<'users'> });
  };

  const selectImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1], // Sửa thành 1:1 cho ảnh tròn đẹp hơn
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
              <TouchableOpacity onPress={onDone}>
                <Text style={styles.doneButtonText}>Lưu</Text>
              </TouchableOpacity>
            ),
          }}
        />
        
        {/* Avatar */}
        <TouchableOpacity onPress={selectImage} style={{ marginTop: 20 }}>
          {selectedImage ? (
            <Image source={{ uri: selectedImage.uri }} style={styles.image} />
          ) : (
            <Image source={{ uri: imageUrl }} style={styles.image} />
          )}
          <Text style={styles.changePhotoText}>Đổi ảnh đại diện</Text>
        </TouchableOpacity>

        {/* Tiểu sử */}
        <View style={styles.section}>
          <Text style={styles.label}>Tiểu sử</Text>
          <TextInput
            value={bio}
            onChangeText={setBio}
            placeholder="Viết đôi dòng về bạn..."
            multiline
            style={styles.bioInput}
          />
        </View>

        {/* Liên kết */}
        <View style={styles.section}>
          <Text style={styles.label}>Liên kết</Text>
          
          {/* Ô nhập URL */}
          <TextInput 
            value={link} 
            onChangeText={setLink} 
            placeholder="https://example.com" 
            autoCapitalize="none" 
            style={styles.input}
          />

          {/* Ô nhập Tiêu đề (Mới) */}
          <View style={styles.divider} />
          <Text style={[styles.label, { marginTop: 10 }]}>Tiêu đề liên kết (Tùy chọn)</Text>
          <TextInput 
            value={linkTitle} 
            onChangeText={setLinkTitle} 
            placeholder="Ví dụ: LinkedIn, Facebook của tôi..." 
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