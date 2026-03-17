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
import { useTranslation } from 'react-i18next'; 

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const LOCAL_IMAGES: Record<string, any> = { 'local:login': require('../assets/images/login.png') };
const getIconSource = (iconString?: string) => (iconString && LOCAL_IMAGES[iconString] ? LOCAL_IMAGES[iconString] : { uri: iconString || 'https://via.placeholder.com/50' });

const TEMPLATES = [
  { id: 'Gaming', icon: '🎮' },
  { id: 'School', icon: '🏫' },
  { id: 'Study', icon: '🍎' },
  { id: 'Friends', icon: '💗' },
  { id: 'Creators', icon: '🎨' },
];

const UPGRADE_LEVELS = [
  { level: 1, stones: 1 }, { level: 2, stones: 2 }, { level: 3, stones: 2 },
  { level: 4, stones: 3 }, { level: 5, stones: 3 }, { level: 6, stones: 4 },
  { level: 7, stones: 4 }, { level: 8, stones: 4 }, { level: 9, stones: 5 },
  { level: 10, stones: 5 },
];

export default function SideMenu() {
  const { t } = useTranslation(); 
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

  const buyStones = useMutation(api.boosts.buyStones);
  const boostServer = useMutation(api.boosts.boostServer);

  const { activeUniversityId, setActiveUniversityId, activeServerId, setActiveServerId, activeChannelId, setActiveChannelId, setActiveChannelName } = useChannel();
  const topBoosters = useQuery(api.boosts.getTopBoosters, { serverId: activeServerId || undefined });
  
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

  const [pinnedServers, setPinnedServers] = useState<string[]>([]);
  const [pinnedChannels, setPinnedChannels] = useState<string[]>([]);
  const [isUpgradeModalVisible, setUpgradeModalVisible] = useState(false);

  const handleKickMember = (targetUserId: Id<"users">, targetName: string) => {
    if (!activeServerId) return;
    Alert.alert(
      t('alerts.kick_title'),
      t('alerts.kick_desc', { name: targetName }),
      [
        { text: t('common.cancel'), style: "cancel" },
        { 
          text: t('common.delete'), 
          style: "destructive", 
          onPress: async () => {
            try {
              await removeMember({ serverId: activeServerId, targetUserId });
            } catch (error: any) {
              if (error.message.includes("ONLY_ADMIN_ALLOWED")) {
                Alert.alert(t('common.error'), t('server_errors.only_admin_allowed'));
              } else if (error.message.includes("CANNOT_REMOVE_OWNER")) {
                Alert.alert(t('common.error'), t('server_errors.cannot_remove_owner'));
              } else {
                Alert.alert(t('common.error'), error.message);
              }
            }
          } 
        }
      ]
    );
  };

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

  const serverTotalStones = (currentWorkspace as any)?.totalStones || 0;
  const myStones = (userProfile as any)?.stones || 0;

  let currentLevel = 0;
  let accumulatedStones = 0;
  let stonesNeededForNext = UPGRADE_LEVELS[0].stones;
  let isMaxLevel = false;

  for (let i = 0; i < UPGRADE_LEVELS.length; i++) {
    accumulatedStones += UPGRADE_LEVELS[i].stones;
    if (serverTotalStones >= accumulatedStones) {
      currentLevel = UPGRADE_LEVELS[i].level;
    } else {
      stonesNeededForNext = UPGRADE_LEVELS[i].stones;
      break;
    }
  }

  if (currentLevel >= 10) {
    currentLevel = 10;
    isMaxLevel = true;
    stonesNeededForNext = 0;
  }

  const MAX_CHANNELS_BASE = 30;
  const currentChannelLimit = MAX_CHANNELS_BASE + (currentLevel * 5);

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

  const checkLimitAndOpenCreate = (type: 'category' | 'channel', parentId?: Id<'channels'>) => {
    const currentTotalChannels = channels.length + groups.length;

    if (currentTotalChannels >= currentChannelLimit) {
      Alert.alert(
        t('alerts.limit_title'),
        t('alerts.limit_desc', { limit: currentChannelLimit, total: currentTotalChannels }),
        [
          { text: t('common.cancel'), style: "cancel" },
          { text: t('alerts.upgrade_now'), onPress: () => setUpgradeModalVisible(true) }
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

  const handleChannelLongPress = (target: any, isCategory: boolean) => {
    if (target.name === 'đại-sảnh') { Alert.alert(t('alerts.invalid'), t('alerts.no_default_edit')); return; }

    const isPinned = pinnedChannels.includes(target._id);

    Alert.alert(
      t('alerts.option_title', { type: isCategory ? t('common.category') : t('common.channel') }), 
      t('alerts.option_desc', { name: target.name }), 
      [
        { text: t('common.cancel'), style: "cancel" },
        { text: isPinned ? t('alerts.unpin') : t('alerts.pin_top'), onPress: () => {
            setPinnedChannels(prev => isPinned ? prev.filter(id => id !== target._id) : [...prev, target._id]);
        }},
        ...(isOwner ? [{ text: t('common.delete'), style: "destructive" as const, onPress: async () => {
            try {
              await deleteChannel({ channelId: target._id });
              if (activeChannelId === target._id || isCategory) setActiveChannelId(null as any);
            } catch(e: any) {
              Alert.alert(t('common.error'), e.message);
            }
        }}] : [])
      ]
    );
  };

  const togglePinServer = (serverId: string) => {
    setPinnedServers(prev => prev.includes(serverId) ? prev.filter(id => id !== serverId) : [...prev, serverId]);
  };

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
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      return a.sortOrder - b.sortOrder;
    });
  };

  const handleSelectTemplate = (templateName: string) => {
    setSelectedTemplate(templateName);
    setServerNameInput(t('server.default_name', { name: userProfile?.first_name || t('common.me') }));
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
      
      const result = await createServer({ 
        name: serverNameInput, 
        template: selectedTemplate || 'Custom', 
        iconStorageId: storageId 
      });

      if (result.success) {
        setNewlyCreatedId(result.serverId || null);
        setCreateStep(2);
      } else { 
        if (result.message === "SERVER_LIMIT_REACHED") {
          Alert.alert(t('common.notification'), t('server_errors.server_limit_reached'));
        } else {
          Alert.alert(t('common.notification'), result.message); 
        }
      }
    } catch (e: any) { 
      Alert.alert(t('common.error'), e.message); 
    }
  };

  const handleInviteAction = async (userId: any) => {
    if (newlyCreatedId) { await addFriendToServer({ serverId: newlyCreatedId, friendId: userId }); }
    else if (activeServerId) { await addFriendToServer({ serverId: activeServerId, friendId: userId }); }
    setInvitedUsers(prev => ({ ...prev, [userId]: true }));
  };

  const handleCreateChannelSubmit = async () => {
    if (newChannelName.trim() === '' || !activeServerId) return;
    try {
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
    } catch (e: any) {
      if (e.message.includes("ONLY_OWNER_CAN_CREATE_CHANNEL")) {
        Alert.alert(t('common.error'), t('server_errors.only_owner_can_create_channel'));
      }
    }
  };

  const handleSaveName = async () => {
    if (editServerName.trim() === '' || !activeServerId) return;
    await updateServer({ serverId: activeServerId, name: editServerName });
    Alert.alert(t('common.success'), t('alerts.save_server_name'));
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
      Alert.alert(t('common.success'), t('alerts.change_server_icon'));
    }
  };

  const handleDeleteServer = () => {
      Alert.alert(t('common.warning'), t('alerts.delete_server_desc'), [
        { text: t('common.cancel'), style: "cancel" },
        { text: t('common.delete'), style: "destructive", onPress: () => {
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
      <TextInput style={[styles.textInput, {marginBottom: 15}]} placeholder={t('members.search_placeholder')} value={searchQuery} onChangeText={setSearchQuery} />
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
      <View style={[styles.serverRail, { paddingTop: top }]}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ alignItems: 'center', paddingBottom: 20, width: '100%' }}>
            {universities.map((uni) => (
              <TouchableOpacity key={uni._id} style={styles.serverItem} onPress={() => switchToUniversity(uni._id)}>
                <Image source={getIconSource(uni.icon)} style={styles.serverIcon} resizeMode="contain" />
                {uni._id === activeUniversityId && <View style={styles.activePill} />}
              </TouchableOpacity>
            ))}
            <View style={styles.railSeparator} />

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
            <Text style={styles.serverName} numberOfLines={1}>{currentWorkspace?.name || t('server.choose_workspace')}</Text>
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
      </View>

      <Modal visible={isCreateModalVisible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{flex: 1, backgroundColor: '#fff'}}>
          <View style={styles.modalHeader}><TouchableOpacity onPress={() => { setCreateModalVisible(false); setSelectedTemplate(null); setInvitedUsers({}); }}><Ionicons name="close" size={28} color="gray" /></TouchableOpacity></View>
          <ScrollView style={styles.modalBody}>
            {!selectedTemplate ? (
              <>
                <Text style={styles.modalTitle}>{t('server.create_title')}</Text><Text style={styles.modalSubtitle}>{t('server.create_desc')}</Text>
                <TouchableOpacity style={styles.templateOptionPrimary} onPress={() => handleSelectTemplate('Custom')}><View style={styles.emojiWrapper}><Text style={styles.templateEmoji}>🌍</Text></View><Text style={styles.templateTextPrimary}>{t('server.create_custom')}</Text></TouchableOpacity>
                <Text style={styles.sectionTitle}>{t('server.start_from_template')}</Text>
                {TEMPLATES.map((item) => (
                  <TouchableOpacity key={item.id} style={styles.templateOption} onPress={() => handleSelectTemplate(item.id)}>
                    <View style={styles.emojiWrapper}><Text style={styles.templateEmoji}>{item.icon}</Text></View>
                    <Text style={styles.templateText}>{t(`templates.${item.id}`)}</Text>
                  </TouchableOpacity>
                ))}
              </>
            ) : (
              createStep === 1 ? (
                <View style={{alignItems: 'center'}}>
                  <Text style={styles.modalTitle}>{t('server.customize')}</Text>
                  <TouchableOpacity onPress={pickIcon} style={{marginVertical: 20}}>
                    {serverIconUri ? (<Image source={{uri: serverIconUri}} style={{width: 100, height: 100, borderRadius: 50}} />) : (<View style={{width: 100, height: 100, borderRadius: 50, backgroundColor: '#f2f3f5', justifyContent: 'center', alignItems: 'center', borderStyle: 'dashed', borderWidth: 1, borderColor: 'gray'}}><Ionicons name="camera" size={40} color="gray" /></View>)}
                  </TouchableOpacity>
                  <View style={{width: '100%'}}><Text style={styles.sectionTitle}>{t('server.server_name_label')}</Text><TextInput style={styles.textInput} value={serverNameInput} onChangeText={setServerNameInput} /></View>
                  <TouchableOpacity style={[styles.submitBtn, {width: '100%', marginTop: 20}]} onPress={handleFinalCreateServer}><Text style={styles.submitBtnText}>{t('server.create_btn')}</Text></TouchableOpacity>
                </View>
              ) : (
                <View style={{flex: 1, height: 600}}><Text style={styles.modalTitle}>{t('server.invite_friends')}</Text>{renderInviteList()}<TouchableOpacity onPress={() => { setCreateModalVisible(false); setSelectedTemplate(null); setInvitedUsers({}); if(newlyCreatedId) switchToServer(newlyCreatedId); }} style={[styles.submitBtn, {marginTop: 20}]}><Text style={styles.submitBtnText}>{t('server.finish')}</Text></TouchableOpacity></View>
              )
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <Modal visible={isSettingsModalVisible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{flex: 1, backgroundColor: '#f2f3f5'}}>
          <View style={[styles.modalHeader, { backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}><Text style={{fontSize: 18, fontWeight: 'bold'}}>{t('server.settings')}</Text><TouchableOpacity onPress={() => setSettingsModalVisible(false)}><Text style={{fontSize: 16, color: '#007aff', fontWeight: 'bold'}}>{t('common.done')}</Text></TouchableOpacity></View>
          <ScrollView style={{padding: 20}}>
            <View style={{alignItems: 'center', marginBottom: 20}}><Image source={getIconSource(currentWorkspace?.icon)} style={{width: 80, height: 80, borderRadius: 40, marginBottom: 10}} /><TouchableOpacity onPress={handleUpdateImage} style={{backgroundColor: '#e0e0e0', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20}}><Text style={{fontWeight: 'bold'}}>{t('server.change_avatar')}</Text></TouchableOpacity></View>
            <Text style={styles.sectionTitle}>{t('server.server_name_label')}</Text>
            <View style={{flexDirection: 'row', backgroundColor: '#fff', borderRadius: 8, padding: 10, marginBottom: 20}}><TextInput style={{flex: 1, fontSize: 16}} value={editServerName} onChangeText={setEditServerName} /><TouchableOpacity onPress={handleSaveName}><Text style={{color: '#007aff', fontWeight: 'bold', paddingLeft: 10}}>{t('common.save')}</Text></TouchableOpacity></View>
            <TouchableOpacity onPress={() => { setSettingsModalVisible(false); setInviteOnlyModalVisible(true); }} style={{backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 8, marginBottom: 20}}><Ionicons name="person-add-outline" size={22} color="#5865F2" style={{marginRight: 10}} /><Text style={{fontSize: 16, fontWeight: 'bold', color: '#5865F2'}}>{t('server.invite_friends')}</Text></TouchableOpacity>
            <TouchableOpacity onPress={handleDeleteServer} style={{backgroundColor: '#ffdddd', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 20}}><Text style={{color: 'red', fontWeight: 'bold', fontSize: 16}}>{t('server.delete_server')}</Text></TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <Modal visible={isInviteOnlyModalVisible} animationType="slide" presentationStyle="pageSheet"><SafeAreaView style={{flex: 1, backgroundColor: '#fff', padding: 20}}><View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20}}><Text style={{fontSize: 22, fontWeight: 'bold'}}>{t('server.invite_friends')}</Text><TouchableOpacity onPress={() => setInviteOnlyModalVisible(false)}><Text style={{color: '#007aff', fontWeight: 'bold', fontSize: 16}}>{t('common.done')}</Text></TouchableOpacity></View>{renderInviteList()}</SafeAreaView></Modal>

      <Modal visible={isCreateChannelModalVisible} transparent animationType="fade">
         <View style={styles.modalOverlay}>
           <View style={styles.smallModalContainer}>
             <Text style={styles.smallModalTitle}>{t('channel.create_title', { type: newChannelType === 'category' ? t('common.category') : t('common.channel') })}</Text>
             <TextInput style={styles.textInput} placeholder={newChannelType === 'category' ? t('channel.placeholder_category') : t('channel.placeholder_channel')} value={newChannelName} onChangeText={setNewChannelName} autoFocus />

             {newChannelType === 'channel' && (
               <View style={{ marginTop: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                 <View style={{flex: 1, paddingRight: 10}}>
                   <Text style={{ fontWeight: 'bold', fontSize: 15, color: '#333' }}>{t('channel.confession_title')}</Text>
                   <Text style={{ fontSize: 12, color: 'gray', marginTop: 4 }}>{t('channel.confession_desc')}</Text>
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
               <TouchableOpacity onPress={() => { setCreateChannelModalVisible(false); setIsAnonymousChannel(false); }} style={styles.cancelBtn}><Text style={styles.cancelBtnText}>{t('common.cancel')}</Text></TouchableOpacity>
               <TouchableOpacity onPress={handleCreateChannelSubmit} style={styles.submitBtn}><Text style={styles.submitBtnText}>{t('channel.create_btn')}</Text></TouchableOpacity>
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
                 {currentLevel > 0 && (
                   <Text style={{fontSize: 12, color: '#44b669', fontWeight: 'bold'}}>{t('menu.reached_level', { level: currentLevel })}</Text>
                 )}
              </View>
            </View>

            <TouchableOpacity style={styles.bottomSheetItem} onPress={() => { setServerMenuVisible(false); setUpgradeModalVisible(true); }}>
              <FontAwesome5 name="gem" size={20} color="#44b669" />
              <Text style={[styles.bottomSheetItemText, {color: '#44b669'}]}>{t('menu.upgrade_server')}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.bottomSheetItem} onPress={() => { setServerMenuVisible(false); togglePinServer(activeServerId!); }}>
              <Ionicons name="pin" size={24} color="black" />
              <Text style={styles.bottomSheetItemText}>{pinnedServers.includes(activeServerId!) ? t('menu.unpin_server') : t('menu.pin_server')}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.bottomSheetItem} onPress={() => { setServerMenuVisible(false); setMemberListModalVisible(true); }}>
              <Ionicons name="people" size={24} color="black" /><Text style={styles.bottomSheetItemText}>{t('menu.view_members')}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.bottomSheetItem} onPress={() => { setServerMenuVisible(false); Alert.alert(t('alerts.report_title', { defaultValue: 'Báo cáo' }), t('alerts.report_thanks')); }}>
              <Ionicons name="flag" size={24} color="black" /><Text style={styles.bottomSheetItemText}>{t('menu.report_server')}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.bottomSheetItem} onPress={() => {
              setServerMenuVisible(false);
              if (isOwner) { Alert.alert(t('common.notification'), t('server_errors.owner_cannot_leave')); return; }
              Alert.alert(t('alerts.leave_server'), t('alerts.leave_server_desc', { name: currentWorkspace?.name }), [
                { text: t('common.cancel'), style: "cancel" },
                { text: t('common.delete'), style: "destructive", onPress: async () => {
                    if (activeServerId) {
                      try {
                        await leaveServer({ serverId: activeServerId });
                        if (universities && universities.length > 0) switchToUniversity(universities[0]._id);
                      } catch (error: any) { Alert.alert(t('common.error'), error.message); }
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

      <Modal visible={isMemberListModalVisible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{flex: 1, backgroundColor: '#f2f3f5'}}>
          <View style={[styles.modalHeader, { backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
            <Text style={{fontSize: 18, fontWeight: 'bold'}}>{t('members.title')}</Text>
            <TouchableOpacity onPress={() => setMemberListModalVisible(false)}><Text style={{fontSize: 16, color: '#007aff', fontWeight: 'bold'}}>{t('common.close')}</Text></TouchableOpacity>
          </View>
          <ScrollView style={{padding: 20}}>
            <Text style={{fontSize: 12, fontWeight: 'bold', color: 'gray', marginBottom: 15, textTransform: 'uppercase'}}>{t('members.count', { count: serverMembers?.length || 0 })}</Text>
            {serverMembers?.map(member => (
              <View key={member._id} style={{flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 15, borderRadius: 8, marginBottom: 10}}>
                <Image source={{uri: member.imageUrl}} style={{width: 40, height: 40, borderRadius: 20, marginRight: 15}} />
                
                <View style={{flex: 1}}>
                  <View style={{flexDirection: 'row', alignItems: 'center'}}>
                    <Text style={{fontWeight: 'bold', fontSize: 16}}>{member.first_name}</Text>
                    {member.isCreator && (<Text style={{fontSize: 10, backgroundColor: '#ffd700', paddingHorizontal: 5, paddingVertical: 2, borderRadius: 5, marginLeft: 8, fontWeight: 'bold'}}>{t('members.owner')}</Text>)}
                    {!member.isCreator && member.isAdmin && (<Text style={{fontSize: 10, backgroundColor: '#ff4d4f', color: 'white', paddingHorizontal: 5, paddingVertical: 2, borderRadius: 5, marginLeft: 8, fontWeight: 'bold'}}>{t('members.admin')}</Text>)}
                  </View>
                  <Text style={{color: 'gray', fontSize: 13}}>@{member.username}</Text>
                </View>

                {isOwner && member._id !== userProfile?._id && (
                  <TouchableOpacity 
                    style={{ padding: 8, marginLeft: 10 }} 
                    onPress={() => handleKickMember(member._id, member.first_name || t('common.member'))}
                  >
                    <Ionicons name="person-remove" size={22} color="#ff4d4f" />
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <Modal visible={isUpgradeModalVisible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{flex: 1, backgroundColor: '#fff'}}>
          <View style={styles.upgradeHeader}>
            <TouchableOpacity onPress={() => setUpgradeModalVisible(false)} hitSlop={{top:10, bottom:10, left:10, right:10}}>
              <Ionicons name="close" size={28} color="#000" />
            </TouchableOpacity>
            <Text style={styles.upgradeHeaderTitle}>{t('upgrade.header_title')}</Text>
            <TouchableOpacity><Ionicons name="settings-outline" size={24} color="#000" /></TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
             <View style={styles.upgradeBanner}>
               <Text style={styles.upgradeBannerText}>{t('upgrade.banner_desc')}</Text>
               <Image source={getIconSource(currentWorkspace?.icon)} style={styles.upgradeBannerIcon} />
               <Text style={styles.upgradeBannerTitle}>{currentWorkspace?.name}</Text>
               
               <Text style={styles.upgradeBannerSubtitle}>
                  {currentLevel > 0 ? t('upgrade.banner_status', { total: serverTotalStones, level: currentLevel }) : t('upgrade.banner_status_no_level', { total: serverTotalStones })}
               </Text>
               <Text style={styles.channelLimitInfo}>{t('upgrade.capacity', { current: channels.length + groups.length, limit: currentChannelLimit })}</Text>

               <TouchableOpacity 
                 style={styles.upgradeBtnPrimary} 
                 onPress={async () => {
                   try {
                     if (!activeServerId) return;
                     await boostServer({ serverId: activeServerId });
                     Alert.alert(t('common.success', { defaultValue: 'Tuyệt vời!' }), t('alerts.donate_success'));
                   } catch (e: any) {
                     if (e.message.includes("NOT_ENOUGH_STONES")) {
                       Alert.alert(t('common.notification'), t('boost.not_enough_stones'));
                     } else {
                       Alert.alert(t('common.notification'), e.message);
                     }
                   }
                 }}
               >
                  <Text style={styles.upgradeBtnTextPrimary}>{t('upgrade.btn_donate')}</Text>
                  <Text style={{color: '#a5d6a7', fontSize: 12, marginTop: 4, fontWeight: '500'}}>
                    {isMaxLevel 
                      ? t('upgrade.max_level_reached') 
                      : t('upgrade.stones_needed', { stones: stonesNeededForNext })}
                  </Text>
               </TouchableOpacity>

               <TouchableOpacity 
                 style={styles.upgradeBtnSecondary} 
                 onPress={async () => {
                    Alert.alert(t('alerts.buy_confirm_title'), t('alerts.buy_confirm_desc'), [
                      { text: t('common.cancel'), style: "cancel" },
                      { 
                        text: t('common.confirm'), 
                        onPress: async () => {
                          try {
                            await buyStones();
                            Alert.alert(t('common.success'), t('alerts.buy_success'));
                          } catch(err: any) {
                            Alert.alert(t('common.error'), err.message);
                          }
                        } 
                      }
                    ]);
                 }}
               >
                  <Text style={styles.upgradeBtnTextSecondary}>{t('upgrade.btn_buy')}</Text>
                  <Text style={{fontSize: 11, color: '#44b669', marginTop: 2}}>{t('upgrade.wallet', { stones: myStones })}</Text>
               </TouchableOpacity>
             </View>

             <View style={{padding: 20}}>
                <Text style={styles.upgradeLevelsTitle}>{t('upgrade.path_title')}</Text>
                <Text style={{fontSize: 13, color: 'gray', marginBottom: 10}}>{t('upgrade.path_desc')}</Text>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap: 15, paddingVertical: 10}}>
                  {UPGRADE_LEVELS.map((item) => {
                    const isReached = currentLevel >= item.level;
                    return (
                      <View key={item.level} style={[styles.levelCard, isReached && { borderColor: '#44b669', borderWidth: 2 }]}>
                         <View style={[styles.levelCardHeader, isReached && { backgroundColor: '#44b669' }]}>
                            <Text style={styles.levelCardTitle}>{t('upgrade.level', { level: item.level })} {isReached && '✅'}</Text>
                         </View>
                         <View style={styles.levelCardFeature}>
                           <Text>📺</Text>
                           <Text style={styles.featureText}>{t('upgrade.max_channels', { max: MAX_CHANNELS_BASE + (item.level * 5) })}</Text>
                         </View>
                         <Text style={[styles.levelPriceText, isReached && { color: 'gray' }]}>
                           {t('upgrade.requirement', { stones: item.stones })}
                         </Text>
                      </View>
                    )
                  })}
                </ScrollView>
             </View>
             {topBoosters && topBoosters.length > 0 && (
               <View style={{padding: 20, paddingTop: 0, paddingBottom: 40}}>
                 <Text style={styles.upgradeLevelsTitle}>{t('upgrade.leaderboard_title')}</Text>
                 <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 15, borderWidth: 1, borderColor: '#eee', elevation: 2, shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.05 }}>
                   
                   {topBoosters.map((booster, index) => {
                     const rankColor = index === 0 ? '#ffd700' : index === 1 ? '#c0c0c0' : '#cd7f32';
                     return (
                       <View key={booster._id} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: index === topBoosters.length - 1 ? 0 : 15 }}>
                         <Text style={{ fontSize: 18, fontWeight: '900', width: 35, color: rankColor, fontStyle: 'italic' }}>
                           #{index + 1}
                         </Text>
                         <Image source={{ uri: booster.imageUrl }} style={{ width: 40, height: 40, borderRadius: 20, marginRight: 12, borderWidth: index === 0 ? 2 : 0, borderColor: rankColor }} />
                         <View style={{ flex: 1 }}>
                           <Text style={{ fontWeight: 'bold', fontSize: 15, color: '#333' }}>{booster.first_name}</Text>
                           <Text style={{ color: '#44b669', fontSize: 13, fontWeight: '700' }}>{t('upgrade.stones', { stones: booster.totalStones })}</Text>
                         </View>
                         {index === 0 && <Text style={{ fontSize: 24 }}>👑</Text>}
                       </View>
                     );
                   })}
                   
                 </View>
               </View>
             )}
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
  upgradeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  upgradeHeaderTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  upgradeBanner: { backgroundColor: '#44b669', alignItems: 'center', paddingVertical: 40, paddingHorizontal: 20, borderBottomLeftRadius: 25, borderBottomRightRadius: 25 },
  upgradeBannerText: { color: 'white', fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 20, lineHeight: 28 },
  upgradeBannerIcon: { width: 80, height: 80, borderRadius: 20, borderWidth: 3, borderColor: 'white', marginBottom: 12 },
  upgradeBannerTitle: { color: 'white', fontSize: 22, fontWeight: 'bold' },
  upgradeBannerSubtitle: { color: '#ffd700', fontSize: 14, fontWeight: 'bold', marginTop: 5 }, 
  channelLimitInfo: { color: '#e0f2f1', fontSize: 13, marginTop: 8, marginBottom: 20 },
  upgradeBtnPrimary: { backgroundColor: '#1b5e20', paddingVertical: 15, width: '100%', borderRadius: 30, alignItems: 'center', marginBottom: 12, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2 },
  upgradeBtnTextPrimary: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  upgradeBtnSecondary: { backgroundColor: 'white', paddingVertical: 15, width: '100%', borderRadius: 30, alignItems: 'center', borderWidth: 1.5, borderColor: '#44b669' },
  upgradeBtnTextSecondary: { color: '#44b669', fontWeight: 'bold', fontSize: 16 },
  upgradeLevelsTitle: { fontSize: 14, fontWeight: 'bold', color: '#888', marginTop: 15, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 },
  levelCard: { backgroundColor: '#fff', padding: 20, borderRadius: 20, width: 260, borderWidth: 1, borderColor: '#eee', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, elevation: 2 },
  levelCardHeader: { backgroundColor: '#999', paddingVertical: 6, paddingHorizontal: 15, borderRadius: 15, alignSelf: 'flex-start', marginBottom: 15 },
  levelCardTitle: { color: 'white', fontWeight: 'bold', fontSize: 15 },
  levelCardFeature: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  featureText: { fontSize: 14, color: '#444', marginLeft: 10, fontWeight: '500' },
  levelPriceText: { color: '#44b669', fontWeight: 'bold', marginTop: 10, fontSize: 14 },
});