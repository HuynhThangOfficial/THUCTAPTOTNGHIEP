import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, ActivityIndicator, LayoutAnimation, Platform, UIManager, Modal, SafeAreaView, Alert, TextInput, Switch, KeyboardAvoidingView, TouchableWithoutFeedback } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useChannel } from '@/context/ChannelContext';
import * as ImagePicker from 'expo-image-picker';
import { Id } from '@/convex/_generated/dataModel';
import { useTranslation } from 'react-i18next';
import { Link, useRouter } from 'expo-router';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const LOCAL_IMAGES: Record<string, any> = { 'local:login': require('../assets/images/login.png'), 'local:community': require('../assets/images/icon.png'), };
const getIconSource = (iconString?: string) => (iconString && LOCAL_IMAGES[iconString] ? LOCAL_IMAGES[iconString] : { uri: iconString || 'https://via.placeholder.com/50' });

const UPGRADE_LEVELS = [
  { level: 1, stones: 1 }, { level: 2, stones: 2 }, { level: 3, stones: 2 }, { level: 4, stones: 3 }, { level: 5, stones: 3 }, { level: 6, stones: 4 }, { level: 7, stones: 4 }, { level: 8, stones: 4 }, { level: 9, stones: 5 }, { level: 10, stones: 5 },
];

const TEMPLATES_LIST = [
  { id: 'Friends', icon: '💗', localeKey: 'templates.Friends' },
  { id: 'Gaming', icon: '🎮', localeKey: 'templates.Gaming' },
  { id: 'Study', icon: '📚', localeKey: 'templates.Study' },
  { id: 'School', icon: '🏫', localeKey: 'templates.School' },
  { id: 'Creators', icon: '🎨', localeKey: 'templates.Creators' },
  { id: 'custom', icon: '🌍', localeKey: 'server.create_custom' },
];

export default function SideMenu() {
  const [isBrowseModalVisible, setBrowseModalVisible] = useState(false);
  const { t } = useTranslation();
  const router = useRouter();
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
  const removeMember = useMutation(api.university.removeMember);
  const reportServerToAdmin = useMutation((api as any).messages.reportServerToAdmin);

  const buyStones = useMutation(api.boosts.buyStones);
  const boostServer = useMutation(api.boosts.boostServer);

  const { activeUniversityId, setActiveUniversityId, activeServerId, setActiveServerId, activeChannelId, setActiveChannelId, setActiveChannelName } = useChannel();

  const hiddenChannels = useQuery(api.university.getHiddenChannelIds, activeServerId ? { serverId: activeServerId } : "skip") || [];
  const topBoosters = useQuery(api.boosts.getTopBoosters, activeServerId ? { serverId: activeServerId } : "skip");
  const serverMembers = useQuery(api.university.getServerMembers, activeServerId ? { serverId: activeServerId } : "skip");

  const toggleVisibility = useMutation(api.university.toggleChannelVisibility);

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  // States Modal Cài đặt
  const [isSettingsModalVisible, setSettingsModalVisible] = useState(false);
  const [editServerName, setEditServerName] = useState('');
  const [editServerIconUri, setEditServerIconUri] = useState<string | null>(null);

  // States Modal Tạo Máy chủ
  const [isCreateModalVisible, setCreateModalVisible] = useState(false);
  const [serverNameInput, setServerNameInput] = useState('');
  const [serverIconUri, setServerIconUri] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(TEMPLATES_LIST[0]);
  const [isTemplateDropdownOpen, setIsTemplateDropdownOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isAvatarUploading, setIsAvatarUploading] = useState(false);

  const [newlyCreatedId, setNewlyCreatedId] = useState<Id<'servers'> | null>(null);
  const [invitedUsers, setInvitedUsers] = useState<Record<string, boolean>>({});

  const [isServerMenuVisible, setServerMenuVisible] = useState(false);
  const [isMemberListModalVisible, setMemberListModalVisible] = useState(false);
  const [isInviteOnlyModalVisible, setInviteOnlyModalVisible] = useState(false);
  const [isCreateChannelModalVisible, setCreateChannelModalVisible] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelType, setNewChannelType] = useState<'category' | 'channel'>('channel');
  const [selectedCategoryId, setSelectedCategoryId] = useState<Id<'channels'> | undefined>(undefined);
  const [isAnonymousChannel, setIsAnonymousChannel] = useState(false);

  // STATE QUẢN LÝ GHIM MÁY CHỦ VÀ NÂNG CẤP
  const [pinnedServers, setPinnedServers] = useState<string[]>([]);
  const [pinnedChannels, setPinnedChannels] = useState<string[]>([]);
  const [isUpgradeModalVisible, setUpgradeModalVisible] = useState(false);

  // STATE BÁO CÁO MÁY CHỦ
  const [isReportServerModalVisible, setReportServerModalVisible] = useState(false);
  const [reportStep, setReportStep] = useState(1);
  const [selectedTargets, setSelectedTargets] = useState<string[]>([]);
  const [reportReason, setReportReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [isReporting, setIsReporting] = useState(false);

  const TARGET_OPTIONS = ['target_avatar', 'target_name', 'target_channels', 'target_purpose'];
  const REASON_OPTIONS = ['reason_spam', 'reason_harassment', 'reason_inappropriate', 'reason_adult', 'reason_other'];

  const handleBuyStones = () => {
    Alert.alert(t('alerts.buy_confirm_title'), t('alerts.buy_confirm_desc'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.confirm'), onPress: async () => {
         try {
           await buyStones();
           Alert.alert(t('common.success'), t('alerts.buy_success'));
         } catch(e: any) {
           Alert.alert(t('common.error'), e.message);
         }
      }}
    ]);
  };

  const handleDonateStones = async () => {
    if (!activeServerId) return;
    const myStones = (userProfile as any)?.stones || 0;
    if (myStones < 1) {
      Alert.alert(t('common.error'), t('boost.not_enough_stones'));
      return;
    }
    try {
      await boostServer({ serverId: activeServerId });
      Alert.alert(t('common.success'), t('alerts.donate_success'));
    } catch (e: any) {
      Alert.alert(t('common.error'), e.message);
    }
  };

  const handleSubmitServerReport = async () => {
    if (!activeServerId) return;
    setIsReporting(true);
    try {
      await reportServerToAdmin({
        serverId: activeServerId,
        targets: selectedTargets,
        reason: reportReason,
        customReason: customReason
      });
      Alert.alert(t('common.success'), t('report.success'));
      setReportServerModalVisible(false);
      setReportStep(1);
      setSelectedTargets([]);
      setReportReason('');
      setCustomReason('');
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message);
    } finally {
      setIsReporting(false);
    }
  };

  const handleToggleVisibility = async (channelId: string) => {
    if (!activeServerId) return;
    try {
      await toggleVisibility({ channelId: channelId as Id<"channels">, serverId: activeServerId });
    } catch(e: any) {
      console.log(e);
    }
  };

  const handleTogglePinServer = () => {
    if (!activeServerId) return;
    setPinnedServers(prev =>
      prev.includes(activeServerId) ? prev.filter(id => id !== activeServerId) : [...prev, activeServerId]
    );
    setServerMenuVisible(false);
  };

  const handlePickIconForCreate = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });
    if (!result.canceled) {
      setServerIconUri(result.assets[0].uri);
    }
  };

  const uploadSingleImage = async (uri: string) => {
    const postUrl = await generateUploadUrl();
    const response = await fetch(uri);
    const blob = await response.blob();
    const result = await fetch(postUrl, { method: 'POST', headers: { 'Content-Type': blob.type }, body: blob });
    const { storageId } = await result.json();
    return storageId;
  };

  const handleCreateServerSubmit = async () => {
    if (!serverNameInput.trim()) return;
    setIsUploading(true);
    try {
      let iconId = undefined;
      if (serverIconUri) {
        iconId = await uploadSingleImage(serverIconUri);
      }

      const response: any = await createServer({
        name: serverNameInput.trim(),
        template: t(selectedTemplate?.localeKey) || '',
        iconStorageId: iconId
      });

      const newId = response.serverId as Id<'servers'>;

      setNewlyCreatedId(newId);
      setActiveUniversityId(null as any);
      setActiveServerId(newId);
      setCreateModalVisible(false);
      setServerNameInput('');
      setServerIconUri(null);
      setSelectedTemplate(TEMPLATES_LIST[0]);
    } catch (e: any) {
      Alert.alert(t('common.error'), e.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleAvatarAutoSave = async () => {
    if (!activeServerId) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });
    if (!result.canceled) {
      const uri = result.assets[0].uri;
      setEditServerIconUri(uri);
      setIsAvatarUploading(true);
      try {
        const iconId = await uploadSingleImage(uri);
        await updateServer({ serverId: activeServerId, iconStorageId: iconId });
        Alert.alert(t('common.success'), t('alerts.change_server_icon'));
      } catch (e: any) {
        Alert.alert(t('common.error'), e.message);
      } finally {
        setIsAvatarUploading(false);
      }
    }
  };

  const handleUpdateServerNameSubmit = async () => {
    if (!activeServerId || !editServerName.trim()) return;
    setIsUploading(true);
    try {
      await updateServer({ serverId: activeServerId, name: editServerName.trim() });
      Alert.alert(t('common.success'), t('alerts.save_server_name'));
    } catch (e: any) {
      Alert.alert(t('common.error'), e.message);
    } finally {
      setIsUploading(false);
    }
  };

  const channelsData = useQuery(api.university.getChannels, {
    universityId: activeUniversityId || undefined,
    serverId: activeServerId || undefined
  });

  useEffect(() => { if (activeServerId && activeUniversityId) setActiveUniversityId(null as any); }, [activeServerId, activeUniversityId]);

  useEffect(() => {
    let fallbackTimer: NodeJS.Timeout;
    if (universities && universities.length > 0 && !activeUniversityId && !activeServerId) {
       fallbackTimer = setTimeout(() => { setActiveUniversityId(universities[0]._id); }, 100);
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

  if (universities === undefined || channelsData === undefined) return <View style={[styles.container, {justifyContent:'center', alignItems: 'center'}]}><ActivityIndicator color="#000" /></View>;

  const groups = channelsData?.groups || [];
  const channels = channelsData?.channels || [];
  const currentWorkspace = activeUniversityId ? universities.find(u => u._id === activeUniversityId) : myServers?.find(s => s._id === activeServerId);
  const isOwner = activeServerId && currentWorkspace && 'creatorId' in currentWorkspace && currentWorkspace.creatorId === userProfile?._id;

  const serverTotalStones = (currentWorkspace as any)?.totalStones || 0;
  const myStones = (userProfile as any)?.stones || 0;

  let currentLevel = 0; let accumulatedStones = 0; let stonesNeededForNext = UPGRADE_LEVELS[0].stones;
  for (let i = 0; i < UPGRADE_LEVELS.length; i++) {
    accumulatedStones += UPGRADE_LEVELS[i].stones;
    if (serverTotalStones >= accumulatedStones) { currentLevel = UPGRADE_LEVELS[i].level; }
    else { stonesNeededForNext = UPGRADE_LEVELS[i].stones; break; }
  }

  const isMaxLevel = currentLevel >= 10;
  if (isMaxLevel) { currentLevel = 10; stonesNeededForNext = 0; }

  const currentChannelLimit = 30 + (currentLevel * 5);

  const switchToUniversity = (id: Id<'universities'>) => { if (id === activeUniversityId) return; setActiveServerId(null as any); setActiveUniversityId(id); setActiveChannelId(null as any); };
  const switchToServer = (id: Id<'servers'>) => { if (id === activeServerId) return; setActiveUniversityId(null as any); setActiveServerId(id); setActiveChannelId(null as any); };
  const toggleGroup = (groupId: string) => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setExpandedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] })); };

  const checkLimitAndOpenCreate = (type: 'category' | 'channel', parentId?: Id<'channels'>) => {
    if (channels.length + groups.length >= currentChannelLimit) {
      Alert.alert(t('alerts.limit_title'), t('alerts.limit_desc', { limit: currentChannelLimit, total: channels.length + groups.length }), [
          { text: t('common.cancel'), style: "cancel" }, { text: t('alerts.upgrade_now'), onPress: () => setUpgradeModalVisible(true) }
      ]);
      return;
    }
    setNewChannelType(type); setSelectedCategoryId(parentId); setNewChannelName(''); setIsAnonymousChannel(false); setCreateChannelModalVisible(true);
  };

  const handleChannelLongPress = (target: any, isCategory: boolean) => {
    if (target.name === 'đại-sảnh') return Alert.alert(t('alerts.invalid'), t('alerts.no_default_edit'));
    const isPinned = pinnedChannels.includes(target._id);
    Alert.alert(t('alerts.option_title', { type: isCategory ? t('common.category') : t('common.channel') }), t('alerts.option_desc', { name: target.name }), [
        { text: t('common.cancel'), style: "cancel" },
        { text: isPinned ? t('alerts.unpin') : t('alerts.pin_top'), onPress: () => { setPinnedChannels(prev => isPinned ? prev.filter(id => id !== target._id) : [...prev, target._id]); }},
        ...(isOwner ? [{ text: t('common.delete'), style: "destructive" as const, onPress: async () => {
            try { await deleteChannel({ channelId: target._id }); if (activeChannelId === target._id || isCategory) setActiveChannelId(null as any); }
            catch(e: any) { Alert.alert(t('common.error'), e.message); }
        }}] : [])
    ]);
  };

  const handleCreateChannelSubmit = async () => {
    if (newChannelName.trim() === '' || !activeServerId) return;
    try {
      let finalName = newChannelName.trim();
      if (newChannelType === 'channel') finalName = finalName.toLowerCase().replace(/\s+/g, '-');
      await createChannel({ serverId: activeServerId, name: finalName, type: newChannelType, parentId: selectedCategoryId ? selectedCategoryId : undefined, isAnonymous: newChannelType === 'channel' ? isAnonymousChannel : undefined as any });
      setCreateChannelModalVisible(false); setNewChannelName(''); setIsAnonymousChannel(false);
    } catch (e: any) { Alert.alert(t('common.error'), e.message); }
  };

  const sortedServers = myServers ? [...myServers].sort((a, b) => {
    const aPinned = pinnedServers.includes(a._id);
    const bPinned = pinnedServers.includes(b._id);
    if (aPinned && !bPinned) return -1;
    if (!aPinned && bPinned) return 1;
    return 0;
  }) : [];

  const isServerPinned = activeServerId && pinnedServers.includes(activeServerId);

  const renderInviteList = () => (
    <View style={{flex: 1}}>
      <TextInput style={[styles.textInput, {marginBottom: 15}]} placeholder={t('members.search_placeholder')} placeholderTextColor="#999" value={searchQuery} onChangeText={setSearchQuery} />
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
              <TouchableOpacity disabled={isInvited} onPress={async () => { if (newlyCreatedId) { await addFriendToServer({ serverId: newlyCreatedId, friendId: user._id }); } else if (activeServerId) { await addFriendToServer({ serverId: activeServerId, friendId: user._id }); } setInvitedUsers(prev => ({ ...prev, [user._id]: true })); }} style={{backgroundColor: isInvited ? '#ccc' : '#5865F2', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20}}>
                <Text style={{color: 'white', fontWeight: 'bold'}}>{isInvited ? t('common.member') : (isFriend ? t('common.add') : t('common.invite'))}</Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* CỘT DANH SÁCH MÁY CHỦ BÊN TRÁI */}
      <View style={[styles.serverRail, { paddingTop: top }]}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ alignItems: 'center', paddingBottom: 20, width: '100%' }}>
            {universities.map((uni) => (
              <TouchableOpacity key={uni._id} style={styles.serverItem} onPress={() => switchToUniversity(uni._id)}>
                <Image source={getIconSource(uni.icon)} style={styles.serverIcon} resizeMode="contain" />
                {uni._id === activeUniversityId && <View style={styles.activePill} />}
              </TouchableOpacity>
            ))}

            <View style={styles.railSeparator} />

            {/* DUYỆT QUA DANH SÁCH MÁY CHỦ ĐÃ SẮP XẾP */}
            {sortedServers.map((server) => (
              <TouchableOpacity key={server._id} style={styles.serverItem} onPress={() => switchToServer(server._id)}>
                <Image source={getIconSource(server.icon)} style={styles.serverIcon} resizeMode="cover" />
                {server._id === activeServerId && <View style={styles.activePill} />}
              </TouchableOpacity>
            ))}

            <View style={styles.railSeparator} />
            <TouchableOpacity style={styles.addServerBtn} onPress={() => { setCreateModalVisible(true); setServerIconUri(null); setServerNameInput(''); setIsTemplateDropdownOpen(false); }}>
              <Ionicons name="add" size={28} color="#44b669" />
            </TouchableOpacity>

        </ScrollView>
      </View>

      {/* CỘT DANH SÁCH KÊNH BÊN PHẢI */}
      <View style={[styles.channelRail, { paddingTop: top, paddingBottom: bottom }]}>
        <View style={styles.serverHeader}>
          <TouchableOpacity style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }} onPress={() => { if (activeServerId) setServerMenuVisible(true); }} disabled={!activeServerId}>
            <Text style={styles.serverName} numberOfLines={1}>{currentWorkspace?.name || t('server.choose_workspace')}</Text>
            {activeServerId && <Ionicons name="chevron-down" size={16} color="gray" style={{marginLeft: 5}}/>}
          </TouchableOpacity>
          {isOwner && (
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 12}}>
               <TouchableOpacity onPress={() => checkLimitAndOpenCreate('category')}><Ionicons name="folder-open-outline" size={20} color="gray" /></TouchableOpacity>
               <TouchableOpacity onPress={() => {
                 setEditServerName(currentWorkspace?.name || '');
                 setEditServerIconUri(null);
                 setSettingsModalVisible(true);
               }}>
                 <Ionicons name="settings-outline" size={20} color="gray" />
               </TouchableOpacity>
            </View>
          )}
        </View>

        <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
            {channels.filter(c => !c.parentId && (!hiddenChannels.includes(c._id) || c.name === 'đại-sảnh')).map((channel) => (
                <TouchableOpacity key={channel._id} style={[styles.channelItem, activeChannelId === channel._id && styles.activeChannel]} onPress={() => { setActiveChannelId(channel._id); setActiveChannelName(channel.name); }} onLongPress={() => handleChannelLongPress(channel, false)}>
                    <MaterialCommunityIcons name="pound" size={20} color={activeChannelId === channel._id ? "black" : "gray"} />
                    <Text style={[styles.channelText, activeChannelId === channel._id && {color: 'black', fontWeight: 'bold'}]}>{channel.name}{(channel as any).isAnonymous && " 🎭"}</Text>
                </TouchableOpacity>
            ))}

            {groups.map((group) => {
              const isExpanded = expandedGroups[group._id] ?? true;
              const childChannels = channels.filter(c => c.parentId === group._id && !hiddenChannels.includes(c._id));

              return (
                <View key={group._id} style={{ marginTop: 16 }}>
                  <View style={[styles.categoryHeader, {justifyContent: 'space-between', paddingRight: 10}]}>
                    <TouchableOpacity style={{flexDirection: 'row', alignItems: 'center', flex: 1}} onPress={() => toggleGroup(group._id)} onLongPress={() => handleChannelLongPress(group, true)}>
                      <Ionicons name={isExpanded ? "chevron-down" : "chevron-forward"} size={12} color="gray" />
                      <Text style={styles.categoryTitle}>{group.name}</Text>
                    </TouchableOpacity>
                    {isOwner && (<TouchableOpacity onPress={() => checkLimitAndOpenCreate('channel', group._id)}><Ionicons name="add" size={18} color="gray" /></TouchableOpacity>)}
                  </View>
                  {isExpanded && childChannels.map(channel => (
                    <TouchableOpacity key={channel._id} style={[styles.channelItem, activeChannelId === channel._id && styles.activeChannel]} onPress={() => { setActiveChannelId(channel._id); setActiveChannelName(channel.name); }} onLongPress={() => handleChannelLongPress(channel, false)}>
                        <MaterialCommunityIcons name="pound" size={20} color={activeChannelId === channel._id ? "black" : "gray"} />
                        <Text style={[styles.channelText, activeChannelId === channel._id && {color: 'black', fontWeight: 'bold'}]}>{channel.name}{(channel as any).isAnonymous && " 🎭"}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              );
            })}
        </ScrollView>
      </View>

      {/* MODAL BOTTOM SHEET MENU SERVER */}
      <Modal visible={isServerMenuVisible} transparent animationType="slide">
        <TouchableOpacity style={styles.bottomSheetOverlay} activeOpacity={1} onPress={() => setServerMenuVisible(false)}>
          <View style={styles.bottomSheetContainer}>
            <View style={styles.bottomSheetHeader}>
              <Image source={getIconSource(currentWorkspace?.icon)} style={styles.bottomSheetIcon} />
              <View style={{flex: 1}}>
                 <Text style={styles.bottomSheetTitle} numberOfLines={1}>{currentWorkspace?.name}</Text>
                 {currentLevel > 0 && <Text style={{fontSize: 12, color: '#44b669', fontWeight: 'bold'}}>{t('menu.reached_level', { level: currentLevel })}</Text>}
              </View>
            </View>

            <TouchableOpacity style={styles.bottomSheetItem} onPress={() => { setServerMenuVisible(false); setUpgradeModalVisible(true); }}><FontAwesome5 name="gem" size={20} color="#44b669" /><Text style={[styles.bottomSheetItemText, {color: '#44b669'}]}>{t('menu.upgrade_server')}</Text></TouchableOpacity>

            <TouchableOpacity style={styles.bottomSheetItem} onPress={handleTogglePinServer}>
              <Ionicons name={isServerPinned ? "pin" : "pin-outline"} size={24} color="black" />
              <Text style={styles.bottomSheetItemText}>{isServerPinned ? t('alerts.unpin') : t('alerts.pin_top')}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.bottomSheetItem} onPress={() => { setServerMenuVisible(false); setTimeout(() => setBrowseModalVisible(true), 300); }}><Ionicons name="list-outline" size={24} color="black" /><Text style={styles.bottomSheetItemText}>{t('menu.browse_channels')}</Text></TouchableOpacity>
            <TouchableOpacity style={styles.bottomSheetItem} onPress={() => { setServerMenuVisible(false); setMemberListModalVisible(true); }}><Ionicons name="people" size={24} color="black" /><Text style={styles.bottomSheetItemText}>{t('menu.view_members')}</Text></TouchableOpacity>

            <TouchableOpacity style={styles.bottomSheetItem} onPress={() => { setServerMenuVisible(false); setReportServerModalVisible(true); }}>
              <Ionicons name="flag" size={24} color="black" /><Text style={styles.bottomSheetItemText}>{t('menu.report_server')}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.bottomSheetItem} onPress={() => {
              setServerMenuVisible(false);
              if (isOwner) { Alert.alert(t('common.notification'), t('server_errors.owner_cannot_leave')); return; }
              Alert.alert(t('alerts.leave_server'), t('alerts.leave_server_desc', { name: currentWorkspace?.name }), [
                { text: t('common.cancel'), style: "cancel" },
                { text: t('common.delete'), style: "destructive", onPress: async () => {
                    if (activeServerId) {
                      try { await leaveServer({ serverId: activeServerId }); if (universities && universities.length > 0) switchToUniversity(universities[0]._id); }
                      catch (error: any) { Alert.alert(t('common.error'), error.message); }
                    }
                }}
              ]);
            }}>
              <Ionicons name="log-out" size={24} color="#ff4d4f" />
              <Text style={[styles.bottomSheetItemText, {color: '#ff4d4f'}]}>{t('menu.leave_server')}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ================================================================= */}
      {/* DUYỆT KÊNH (BROWSE CHANNELS) THEO ẢNH 3 - CĂN GIỮA */}
      {/* ================================================================= */}
      <Modal visible={isBrowseModalVisible} animationType="fade" transparent>
        <View style={styles.centeredModalOverlay}>
           <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setBrowseModalVisible(false)} />
           <View style={styles.centeredModalContainer}>
             <View style={styles.centeredModalHeader}>
                <View>
                   <Text style={styles.centeredModalTitle}>{t('menu.browse_channels_title')}</Text>
                   <Text style={{ fontSize: 13, color: 'gray', marginTop: 2 }}>{t('menu.browse_channels_desc')}</Text>
                </View>
                <TouchableOpacity onPress={() => setBrowseModalVisible(false)}><Ionicons name="close" size={24} color="gray" /></TouchableOpacity>
             </View>

             <ScrollView style={{ padding: 20 }} showsVerticalScrollIndicator={false}>
               {/* Nhóm Đại Sảnh (LÀM MỜ VÀ KHÓA) */}
               {channels.filter(c => c.name === 'đại-sảnh').map(c => (
                 <View key={c._id} style={styles.browseCard}>
                    <View style={[styles.browseItem, { opacity: 0.5 }]}>
                       <Text style={styles.browseItemText}># {c.name}</Text>
                       <Switch value={true} disabled={true} trackColor={{ true: '#8b94f7' }} thumbColor="#5865F2" />
                    </View>
                 </View>
               ))}

               {/* Các Kênh Tự Do Khác */}
               <View style={[styles.browseCard, { marginTop: 20 }]}>
                 {channels.filter(c => !c.parentId && c.name !== 'đại-sảnh').map((c, idx, arr) => (
                    <View key={c._id} style={[styles.browseItem, idx < arr.length - 1 && styles.browseItemBorder]}>
                       <Text style={styles.browseItemText}># {c.name}</Text>
                       <Switch
                          value={!hiddenChannels.includes(c._id)}
                          onValueChange={() => handleToggleVisibility(c._id)}
                          trackColor={{ false: "#d1d5db", true: "#8b94f7" }}
                          thumbColor={!hiddenChannels.includes(c._id) ? "#5865F2" : "#f4f3f4"}
                       />
                    </View>
                 ))}
               </View>

               {/* Nhóm Danh Mục */}
               {groups.map(group => {
                  const childChannels = channels.filter(c => c.parentId === group._id);
                  if (childChannels.length === 0) return null;
                  return (
                    <View key={group._id} style={{ marginTop: 20 }}>
                       <Text style={styles.browseCategoryText}>{group.name}</Text>
                       <View style={styles.browseCard}>
                          {childChannels.map((c, idx) => (
                             <View key={c._id} style={[styles.browseItem, idx < childChannels.length - 1 && styles.browseItemBorder]}>
                                <Text style={styles.browseItemText}># {c.name}</Text>
                                <Switch
                                   value={!hiddenChannels.includes(c._id)}
                                   onValueChange={() => handleToggleVisibility(c._id)}
                                   trackColor={{ false: "#d1d5db", true: "#8b94f7" }}
                                   thumbColor={!hiddenChannels.includes(c._id) ? "#5865F2" : "#f4f3f4"}
                                />
                             </View>
                          ))}
                       </View>
                    </View>
                  );
               })}
               <View style={{height: 30}} />
             </ScrollView>
           </View>
        </View>
      </Modal>

      {/* ================================================================= */}
      {/* XEM THÀNH VIÊN (VIEW MEMBERS) - CĂN GIỮA KÈM ROLE */}
      {/* ================================================================= */}
      <Modal visible={isMemberListModalVisible} animationType="fade" transparent>
        <View style={styles.centeredModalOverlay}>
           <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setMemberListModalVisible(false)} />
           <View style={[styles.centeredModalContainer, { maxHeight: '80%' }]}>
             <View style={styles.centeredModalHeader}>
                <Text style={styles.centeredModalTitle}>{t('members.title')} ({serverMembers?.length || 0})</Text>
                <TouchableOpacity onPress={() => setMemberListModalVisible(false)}><Ionicons name="close" size={24} color="gray" /></TouchableOpacity>
             </View>
             <ScrollView style={{ padding: 20 }} showsVerticalScrollIndicator={false}>
                {serverMembers?.map(member => (
                   <View key={member._id} style={styles.memberListItem}>
                      <Image source={{uri: member.imageUrl}} style={styles.memberListAvatar}/>
                      <View style={styles.memberListInfo}>
                         <Text style={styles.memberListName}>{member.first_name}</Text>
                         <Text style={styles.memberListUsername}>@{member.username}</Text>
                      </View>
                      {/* HIỂN THỊ HUY HIỆU ROLE */}
                      {member.isCreator ? (
                         <View style={styles.ownerBadge}><Text style={styles.ownerBadgeText}>{t('members.owner')}</Text></View>
                      ) : member.isAdmin ? (
                         <View style={styles.adminBadge}><Text style={styles.adminBadgeText}>{t('members.admin')}</Text></View>
                      ) : null}
                   </View>
                ))}
             </ScrollView>
           </View>
        </View>
      </Modal>

      {/* ================================================================= */}
      {/* NÂNG CẤP MÁY CHỦ (CĂN GIỮA THEO ẢNH SỐ 2) */}
      {/* ================================================================= */}
      <Modal visible={isUpgradeModalVisible} animationType="fade" transparent>
        <View style={styles.centeredModalOverlay}>
           <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setUpgradeModalVisible(false)} />

           <View style={[styles.centeredModalContainer, { padding: 0, maxHeight: '85%' }]}>
             {/* Header có nút Đóng góc trên bên phải, giống ảnh */}
             <View style={{flexDirection: 'row', justifyContent: 'space-between', padding: 15, zIndex: 10, position: 'absolute', top: 0, right: 0}}>
                <TouchableOpacity onPress={() => setUpgradeModalVisible(false)}><Ionicons name="close" size={24} color="rgba(255,255,255,0.8)" /></TouchableOpacity>
             </View>

             <ScrollView showsVerticalScrollIndicator={false}>
               {/* BANNER XANH LÁ (ẢNH 2) */}
               <View style={styles.upgradeBanner}>
                 <Text style={styles.upgradeBannerText}>{t('upgrade.banner_desc')}</Text>
                 <Text style={styles.upgradeBannerTitle}>{isMaxLevel ? t('upgrade.banner_status_no_level', { total: serverTotalStones }) : t('upgrade.banner_status', { total: serverTotalStones, level: currentLevel })}</Text>
                 {!isMaxLevel && <Text style={styles.channelLimitInfo}>{t('upgrade.capacity', { current: channels.length + groups.length, limit: currentChannelLimit })}</Text>}

                 {/* NÚT QUYÊN GÓP NẰM TRONG BANNER XANH LÁ */}
                 <TouchableOpacity style={styles.upgradeBtnPrimary} onPress={handleDonateStones}>
                    <Text style={styles.upgradeBtnTextPrimary}>{t('upgrade.btn_donate')}</Text>
                 </TouchableOpacity>
                 {!isMaxLevel && <Text style={{color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 5}}>{t('upgrade.stones_needed', { stones: stonesNeededForNext })}</Text>}
               </View>

               <View style={{ padding: 20 }}>
                  {/* CARD MUA ĐÁ NÂNG CẤP */}
                  <View style={styles.walletCard}>
                     <Text style={styles.walletText}>{t('upgrade.wallet', { stones: myStones })}</Text>
                     <TouchableOpacity style={styles.upgradeBtnSecondary} onPress={handleBuyStones}>
                        <Text style={styles.upgradeBtnTextSecondary}>{t('upgrade.btn_buy')}</Text>
                     </TouchableOpacity>
                  </View>

                  {/* 👇 LỘ TRÌNH NÂNG CẤP (ĐÃ SỬA CẤU TRÚC ĐỂ VUỐT MƯỢT MÀ) 👇 */}
                  <Text style={styles.upgradeLevelsTitle}>{t('upgrade.path_title')}</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 5, paddingBottom: 20 }}>
                     {UPGRADE_LEVELS.map((lvl, index) => {
                        const required = UPGRADE_LEVELS.slice(0, index + 1).reduce((a,b)=>a+b.stones,0);
                        const isAchieved = currentLevel >= lvl.level;
                        return (
                          <View key={index} style={[styles.horizontalLevelCard, isAchieved && { borderColor: '#44b669', borderWidth: 2 }, { marginRight: 15 }]}>
                            <View style={[styles.levelCardHeader, isAchieved && { backgroundColor: '#44b669' }]}>
                               <Text style={styles.levelCardTitle}>{t('upgrade.level', { level: lvl.level })}</Text>
                            </View>
                            <Text style={styles.horizontalLevelText}>{t('upgrade.max_channels', { max: 30 + lvl.level * 5 })}</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
                               <Ionicons name="diamond-outline" size={16} color={isAchieved ? "#44b669" : "#007aff"} />
                               <Text style={styles.horizontalLevelReq}>{t('upgrade.requirement', { stones: required })}</Text>
                            </View>
                          </View>
                        )
                     })}
                  </ScrollView>
               </View>
             </ScrollView>
           </View>
        </View>
      </Modal>

      {/* ================================================================= */}
      {/* BÁO CÁO MÁY CHỦ (CĂN GIỮA) */}
      {/* ================================================================= */}
      <Modal visible={isReportServerModalVisible} animationType="fade" transparent>
        <View style={styles.centeredModalOverlay}>
           <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setReportServerModalVisible(false)} />
           <View style={[styles.centeredModalContainer, { maxHeight: '80%' }]}>
             <View style={styles.centeredModalHeader}>
                <Text style={styles.centeredModalTitle}>{t('report.step1_title')}</Text>
                <TouchableOpacity onPress={() => { setReportServerModalVisible(false); setReportStep(1); }}><Ionicons name="close" size={24} color="gray" /></TouchableOpacity>
             </View>
             <ScrollView style={{ padding: 20 }} showsVerticalScrollIndicator={false}>
               {reportStep === 1 ? (
                  <>
                    <Text style={{ fontSize: 14, color: 'gray', marginBottom: 20 }}>{t('report.step1_desc')}</Text>
                    {TARGET_OPTIONS.map(target => (
                      <TouchableOpacity key={target} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#f9f9f9', padding: 15, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: selectedTargets.includes(target) ? '#5865F2' : '#eee' }} onPress={() => { if (selectedTargets.includes(target)) setSelectedTargets(selectedTargets.filter(t => t !== target)); else setSelectedTargets([...selectedTargets, target]); }}>
                        <Ionicons name={selectedTargets.includes(target) ? "checkbox" : "square-outline"} size={24} color={selectedTargets.includes(target) ? "#5865F2" : "gray"} style={{ marginRight: 15 }} />
                        <Text style={{ fontSize: 16, fontWeight: '500', color: '#333' }}>{t(`report.${target}`)}</Text>
                      </TouchableOpacity>
                    ))}
                    <TouchableOpacity disabled={selectedTargets.length === 0} onPress={() => setReportStep(2)} style={[styles.submitBtn, { marginTop: 20, backgroundColor: selectedTargets.length === 0 ? '#a5b4fc' : '#5865F2' }]}>
                      <Text style={styles.submitBtnText}>{t('common.next')}</Text>
                    </TouchableOpacity>
                  </>
               ) : (
                  <>
                    <Text style={{ fontSize: 14, color: 'gray', marginBottom: 20 }}>{t('alerts.report_thanks')}</Text>
                    {REASON_OPTIONS.map(r => (
                      <TouchableOpacity key={r} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#f9f9f9', padding: 15, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: reportReason === r ? '#5865F2' : '#eee' }} onPress={() => setReportReason(r)}>
                        <Ionicons name={reportReason === r ? "radio-button-on" : "radio-button-off"} size={24} color={reportReason === r ? "#5865F2" : "gray"} style={{ marginRight: 15 }} />
                        <Text style={{ fontSize: 16, fontWeight: '500', color: '#333' }}>{t(`report.${r}`)}</Text>
                      </TouchableOpacity>
                    ))}
                    {reportReason === 'reason_other' && (
                      <TextInput style={[styles.textInput, { height: 100, textAlignVertical: 'top', marginTop: 10, backgroundColor: '#f9f9f9', borderWidth: 1, borderColor: '#eee' }]} placeholder={t('report.custom_reason_placeholder')} placeholderTextColor="#999" value={customReason} onChangeText={setCustomReason} multiline />
                    )}
                    <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
                      <TouchableOpacity onPress={() => setReportStep(1)} style={[styles.submitBtn, { flex: 1, backgroundColor: '#e0e0e0' }]}>
                        <Text style={[styles.submitBtnText, { color: '#333' }]}>{t('common.back')}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity disabled={!reportReason || (reportReason === 'reason_other' && !customReason.trim()) || isReporting} onPress={handleSubmitServerReport} style={[styles.submitBtn, { flex: 1, opacity: (!reportReason || (reportReason === 'reason_other' && !customReason.trim()) || isReporting) ? 0.5 : 1 }]}>
                        {isReporting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>{t('common.confirm')}</Text>}
                      </TouchableOpacity>
                    </View>
                  </>
               )}
               <View style={{height: 30}} />
             </ScrollView>
           </View>
        </View>
      </Modal>

      {/* ================================================================= */}
      {/* MODAL TẠO MÁY CHỦ MỚI */}
      {/* ================================================================= */}
      <Modal visible={isCreateModalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{flex: 1}}>
          <View style={styles.modalOverlay}>
            <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setCreateModalVisible(false)} />
            <View style={styles.lightModalContainer}>
               <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{paddingVertical: 10}}>
                 <Text style={styles.lightTitle}>{t('server.create_title')}</Text>
                 <TouchableOpacity style={styles.avatarPicker} onPress={handlePickIconForCreate}>
                    {serverIconUri ? <Image source={{uri: serverIconUri}} style={styles.avatarPreview} /> : <View style={styles.avatarDashed}><Ionicons name="camera-outline" size={28} color="#888" /></View>}
                 </TouchableOpacity>
                 <Text style={styles.lightLabel}>{t('server.server_name_label')}</Text>
                 <TextInput style={styles.lightInput} placeholder={t('server.default_name', { name: userProfile?.first_name || t('common.me') })} placeholderTextColor="#999" value={serverNameInput} onChangeText={setServerNameInput} />
                 <Text style={[styles.lightLabel, {marginTop: 20}]}>{t('server.start_from_template')}</Text>
                 <View style={{zIndex: 10, marginBottom: 20}}>
                    <TouchableOpacity style={[styles.lightDropdownBtn, isTemplateDropdownOpen && {borderColor: '#5865F2'}]} onPress={() => setIsTemplateDropdownOpen(!isTemplateDropdownOpen)}>
                       <Text style={{color: '#333', fontSize: 16, fontWeight: '500'}}>{selectedTemplate?.icon} {t(selectedTemplate?.localeKey)}</Text>
                       <Ionicons name={isTemplateDropdownOpen ? "chevron-up" : "chevron-down"} size={20} color="#888" />
                    </TouchableOpacity>
                    {isTemplateDropdownOpen && (
                       <View style={styles.lightDropdownList}>
                          {TEMPLATES_LIST.map((tmpl) => {
                             const isSelected = selectedTemplate?.id === tmpl.id;
                             return (
                                <TouchableOpacity key={tmpl.id} style={[styles.lightDropdownItem, isSelected && {backgroundColor: '#e0e7ff'}]} onPress={() => { setSelectedTemplate(tmpl); setIsTemplateDropdownOpen(false); }}>
                                   <Text style={{color: isSelected ? '#5865F2' : '#333', fontSize: 16, fontWeight: '500'}}>{tmpl.icon} {t(tmpl.localeKey)}</Text>
                                </TouchableOpacity>
                             )
                          })}
                       </View>
                    )}
                 </View>
                 <View style={styles.lightFooter}>
                    <TouchableOpacity onPress={() => setCreateModalVisible(false)} style={{padding: 10}}><Text style={{color: 'gray', fontSize: 16, fontWeight: '500'}}>{t('common.cancel')}</Text></TouchableOpacity>
                    <TouchableOpacity disabled={!serverNameInput.trim() || isUploading} style={[styles.lightSubmitBtn, (!serverNameInput.trim() || isUploading) && {opacity: 0.5}]} onPress={handleCreateServerSubmit}>
                       {isUploading ? <ActivityIndicator color="#fff" /> : <Text style={{color: '#fff', fontWeight: 'bold', fontSize: 16}}>{t('server.create_btn')}</Text>}
                    </TouchableOpacity>
                 </View>
               </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ================================================================= */}
      {/* MODAL CÀI ĐẶT MÁY CHỦ */}
      {/* ================================================================= */}
      <Modal visible={isSettingsModalVisible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{flex: 1, backgroundColor: '#f2f2f7'}}>
          <View style={styles.settingsHeader}>
             <TouchableOpacity onPress={() => { setSettingsModalVisible(false); setEditServerIconUri(null); }}><Text style={[styles.settingsHeaderDone, {color: '#ff3b30', fontWeight: 'normal'}]}>{t('common.cancel')}</Text></TouchableOpacity>
             <Text style={styles.settingsHeaderTitle}>{t('server.settings')}</Text>
             <TouchableOpacity disabled={isUploading} onPress={handleUpdateServerNameSubmit}>
               {isUploading ? <ActivityIndicator size="small" color="#007AFF" /> : <Text style={styles.settingsHeaderDone}>{t('common.save')}</Text>}
             </TouchableOpacity>
          </View>
          <ScrollView style={{padding: 20}}>
             <View style={{alignItems: 'center', marginBottom: 25}}>
               <Image source={editServerIconUri ? {uri: editServerIconUri} : getIconSource(currentWorkspace?.icon)} style={{width: 80, height: 80, borderRadius: 40, backgroundColor: '#ddd'}} />
               <TouchableOpacity disabled={isAvatarUploading} onPress={handleAvatarAutoSave} style={styles.changeAvatarBtn}>
                 {isAvatarUploading ? <ActivityIndicator size="small" color="#333" /> : <Text style={styles.changeAvatarText}>{t('server.change_avatar')}</Text>}
               </TouchableOpacity>
             </View>
             <Text style={styles.inputLabel}>{t('server.server_name_label')}</Text>
             <View style={styles.inputWithSaveBtn}>
               <TextInput style={styles.inlineInput} placeholder={t('server.default_name', { name: userProfile?.first_name || t('common.me') })} placeholderTextColor="#999" value={editServerName} onChangeText={setEditServerName} />
             </View>
             <View style={{marginTop: 20, gap: 15}}>
               <TouchableOpacity style={[styles.actionCardBtn, {backgroundColor: '#007AFF', justifyContent: 'flex-start'}]} onPress={() => { setSettingsModalVisible(false); router.push({ pathname: '/moderation' as any, params: { serverId: activeServerId } }); }}>
                  <Ionicons name="shield-checkmark" size={22} color="#fff" style={{ marginRight: 10 }} />
                  <Text style={[styles.actionCardText, {color: '#fff'}]}>{t('report.moderation_title')}</Text>
               </TouchableOpacity>
               <TouchableOpacity style={[styles.actionCardBtn, {backgroundColor: '#34C759', justifyContent: 'flex-start'}]} onPress={() => { setSettingsModalVisible(false); setInviteOnlyModalVisible(true); }}>
                  <Ionicons name="person-add" size={22} color="#fff" style={{ marginRight: 10 }} />
                  <Text style={[styles.actionCardText, {color: '#fff'}]}>{t('server.invite_friends')}</Text>
               </TouchableOpacity>
               <TouchableOpacity style={[styles.actionCardBtn, {backgroundColor: '#fee2e2', marginTop: 10, justifyContent: 'center'}]} onPress={() => {
                    Alert.alert(t('common.delete'), t('common.warning'), [
                       { text: t('common.cancel'), style: "cancel" },
                       { text: t('common.delete'), style: "destructive", onPress: async () => {
                           try { if(activeServerId) await deleteServer({ serverId: activeServerId }); setSettingsModalVisible(false); if (universities && universities.length > 0) switchToUniversity(universities[0]._id); } catch(e:any) { Alert.alert(t('common.error'), e.message); }
                       }}
                    ]);
                  }}>
                  <Text style={[styles.actionCardText, {color: '#ef4444'}]}>{t('common.delete')}</Text>
               </TouchableOpacity>
             </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <Modal visible={isInviteOnlyModalVisible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{flex: 1, backgroundColor: '#fff'}}>
          <View style={[styles.modalHeader, { borderBottomWidth: 1, borderColor: '#eee', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}><Text style={{ fontSize: 18, fontWeight: 'bold' }}>{t('common.invite')}</Text><TouchableOpacity onPress={() => setInviteOnlyModalVisible(false)}><Ionicons name="close" size={28} color="gray" /></TouchableOpacity></View>
          <View style={{flex: 1, padding: 20}}>{renderInviteList()}</View>
        </SafeAreaView>
      </Modal>

      <Modal visible={isCreateChannelModalVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
           <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setCreateChannelModalVisible(false)} />
           <View style={{backgroundColor: '#fff', padding: 20, borderRadius: 12, width: '100%', shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.25, elevation: 5}}>
             <Text style={{fontSize: 18, fontWeight: 'bold', marginBottom: 15, color: '#333'}}>{newChannelType === 'category' ? t('common.category') : t('common.channel')}</Text>
             <TextInput style={[styles.textInput, {backgroundColor: '#f9f9f9', borderWidth: 1, borderColor: '#eee'}]} placeholder={newChannelType === 'category' ? t('channel.placeholder_category') : t('channel.placeholder_channel')} placeholderTextColor="#999" value={newChannelName} onChangeText={setNewChannelName} autoFocus />
             {newChannelType === 'channel' && (
               <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 15, backgroundColor: '#f9f9f9', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#eee'}}><Text style={{fontSize: 15, fontWeight: '500', color: '#555'}}>{t('common.anonymous')} 🎭</Text><Switch value={isAnonymousChannel} onValueChange={setIsAnonymousChannel} trackColor={{ false: "#767577", true: "#5865F2" }} /></View>
             )}
             <View style={{flexDirection: 'row', justifyContent: 'flex-end', marginTop: 25, gap: 12}}>
                <TouchableOpacity onPress={() => setCreateChannelModalVisible(false)} style={{paddingVertical: 10, paddingHorizontal: 15}}><Text style={{color: 'gray', fontWeight: 'bold', fontSize: 15}}>{t('common.cancel')}</Text></TouchableOpacity>
                <TouchableOpacity onPress={handleCreateChannelSubmit} disabled={!newChannelName.trim()} style={{paddingVertical: 10, paddingHorizontal: 20, backgroundColor: newChannelName.trim() ? '#5865F2' : '#a5b4fc', borderRadius: 8}}><Text style={{color: '#fff', fontWeight: 'bold', fontSize: 15}}>{t('common.add')}</Text></TouchableOpacity>
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
  modalHeader: { padding: 16, alignItems: 'flex-start' },
  textInput: { backgroundColor: '#f2f3f5', padding: 12, borderRadius: 8, fontSize: 16, color: 'black' },
  submitBtn: { backgroundColor: '#5865F2', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8, alignItems: 'center' },
  submitBtnText: { color: 'white', fontWeight: 'bold', fontSize: 15 },
  bottomSheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  bottomSheetContainer: { backgroundColor: '#ffffff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40 },
  bottomSheetHeader: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#f0f0f0', paddingBottom: 15, marginBottom: 10 },
  bottomSheetIcon: { width: 48, height: 48, borderRadius: 16, marginRight: 15, backgroundColor: '#313338' },
  bottomSheetTitle: { color: 'black', fontSize: 20, fontWeight: 'bold' },
  bottomSheetItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15 },
  bottomSheetItemText: { color: 'black', fontSize: 16, fontWeight: 'bold', marginLeft: 15 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },

  /* STYLE MỚI CHO CÁC MODAL CĂN GIỮA */
  centeredModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 15 },
  centeredModalContainer: { width: '100%', maxWidth: 400, backgroundColor: '#ffffff', borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 10 },
  centeredModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  centeredModalTitle: { fontSize: 18, fontWeight: 'bold', color: '#111' },

  /* STYLE DANH SÁCH THÀNH VIÊN */
  memberListItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f2f3f5' },
  memberListAvatar: { width: 40, height: 40, borderRadius: 20, marginRight: 12 },
  memberListInfo: { flex: 1 },
  memberListName: { fontSize: 15, fontWeight: '600', color: '#111' },
  memberListUsername: { fontSize: 13, color: '#666', marginTop: 2 },
  ownerBadge: { backgroundColor: '#FFD700', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  ownerBadgeText: { color: '#000', fontSize: 10, fontWeight: 'bold' },
  adminBadge: { backgroundColor: '#5865F2', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  adminBadgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },

  /* STYLE CHO MODAL TẠO MÁY CHỦ TRẮNG / SCROLL ĐƯỢC */
  lightModalContainer: { width: '100%', backgroundColor: '#ffffff', borderRadius: 12, padding: 24, shadowColor: '#000', shadowOffset: {width: 0, height: 5}, shadowOpacity: 0.2, elevation: 10 },
  lightTitle: { color: '#333', fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 },
  lightDesc: { color: '#666', fontSize: 14, textAlign: 'center', marginBottom: 24, paddingHorizontal: 10 },
  avatarPicker: { alignSelf: 'center', marginBottom: 24 },
  avatarDashed: { width: 80, height: 80, borderRadius: 40, borderWidth: 2, borderStyle: 'dashed', borderColor: '#ccc', justifyContent: 'center', alignItems: 'center', backgroundColor: '#fafafa' },
  avatarPreview: { width: 80, height: 80, borderRadius: 40 },
  lightLabel: { color: '#555', fontSize: 12, fontWeight: 'bold', marginBottom: 8, textTransform: 'uppercase' },
  lightInput: { backgroundColor: '#f2f3f5', color: '#333', padding: 14, borderRadius: 8, fontSize: 16, borderWidth: 1, borderColor: '#eee' },
  lightDropdownBtn: { backgroundColor: '#f2f3f5', padding: 14, borderRadius: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#eee' },
  lightDropdownList: { backgroundColor: '#fff', borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#eee', shadowColor: '#000', shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.1, elevation: 5, marginTop: 5 },
  lightDropdownItem: { padding: 14, borderBottomWidth: 1, borderBottomColor: '#f9f9f9' },
  lightFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  lightSubmitBtn: { backgroundColor: '#5865F2', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8 },

  /* STYLE CHO MODAL CÀI ĐẶT MÁY CHỦ MỚI (CHUẨN iOS) */
  settingsHeader: { backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  settingsHeaderTitle: { fontSize: 18, fontWeight: 'bold' },
  settingsHeaderDone: { fontSize: 16, color: '#007AFF', fontWeight: '600' },
  changeAvatarBtn: { backgroundColor: '#e5e7eb', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, marginTop: 12 },
  changeAvatarText: { color: '#333', fontWeight: '500', fontSize: 14 },
  inputLabel: { fontSize: 12, color: 'gray', marginBottom: 8, fontWeight: 'bold', textTransform: 'uppercase', paddingLeft: 4 },
  inputWithSaveBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 15, marginBottom: 20 },
  inlineInput: { flex: 1, paddingVertical: 15, fontSize: 16, color: '#333' },
  inlineSaveText: { color: '#007AFF', fontSize: 16, fontWeight: '500' },
  actionCardBtn: { padding: 15, borderRadius: 8, flexDirection: 'row', alignItems: 'center' },
  actionCardText: { fontSize: 16, fontWeight: 'bold' },

  /* STYLE NÂNG CẤP CUỘN NGANG */
  upgradeBanner: { backgroundColor: '#1b5e20', alignItems: 'center', paddingTop: 40, paddingBottom: 25, paddingHorizontal: 20 },
  upgradeBannerText: { color: 'white', fontSize: 16, fontWeight: 'bold', textAlign: 'center', marginBottom: 15, lineHeight: 24 },
  upgradeBannerTitle: { color: 'white', fontSize: 20, fontWeight: 'bold', marginTop: 5 },
  channelLimitInfo: { color: '#e0f2f1', fontSize: 13, marginTop: 5, marginBottom: 15 },
  upgradeBtnPrimary: { backgroundColor: '#44b669', paddingVertical: 12, paddingHorizontal: 25, borderRadius: 30, alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2 },
  upgradeBtnTextPrimary: { color: 'white', fontWeight: 'bold', fontSize: 15 },
  walletCard: { backgroundColor: '#f9f9f9', borderRadius: 12, padding: 15, alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: '#eee' },
  walletText: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 12 },
  upgradeBtnSecondary: { backgroundColor: 'white', paddingVertical: 12, width: '100%', borderRadius: 8, alignItems: 'center', borderWidth: 1.5, borderColor: '#44b669' },
  upgradeBtnTextSecondary: { color: '#44b669', fontWeight: 'bold', fontSize: 15 },
  upgradeLevelsTitle: { fontSize: 14, fontWeight: 'bold', color: '#888', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 },
  horizontalLevelCard: { backgroundColor: '#fff', padding: 15, borderRadius: 12, width: 160, borderWidth: 1, borderColor: '#eee' },
  levelCardHeader: { backgroundColor: '#999', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, alignSelf: 'flex-start', marginBottom: 10 },
  levelCardTitle: { color: 'white', fontWeight: 'bold', fontSize: 13 },
  horizontalLevelText: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  horizontalLevelReq: { fontSize: 13, color: '#555', marginLeft: 5, fontWeight: '500' },

  /* STYLE CHO DUYỆT KÊNH (BROWSE CHANNELS) */
  browseCard: { backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#eee' },
  browseItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15 },
  browseItemBorder: { borderBottomWidth: 1, borderBottomColor: '#f2f3f5' },
  browseItemText: { fontSize: 16, fontWeight: '600', color: '#333' },
  browseCategoryText: { fontSize: 12, fontWeight: 'bold', color: 'gray', marginLeft: 15, marginBottom: 8, textTransform: 'uppercase' },
});