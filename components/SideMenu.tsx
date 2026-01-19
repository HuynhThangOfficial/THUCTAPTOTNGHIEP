import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, ActivityIndicator, LayoutAnimation, Platform, UIManager } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons'; // Thêm Ionicons
import { useUserProfile } from '@/hooks/useUserProfile';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';

// Kích hoạt LayoutAnimation trên Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const getIconSource = (iconString?: string) => {
  if (iconString === 'local:login') {
    // Trỏ đúng vào file ảnh trong assets của bạn
    return require('@/assets/images/login.png');
  }
  // Nếu là link online hoặc null
  return { uri: iconString || 'https://via.placeholder.com/50' };
};

export default function SideMenu() {
  const { top, bottom } = useSafeAreaInsets();
  const { userProfile } = useUserProfile();

  const data = useQuery(api.categories.getList);

  const [activeServerId, setActiveServerId] = useState<string | null>(null);

  // State lưu trạng thái đóng/mở của các nhóm (Key là ID của nhóm)
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    // Mặc định có thể set true hết nếu muốn mở sẵn
  });

  if (!data) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color="gray" />
      </View>
    );
  }

  // Lấy dữ liệu từ Backend
  const { servers = [], groups = [], channels = [] } = data;

  const currentUniversityId = activeServerId || servers[0]?._id;
  const currentUniversity = servers.find((s) => s._id === currentUniversityId);

  // 1. Lọc các kênh lẻ (VD: đại-sảnh) - parentId là Trường
  const standaloneChannels = channels.filter(c => c.parentId === currentUniversityId);

  // 2. Lọc các Nhóm thuộc trường (VD: CỘNG ĐỒNG, KHOÁ)
  const currentGroups = groups.filter(g => g.parentId === currentUniversityId);

  // Hàm toggle đóng mở nhóm
  const toggleGroup = (groupId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId] // Đảo ngược trạng thái
    }));
  };

  return (
    <View style={styles.container}>
      {/* --- CỘT 1: TRƯỜNG ĐẠI HỌC --- */}
      <View style={[styles.serverRail, { paddingTop: top }]}>
        {servers.map((uni) => (
          <TouchableOpacity
            key={uni._id}
            style={styles.serverItem}
            onPress={() => setActiveServerId(uni._id)}
          >
            <Image
              source={getIconSource(uni.icon)}
              style={styles.serverIcon}
              resizeMode="cover"
            />
            {uni._id === currentUniversityId && <View style={styles.activePill} />}
          </TouchableOpacity>
        ))}
      </View>

      {/* --- CỘT 2: DANH SÁCH KÊNH --- */}
      <View style={[styles.channelRail, { paddingTop: top, paddingBottom: bottom }]}>

        {/* Header Tên Trường */}
        <View style={styles.serverHeader}>
          <Text style={styles.serverName} numberOfLines={1}>
            {currentUniversity?.name || "Chọn Trường"}
          </Text>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>

            {/* 1. HIỂN THỊ KÊNH LẺ (VD: ĐẠI SẢNH) */}
            {standaloneChannels.map((channel) => (
                <TouchableOpacity key={channel._id} style={styles.channelItem}>
                    <MaterialCommunityIcons name="pound" size={20} color="gray" />
                    <Text style={styles.channelText}>{channel.name}</Text>
                </TouchableOpacity>
            ))}

            {/* 2. HIỂN THỊ NHÓM (CỘNG ĐỒNG, KHOÁ...) */}
            {currentGroups.map((group) => {
              const isExpanded = expandedGroups[group._id] ?? true; // Mặc định mở (true)
              // Lọc các kênh con thuộc nhóm này
              const childChannels = channels.filter(c => c.parentId === group._id);

              return (
                <View key={group._id} style={{ marginTop: 16 }}>
                  {/* Tiêu đề nhóm (Có mũi tên) */}
                  <TouchableOpacity
                    style={styles.categoryHeader}
                    onPress={() => toggleGroup(group._id)}
                  >
                    <Ionicons
                      name={isExpanded ? "chevron-down" : "chevron-forward"}
                      size={12}
                      color="gray"
                    />
                    <Text style={styles.categoryTitle}>{group.name}</Text>
                  </TouchableOpacity>

                  {/* Danh sách kênh con (Chỉ hiện khi Expanded) */}
                  {isExpanded && (
                    <View>
                      {childChannels.map(channel => (
                        <TouchableOpacity key={channel._id} style={styles.channelItem}>
                            <MaterialCommunityIcons name="pound" size={20} color="gray" />
                            <Text style={styles.channelText}>{channel.name}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              );
            })}

            <View style={{ height: 20 }} />
        </ScrollView>

        {/* Footer User */}
        <View style={styles.userFooter}>
            <Image
              source={{ uri: userProfile?.imageUrl || 'https://github.com/shadcn.png' }}
              style={styles.footerAvatar}
            />
            <View style={{ marginLeft: 8, flex: 1 }}>
                <Text style={styles.footerName} numberOfLines={1}>
                  {userProfile?.first_name} {userProfile?.last_name}
                </Text>
                <Text style={styles.footerUsername} numberOfLines={1}>
                  @{userProfile?.username}
                </Text>
            </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#f2f3f5',
    width: 300
  },
  serverRail: {
    width: 72,
    backgroundColor: '#E3E5E8',
    alignItems: 'center',
    paddingBottom: 10
  },
  serverItem: {
    marginBottom: 12,
    alignItems: 'center',
    width: 72,
    justifyContent: 'center',
    position: 'relative',
  },
  serverIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#d1d1d1'
  },
  activePill: {
    position: 'absolute',
    left: 0,
    width: 4,
    height: 40,
    backgroundColor: 'black',
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4
  },
  channelRail: {
    flex: 1,
    backgroundColor: '#F2F3F5'
  },
  serverHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: 'white',
    height: 56,
    justifyContent: 'center',
    marginBottom: 8 // Khoảng cách với kênh đầu tiên
  },
  serverName: {
    fontWeight: '900',
    fontSize: 15,
    textTransform: 'uppercase',
  },

  // Style cho Category (Mục cha)
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8, // Thụt lề ít hơn kênh
    marginBottom: 4,
    paddingVertical: 4
  },
  categoryTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: 'gray',
    marginLeft: 4,
    textTransform: 'uppercase'
  },

  channelItem: {
    flexDirection: 'row',
    padding: 8, // Discord padding nhỏ hơn
    paddingHorizontal: 12,
    marginHorizontal: 8,
    alignItems: 'center',
    borderRadius: 4,
    marginTop: 1 // Sát nhau hơn
  },
  channelText: {
    marginLeft: 6,
    color: '#5c5e62',
    fontWeight: '500',
    fontSize: 15,
    flex: 1
  },

  userFooter: {
    padding: 10,
    backgroundColor: '#ebedef',
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0'
  },
  footerAvatar: { width: 32, height: 32, borderRadius: 16 },
  footerName: { fontWeight: 'bold', fontSize: 13, color: 'black' },
  footerUsername: { fontSize: 11, color: 'gray' }
});