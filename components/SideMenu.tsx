import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, ActivityIndicator, LayoutAnimation, Platform, UIManager, Modal, SafeAreaView, Alert, TextInput, Switch } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
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

  const [searchQuery, setSearchQuery] = useState('');

  const universities = useQuery(api.university.getUniversities);
  const myServers = useQuery(api.university.getMyServers);
  const myFriends = useQuery(api.users.getFriends, userProfile ? { userId: userProfile._id } : "skip");
  const allUsers = useQuery(api.users.getUsers, { search: searchQuery });

  const createServer = useMutation(api.university.createServer);
  const updateServer = useMutation(api.university.updateServer);
  const deleteServer = useMutation(api.university.deleteServer);
  const addFriendToServer = useMutation(api.university.addFriendToServer);
  const generateUploadUrl = useMutation(api.users.generateUploadUrl);
  const createChannel = useMutation(api.university.createChannel);
  const deleteChannel = useMutation(api.university.deleteChannel);
  const leaveServer = useMutation(api.university.leaveServer);

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

  const [isInviteOnlyModalVisible, setInviteOnlyModalVisible] = useState(false);

  const [isServerMenuVisible, setServerMenuVisible] = useState(false);
  const [isMemberListModalVisible, setMemberListModalVisible] = useState(false);
  const [isCreateChannelModalVisible, setCreateChannelModalVisible] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelType, setNewChannelType] = useState<'category' | 'channel'>('channel');
  const [selectedCategoryId, setSelectedCategoryId] = useState<Id<'channels'> | undefined>(undefined);
  const [isAnonymousChannel, setIsAnonymousChannel] = useState(false);

  // 👇 STATE GHIM & NÂNG CẤP 👇
  const [pinnedServers, setPinnedServers] = useState<string[]>([]);
  const [pinnedChannels, setPinnedChannels] = useState<string[]>([]);
  const [isUpgradeModalVisible, setUpgradeModalVisible] = useState(false);

  const channelsData = useQuery(api.university.getChannels, {
    universityId: activeUniversityId || undefined,
    serverId: activeServerId || undefined
  });

  const serverMembers = useQuery(api.university.getServerMembers, {
    serverId: activeServerId || undefined
  });

  useEffect(() => {
    if (activeServerId && activeUniversityId) {
      setActiveUniversityId(null as any);
    }
  }, [activeServerId, activeUniversityId]);

  useEffect(() => {
    let fallbackTimer: NodeJS.Timeout;
    if (universities && universities.length > 0 && !activeUniversityId && !activeServerId) {
       fallbackTimer = setTimeout(() => {
         setActiveUniversityId(universities[0]._id);
       }, 100);
    }
    return () => clearTimeout(fallbackTimer);
  }, [!!universities, activeUniversityId, activeServerId]);

  useEffect(() => {
    const chans = channelsData?.channels || [];
    if (chans.length > 0 && !activeChannelId) {
       const defaultChannel = chans.find(c => c.name === 'đại-sảnh') || chans[0];
       setActiveChannelId(defaultChannel._id);
       setActiveChannelName(defaultChannel.name);
    }
  }, [!!channelsData, activeUniversityId, activeServerId]);

  if (universities === undefined || channelsData === undefined) {
    return <View style={[styles.container, {justifyContent:'center', alignItems: 'center'}]}><ActivityIndicator color="#000" /></View>;
  }

  const groups = channelsData?.groups || [];
  const channels = channelsData?.channels || [];
  const currentWorkspace = activeUniversityId ? universities.find(u => u._id === activeUniversityId) : myServers?.find(s => s._id === activeServerId);
  const isOwner = activeServerId && currentWorkspace && 'creatorId' in currentWorkspace && currentWorkspace.creatorId === userProfile?._id;

  // Giả lập lấy số lần nâng cấp (Nitro) của máy chủ hiện tại
  // @ts-ignore
  const serverBoostCount = currentWorkspace?.boostCount || 0; 
  const MAX_CHANNELS_BASE = 30;
  const currentChannelLimit = MAX_CHANNELS_BASE + (serverBoostCount * 5);

  const switchToUniversity = (id: Id<'universities'>) => {
    if (id === activeUniversityId) return;
    setActiveServerId(null as any);
    setActiveUniversityId(id);
    setActiveChannelId(null as any);
  };

  const switchToServer = (id: Id<'servers'>) => {
    if (id === activeServerId) return;
    setActiveUniversityId(null as any);
    setActiveServerId(id);
    setActiveChannelId(null as any);
  };

  const toggleGroup = (groupId: string) => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setExpandedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] })); };

  // 👇 HÀM KIỂM TRA GIỚI HẠN KÊNH TRƯỚC KHI TẠO 👇
  const checkLimitAndOpenCreate = (type: 'category' | 'channel', parentId?: Id<'channels'>) => {
    const currentTotalChannels = channels.length + groups.length;

    if (currentTotalChannels >= currentChannelLimit) {
      Alert.alert(
        "Đã đạt giới hạn kênh!",
        `Máy chủ này đã tạo tối đa ${currentChannelLimit} kênh/danh mục.\n\nHãy Nâng Cấp Máy Chủ để mở rộng thêm không gian!`,
        [
          { text: "Hủy", style: "cancel" },
          { text: "Nâng cấp ngay", onPress: () => setUpgradeModalVisible(true) }
        ]
      );
      return;
    }

    setNewChannelType(type);
    setSelectedCategoryId(parentId);
    setNewChannelName('');
    setIsAnonymousChannel(false);
    setCreateChannelModalVisible(true);
  };

  // 👇 HÀM TƯƠNG TÁC LONG PRESS ĐỂ GHIM HOẶC XÓA 👇
  const handleChannelLongPress = (target: any, isCategory: boolean) => {
    if (target.name === 'đại-sảnh') { Alert.alert("Không hợp lệ", "Không thể thao tác kênh mặc định!"); return; }
    
    const isPinned = pinnedChannels.includes(target._id);
    
    Alert.alert(`Tùy chọn ${isCategory ? 'Danh mục' : 'Kênh'}`, `Bạn muốn làm gì với "${target.name}"?`, [
      { text: "Hủy", style: "cancel" },
      { text: isPinned ? "Bỏ ghim" : "Ghim lên đầu", onPress: () => {
          setPinnedChannels(prev => isPinned ? prev.filter(id => id !== target._id) : [...prev, target._id]);
      }},
      ...(isOwner ? [{ text: "Xóa", style: "destructive" as const, onPress: async () => {
          await deleteChannel({ channelId: target._id });
          if (activeChannelId === target._id || isCategory) setActiveChannelId(null as any);
      }}] : [])
    ]);
  };

  const togglePinServer = (serverId: string) => {
    setPinnedServers(prev => prev.includes(serverId) ? prev.filter(id => id !== serverId) : [...prev, serverId]);
  };

  // XỬ LÝ SẮP XẾP SERVER & KÊNH
  const sortedServers = myServers ? [...myServers].sort((a, b) => {
    const aPinned = pinnedServers.includes(a._id);
    const bPinned = pinnedServers.includes(b._id);
    if (aPinned && !bPinned) return -1;
    if (!aPinned && bPinned) return 1;
    return 0;
  }) : [];

  const sortedGroups = [...groups].sort((a, b) => {
    const aPinned = pinnedChannels.includes(a._id);
    const bPinned = pinnedChannels.includes(b._id);
    if (aPinned && !bPinned) return -1;
    if (!aPinned && bPinned) return 1;
    return a.sortOrder - b.sortOrder;
  });

  const getSortedChannels = (channelList: any[]) => {
    return [...channelList].sort((a, b) => {
      const aPinned = pinnedChannels.includes(a._id);
      const bPinned = pinnedChannels.includes(b._id);
      if (aPinned && !bPinned) return -1; // Thằng nào ghim thì bay lên đầu
      if (!aPinned && bPinned) return 1;
      return a.sortOrder - b.sortOrder;   // Không ghim thì nằm im theo thứ tự cũ
    });
  };

  const handleCreateServerClick = async (templateName: string) => {
    const serverName = `Máy chủ của ${userProfile?.first_name || 'Tôi'}`;
    const result = await createServer({ name: serverName, template: templateName });
    if (result && result.success === false) { Alert.alert("Thông báo", result.message); return; }
    if (result && result.success === true) {
      setCreateModalVisible(false);
      switchToServer(result.serverId as Id<'servers'>);
    }
  };

  const handleStartCustomCreate = () => {
    setSelectedTemplate('Custom');
    setServerNameInput(`Máy chủ của ${userProfile?.first_name || 'Tôi'}`);
    setServerIconUri(null);
    setCreateStep(1);
    setSearchQuery('');
    setInvitedUsers({});
    setNewlyCreatedId(null);
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
        setNewlyCreatedId(result.serverId || null);
        setCreateStep(2);
      } else { Alert.alert("Thông báo", result.message); }
    } catch (e) { console.log(e); }
  };

  const handleInviteAction = async (userId: any) => {
    if (newlyCreatedId) { await addFriendToServer({ serverId: newlyCreatedId, friendId: userId }); }
    else if (activeServerId) { await addFriendToServer({ serverId: activeServerId, friendId: userId }); }
    setInvitedUsers(prev => ({ ...prev, [userId]: true }));
  };

  const handleCreateChannelSubmit = async () => {
    if (newChannelName.trim() === '' || !activeServerId) return;
    await createChannel({ 
      serverId: activeServerId, 
      name: newChannelName.trim(), 
      type: newChannelType, 
      parentId: selectedCategoryId,
      // @ts-ignore
      isAnonymous: isAnonymousChannel
    });
    setCreateChannelModalVisible(false);
    setNewChannelName('');
    setIsAnonymousChannel(false);
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
        { text: "Xóa", style: "destructive", onPress: () => {
            if (activeServerId) {
              const serverIdToDelete = activeServerId;
              setSettingsModalVisible(false);
              if (universities && universities.length > 0) switchToUniversity(universities[0]._id);
              setTimeout(async () => {
                try { await deleteServer({ serverId: serverIdToDelete }); } catch (error) { console.error(error); }
              }, 300);
            }
          }
        }
      ]);
    };

  const renderInviteList = () => (
    <View style={{flex: 1}}>
      <TextInput style={[styles.textInput, {marginBottom: 15}]} placeholder="Tìm theo username..." value={searchQuery} onChangeText={setSearchQuery} />
      <ScrollView showsVerticalScrollIndicator={false}>
        {allUsers?.filter(u => u._id !== userProfile?._id).map((user) => {
          const isFriend = myFriends?.some(f => f._id === user._id);
          const isInvited = invitedUsers[user._id] || (currentWorkspace as any)?.memberIds?.includes(user._id);
          return (
            <View key={user._id} style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderColor: '#f0f0f0'}}>
              <View style={{flexDirection: 'row', alignItems: 'center'}}>
                <Image source={{uri: user.imageUrl}} style={{width: 40, height: 40, borderRadius: 20, marginRight: 12}} />
                <View><Text style={{fontWeight: 'bold'}}>{user.first_name}</Text><Text style={{fontSize: 12, color: 'gray'}}>@{user.username}</Text></View>
              </View>
              <TouchableOpacity disabled={isInvited} onPress={() => handleInviteAction(user._id)} style={{backgroundColor: isInvited ? '#ccc' : '#5865F2', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20}}>
                <Text style={{color: 'white', fontWeight: 'bold'}}>{isInvited ? 'Thành viên' : (isFriend ? 'Thêm' : 'Mời')}</Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );

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
            
            {/* LẤY DANH SÁCH SERVER ĐÃ ĐƯỢC SẮP XẾP (CÓ GHIM) */}
            {sortedServers.map((server) => (
              <TouchableOpacity key={server._id} style={styles.serverItem} onPress={() => switchToServer(server._id)}>
                <Image source={getIconSource(server.icon)} style={styles.serverIcon} resizeMode="cover" />
                {pinnedServers.includes(server._id) && (
                  <View style={{position: 'absolute', bottom: -2, right: 6, backgroundColor: '#fff', borderRadius: 10, padding: 2}}>
                    <Ionicons name="pin" size={10} color="#000" style={{transform: [{rotate: '45deg'}]}} />
                  </View>
                )}
                {server._id === activeServerId && <View style={styles.activePill} />}
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.addServerBtn} onPress={() => setCreateModalVisible(true)}><Ionicons name="add" size={32} color="#2e8b57" /></TouchableOpacity>
        </ScrollView>
      </View>

      <View style={[styles.channelRail, { paddingTop: top, paddingBottom: bottom }]}>
        <View style={styles.serverHeader}>
          <TouchableOpacity
            style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}
            onPress={() => { if (activeServerId) setServerMenuVisible(true); }}
            disabled={!activeServerId}
          >
            <Text style={styles.serverName} numberOfLines={1}>{currentWorkspace?.name || "Chọn Không Gian"}</Text>
            {activeServerId && <Ionicons name="chevron-down" size={16} color="gray" style={{marginLeft: 5}}/>}
          </TouchableOpacity>

          {isOwner && (
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 12}}>
               <TouchableOpacity onPress={() => checkLimitAndOpenCreate('category')}><Ionicons name="folder-open-outline" size={20} color="gray" /></TouchableOpacity>
               <TouchableOpacity onPress={() => { setEditServerName(currentWorkspace?.name || ''); setSettingsModalVisible(true); }}><Ionicons name="settings-outline" size={20} color="gray" /></TouchableOpacity>
            </View>
          )}
        </View>
<ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
            
            {/* 👇 ĐÃ SỬA: Bọc hàm getSortedChannels vào đây 👇 */}
            {getSortedChannels(channels.filter(c => !c.parentId)).map((channel) => (
                <TouchableOpacity key={channel._id} style={[styles.channelItem, activeChannelId === channel._id && styles.activeChannel]} onPress={() => { setActiveChannelId(channel._id); setActiveChannelName(channel.name); }} onLongPress={() => handleChannelLongPress(channel, false)}>
                    <MaterialCommunityIcons name="pound" size={20} color={activeChannelId === channel._id ? "black" : "gray"} />
                    <Text style={[styles.channelText, activeChannelId === channel._id && {color: 'black', fontWeight: 'bold'}]}>
                      {channel.name} 
                      {/* @ts-ignore */}
                      {channel.isAnonymous && " 🎭"}
                    </Text>
                    {pinnedChannels.includes(channel._id) && <Ionicons name="pin" size={12} color="gray" style={{transform: [{rotate: '45deg'}]}} />}
                </TouchableOpacity>
            ))}

            {sortedGroups.map((group) => {
              const isExpanded = expandedGroups[group._id] ?? true;
              // 👇 ĐÃ SỬA: Bọc hàm getSortedChannels vào childChannels 👇
              const childChannels = getSortedChannels(channels.filter(c => c.parentId === group._id));
              const isGroupPinned = pinnedChannels.includes(group._id);

              return (
                <View key={group._id} style={{ marginTop: 16 }}>
                  <View style={[styles.categoryHeader, {justifyContent: 'space-between', paddingRight: 10}]}>
                    <TouchableOpacity style={{flexDirection: 'row', alignItems: 'center', flex: 1}} onPress={() => toggleGroup(group._id)} onLongPress={() => handleChannelLongPress(group, true)}>
                      <Ionicons name={isExpanded ? "chevron-down" : "chevron-forward"} size={12} color="gray" />
                      <Text style={styles.categoryTitle}>{group.name}</Text>
                      {isGroupPinned && <Ionicons name="pin" size={12} color="gray" style={{marginLeft: 4, transform: [{rotate: '45deg'}]}} />}
                    </TouchableOpacity>
                    {isOwner && (<TouchableOpacity onPress={() => checkLimitAndOpenCreate('channel', group._id)}><Ionicons name="add" size={18} color="gray" /></TouchableOpacity>)}
                  </View>

                  {/* Vòng lặp hiển thị kênh con bên trong Category */}
                  {isExpanded && childChannels.map(channel => (
                    <TouchableOpacity key={channel._id} style={[styles.channelItem, activeChannelId === channel._id && styles.activeChannel]} onPress={() => { setActiveChannelId(channel._id); setActiveChannelName(channel.name); }} onLongPress={() => handleChannelLongPress(channel, false)}>
                        <MaterialCommunityIcons name="pound" size={20} color={activeChannelId === channel._id ? "black" : "gray"} />
                        <Text style={[styles.channelText, activeChannelId === channel._id && {color: 'black', fontWeight: 'bold'}]}>
                          {channel.name} 
                          {/* @ts-ignore */}
                          {channel.isAnonymous && " 🎭"}
                        </Text>
                        {pinnedChannels.includes(channel._id) && <Ionicons name="pin" size={12} color="gray" style={{transform: [{rotate: '45deg'}]}} />}
                    </TouchableOpacity>
                  ))}
                </View>
              );
            })}
        </ScrollView>
        <View style={styles.userFooter}>
            <Image source={{ uri: userProfile?.imageUrl || 'https://github.com/shadcn.png' }} style={styles.footerAvatar} />
            <View style={{ marginLeft: 8, flex: 1 }}><Text style={styles.footerName} numberOfLines={1}>{userProfile?.first_name}</Text><Text style={styles.footerUsername} numberOfLines={1}>@{userProfile?.username}</Text></View>
        </View>
      </View>

      <Modal visible={isCreateModalVisible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{flex: 1, backgroundColor: '#fff'}}>
          <View style={styles.modalHeader}><TouchableOpacity onPress={() => { setCreateModalVisible(false); setSelectedTemplate(null); setInvitedUsers({}); }}><Ionicons name="close" size={28} color="gray" /></TouchableOpacity></View>
          <ScrollView style={styles.modalBody}>
            {!selectedTemplate ? (
              <>
                <Text style={styles.modalTitle}>Tạo Máy Chủ Của Bạn</Text><Text style={styles.modalSubtitle}>Máy chủ của bạn là nơi bạn giao lưu với bạn bè của mình.</Text>
                <TouchableOpacity style={styles.templateOptionPrimary} onPress={handleStartCustomCreate}><View style={styles.emojiWrapper}><Text style={styles.templateEmoji}>🌍</Text></View><Text style={styles.templateTextPrimary}>Tạo Mẫu Riêng</Text></TouchableOpacity>
                <Text style={styles.sectionTitle}>Bắt đầu từ mẫu</Text>
                {TEMPLATES.map((item) => (
                  <TouchableOpacity key={item.id} style={styles.templateOption} onPress={() => handleCreateServerClick(item.id)}><View style={styles.emojiWrapper}><Text style={styles.templateEmoji}>{item.icon}</Text></View><Text style={styles.templateText}>{item.name}</Text></TouchableOpacity>
                ))}
              </>
            ) : (
              createStep === 1 ? (
                <View style={{alignItems: 'center'}}>
                  <Text style={styles.modalTitle}>Tùy chỉnh máy chủ</Text>
                  <TouchableOpacity onPress={pickIcon} style={{marginVertical: 20}}>
                    {serverIconUri ? (<Image source={{uri: serverIconUri}} style={{width: 100, height: 100, borderRadius: 50}} />) : (<View style={{width: 100, height: 100, borderRadius: 50, backgroundColor: '#f2f3f5', justifyContent: 'center', alignItems: 'center', borderStyle: 'dashed', borderWidth: 1, borderColor: 'gray'}}><Ionicons name="camera" size={40} color="gray" /></View>)}
                  </TouchableOpacity>
                  <View style={{width: '100%'}}><Text style={styles.sectionTitle}>TÊN MÁY CHỦ</Text><TextInput style={styles.textInput} value={serverNameInput} onChangeText={setServerNameInput} /></View>
                  <TouchableOpacity style={[styles.submitBtn, {width: '100%', marginTop: 20}]} onPress={handleFinalCreateServer}><Text style={styles.submitBtnText}>Tạo máy chủ</Text></TouchableOpacity>
                </View>
              ) : (
                <View style={{flex: 1, height: 600}}><Text style={styles.modalTitle}>Mời bạn bè</Text>{renderInviteList()}<TouchableOpacity onPress={() => { setCreateModalVisible(false); setSelectedTemplate(null); setInvitedUsers({}); if(newlyCreatedId) switchToServer(newlyCreatedId); }} style={[styles.submitBtn, {marginTop: 20}]}><Text style={styles.submitBtnText}>Hoàn tất</Text></TouchableOpacity></View>
              )
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <Modal visible={isSettingsModalVisible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{flex: 1, backgroundColor: '#f2f3f5'}}>
          <View style={[styles.modalHeader, { backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}><Text style={{fontSize: 18, fontWeight: 'bold'}}>Cài đặt máy chủ</Text><TouchableOpacity onPress={() => setSettingsModalVisible(false)}><Text style={{fontSize: 16, color: '#007aff', fontWeight: 'bold'}}>Xong</Text></TouchableOpacity></View>
          <ScrollView style={{padding: 20}}>
            <View style={{alignItems: 'center', marginBottom: 20}}><Image source={getIconSource(currentWorkspace?.icon)} style={{width: 80, height: 80, borderRadius: 40, marginBottom: 10}} /><TouchableOpacity onPress={handleUpdateImage} style={{backgroundColor: '#e0e0e0', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20}}><Text style={{fontWeight: 'bold'}}>Đổi ảnh đại diện</Text></TouchableOpacity></View>
            <Text style={styles.sectionTitle}>TÊN MÁY CHỦ</Text>
            <View style={{flexDirection: 'row', backgroundColor: '#fff', borderRadius: 8, padding: 10, marginBottom: 20}}><TextInput style={{flex: 1, fontSize: 16}} value={editServerName} onChangeText={setEditServerName} /><TouchableOpacity onPress={handleSaveName}><Text style={{color: '#007aff', fontWeight: 'bold', paddingLeft: 10}}>Lưu</Text></TouchableOpacity></View>
            <TouchableOpacity onPress={() => { setSettingsModalVisible(false); setInviteOnlyModalVisible(true); }} style={{backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 8, marginBottom: 20}}><Ionicons name="person-add-outline" size={22} color="#5865F2" style={{marginRight: 10}} /><Text style={{fontSize: 16, fontWeight: 'bold', color: '#5865F2'}}>Mời bạn bè</Text></TouchableOpacity>
            <TouchableOpacity onPress={handleDeleteServer} style={{backgroundColor: '#ffdddd', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 20}}><Text style={{color: 'red', fontWeight: 'bold', fontSize: 16}}>Xóa máy chủ</Text></TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <Modal visible={isInviteOnlyModalVisible} animationType="slide" presentationStyle="pageSheet"><SafeAreaView style={{flex: 1, backgroundColor: '#fff', padding: 20}}><View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20}}><Text style={{fontSize: 22, fontWeight: 'bold'}}>Mời bạn bè</Text><TouchableOpacity onPress={() => setInviteOnlyModalVisible(false)}><Text style={{color: '#007aff', fontWeight: 'bold', fontSize: 16}}>Xong</Text></TouchableOpacity></View>{renderInviteList()}</SafeAreaView></Modal>

      <Modal visible={isCreateChannelModalVisible} transparent animationType="fade">
         <View style={styles.modalOverlay}>
           <View style={styles.smallModalContainer}>
             <Text style={styles.smallModalTitle}>Tạo {newChannelType === 'category' ? 'Danh Mục' : 'Kênh'}</Text>
             <TextInput style={styles.textInput} placeholder={newChannelType === 'category' ? "Tên danh mục mới" : "tên-kênh-mới"} value={newChannelName} onChangeText={setNewChannelName} autoFocus />
             
             {newChannelType === 'channel' && (
               <View style={{ marginTop: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                 <View style={{flex: 1, paddingRight: 10}}>
                   <Text style={{ fontWeight: 'bold', fontSize: 15, color: '#333' }}>Kênh ẩn danh (Confession)</Text>
                   <Text style={{ fontSize: 12, color: 'gray', marginTop: 4 }}>Thành viên đăng bài trong kênh này sẽ bị ẩn danh tính hoàn toàn.</Text>
                 </View>
                 <Switch 
                   value={isAnonymousChannel} 
                   onValueChange={setIsAnonymousChannel} 
                   trackColor={{ false: "#767577", true: "#5865F2" }}
                   thumbColor={isAnonymousChannel ? "#fff" : "#f4f3f4"}
                 />
               </View>
             )}

             <View style={styles.modalButtonRow}>
               <TouchableOpacity onPress={() => { setCreateChannelModalVisible(false); setIsAnonymousChannel(false); }} style={styles.cancelBtn}><Text style={styles.cancelBtnText}>Hủy</Text></TouchableOpacity>
               <TouchableOpacity onPress={handleCreateChannelSubmit} style={styles.submitBtn}><Text style={styles.submitBtnText}>Tạo</Text></TouchableOpacity>
             </View>
           </View>
         </View>
      </Modal>

      <Modal visible={isServerMenuVisible} transparent animationType="slide">
        <TouchableOpacity style={styles.bottomSheetOverlay} activeOpacity={1} onPress={() => setServerMenuVisible(false)}>
          <View style={styles.bottomSheetContainer}>
            <View style={styles.bottomSheetHeader}>
              <Image source={getIconSource(currentWorkspace?.icon)} style={styles.bottomSheetIcon} />
              <View style={{flex: 1}}>
                 <Text style={styles.bottomSheetTitle} numberOfLines={1}>{currentWorkspace?.name}</Text>
                 {/* @ts-ignore */}
                 {currentWorkspace?.boostCount > 0 && (
                   <Text style={{fontSize: 12, color: '#ff73fa', fontWeight: 'bold'}}>✨ Đã Nâng Cấp Cấp {(currentWorkspace as any).boostCount}</Text>
                 )}
              </View>
            </View>
            
            {/* 👇 NÚT NÂNG CẤP MÁY CHỦ 👇 */}
            <TouchableOpacity style={styles.bottomSheetItem} onPress={() => { setServerMenuVisible(false); setUpgradeModalVisible(true); }}>
              <FontAwesome5 name="gem" size={20} color="#ff73fa" />
              <Text style={[styles.bottomSheetItemText, {color: '#ff73fa'}]}>Nâng Cấp Máy Chủ</Text>
            </TouchableOpacity>
            
            {/* 👇 NÚT GHIM MÁY CHỦ 👇 */}
            <TouchableOpacity style={styles.bottomSheetItem} onPress={() => { setServerMenuVisible(false); togglePinServer(activeServerId!); }}>
              <Ionicons name="pin" size={24} color="black" />
              <Text style={styles.bottomSheetItemText}>{pinnedServers.includes(activeServerId!) ? "Bỏ ghim máy chủ" : "Ghim máy chủ lên đầu"}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.bottomSheetItem} onPress={() => { setServerMenuVisible(false); setMemberListModalVisible(true); }}>
              <Ionicons name="people" size={24} color="black" /><Text style={styles.bottomSheetItemText}>Xem thành viên</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.bottomSheetItem} onPress={() => { setServerMenuVisible(false); Alert.alert("Báo cáo", "Cảm ơn bạn. Quản trị viên sẽ xem xét máy chủ này."); }}>
              <Ionicons name="flag" size={24} color="black" /><Text style={styles.bottomSheetItemText}>Báo cáo máy chủ</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.bottomSheetItem} onPress={() => {
              setServerMenuVisible(false);
              if (isOwner) { Alert.alert("Thông báo", "Bạn là chủ máy chủ, hãy dùng Cài đặt (Icon bánh răng) để Xóa máy chủ thay vì Thoát."); return; }
              Alert.alert("Thoát máy chủ", `Bạn có chắc chắn muốn rời khỏi "${currentWorkspace?.name}" không?`, [
                { text: "Hủy", style: "cancel" },
                { text: "Thoát", style: "destructive", onPress: async () => {
                    if (activeServerId) {
                      try {
                        await leaveServer({ serverId: activeServerId });
                        if (universities && universities.length > 0) switchToUniversity(universities[0]._id);
                      } catch (error: any) { Alert.alert("Lỗi", error.message); }
                    }
                }}
              ]);
            }}>
              <Ionicons name="log-out" size={24} color="#ff4d4f" />
              <Text style={[styles.bottomSheetItemText, {color: '#ff4d4f'}]}>Thoát Server</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={isMemberListModalVisible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{flex: 1, backgroundColor: '#f2f3f5'}}>
          <View style={[styles.modalHeader, { backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
            <Text style={{fontSize: 18, fontWeight: 'bold'}}>Thành viên máy chủ</Text>
            <TouchableOpacity onPress={() => setMemberListModalVisible(false)}><Text style={{fontSize: 16, color: '#007aff', fontWeight: 'bold'}}>Đóng</Text></TouchableOpacity>
          </View>
          <ScrollView style={{padding: 20}}>
            <Text style={{fontSize: 12, fontWeight: 'bold', color: 'gray', marginBottom: 15, textTransform: 'uppercase'}}>Thành viên — {serverMembers?.length || 0}</Text>
            {serverMembers?.map(member => (
              <View key={member._id} style={{flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 15, borderRadius: 8, marginBottom: 10}}>
                <Image source={{uri: member.imageUrl}} style={{width: 40, height: 40, borderRadius: 20, marginRight: 15}} />
                <View style={{flex: 1}}>
                  <View style={{flexDirection: 'row', alignItems: 'center'}}>
                    <Text style={{fontWeight: 'bold', fontSize: 16}}>{member.first_name}</Text>
                    {member.isCreator && (<Text style={{fontSize: 10, backgroundColor: '#ffd700', paddingHorizontal: 5, paddingVertical: 2, borderRadius: 5, marginLeft: 8, fontWeight: 'bold'}}>CHỦ SERVER</Text>)}
                    {!member.isCreator && member.isAdmin && (<Text style={{fontSize: 10, backgroundColor: '#ff4d4f', color: 'white', paddingHorizontal: 5, paddingVertical: 2, borderRadius: 5, marginLeft: 8, fontWeight: 'bold'}}>QTV</Text>)}
                  </View>
                  <Text style={{color: 'gray', fontSize: 13}}>@{member.username}</Text>
                </View>
              </View>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* ========================================== */}
      {/* 💎 GIAO DIỆN MODAL NÂNG CẤP MÁY CHỦ (NITRO) 💎 */}
      {/* ========================================== */}
      <Modal visible={isUpgradeModalVisible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{flex: 1, backgroundColor: '#fff'}}>
          <View style={styles.upgradeHeader}>
            <TouchableOpacity onPress={() => setUpgradeModalVisible(false)} hitSlop={{top:10, bottom:10, left:10, right:10}}>
              <Ionicons name="close" size={28} color="#000" />
            </TouchableOpacity>
            <Text style={styles.upgradeHeaderTitle}>Nâng Cấp Máy Chủ</Text>
            <TouchableOpacity><Ionicons name="settings-outline" size={24} color="#000" /></TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
             {/* Banner Top */}
             <View style={styles.upgradeBanner}>
               <Text style={styles.upgradeBannerText}>Nâng cấp máy chủ này để mở khóa các đặc quyền ✨</Text>
               <Image source={getIconSource(currentWorkspace?.icon)} style={styles.upgradeBannerIcon} />
               <Text style={styles.upgradeBannerTitle}>{currentWorkspace?.name}</Text>
               {/* @ts-ignore */}
               <Text style={styles.upgradeBannerSubtitle}>💎 {currentWorkspace?.boostCount > 0 ? `Đã Nâng Cấp Cấp ${currentWorkspace.boostCount}` : 'Không Có Nâng Cấp'}</Text>
               <Text style={styles.channelLimitInfo}>Giới hạn kênh: {channels.length + groups.length} / {currentChannelLimit}</Text>

               <TouchableOpacity style={styles.upgradeBtnPrimary} onPress={() => Alert.alert("Nâng cấp", "Tính năng thanh toán Nitro đang được phát triển!")}>
                  <Text style={styles.upgradeBtnTextPrimary}>Nâng Cấp Máy Chủ Này</Text>
               </TouchableOpacity>
               <TouchableOpacity style={styles.upgradeBtnSecondary}>
                  <Text style={styles.upgradeBtnTextSecondary}>Nhận Nitro</Text>
               </TouchableOpacity>
             </View>

             <View style={{padding: 20}}>
                <Text style={styles.upgradeLevelsTitle}>CÁC ĐẶC QUYỀN BỔ SUNG</Text>
                
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap: 15, paddingVertical: 10}}>
                  {/* Cấp 1 */}
                  <View style={styles.levelCard}>
                     <View style={styles.levelCardHeader}>
                        <Text style={styles.levelCardTitle}>Cấp 1</Text>
                     </View>
                     <View style={styles.levelCardFeature}><Text>📺</Text><Text style={styles.featureText}>+5 Giới hạn số lượng Kênh</Text></View>
                     <View style={styles.levelCardFeature}><Text>😎</Text><Text style={styles.featureText}>100 Ô Emoji tùy chỉnh</Text></View>
                     <View style={styles.levelCardFeature}><Text>🎵</Text><Text style={styles.featureText}>Chất lượng Âm thanh 128kbps</Text></View>
                     <View style={styles.levelCardFeature}><Text>🖼️</Text><Text style={styles.featureText}>Biểu Tượng Máy Chủ Động</Text></View>
                     <Text style={styles.levelPriceText}>💎 Yêu cầu: 2 Nâng cấp</Text>
                  </View>

                  {/* Cấp 2 */}
                  <View style={styles.levelCard}>
                     <View style={styles.levelCardHeader}>
                        <Text style={styles.levelCardTitle}>Cấp 2</Text>
                     </View>
                     <View style={styles.levelCardFeature}><Text>📺</Text><Text style={styles.featureText}>+10 Giới hạn số lượng Kênh</Text></View>
                     <View style={styles.levelCardFeature}><Text>🎥</Text><Text style={styles.featureText}>Stream video HD</Text></View>
                     <View style={styles.levelCardFeature}><Text>⬆️</Text><Text style={styles.featureText}>Dung lượng tải lên 50MB</Text></View>
                     <View style={styles.levelCardFeature}><Text>🎭</Text><Text style={styles.featureText}>Biểu ngữ máy chủ tùy biến</Text></View>
                     <Text style={styles.levelPriceText}>💎 Yêu cầu: 7 Nâng cấp</Text>
                  </View>
                </ScrollView>
             </View>
          </ScrollView>
        </SafeAreaView>
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
  bottomSheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  bottomSheetContainer: { backgroundColor: '#ffffff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40 },
  bottomSheetHeader: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#f0f0f0', paddingBottom: 15, marginBottom: 10 },
  bottomSheetIcon: { width: 48, height: 48, borderRadius: 16, marginRight: 15, backgroundColor: '#313338' },
  bottomSheetTitle: { color: 'black', fontSize: 20, fontWeight: 'bold' },
  bottomSheetItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15 },
  bottomSheetItemText: { color: 'black', fontSize: 16, fontWeight: 'bold', marginLeft: 15 },

  // Giao diện Nâng Cấp Máy Chủ
  upgradeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, backgroundColor: '#fff' },
  upgradeHeaderTitle: { fontSize: 18, fontWeight: 'bold' },
  upgradeBanner: { backgroundColor: '#8a2be2', alignItems: 'center', paddingVertical: 40, paddingHorizontal: 20, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  upgradeBannerText: { color: 'white', fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  upgradeBannerIcon: { width: 70, height: 70, borderRadius: 35, borderWidth: 3, borderColor: 'white', marginBottom: 10 },
  upgradeBannerTitle: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  upgradeBannerSubtitle: { color: '#ffd700', fontSize: 14, fontWeight: 'bold', marginTop: 5 },
  channelLimitInfo: { color: '#e0e0e0', fontSize: 13, marginTop: 8, marginBottom: 20 },
  upgradeBtnPrimary: { backgroundColor: '#5865F2', paddingVertical: 14, width: '100%', borderRadius: 25, alignItems: 'center', marginBottom: 12 },
  upgradeBtnTextPrimary: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  upgradeBtnSecondary: { backgroundColor: 'white', paddingVertical: 14, width: '100%', borderRadius: 25, alignItems: 'center' },
  upgradeBtnTextSecondary: { color: '#5865F2', fontWeight: 'bold', fontSize: 16 },
  upgradeLevelsTitle: { fontSize: 16, fontWeight: 'bold', color: 'gray', marginTop: 10, marginBottom: 10 },
  levelCard: { backgroundColor: '#f2f3f5', padding: 20, borderRadius: 16, width: 260, borderWidth: 1, borderColor: '#e0e0e0' },
  levelCardHeader: { backgroundColor: '#8a2be2', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 12, alignSelf: 'flex-start', marginBottom: 15 },
  levelCardTitle: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  levelCardFeature: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  featureText: { fontSize: 14, color: '#333', marginLeft: 10, fontWeight: '500' },
  levelPriceText: { color: '#ff73fa', fontWeight: 'bold', marginTop: 10, fontSize: 14 }
});