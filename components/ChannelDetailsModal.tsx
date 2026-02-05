import React, { useState, useMemo } from 'react';
import {
  StyleSheet, Text, View, Modal, TouchableOpacity, Image, FlatList,
  Linking, SafeAreaView, Platform, NativeSyntheticEvent, TextLayoutEventData
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { Colors } from '@/constants/Colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ImageView from "react-native-image-viewing";

type ChannelDetailsModalProps = {
  visible: boolean;
  onClose: () => void;
  channelId: Id<'channels'>;
};

export default function ChannelDetailsModal({ visible, onClose, channelId }: ChannelDetailsModalProps) {
  const channelInfo = useQuery(api.university.getChannelDetails, { channelId });
  const attachments = useQuery(api.messages.getChannelAttachments, { channelId });

  const [activeTab, setActiveTab] = useState<'media' | 'links'>('media');
  const [isDescExpanded, setIsDescExpanded] = useState(false);
  const [isTruncated, setIsTruncated] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(-1);
  const insets = useSafeAreaInsets();

  // Sử dụng useMemo để lọc danh sách ảnh duy nhất (Unique)
  const uniqueMediaList = useMemo(() => {
    if (!attachments?.mediaList) return [];
    // Set sẽ tự động loại bỏ các phần tử trùng nhau
    return Array.from(new Set(attachments.mediaList));
  }, [attachments?.mediaList]);

  // Tạo danh sách object cho ImageView từ danh sách đã lọc
  const imagesForViewer = uniqueMediaList.map(uri => ({ uri }));
  // -----------------------------------

  if (!visible || !channelInfo) return null;

  const onTextLayout = (e: NativeSyntheticEvent<TextLayoutEventData>) => {
    setIsTruncated(e.nativeEvent.lines.length > 2);
  };

  const ImageHeader = () => (
    <SafeAreaView style={styles.imageHeader}>
      <TouchableOpacity
        style={styles.closeImageButton}
        onPress={() => setSelectedImageIndex(-1)}
        hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
      >
        <Ionicons name="close" size={28} color="white" />
      </TouchableOpacity>
    </SafeAreaView>
  );

  const ImageFooter = ({ imageIndex }: { imageIndex: number }) => (
    <View style={[styles.imageFooter, { paddingBottom: insets.bottom + 20 }]}>
      <Text style={styles.imageFooterText}>{`${imageIndex + 1} / ${imagesForViewer.length}`}</Text>
    </View>
  );

  return (
    <View>
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={onClose}
      >
        <SafeAreaView style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.iconButton}>
              <Ionicons name="arrow-back" size={28} color="black" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton}>
              <Ionicons name="notifications-outline" size={24} color="black" />
            </TouchableOpacity>
          </View>

          <View style={styles.contentContainer}>
              <View style={styles.infoSection}>
                  <Text style={styles.channelName}># {channelInfo.name}</Text>
                  <Text style={styles.uniName}>{channelInfo.universityName}</Text>

                  <TouchableOpacity
                    activeOpacity={1}
                    onPress={isTruncated ? () => setIsDescExpanded(!isDescExpanded) : undefined}
                  >
                      <Text
                          style={styles.description}
                          numberOfLines={isDescExpanded ? undefined : 2}
                          onTextLayout={onTextLayout}
                      >
                          {channelInfo.description || "Chào mừng bạn đến với kênh thảo luận này!"}
                      </Text>

                      {isTruncated && (
                        <Text style={styles.toggleText}>
                            {isDescExpanded ? "Thu gọn" : "Xem thêm"}
                        </Text>
                      )}
                  </TouchableOpacity>
              </View>

              <View style={styles.tabContainer}>
                  <TouchableOpacity
                      style={[styles.tabButton, activeTab === 'media' && styles.activeTab]}
                      onPress={() => setActiveTab('media')}
                  >
                      <Text style={[styles.tabText, activeTab === 'media' && styles.activeTabText]}>Đa phương tiện</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                      style={[styles.tabButton, activeTab === 'links' && styles.activeTab]}
                      onPress={() => setActiveTab('links')}
                  >
                      <Text style={[styles.tabText, activeTab === 'links' && styles.activeTabText]}>Liên kết</Text>
                  </TouchableOpacity>
              </View>

              {activeTab === 'media' ? (
                  <FlatList
                      key="media-grid"
                      // --- SỬA: Dùng danh sách đã lọc trùng ---
                      data={uniqueMediaList}
                      // ----------------------------------------
                      keyExtractor={(item, index) => index.toString()} // Index giờ đã an toàn vì list không trùng
                      numColumns={3}
                      contentContainerStyle={{ paddingBottom: 20 }}
                      renderItem={({ item, index }) => (
                          <TouchableOpacity
                            style={styles.gridImageContainer}
                            onPress={() => setSelectedImageIndex(index)}
                          >
                              <Image source={{ uri: item }} style={styles.gridImage} />
                          </TouchableOpacity>
                      )}
                      ListEmptyComponent={<Text style={styles.emptyText}>Chưa có ảnh nào.</Text>}
                  />
              ) : (
                  <FlatList
                      key="link-list"
                      data={attachments?.linkList || []}
                      keyExtractor={(item, index) => index.toString()}
                      contentContainerStyle={{ padding: 16 }}
                      renderItem={({ item }) => (
                          <TouchableOpacity
                              style={styles.linkItem}
                              onPress={() => Linking.openURL(item.url)}
                          >
                              <View style={styles.linkIconBox}>
                                  <Ionicons name="link" size={20} color="white" />
                              </View>
                              <View style={{flex: 1}}>
                                  <Text style={styles.linkUrl} numberOfLines={1}>{item.url}</Text>
                                  <Text style={styles.linkTitle} numberOfLines={1}>{item.title || "Liên kết"}</Text>
                              </View>
                          </TouchableOpacity>
                      )}
                      ListEmptyComponent={<Text style={styles.emptyText}>Chưa có liên kết nào.</Text>}
                  />
              )}
          </View>
        </SafeAreaView>
      </Modal>

      <ImageView
        images={imagesForViewer}
        imageIndex={selectedImageIndex}
        visible={selectedImageIndex > -1}
        onRequestClose={() => setSelectedImageIndex(-1)}
        HeaderComponent={ImageHeader}
        FooterComponent={ImageFooter}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 40 : 10,
    paddingBottom: 10,
  },
  iconButton: { padding: 5 },
  contentContainer: { flex: 1 },

  infoSection: { paddingHorizontal: 20, marginBottom: 20 },
  channelName: { fontSize: 28, fontWeight: 'bold', marginBottom: 4 },
  uniName: { fontSize: 16, color: 'gray', fontWeight: '600', marginBottom: 12 },
  description: { fontSize: 15, lineHeight: 22, color: '#333' },
  toggleText: { color: Colors.primary || '#007aff', marginTop: 5, fontSize: 13, fontWeight: '600' },

  tabContainer: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#eee', marginBottom: 10 },
  tabButton: { flex: 1, paddingVertical: 14, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  activeTab: { borderBottomColor: 'black' },
  tabText: { fontSize: 15, color: 'gray', fontWeight: '600' },
  activeTabText: { color: 'black' },

  gridImageContainer: { width: '33.33%', aspectRatio: 1, borderWidth: 1, borderColor: '#fff' },
  gridImage: { width: '100%', height: '100%' },

  linkItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 12 },
  linkIconBox: { width: 40, height: 40, backgroundColor: '#333', borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  linkUrl: { fontSize: 14, color: '#007aff', fontWeight: 'bold' },
  linkTitle: { fontSize: 13, color: 'gray' },

  emptyText: { textAlign: 'center', marginTop: 40, color: 'gray' },

  imageHeader: {
    position: 'absolute',
    top: 0,
    width: '100%',
    zIndex: 1,
    alignItems: 'flex-end',
    paddingHorizontal: 20,
  },
  closeImageButton: {
    padding: 10,
    marginTop:10,
  },
  imageFooter: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    zIndex: 1,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingTop: 15,
  },
  imageFooterText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  }
});