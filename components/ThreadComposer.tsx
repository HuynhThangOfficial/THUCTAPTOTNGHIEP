import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Image,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useUserProfile } from '@/hooks/useUserProfile';
import { Colors } from '@/constants/Colors';
import { Ionicons, MaterialIcons, MaterialCommunityIcons, FontAwesome } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Id } from '@/convex/_generated/dataModel';

type ThreadComposerProps = {
  isPreview?: boolean;
  isReply?: boolean;
  threadId?: string;
};

type MediaPreviewItem = {
  type: 'existing' | 'new';
  uri: string;
  originalIdOrUri: string;
};

const ThreadComposer = ({ isPreview, isReply, threadId }: ThreadComposerProps) => {
  const router = useRouter();
  const { editId } = useLocalSearchParams();
  const { userProfile } = useUserProfile();

  const [threadContent, setThreadContent] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const [existingMediaIds, setExistingMediaIds] = useState<string[]>([]);
  const [newMediaUris, setNewMediaUris] = useState<string[]>([]);

  // API Mutations/Queries
  const addThread = useMutation(api.messages.addThread);
  const updateThread = useMutation(api.messages.updateThread);
  const generateUploadUrl = useMutation(api.messages.generateUploadUrl);

  const threadToEdit = useQuery(api.messages.getThreadById, editId ? { messageId: editId as Id<'messages'> } : 'skip');

  const defaultAvatar = 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y';

  useEffect(() => {
    if (threadToEdit) {
      setThreadContent(threadToEdit.content);
    }
  }, [threadToEdit]);

  const mediaPreviewList: MediaPreviewItem[] = useMemo(() => {
    const existing: MediaPreviewItem[] = (threadToEdit?.mediaFiles || []).map((url) => ({
      type: 'existing',
      uri: url,
      originalIdOrUri: url,
    }));

    const newItems: MediaPreviewItem[] = newMediaUris.map((uri) => ({
      type: 'new',
      uri: uri,
      originalIdOrUri: uri,
    }));

    const filteredExisting = existing.filter(item => existingMediaIds.includes(item.originalIdOrUri));

    return [...filteredExisting, ...newItems];
  }, [threadToEdit?.mediaFiles, newMediaUris, existingMediaIds]);


  useEffect(() => {
    if (threadToEdit?.mediaFiles) {
      setExistingMediaIds(threadToEdit.mediaFiles);
    }
  }, [threadToEdit]);

  const handleSelectImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.5,
    });
    if (!result.canceled) {
      setNewMediaUris([...newMediaUris, ...result.assets.map((asset) => asset.uri)]);
    }
  };

  const handleCamera = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (permission.status !== 'granted') {
      Alert.alert('Cấp quyền', 'Cần quyền camera.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.5 });
    if (!result.canceled) {
      setNewMediaUris([...newMediaUris, result.assets[0].uri]);
    }
  };

  const removeMedia = (item: MediaPreviewItem) => {
    if (item.type === 'new') {
      setNewMediaUris(newMediaUris.filter(uri => uri !== item.originalIdOrUri));
    } else {
      setExistingMediaIds(existingMediaIds.filter(id => id !== item.originalIdOrUri));
    }
  };

  const handleGif = () => Alert.alert('GIF', 'Tính năng đang phát triển');
  const handleMic = () => Alert.alert('Mic', 'Tính năng đang phát triển');
  const handleHashtag = () => setThreadContent(prev => prev + " #");
  const handlePoll = () => setThreadContent(prev => prev + "\n📊 Poll:\n1. \n2. ");

  const handleSubmit = async () => {
    if (threadContent.trim() === '' && mediaPreviewList.length === 0) return;
    setIsUploading(true);

    try {
      const newUploadedIds = await Promise.all(
        newMediaUris.map(async (uri) => {
          const postUrl = await generateUploadUrl();
          const response = await fetch(uri);
          const blob = await response.blob();
          const result = await fetch(postUrl, {
            method: "POST",
            headers: { "Content-Type": "image/jpeg" },
            body: blob,
          });
          const { storageId } = await result.json();
          return storageId;
        })
      );

      if (editId) {
        if (existingMediaIds.length > 0 && newUploadedIds.length === 0 && threadContent !== threadToEdit?.content) {
           await updateThread({
            messageId: editId as Id<'messages'>,
            content: threadContent,
          });
        } else {
           await updateThread({
            messageId: editId as Id<'messages'>,
            content: threadContent,
            mediaFiles: newUploadedIds,
          });
        }
      } else {
        await addThread({
          // SỬA LỖI TẠI ĐÂY: Ép kiểu string sang Id<'messages'>
          threadId: threadId as Id<'messages'>, 
          content: threadContent,
          mediaFiles: newUploadedIds,
        });
      }

      router.dismiss();
    } catch (error) {
      console.error("Lỗi:", error);
      Alert.alert('Lỗi', 'Có lỗi xảy ra. Vui lòng thử lại.');
    } finally {
      setIsUploading(false);
    }
  };

  if (isPreview) {
    return (
      <View style={styles.previewContainer}>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Image
            source={{ uri: userProfile?.imageUrl || defaultAvatar }}
            style={styles.avatar}
          />
          <View style={{ flex: 1, justifyContent: 'center' }}>
            <Text style={styles.placeholderText}>Bạn đang nghĩ gì?</Text>
            <View style={[styles.mediaIcons, { marginTop: 8 }]}>
               <Ionicons name="images-outline" size={20} color={Colors.border} />
               <Ionicons name="camera-outline" size={20} color={Colors.border} />
               <MaterialIcons name="gif" size={24} color={Colors.border} />
               <Ionicons name="mic-outline" size={20} color={Colors.border} />
               <FontAwesome name="hashtag" size={18} color={Colors.border} />
               <MaterialCommunityIcons name="chart-bar" size={20} color={Colors.border} />
            </View>
          </View>
        </View>
      </View>
    );
  }

  if (editId && !threadToEdit) {
    return <View style={[styles.container, { justifyContent: 'center' }]}><ActivityIndicator /></View>;
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}>

      <Stack.Screen
        options={{
          headerTitle: editId ? 'Chỉnh Sửa' : (isReply ? 'Phản hồi' : 'Bài Viết Mới'),
          headerTitleAlign: 'center',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.dismiss()}>
              <Text style={{ fontSize: 16 }}>Hủy</Text>
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={isUploading || (threadContent.trim().length === 0 && mediaPreviewList.length === 0)}
              style={{ opacity: isUploading ? 0.5 : 1 }}>
              <Text style={styles.postButtonText}>
                {isUploading ? '...' : (editId ? 'Lưu' : 'Đăng')}
              </Text>
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Image
            source={{ uri: userProfile?.imageUrl || defaultAvatar }}
            style={styles.avatar}
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.username}>
              {userProfile?.first_name} {userProfile?.last_name}
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Bạn đang nghĩ gì?"
              value={threadContent}
              onChangeText={setThreadContent}
              multiline
              autoFocus={!isPreview && !editId}
              editable={!isUploading}
              placeholderTextColor={Colors.border}
            />

            {mediaPreviewList.length > 0 && (
              <ScrollView horizontal style={styles.mediaScroll} showsHorizontalScrollIndicator={false}>
                {mediaPreviewList.map((item, index) => (
                  <View key={index} style={styles.mediaItem}>
                    <Image source={{ uri: item.uri }} style={styles.mediaImage} />
                    <TouchableOpacity
                      style={styles.deleteIconContainer}
                      onPress={() => removeMedia(item)}
                    >
                      <Ionicons name="close" size={16} color="white" />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}

            <View style={styles.mediaIcons}>
              <TouchableOpacity onPress={handleSelectImage}>
                <Ionicons name="images-outline" size={24} color={Colors.border} />
              </TouchableOpacity>

              <TouchableOpacity onPress={handleCamera}>
                <Ionicons name="camera-outline" size={24} color={Colors.border} />
              </TouchableOpacity>

              <TouchableOpacity onPress={handleGif}>
                <View style={styles.gifIcon}>
                   <Text style={styles.gifText}>GIF</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity onPress={handleMic}>
                <Ionicons name="mic-outline" size={24} color={Colors.border} />
              </TouchableOpacity>

              <TouchableOpacity onPress={handleHashtag}>
                <FontAwesome name="hashtag" size={20} color={Colors.border} />
              </TouchableOpacity>

              <TouchableOpacity onPress={handlePoll}>
                <MaterialCommunityIcons name="chart-bar" size={24} color={Colors.border} />
              </TouchableOpacity>
            </View>

          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default ThreadComposer;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white' },
  previewContainer: { padding: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: Colors.border, backgroundColor: 'white' },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  placeholderText: { color: Colors.border, fontSize: 16 },
  username: { fontWeight: 'bold', fontSize: 16, marginBottom: 4 },
  input: { fontSize: 16, color: 'black', textAlignVertical: 'top', minHeight: 40 },
  postButtonText: { color: Colors.submit, fontWeight: 'bold', fontSize: 16 },

  mediaScroll: { marginTop: 10, marginBottom: 10 },
  mediaItem: { position: 'relative', marginRight: 10 },
  mediaImage: { width: 100, height: 150, borderRadius: 10 },
  deleteIconContainer: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
    padding: 4,
  },

  mediaIcons: { flexDirection: 'row', gap: 20, marginTop: 10, alignItems: 'center' },
  gifIcon: { borderWidth: 1.5, borderColor: Colors.border, borderRadius: 4, paddingHorizontal: 2 },
  gifText: { fontSize: 10, fontWeight: 'bold', color: Colors.border },
});