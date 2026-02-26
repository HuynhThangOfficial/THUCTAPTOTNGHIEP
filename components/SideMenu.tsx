import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, ActivityIndicator, LayoutAnimation, Platform, UIManager, Modal, SafeAreaView, Alert, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useChannel } from '@/context/ChannelContext';
import * as ImagePicker from 'expo-image-picker';
import { Id } from '@/convex/_generated/dataModel';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const LOCAL_IMAGES: Record<string, any> = { 'local:login': require('../assets/images/login.png') };
const getIconSource = (iconString?: string) => (iconString && LOCAL_IMAGES[iconString] ? LOCAL_IMAGES[iconString] : { uri: iconString || 'https://via.placeholder.com/50' });

const TEMPLATES = [
  { id: 'Gaming', name: 'Gaming', icon: '🎮' },
  { id: 'School', name: 'Câu Lạc Bộ Trường Học', icon: '🏫' },
  { id: 'Study', name: 'Nhóm Học Tập', icon: '🍎' },
  { id: 'Friends', name: 'Bạn bè', icon: '💗' },
  { id: 'Creators', name: 'Nghệ Sĩ và Người Sáng Tạo', icon: '🎨' },
];

export default function SideMenu() {
  const { top, bottom } = useSafeAreaInsets();
  const { userProfile } = useUserProfile();

  const universities = useQuery(api.university.getUniversities);
  const myServers = useQuery(api.university.getMyServers);
  const myFriends = useQuery(api.users.getFriends, userProfile ? { userId: userProfile._id } : "skip");

  const createServer = useMutation(api.university.createServer);
  const updateServer = useMutation(api.university.updateServer);
  const deleteServer = useMutation(api.university.deleteServer);
  const addFriendToServer = useMutation(api.university.addFriendToServer);
  const generateUploadUrl = useMutation(api.users.generateUploadUrl);
  const createChannel = useMutation(api.university.createChannel);

  // 👇 ĐĂNG KÝ API XÓA KÊNH MỚI
  const deleteChannel = useMutation(api.university.deleteChannel);

  const { activeUniversityId, setActiveUniversityId, activeServerId, setActiveServerId, activeChannelId, setActiveChannelId, setActiveChannelName } = useChannel();
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const [isCreateModalVisible, setCreateModalVisible] = useState(false);
  const [isSettingsModalVisible, setSettingsModalVisible] = useState(false);
  const [editServerName, setEditServerName] = useState('');

  const [isCreateChannelModalVisible, setCreateChannelModalVisible] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelType, setNewChannelType] = useState<'category' | 'channel'>('channel');
  const [selectedCategoryId, setSelectedCategoryId] = useState<Id<'channels'> | undefined>(undefined);

  const channelsData = useQuery(api.university.getChannels, {
    universityId: activeUniversityId || undefined,
    serverId: activeServerId || undefined
  });

  useEffect(() => {
    if (universities && universities.length > 0 && !activeUniversityId && !activeServerId) {
       setActiveUniversityId(universities[0]._id);
    }
  }, [universities]);

  useEffect(() => {
    const chans = channelsData?.channels || [];
    if (chans.length > 0 && !activeChannelId) {
       const defaultChannel = chans.find(c => c.name === 'đại-sảnh') || chans[0];
       setActiveChannelId(defaultChannel._id);
       setActiveChannelName(defaultChannel.name);
    }
  }, [channelsData, activeUniversityId, activeServerId]);

  if (universities === undefined || channelsData === undefined) {
    return <View style={[styles.container, {justifyContent:'center', alignItems: 'center'}]}><ActivityIndicator color="#000" /></View>;
  }

  const groups = channelsData?.groups || [];
  const channels = channelsData?.channels || [];

  const currentWorkspace = activeUniversityId
    ? universities.find(u => u._id === activeUniversityId)
    : myServers?.find(s => s._id === activeServerId);

  const isOwner = activeServerId && currentWorkspace && 'creatorId' in currentWorkspace && currentWorkspace.creatorId === userProfile?._id;

  const switchToUniversity = (id: Id<'universities'>) => {
    setActiveServerId(null); setActiveUniversityId(id); setActiveChannelId(null);
  };

  const switchToServer = (id: Id<'servers'>) => {
    setActiveUniversityId(null); setActiveServerId(id); setActiveChannelId(null);
  };

  const toggleGroup = (groupId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  // --- HÀM XỬ LÝ NHẤN GIỮ ĐỂ XÓA KÊNH / DANH MỤC ---
  const handleLongPressDelete = (target: any, isCategory: boolean) => {
    // Không cho phép xóa kênh mặc định
    if (target.name === 'đại-sảnh') {
      Alert.alert("Không hợp lệ", "Bạn không thể xóa kênh đại sảnh mặc định của máy chủ!");
      return;
    }

    Alert.alert(
      `Xóa ${isCategory ? 'Danh mục' : 'Kênh'}`,
      `Bạn có chắc chắn muốn xóa "${target.name}"? ${isCategory ? 'Toàn bộ các kênh con và tin nhắn bên trong đều sẽ bị xóa vĩnh viễn!' : 'Mọi tin nhắn trong kênh này sẽ bị mất.'}`,
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteChannel({ channelId: target._id });
              // Nếu đang đứng ở kênh bị xóa, reset activeChannel để nó tự nhảy về đại-sảnh
              if (activeChannelId === target._id || isCategory) {
                setActiveChannelId(null);
              }
            } catch (error: any) {
              Alert.alert("Lỗi", error.message);
            }
          }
        }
      ]
    );
  };

  const handleCreateServerClick = async (templateName: string) => {
    const serverName = `Máy chủ của ${userProfile?.first_name || 'Tôi'}`;

    const result = await createServer({ name: serverName, template: templateName });

    // 1. Nếu backend trả về success: false (đã có máy chủ)
    if (result && result.success === false) {
      Alert.alert("Thông báo", result.message);
      return;
    }

    // 2. Nếu thành công (result.success === true)
    if (result && result.success === true) {
      setCreateModalVisible(false);
      switchToServer(result.serverId);
    }
  };

  const handleUpdateImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.5 });
    if (!result.canceled && activeServerId) {
      try {
        const postUrl = await generateUploadUrl();
        const response = await fetch(result.assets[0].uri);
        const blob = await response.blob();
        const uploadResult = await fetch(postUrl, { method: 'POST', body: blob });
        const { storageId } = await uploadResult.json();
        await updateServer({ serverId: activeServerId, iconStorageId: storageId });
        Alert.alert("Thành công", "Đã đổi ảnh máy chủ!");
      } catch (err) { Alert.alert("Lỗi", "Không thể tải ảnh lên"); }
    }
  };

  const handleSaveName = async () => {
    if (editServerName.trim() === '' || !activeServerId) return;
    await updateServer({ serverId: activeServerId, name: editServerName });
    Alert.alert("Thành công", "Đã lưu tên máy chủ!");
  };

  const handleDeleteServer = () => {
    Alert.alert("Cảnh báo", "Bạn có chắc chắn muốn xóa máy chủ này?", [
      { text: "Hủy", style: "cancel" },
      { text: "Xóa", style: "destructive", onPress: async () => {
          if (activeServerId) {
             await deleteServer({ serverId: activeServerId });
             setSettingsModalVisible(false);
             switchToUniversity(universities[0]._id);
          }
      }}
    ]);
  };

  const handleInviteFriend = async (friendId: any) => {
    if (activeServerId) {
      await addFriendToServer({ serverId: activeServerId, friendId });
      Alert.alert("Thành công", "Đã thêm bạn bè vào máy chủ!");
    }
  };

  const handleCreateChannelSubmit = async () => {
    if (newChannelName.trim() === '' || !activeServerId) return;
    try {
       await createChannel({
          serverId: activeServerId,
          name: newChannelName.trim(),
          type: newChannelType,
          parentId: selectedCategoryId
       });
       setCreateChannelModalVisible(false);
       setNewChannelName('');
    } catch (error: any) {
       Alert.alert("Lỗi", error.message);
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.serverRail, { paddingTop: top }]}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ alignItems: 'center', paddingBottom: 20, width: '100%' }}>
            {universities.map((uni) => (
              <TouchableOpacity key={uni._id} style={styles.serverItem} onPress={() => switchToUniversity(uni._id)}>
                <Image source={getIconSource(uni.icon)} style={styles.serverIcon} resizeMode="contain" />
                {uni._id === activeUniversityId && <View style={styles.activePill} />}
              </TouchableOpacity>
            ))}
            <View style={styles.railSeparator} />
            {myServers?.map((server) => (
              <TouchableOpacity key={server._id} style={styles.serverItem} onPress={() => switchToServer(server._id)}>
                <Image source={getIconSource(server.icon)} style={styles.serverIcon} resizeMode="cover" />
                {server._id === activeServerId && <View style={styles.activePill} />}
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.addServerBtn} onPress={() => setCreateModalVisible(true)}>
              <Ionicons name="add" size={32} color="#2e8b57" />
            </TouchableOpacity>
        </ScrollView>
      </View>

      <View style={[styles.channelRail, { paddingTop: top, paddingBottom: bottom }]}>
        <View style={styles.serverHeader}>
          <Text style={styles.serverName} numberOfLines={1}>{currentWorkspace?.name || "Chọn Không Gian"}</Text>
          {isOwner && (
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 12}}>
               <TouchableOpacity onPress={() => {
                  setNewChannelType('category');
                  setSelectedCategoryId(undefined);
                  setNewChannelName('');
                  setCreateChannelModalVisible(true);
               }}>
                  <Ionicons name="folder-open-outline" size={20} color="gray" />
               </TouchableOpacity>
               <TouchableOpacity onPress={() => { setEditServerName(currentWorkspace?.name || ''); setSettingsModalVisible(true); }}>
                  <Ionicons name="settings-outline" size={20} color="gray" />
               </TouchableOpacity>
            </View>
          )}
        </View>

        <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
            {/* KÊNH ĐỘC LẬP (KHÔNG CÓ DANH MỤC) */}
            {channels.filter(c => !c.parentId).map((channel) => (
                <TouchableOpacity
                  key={channel._id}
                  style={[styles.channelItem, activeChannelId === channel._id && styles.activeChannel]}
                  onPress={() => { setActiveChannelId(channel._id); setActiveChannelName(channel.name); }}
                  onLongPress={() => isOwner && handleLongPressDelete(channel, false)} // Bấm giữ để xóa
                >
                    <MaterialCommunityIcons name="pound" size={20} color={activeChannelId === channel._id ? "black" : "gray"} />
                    <Text style={[styles.channelText, activeChannelId === channel._id && {color: 'black', fontWeight: 'bold'}]}>{channel.name}</Text>
                </TouchableOpacity>
            ))}

            {/* CÁC DANH MỤC */}
            {groups.map((group) => {
              const isExpanded = expandedGroups[group._id] ?? true;
              const childChannels = channels.filter(c => c.parentId === group._id);
              return (
                <View key={group._id} style={{ marginTop: 16 }}>
                  <View style={[styles.categoryHeader, {justifyContent: 'space-between', paddingRight: 10}]}>
                    {/* Bấm một phát để xổ xuống, bấm giữ để Xóa Danh Mục */}
                    <TouchableOpacity
                      style={{flexDirection: 'row', alignItems: 'center', flex: 1}}
                      onPress={() => toggleGroup(group._id)}
                      onLongPress={() => isOwner && handleLongPressDelete(group, true)}
                    >
                      <Ionicons name={isExpanded ? "chevron-down" : "chevron-forward"} size={12} color="gray" />
                      <Text style={styles.categoryTitle}>{group.name}</Text>
                    </TouchableOpacity>
                    {isOwner && (
                      <TouchableOpacity onPress={() => {
                        setNewChannelType('channel');
                        setSelectedCategoryId(group._id);
                        setNewChannelName('');
                        setCreateChannelModalVisible(true);
                      }}>
                        <Ionicons name="add" size={18} color="gray" />
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* CÁC KÊNH CON BÊN TRONG DANH MỤC */}
                  {isExpanded && (
                    <View>
                      {childChannels.map(channel => (
                        <TouchableOpacity
                          key={channel._id}
                          style={[styles.channelItem, activeChannelId === channel._id && styles.activeChannel]}
                          onPress={() => { setActiveChannelId(channel._id); setActiveChannelName(channel.name); }}
                          onLongPress={() => isOwner && handleLongPressDelete(channel, false)} // Bấm giữ để xóa
                        >
                            <MaterialCommunityIcons name="pound" size={20} color={activeChannelId === channel._id ? "black" : "gray"} />
                            <Text style={[styles.channelText, activeChannelId === channel._id && {color: 'black', fontWeight: 'bold'}]}>{channel.name}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              );
            })}
        </ScrollView>
        <View style={styles.userFooter}>
            <Image source={{ uri: userProfile?.imageUrl || 'https://github.com/shadcn.png' }} style={styles.footerAvatar} />
            <View style={{ marginLeft: 8, flex: 1 }}>
                <Text style={styles.footerName} numberOfLines={1}>{userProfile?.first_name}</Text>
                <Text style={styles.footerUsername} numberOfLines={1}>@{userProfile?.username}</Text>
            </View>
        </View>
      </View>

      {/* --- CÁC MODAL GIỮ NGUYÊN HOÀN TOÀN NHƯ CŨ BÊN DƯỚI --- */}

      <Modal visible={isCreateModalVisible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalSafeArea}>
          <View style={styles.modalHeader}>
             <TouchableOpacity onPress={() => setCreateModalVisible(false)} style={styles.closeBtn}><Ionicons name="close" size={26} color="gray" /></TouchableOpacity>
          </View>
          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
             <Text style={styles.modalTitle}>Tạo Máy Chủ Của Bạn</Text>
             <Text style={styles.modalSubtitle}>Máy chủ của bạn là nơi bạn giao lưu với bạn bè của mình.</Text>
             <TouchableOpacity style={styles.templateOptionPrimary} onPress={() => handleCreateServerClick('Custom')}>
                 <View style={styles.emojiWrapper}><Text style={styles.templateEmoji}>🌍</Text></View>
                 <Text style={styles.templateTextPrimary}>Tạo Mẫu Riêng</Text>
                 <Ionicons name="chevron-forward" size={20} color="gray" style={{marginLeft: 'auto'}} />
             </TouchableOpacity>
             <Text style={styles.sectionTitle}>Bắt đầu từ mẫu</Text>
             {TEMPLATES.map((item) => (
               <TouchableOpacity key={item.id} style={styles.templateOption} onPress={() => handleCreateServerClick(item.id)}>
                   <View style={styles.emojiWrapper}><Text style={styles.templateEmoji}>{item.icon}</Text></View>
                   <Text style={styles.templateText}>{item.name}</Text>
                   <Ionicons name="chevron-forward" size={20} color="gray" style={{marginLeft: 'auto'}} />
               </TouchableOpacity>
             ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <Modal visible={isSettingsModalVisible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{flex: 1, backgroundColor: '#f2f3f5'}}>
          <View style={[styles.modalHeader, { backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee', flexDirection: 'row', justifyContent: 'space-between' }]}>
             <Text style={{fontSize: 18, fontWeight: 'bold'}}>Cài đặt máy chủ</Text>
             <TouchableOpacity onPress={() => setSettingsModalVisible(false)}><Text style={{fontSize: 16, color: '#007aff', fontWeight: 'bold'}}>Xong</Text></TouchableOpacity>
          </View>
          <ScrollView style={{padding: 20}}>
            <View style={{alignItems: 'center', marginBottom: 20}}>
              <Image source={getIconSource(currentWorkspace?.icon)} style={{width: 80, height: 80, borderRadius: 40, marginBottom: 10}} />
              <TouchableOpacity onPress={handleUpdateImage} style={{backgroundColor: '#e0e0e0', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20}}>
                <Text style={{fontWeight: 'bold'}}>Đổi ảnh đại diện</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionTitle}>TÊN MÁY CHỦ</Text>
            <View style={{flexDirection: 'row', backgroundColor: '#fff', borderRadius: 8, padding: 10, marginBottom: 20}}>
               <TextInput style={{flex: 1, fontSize: 16}} value={editServerName} onChangeText={setEditServerName} />
               <TouchableOpacity onPress={handleSaveName}><Text style={{color: '#007aff', fontWeight: 'bold', paddingLeft: 10}}>Lưu</Text></TouchableOpacity>
            </View>

            <Text style={styles.sectionTitle}>MỜI BẠN BÈ</Text>
            <View style={{backgroundColor: '#fff', borderRadius: 8, padding: 10, marginBottom: 20}}>
              {myFriends && myFriends.length > 0 ? (
                myFriends.map((friend) => {
                  const isAlreadyMember = (currentWorkspace as any)?.memberIds?.includes(friend._id);
                  return (
                    <View key={friend._id} style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderColor: '#f0f0f0'}}>
                      <View style={{flexDirection: 'row', alignItems: 'center'}}>
                        <Image source={{uri: friend.imageUrl}} style={{width: 30, height: 30, borderRadius: 15, marginRight: 10}} />
                        <Text style={{fontWeight: 'bold'}}>{friend.first_name}</Text>
                      </View>
                      <TouchableOpacity disabled={isAlreadyMember} onPress={() => handleInviteFriend(friend._id)} style={{backgroundColor: isAlreadyMember ? '#e0e0e0' : '#5865F2', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 15}}>
                        <Text style={{color: isAlreadyMember ? 'gray' : 'white', fontWeight: 'bold', fontSize: 12}}>{isAlreadyMember ? 'Đã thêm' : 'Thêm'}</Text>
                      </TouchableOpacity>
                    </View>
                  )
                })
              ) : (<Text style={{color: 'gray', textAlign: 'center', padding: 10}}>Bạn chưa có bạn bè nào.</Text>)}
            </View>

            <TouchableOpacity onPress={handleDeleteServer} style={{backgroundColor: '#ffdddd', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 20}}>
               <Text style={{color: 'red', fontWeight: 'bold', fontSize: 16}}>Xóa máy chủ</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <Modal visible={isCreateChannelModalVisible} transparent animationType="fade">
         <View style={styles.modalOverlay}>
            <View style={styles.smallModalContainer}>
               <Text style={styles.smallModalTitle}>Tạo {newChannelType === 'category' ? 'Danh Mục' : 'Kênh'}</Text>
               <TextInput
                  style={styles.textInput}
                  placeholder={newChannelType === 'category' ? "Tên danh mục mới" : "tên-kênh-mới"}
                  value={newChannelName}
                  onChangeText={setNewChannelName}
                  autoFocus
               />
               <View style={styles.modalButtonRow}>
                  <TouchableOpacity onPress={() => setCreateChannelModalVisible(false)} style={styles.cancelBtn}>
                     <Text style={styles.cancelBtnText}>Hủy</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleCreateChannelSubmit} style={styles.submitBtn}>
                     <Text style={styles.submitBtnText}>Tạo</Text>
                  </TouchableOpacity>
               </View>
            </View>
         </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: 'row', backgroundColor: '#f2f3f5', width: 300 },
  serverRail: { width: 72, backgroundColor: '#E3E5E8', alignItems: 'center', paddingBottom: 10 },
  serverItem: { marginBottom: 12, alignItems: 'center', width: 72, justifyContent: 'center', position: 'relative' },
  serverIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'white', borderWidth: 1, borderColor: '#d1d1d1' },
  activePill: { position: 'absolute', left: 0, width: 4, height: 40, backgroundColor: 'black', borderTopRightRadius: 4, borderBottomRightRadius: 4 },
  railSeparator: { width: 32, height: 2, backgroundColor: '#d0d3d5', marginVertical: 8, borderRadius: 1 },
  addServerBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center', marginBottom: 12, borderWidth: 1, borderColor: '#e0e0e0' },
  channelRail: { flex: 1, backgroundColor: '#F2F3F5' },
  serverHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderColor: '#e0e0e0', backgroundColor: 'white', height: 56, marginBottom: 8 },
  serverName: { fontWeight: '900', fontSize: 15, textTransform: 'uppercase', flex: 1 },
  categoryHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, marginBottom: 4, paddingVertical: 4 },
  categoryTitle: { fontSize: 12, fontWeight: 'bold', color: 'gray', marginLeft: 4, textTransform: 'uppercase' },
  channelItem: { flexDirection: 'row', padding: 8, paddingHorizontal: 12, marginHorizontal: 8, alignItems: 'center', borderRadius: 4, marginTop: 1 },
  activeChannel: { backgroundColor: '#dbdee1' },
  channelText: { marginLeft: 6, color: '#5c5e62', fontWeight: '500', fontSize: 15, flex: 1 },
  userFooter: { padding: 10, backgroundColor: '#ebedef', flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#e0e0e0' },
  footerAvatar: { width: 32, height: 32, borderRadius: 16 },
  footerName: { fontWeight: 'bold', fontSize: 13, color: 'black' },
  footerUsername: { fontSize: 11, color: 'gray' },
  modalSafeArea: { flex: 1, backgroundColor: '#ffffff' },
  modalHeader: { padding: 16, alignItems: 'flex-start' },
  closeBtn: { padding: 5 },
  modalBody: { paddingHorizontal: 20 },
  modalTitle: { fontSize: 26, fontWeight: '900', textAlign: 'center', marginBottom: 12, color: 'black' },
  modalSubtitle: { fontSize: 15, color: 'gray', textAlign: 'center', marginBottom: 25, lineHeight: 22, paddingHorizontal: 10 },
  emojiWrapper: { width: 40, height: 40, backgroundColor: '#f2f3f5', borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  templateEmoji: { fontSize: 20 },
  templateOptionPrimary: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 12, borderRadius: 10, marginBottom: 20, borderWidth: 1, borderColor: '#e0e0e0' },
  templateTextPrimary: { fontSize: 16, fontWeight: 'bold', marginLeft: 15, color: 'black' },
  sectionTitle: { fontSize: 13, fontWeight: 'bold', color: '#5c5e62', textTransform: 'uppercase', marginBottom: 10, marginTop: 5 },
  templateOption: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 12, borderRadius: 10, marginBottom: 10, borderWidth: 1, borderColor: '#e0e0e0' },
  templateText: { fontSize: 16, fontWeight: 'bold', marginLeft: 15, color: 'black' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  smallModalContainer: { width: '80%', backgroundColor: 'white', borderRadius: 8, padding: 20, shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5 },
  smallModalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, color: 'black' },
  textInput: { backgroundColor: '#f2f3f5', padding: 12, borderRadius: 5, fontSize: 16, marginBottom: 20, color: 'black' },
  modalButtonRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  cancelBtn: { padding: 10 },
  cancelBtnText: { color: 'gray', fontWeight: 'bold', fontSize: 15 },
  submitBtn: { backgroundColor: '#5865F2', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 5 },
  submitBtnText: { color: 'white', fontWeight: 'bold', fontSize: 15 },
});