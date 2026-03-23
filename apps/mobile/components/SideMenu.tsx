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
import { Link, useRouter } from 'expo-router';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const LOCAL_IMAGES: Record<string, any> = { 'local:login': require('../assets/images/login.png'), 'local:community': require('../assets/images/icon.png'), };
const getIconSource = (iconString?: string) => (iconString && LOCAL_IMAGES[iconString] ? LOCAL_IMAGES[iconString] : { uri: iconString || 'https://via.placeholder.com/50' });

const TEMPLATES = [
  { id: 'Gaming', icon: '🎮' }, { id: 'School', icon: '🏫' }, { id: 'Study', icon: '🍎' }, { id: 'Friends', icon: '💗' }, { id: 'Creators', icon: '🎨' },
];

const UPGRADE_LEVELS = [
  { level: 1, stones: 1 }, { level: 2, stones: 2 }, { level: 3, stones: 2 }, { level: 4, stones: 3 }, { level: 5, stones: 3 }, { level: 6, stones: 4 }, { level: 7, stones: 4 }, { level: 8, stones: 4 }, { level: 9, stones: 5 }, { level: 10, stones: 5 },
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

  // STATE BÁO CÁO MÁY CHỦ
  const [isReportServerModalVisible, setReportServerModalVisible] = useState(false);
  const [reportStep, setReportStep] = useState(1);
  const [selectedTargets, setSelectedTargets] = useState<string[]>([]);
  const [reportReason, setReportReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [isReporting, setIsReporting] = useState(false);

  const TARGET_OPTIONS = ['target_avatar', 'target_name', 'target_channels', 'target_purpose'];
  const REASON_OPTIONS = ['reason_spam', 'reason_harassment', 'reason_inappropriate', 'reason_adult', 'reason_other'];

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

  const handleKickMember = (targetUserId: Id<"users">, targetName: string) => {
    if (!activeServerId) return;
    Alert.alert(t('alerts.kick_title'), t('alerts.kick_desc', { name: targetName }), [
        { text: t('common.cancel'), style: "cancel" },
        { text: t('common.delete'), style: "destructive", onPress: async () => {
            try { await removeMember({ serverId: activeServerId, targetUserId }); }
            catch (error: any) { Alert.alert(t('common.error'), error.message); }
          }
        }
    ]);
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

  let currentLevel = 0; let accumulatedStones = 0; let stonesNeededForNext = UPGRADE_LEVELS[0].stones; let isMaxLevel = false;
  for (let i = 0; i < UPGRADE_LEVELS.length; i++) {
    accumulatedStones += UPGRADE_LEVELS[i].stones;
    if (serverTotalStones >= accumulatedStones) { currentLevel = UPGRADE_LEVELS[i].level; }
    else { stonesNeededForNext = UPGRADE_LEVELS[i].stones; break; }
  }
  if (currentLevel >= 10) { currentLevel = 10; isMaxLevel = true; stonesNeededForNext = 0; }

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
      <View style={[styles.serverRail, { paddingTop: top }]}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ alignItems: 'center', paddingBottom: 20, width: '100%' }}>
            {universities.map((uni) => (
              <TouchableOpacity key={uni._id} style={styles.serverItem} onPress={() => switchToUniversity(uni._id)}>
                <Image source={getIconSource(uni.icon)} style={styles.serverIcon} resizeMode="contain" />
                {uni._id === activeUniversityId && <View style={styles.activePill} />}
              </TouchableOpacity>
            ))}
            <View style={styles.railSeparator} />
            {myServers && myServers.map((server) => (
              <TouchableOpacity key={server._id} style={styles.serverItem} onPress={() => switchToServer(server._id)}>
                <Image source={getIconSource(server.icon)} style={styles.serverIcon} resizeMode="cover" />
                {server._id === activeServerId && <View style={styles.activePill} />}
              </TouchableOpacity>
            ))}
        </ScrollView>
      </View>

      <View style={[styles.channelRail, { paddingTop: top, paddingBottom: bottom }]}>
        <View style={styles.serverHeader}>
          <TouchableOpacity style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }} onPress={() => { if (activeServerId) setServerMenuVisible(true); }} disabled={!activeServerId}>
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
            {channels.filter(c => !c.parentId && (!hiddenChannels.includes(c._id) || c.name === 'đại-sảnh')).map((channel) => (
                <TouchableOpacity key={channel._id} style={[styles.channelItem, activeChannelId === channel._id && styles.activeChannel]} onPress={() => { setActiveChannelId(channel._id); setActiveChannelName(channel.name); }} onLongPress={() => handleChannelLongPress(channel, false)}>
                    <MaterialCommunityIcons name="pound" size={20} color={activeChannelId === channel._id ? "black" : "gray"} />
                    <Text style={[styles.channelText, activeChannelId === channel._id && {color: 'black', fontWeight: 'bold'}]}>{channel.name}{(channel as any).isAnonymous && " 🎭"}</Text>
                </TouchableOpacity>
            ))}
            {groups.map((group) => {
              const isExpanded = expandedGroups[group._id] ?? true;
              const childChannels = channels.filter(c => c.parentId === group._id && !hiddenChannels.includes(c._id));
              if (childChannels.length === 0) return null;

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

      <Modal visible={isReportServerModalVisible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: '#f2f3f5' }}>
          <View style={[styles.modalHeader, { backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
            <Text style={{ fontSize: 18, fontWeight: 'bold' }}>{t('report.step1_title')}</Text>
            <TouchableOpacity onPress={() => { setReportServerModalVisible(false); setReportStep(1); }}><Ionicons name="close" size={28} color="gray" /></TouchableOpacity>
          </View>
          <ScrollView style={{ padding: 20 }}>
            {reportStep === 1 ? (
               <>
                 <Text style={{ fontSize: 14, color: 'gray', marginBottom: 20 }}>{t('report.step1_desc')}</Text>
                 {TARGET_OPTIONS.map(target => (
                   <TouchableOpacity
                     key={target}
                     style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 15, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: selectedTargets.includes(target) ? '#5865F2' : '#eee' }}
                     onPress={() => {
                        if (selectedTargets.includes(target)) setSelectedTargets(selectedTargets.filter(t => t !== target));
                        else setSelectedTargets([...selectedTargets, target]);
                     }}
                   >
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
                   <TouchableOpacity
                     key={r}
                     style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 15, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: reportReason === r ? '#5865F2' : '#eee' }}
                     onPress={() => setReportReason(r)}
                   >
                     <Ionicons name={reportReason === r ? "radio-button-on" : "radio-button-off"} size={24} color={reportReason === r ? "#5865F2" : "gray"} style={{ marginRight: 15 }} />
                     <Text style={{ fontSize: 16, fontWeight: '500', color: '#333' }}>{t(`report.${r}`)}</Text>
                   </TouchableOpacity>
                 ))}
                 {reportReason === 'reason_other' && (
                   <TextInput
                      style={[styles.textInput, { height: 100, textAlignVertical: 'top', marginTop: 10, backgroundColor: '#fff', borderWidth: 1, borderColor: '#eee' }]}
                      placeholder={t('report.custom_reason_placeholder')}
                      value={customReason}
                      onChangeText={setCustomReason}
                      multiline
                   />
                 )}
                 <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
                   <TouchableOpacity onPress={() => setReportStep(1)} style={[styles.submitBtn, { flex: 1, backgroundColor: '#e0e0e0' }]}>
                     <Text style={[styles.submitBtnText, { color: '#333' }]}>{t('common.back')}</Text>
                   </TouchableOpacity>
                   <TouchableOpacity
                      disabled={!reportReason || (reportReason === 'reason_other' && !customReason.trim()) || isReporting}
                      onPress={handleSubmitServerReport}
                      style={[styles.submitBtn, { flex: 1, opacity: (!reportReason || (reportReason === 'reason_other' && !customReason.trim()) || isReporting) ? 0.5 : 1 }]}
                   >
                     {isReporting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>{t('common.confirm')}</Text>}
                   </TouchableOpacity>
                 </View>
               </>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* (Phần còn lại của các Modal cũ giữ nguyên, tôi đã lược bỏ bớt ở đây để file ngắn gọn, bạn nhớ giữ lại Modal Settings, BrowseChannels ở file gốc của bạn nhé) */}

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
  modalBody: { paddingHorizontal: 20 },
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