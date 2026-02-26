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

  // --- 1. STATE TÌM KIẾM ---
  const [searchQuery, setSearchQuery] = useState('');

  const universities = useQuery(api.university.getUniversities);
  const myServers = useQuery(api.university.getMyServers);
  const myFriends = useQuery(api.users.getFriends, userProfile ? { userId: userProfile._id } : "skip");

  // --- 2. TRUYỀN SEARCH QUERY VÀO BACKEND ---
  const allUsers = useQuery(api.users.getUsers, { search: searchQuery });

  const createServer = useMutation(api.university.createServer);
  const updateServer = useMutation(api.university.updateServer);
  const deleteServer = useMutation(api.university.deleteServer);
  const addFriendToServer = useMutation(api.university.addFriendToServer);
  const generateUploadUrl = useMutation(api.users.generateUploadUrl);
  const createChannel = useMutation(api.university.createChannel);
  const deleteChannel = useMutation(api.university.deleteChannel);

  const { activeUniversityId, setActiveUniversityId, activeServerId, setActiveServerId, activeChannelId, setActiveChannelId, setActiveChannelName } = useChannel();

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [isSettingsModalVisible, setSettingsModalVisible] = useState(false);
  const [editServerName, setEditServerName] = useState('');

  const [isCreateModalVisible, setCreateModalVisible] = useState(false);
  const [createStep, setCreateStep] = useState(1);
  const [serverNameInput, setServerNameInput] = useState('');
  const [serverIconUri, setServerIconUri] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [newlyCreatedId, setNewlyCreatedId] = useState<Id<'servers'> | null>(null);
  const [invitedUsers, setInvitedUsers] = useState<Record<string, boolean>>({});

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
  const currentWorkspace = activeUniversityId ? universities.find(u => u._id === activeUniversityId) : myServers?.find(s => s._id === activeServerId);
  const isOwner = activeServerId && currentWorkspace && 'creatorId' in currentWorkspace && currentWorkspace.creatorId === userProfile?._id;

  const switchToUniversity = (id: Id<'universities'>) => { setActiveServerId(null); setActiveUniversityId(id); setActiveChannelId(null); };
  const switchToServer = (id: Id<'servers'>) => { setActiveUniversityId(null); setActiveServerId(id); setActiveChannelId(null); };
  const toggleGroup = (groupId: string) => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setExpandedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] })); };

  const handleCreateServerClick = async (templateName: string) => {
    const serverName = `Máy chủ của ${userProfile?.first_name || 'Tôi'}`;
    const result = await createServer({ name: serverName, template: templateName });
    if (result && result.success === false) { Alert.alert("Thông báo", result.message); return; }
    if (result && result.success === true) {
      setCreateModalVisible(false);
      switchToServer(result.serverId);
    }
  };

  const handleStartCustomCreate = () => {
    setSelectedTemplate('Custom');
    setServerNameInput(`Máy chủ của ${userProfile?.first_name || 'Tôi'}`);
    setServerIconUri(null);
    setCreateStep(1);
    setSearchQuery(''); // Reset search khi bắt đầu luồng mới
  };

  const pickIcon = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.5 });
    if (!result.canceled) setServerIconUri(result.assets[0].uri);
  };

  const handleFinalCreateServer = async () => {
    try {
      let storageId = undefined;
      if (serverIconUri) {
        const postUrl = await generateUploadUrl();
        const response = await fetch(serverIconUri);
        const blob = await response.blob();
        const uploadResult = await fetch(postUrl, { method: 'POST', body: blob });
        const res = await uploadResult.json();
        storageId = res.storageId;
      }
      const result = await createServer({ name: serverNameInput, template: 'Custom', iconStorageId: storageId });
      if (result.success) {
        setNewlyCreatedId(result.serverId);
        setCreateStep(2);
      } else { Alert.alert("Thông báo", result.message); }
    } catch (e) { console.log(e); }
  };

  const handleInviteAction = async (userId: any) => {
    if (newlyCreatedId) {
      await addFriendToServer({ serverId: newlyCreatedId, friendId: userId });
      setInvitedUsers(prev => ({ ...prev, [userId]: true }));
    }
  };

  const handleLongPressDelete = (target: any, isCategory: boolean) => {
    if (target.name === 'đại-sảnh') { Alert.alert("Không hợp lệ", "Không thể xóa kênh mặc định!"); return; }
    Alert.alert(`Xóa ${isCategory ? 'Danh mục' : 'Kênh'}`, `Bạn có chắc chắn muốn xóa "${target.name}"?`, [
      { text: "Hủy", style: "cancel" },
      { text: "Xóa", style: "destructive", onPress: async () => {
          await deleteChannel({ channelId: target._id });
          if (activeChannelId === target._id || isCategory) setActiveChannelId(null);
      }}
    ]);
  };

  const handleCreateChannelSubmit = async () => {
    if (newChannelName.trim() === '' || !activeServerId) return;
    await createChannel({ serverId: activeServerId, name: newChannelName.trim(), type: newChannelType, parentId: selectedCategoryId });
    setCreateChannelModalVisible(false);
    setNewChannelName('');
  };

  const handleSaveName = async () => {
    if (editServerName.trim() === '' || !activeServerId) return;
    await updateServer({ serverId: activeServerId, name: editServerName });
    Alert.alert("Thành công", "Đã lưu tên máy chủ!");
  };

  const handleUpdateImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.5 });
    if (!result.canceled && activeServerId) {
      const postUrl = await generateUploadUrl();
      const response = await fetch(result.assets[0].uri);
      const blob = await response.blob();
      const uploadResult = await fetch(postUrl, { method: 'POST', body: blob });
      const { storageId } = await uploadResult.json();
      await updateServer({ serverId: activeServerId, iconStorageId: storageId });
      Alert.alert("Thành công", "Đã đổi ảnh máy chủ!");
    }
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
               <TouchableOpacity onPress={() => { setNewChannelType('category'); setSelectedCategoryId(undefined); setNewChannelName(''); setCreateChannelModalVisible(true); }}>
                  <Ionicons name="folder-open-outline" size={20} color="gray" />
               </TouchableOpacity>
               <TouchableOpacity onPress={() => { setEditServerName(currentWorkspace?.name || ''); setSettingsModalVisible(true); }}>
                  <Ionicons name="settings-outline" size={20} color="gray" />
               </TouchableOpacity>
            </View>
          )}
        </View>

        <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
            {channels.filter(c => !c.parentId).map((channel) => (
                <TouchableOpacity key={channel._id} style={[styles.channelItem, activeChannelId === channel._id && styles.activeChannel]}
                  onPress={() => { setActiveChannelId(channel._id); setActiveChannelName(channel.name); }}
                  onLongPress={() => isOwner && handleLongPressDelete(channel, false)}>
                    <MaterialCommunityIcons name="pound" size={20} color={activeChannelId === channel._id ? "black" : "gray"} />
                    <Text style={[styles.channelText, activeChannelId === channel._id && {color: 'black', fontWeight: 'bold'}]}>{channel.name}</Text>
                </TouchableOpacity>
            ))}

            {groups.map((group) => {
              const isExpanded = expandedGroups[group._id] ?? true;
              const childChannels = channels.filter(c => c.parentId === group._id);
              return (
                <View key={group._id} style={{ marginTop: 16 }}>
                  <View style={[styles.categoryHeader, {justifyContent: 'space-between', paddingRight: 10}]}>
                    <TouchableOpacity style={{flexDirection: 'row', alignItems: 'center', flex: 1}} onPress={() => toggleGroup(group._id)} onLongPress={() => isOwner && handleLongPressDelete(group, true)}>
                      <Ionicons name={isExpanded ? "chevron-down" : "chevron-forward"} size={12} color="gray" />
                      <Text style={styles.categoryTitle}>{group.name}</Text>
                    </TouchableOpacity>
                    {isOwner && (
                      <TouchableOpacity onPress={() => { setNewChannelType('channel'); setSelectedCategoryId(group._id); setNewChannelName(''); setCreateChannelModalVisible(true); }}>
                        <Ionicons name="add" size={18} color="gray" />
                      </TouchableOpacity>
                    )}
                  </View>
                  {isExpanded && childChannels.map(channel => (
                    <TouchableOpacity key={channel._id} style={[styles.channelItem, activeChannelId === channel._id && styles.activeChannel]}
                      onPress={() => { setActiveChannelId(channel._id); setActiveChannelName(channel.name); }}
                      onLongPress={() => isOwner && handleLongPressDelete(channel, false)}>
                        <MaterialCommunityIcons name="pound" size={20} color={activeChannelId === channel._id ? "black" : "gray"} />
                        <Text style={[styles.channelText, activeChannelId === channel._id && {color: 'black', fontWeight: 'bold'}]}>{channel.name}</Text>
                    </TouchableOpacity>
                  ))}
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

      <Modal visible={isCreateModalVisible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{flex: 1, backgroundColor: '#fff'}}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => { setCreateModalVisible(false); setSelectedTemplate(null); }}><Ionicons name="close" size={28} color="gray" /></TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            {!selectedTemplate ? (
              <>
                <Text style={styles.modalTitle}>Tạo Máy Chủ Của Bạn</Text>
                <Text style={styles.modalSubtitle}>Máy chủ của bạn là nơi bạn giao lưu với bạn bè của mình.</Text>
                <TouchableOpacity style={styles.templateOptionPrimary} onPress={handleStartCustomCreate}>
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
              </>
            ) : (
              createStep === 1 ? (
                <View style={{alignItems: 'center'}}>
                  <Text style={styles.modalTitle}>Tùy chỉnh máy chủ</Text>
                  <TouchableOpacity onPress={pickIcon} style={{marginVertical: 20}}>
                    {serverIconUri ? (
                      <Image source={{uri: serverIconUri}} style={{width: 100, height: 100, borderRadius: 50}} />
                    ) : (
                      <View style={{width: 100, height: 100, borderRadius: 50, backgroundColor: '#f2f3f5', justifyContent: 'center', alignItems: 'center', borderStyle: 'dashed', borderWidth: 1, borderColor: 'gray'}}>
                        <Ionicons name="camera" size={40} color="gray" />
                      </View>
                    )}
                  </TouchableOpacity>
                  <View style={{width: '100%'}}>
                    <Text style={styles.sectionTitle}>TÊN MÁY CHỦ</Text>
                    <TextInput style={styles.textInput} value={serverNameInput} onChangeText={setServerNameInput} />
                  </View>
                  <TouchableOpacity style={[styles.submitBtn, {width: '100%', marginTop: 20}]} onPress={handleFinalCreateServer}>
                    <Text style={styles.submitBtnText}>Tạo máy chủ</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View>
                  <Text style={styles.modalTitle}>Mời bạn bè</Text>

                  {/* --- SỬA: THANH TÌM KIẾM ĐÃ ĐƯỢC KẾT NỐI --- */}
                  <TextInput
                    style={[styles.textInput, {marginBottom: 15}]}
                    placeholder="Tìm theo username..."
                    value={searchQuery}
                    onChangeText={setSearchQuery} // Khi gõ, useQuery allUsers ở dòng 39 sẽ tự fetch lại
                  />

                  {allUsers?.filter(u => u._id !== userProfile?._id).map((user) => {
                    const isFriend = myFriends?.some(f => f._id === user._id);
                    const isInvited = invitedUsers[user._id];
                    return (
                      <View key={user._id} style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderColor: '#f0f0f0'}}>
                        <View style={{flexDirection: 'row', alignItems: 'center'}}>
                          <Image source={{uri: user.imageUrl}} style={{width: 40, height: 40, borderRadius: 20, marginRight: 12}} />
                          <View>
                             <Text style={{fontWeight: 'bold'}}>{user.first_name}</Text>
                             <Text style={{fontSize: 12, color: 'gray'}}>@{user.username}</Text>
                          </View>
                        </View>
                        <TouchableOpacity disabled={isInvited} onPress={() => handleInviteAction(user._id)} style={{backgroundColor: isInvited ? '#ccc' : '#5865F2', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20}}>
                          <Text style={{color: 'white', fontWeight: 'bold'}}>{isInvited ? 'Đã mời' : (isFriend ? 'Thêm' : 'Mời')}</Text>
                        </TouchableOpacity>
                      </View>
                    );
                  })}

                  <TouchableOpacity
                    onPress={() => {
                      setCreateModalVisible(false);
                      setSelectedTemplate(null);
                      setSearchQuery(''); // Reset search
                      if(newlyCreatedId) switchToServer(newlyCreatedId);
                    }}
                    style={[styles.submitBtn, {marginTop: 20}]}
                  >
                    <Text style={styles.submitBtnText}>Hoàn tất</Text>
                  </TouchableOpacity>
                </View>
              )
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* CÁC MODAL KHÁC GIỮ NGUYÊN */}
      <Modal visible={isSettingsModalVisible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{flex: 1, backgroundColor: '#f2f3f5'}}>
          <View style={[styles.modalHeader, { backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
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
               <TextInput style={styles.textInput} placeholder={newChannelType === 'category' ? "Tên danh mục mới" : "tên-kênh-mới"} value={newChannelName} onChangeText={setNewChannelName} autoFocus />
               <View style={styles.modalButtonRow}>
                  <TouchableOpacity onPress={() => setCreateChannelModalVisible(false)} style={styles.cancelBtn}><Text style={styles.cancelBtnText}>Hủy</Text></TouchableOpacity>
                  <TouchableOpacity onPress={handleCreateChannelSubmit} style={styles.submitBtn}><Text style={styles.submitBtnText}>Tạo</Text></TouchableOpacity>
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
  modalHeader: { padding: 16, alignItems: 'flex-start' },
  modalBody: { paddingHorizontal: 20 },
  modalTitle: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 12, color: 'black' },
  modalSubtitle: { fontSize: 15, color: 'gray', textAlign: 'center', marginBottom: 25, lineHeight: 22 },
  emojiWrapper: { width: 40, height: 40, backgroundColor: '#f2f3f5', borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  templateEmoji: { fontSize: 20 },
  templateOptionPrimary: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 12, borderRadius: 10, marginBottom: 20, borderWidth: 1, borderColor: '#e0e0e0' },
  templateTextPrimary: { fontSize: 16, fontWeight: 'bold', marginLeft: 15, color: 'black' },
  sectionTitle: { fontSize: 12, fontWeight: 'bold', color: 'gray', textTransform: 'uppercase', marginBottom: 10, marginTop: 15 },
  templateOption: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 12, borderRadius: 10, marginBottom: 10, borderWidth: 1, borderColor: '#e0e0e0' },
  templateText: { fontSize: 16, fontWeight: 'bold', marginLeft: 15, color: 'black' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  smallModalContainer: { width: '80%', backgroundColor: 'white', borderRadius: 8, padding: 20 },
  smallModalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  textInput: { backgroundColor: '#f2f3f5', padding: 12, borderRadius: 8, fontSize: 16, color: 'black' },
  modalButtonRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 10 },
  cancelBtn: { padding: 10 },
  cancelBtnText: { color: 'gray', fontWeight: 'bold' },
  submitBtn: { backgroundColor: '#5865F2', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8, alignItems: 'center' },
  submitBtnText: { color: 'white', fontWeight: 'bold', fontSize: 15 },
});