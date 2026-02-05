import React, { useState } from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity, ScrollView, Alert, SafeAreaView } from 'react-native'; // <--- Đã thêm SafeAreaView
import { Feather, Ionicons, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Doc } from '@/convex/_generated/dataModel';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Colors } from '@/constants/Colors';
import { Link, useRouter } from 'expo-router';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useActionSheet } from '@expo/react-native-action-sheet';
import ImageView from "react-native-image-viewing";

type ThreadProps = {
  thread: Doc<'messages'> & {
    creator: Doc<'users'>;
    isLiked?: boolean;
  };
};

const Thread = ({ thread }: ThreadProps) => {
  const { content, mediaFiles, likeCount, commentCount, retweetCount, creator, isLiked } = thread;

  const { userProfile } = useUserProfile();
  const { showActionSheetWithOptions } = useActionSheet();
  const router = useRouter();

  const [visible, setVisible] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const likeThread = useMutation(api.messages.likeThread);
  const deleteThread = useMutation(api.messages.deleteThread);
  const editHistory = useQuery(api.messages.getEditHistory, { messageId: thread._id });

  const isOwner = userProfile?._id === thread.userId;

  const images = (mediaFiles || [])
    .filter(url => url)
    .map((url) => ({ uri: url as string }));

  const openImageViewer = (index: number) => {
    setCurrentImageIndex(index);
    setVisible(true);
  };

  const showHistory = () => {
      if (!editHistory || editHistory.length === 0) {
        Alert.alert('Lịch sử chỉnh sửa', 'Bài viết này chưa từng được chỉnh sửa.');
        return;
      }

      const historyList = editHistory.map((h, index) => {
          const date = new Date(h._creationTime);
          const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const dateString = date.toLocaleDateString();

          let versionLabel;
          if (index === 0) {
            versionLabel = `🌟 Phiên bản mới nhất`;
          } else {
            const versionNumber = editHistory.length - index;
            versionLabel = `🕒 Phiên bản ${versionNumber}`;
          }

          let details = "";
          if (h.isTextModified) {
            const oldContentDisplay = h.oldContent ? `"${h.oldContent}"` : '""';
            details += `\nNội dung đã chỉnh sửa: ${oldContentDisplay}`;
          }

          if (h.imageChangeLog && h.imageChangeLog.length > 0) {
            details += `\n🖼️ ${h.imageChangeLog}`;
          }

          return `${versionLabel} (${timeString} - ${dateString}):${details}`;
        })
        .join('\n\n----------------\n\n');

      Alert.alert('Lịch sử thay đổi', historyList);
    };

  const onActionPress = () => {
    const options = isOwner
      ? ['Chỉnh sửa bài viết', 'Xem lịch sử chỉnh sửa', 'Xóa bài viết', 'Hủy']
      : ['Báo cáo bài viết', 'Xem lịch sử chỉnh sửa', 'Hủy'];

    const icons = isOwner
      ? [
          <Ionicons name="pencil-outline" size={24} color="black" />,
          <Ionicons name="time-outline" size={24} color="black" />,
          <Ionicons name="trash-outline" size={24} color="red" />,
          <Ionicons name="close-outline" size={24} color="black" />,
        ]
      : [
          <Ionicons name="alert-circle-outline" size={24} color="black" />,
          <Ionicons name="time-outline" size={24} color="black" />,
          <Ionicons name="close-outline" size={24} color="black" />,
        ];

    const destructiveButtonIndex = isOwner ? 2 : undefined;
    const cancelButtonIndex = options.length - 1;

    showActionSheetWithOptions(
      {
        options,
        icons,
        cancelButtonIndex,
        destructiveButtonIndex,
        title: 'Tùy chọn bài viết',
        titleTextStyle: { fontWeight: 'bold' },
      },
      (selectedIndex?: number) => {
        if (isOwner) {
          switch (selectedIndex) {
            case 0:
              router.push(`/(auth)/(modal)/edit/${thread._id}`);
              break;
            case 1:
              showHistory();
              break;
            case 2:
              handleDelete();
              break;
          }
        } else {
          switch (selectedIndex) {
            case 0:
              Alert.alert('Báo cáo', 'Đã gửi báo cáo bài viết này.');
              break;
            case 1:
              showHistory();
              break;
          }
        }
      }
    );
  };

  const handleDelete = () => {
    Alert.alert('Xóa bài viết', 'Bạn có chắc chắn muốn xóa bài viết này?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteThread({ messageId: thread._id });
          } catch (err) {
            Alert.alert('Lỗi', 'Không thể xóa bài viết');
          }
        },
      },
    ]);
  };

  // --- COMPONENT HEADER CHO ẢNH (MỚI THÊM) ---
  const ImageHeader = ({ imageIndex }: { imageIndex: number }) => (
    <SafeAreaView style={styles.imageHeader}>
      <TouchableOpacity
        style={styles.closeImageButton}
        onPress={() => setVisible(false)} // Đóng viewer
        hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
      >
        <Ionicons name="close" size={28} color="white" />
      </TouchableOpacity>
    </SafeAreaView>
  );

  return (
    <View style={styles.container}>
      <Image
        source={{ uri: creator?.imageUrl || 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y' }}
        style={styles.avatar}
      />

      <View style={{ flex: 1 }}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Link href={`/feed/profile/${creator?._id}`} asChild>
              <Text style={styles.username}>
                {creator?.first_name} {creator?.last_name}
              </Text>
            </Link>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
               <Text style={styles.timestamp}>
                {new Date(thread._creationTime).toLocaleDateString()}
               </Text>
               {editHistory && editHistory.length > 0 && (
                 <Text style={{ fontSize: 10, color: '#999' }}>(Đã chỉnh sửa)</Text>
               )}
            </View>
          </View>

          <TouchableOpacity onPress={onActionPress}>
            <Ionicons name="ellipsis-horizontal" size={24} color={Colors.border} />
          </TouchableOpacity>
        </View>

        <Text style={styles.content}>{content}</Text>

        {mediaFiles && mediaFiles.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.mediaContainer}>
            {mediaFiles.map((imageUrl, index) => {
              if (!imageUrl) return null;
              return (
                <TouchableOpacity
                  key={index}
                  onPress={() => openImageViewer(index)}
                  activeOpacity={0.9}
                >
                  <Image source={{ uri: imageUrl }} style={styles.mediaImage} />
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionButton} onPress={() => likeThread({ messageId: thread._id })}>
            <Ionicons
              name={isLiked ? "heart" : "heart-outline"}
              size={24}
              color={isLiked ? "red" : "black"}
            />
            <Text style={[styles.actionText, { color: isLiked ? "red" : "black" }]}>
              {likeCount}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="chatbubble-outline" size={24} color="black" />
            <Text style={styles.actionText}>{commentCount}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="repeat-outline" size={24} color="black" />
            <Text style={styles.actionText}>{retweetCount}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Feather name="send" size={22} color="black" />
          </TouchableOpacity>
        </View>

        <ImageView
          images={images}
          imageIndex={currentImageIndex}
          visible={visible}
          onRequestClose={() => setVisible(false)}
          swipeToCloseEnabled={true}
          doubleTapToZoomEnabled={true}
          HeaderComponent={ImageHeader} // <--- ĐÃ THÊM HEADER VÀO ĐÂY
          FooterComponent={({ imageIndex }) => (
            <View style={styles.imageFooter}>
              <Text style={styles.imageFooterText}>
                {imageIndex + 1} / {images.length}
              </Text>
            </View>
          )}
        />
      </View>
    </View>
  );
};

export default Thread;

const styles = StyleSheet.create({
  container: { padding: 15, flexDirection: 'row' },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, justifyContent: 'space-between' },
  avatar: { width: 40, height: 40, borderRadius: 20, marginRight: 10 },
  headerText: { flex: 1, flexDirection: 'column', gap: 2 },
  username: { fontWeight: 'bold', fontSize: 16 },
  timestamp: { color: '#777', fontSize: 12 },
  content: { fontSize: 16, marginBottom: 10 },
  mediaImage: { width: 200, height: 200, borderRadius: 10, marginBottom: 10 },
  mediaContainer: { flexDirection: 'row', gap: 14, paddingRight: 40 },
  actions: { flexDirection: 'row', marginTop: 10, gap: 16 },
  actionButton: { flexDirection: 'row', alignItems: 'center' },
  actionText: { marginLeft: 5 },

  // --- STYLE MỚI CHO HEADER VÀ NÚT ĐÓNG ---
  imageHeader: {
    position: 'absolute',
    top: 0,
    width: '100%',
    zIndex: 1,
    alignItems: 'flex-end', // Căn phải
    paddingHorizontal: 20,
  },
  closeImageButton: {
    padding: 10,
    marginTop: 10,
  },
  // ----------------------------------------

  imageFooter: {
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    width: '100%',
  },
  imageFooterText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});