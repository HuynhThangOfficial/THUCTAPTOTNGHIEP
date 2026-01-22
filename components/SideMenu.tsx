import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, ActivityIndicator, LayoutAnimation, Platform, UIManager } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useChannel } from '@/context/ChannelContext';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const LOCAL_IMAGES: Record<string, any> = { 'local:login': require('../assets/images/login.png') };
const getIconSource = (iconString?: string) => (iconString && LOCAL_IMAGES[iconString] ? LOCAL_IMAGES[iconString] : { uri: iconString || 'https://via.placeholder.com/50' });

export default function SideMenu() {
  const { top, bottom } = useSafeAreaInsets();
  const { userProfile } = useUserProfile();

  // Lấy danh sách trường
  const universities = useQuery(api.university.getUniversities);

  const { activeUniversityId, setActiveUniversityId, activeChannelId, setActiveChannelId, setActiveChannelName } = useChannel();
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (universities && universities.length > 0 && !activeUniversityId) setActiveUniversityId(universities[0]._id);
  }, [universities]);

  const channelsData = useQuery(api.university.getChannels, { universityId: activeUniversityId || undefined });

  useEffect(() => {
    const chans = channelsData?.channels || [];
    if (chans.length > 0 && !activeChannelId) {
       const defaultChannel = chans.find(c => c.name === 'đại-sảnh') || chans[0];
       setActiveChannelId(defaultChannel._id);
       setActiveChannelName(defaultChannel.name);
    }
  }, [channelsData]);

  if (universities === undefined || channelsData === undefined) {
    return <View style={[styles.container, {justifyContent:'center', alignItems: 'center'}]}><ActivityIndicator color="#000" /></View>;
  }

  const groups = channelsData?.groups || [];
  const channels = channelsData?.channels || [];
  const currentUniversity = universities.find(u => u._id === activeUniversityId);
  const standaloneChannels = channels.filter(c => !c.parentId);

  const toggleGroup = (groupId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const handleSelectChannel = (channel: any) => {
    setActiveChannelId(channel._id);
    setActiveChannelName(channel.name);
  };

  return (
    <View style={styles.container}>
      {/* CỘT 1: TRƯỜNG */}
      <View style={[styles.serverRail, { paddingTop: top }]}>
        {universities.map((uni) => (
          <TouchableOpacity key={uni._id} style={styles.serverItem} onPress={() => setActiveUniversityId(uni._id)}>
            <Image source={getIconSource(uni.icon)} style={styles.serverIcon} resizeMode="contain" />
            {uni._id === activeUniversityId && <View style={styles.activePill} />}
          </TouchableOpacity>
        ))}
      </View>

      {/* CỘT 2: KÊNH */}
      <View style={[styles.channelRail, { paddingTop: top, paddingBottom: bottom }]}>
        <View style={styles.serverHeader}>
          <Text style={styles.serverName} numberOfLines={1}>{currentUniversity?.name || "Chọn Trường"}</Text>
        </View>
        <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
            {standaloneChannels.map((channel) => (
                <TouchableOpacity key={channel._id} style={[styles.channelItem, activeChannelId === channel._id && styles.activeChannel]} onPress={() => handleSelectChannel(channel)}>
                    <MaterialCommunityIcons name="pound" size={20} color={activeChannelId === channel._id ? "black" : "gray"} />
                    <Text style={[styles.channelText, activeChannelId === channel._id && {color: 'black', fontWeight: 'bold'}]}>{channel.name}</Text>
                </TouchableOpacity>
            ))}
            {groups.map((group) => {
              const isExpanded = expandedGroups[group._id] ?? true;
              const childChannels = channels.filter(c => c.parentId === group._id);
              return (
                <View key={group._id} style={{ marginTop: 16 }}>
                  <TouchableOpacity style={styles.categoryHeader} onPress={() => toggleGroup(group._id)}>
                    <Ionicons name={isExpanded ? "chevron-down" : "chevron-forward"} size={12} color="gray" />
                    <Text style={styles.categoryTitle}>{group.name}</Text>
                  </TouchableOpacity>
                  {isExpanded && (
                    <View>
                      {childChannels.map(channel => (
                        <TouchableOpacity key={channel._id} style={[styles.channelItem, activeChannelId === channel._id && styles.activeChannel]} onPress={() => handleSelectChannel(channel)}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: 'row', backgroundColor: '#f2f3f5', width: 300 },
  serverRail: { width: 72, backgroundColor: '#E3E5E8', alignItems: 'center', paddingBottom: 10 },
  serverItem: { marginBottom: 12, alignItems: 'center', width: 72, justifyContent: 'center', position: 'relative' },
  serverIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'white', borderWidth: 1, borderColor: '#d1d1d1' },
  activePill: { position: 'absolute', left: 0, width: 4, height: 40, backgroundColor: 'black', borderTopRightRadius: 4, borderBottomRightRadius: 4 },
  channelRail: { flex: 1, backgroundColor: '#F2F3F5' },
  serverHeader: { padding: 16, borderBottomWidth: 1, borderColor: '#e0e0e0', backgroundColor: 'white', height: 56, justifyContent: 'center', marginBottom: 8 },
  serverName: { fontWeight: '900', fontSize: 15, textTransform: 'uppercase' },
  categoryHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, marginBottom: 4, paddingVertical: 4 },
  categoryTitle: { fontSize: 12, fontWeight: 'bold', color: 'gray', marginLeft: 4, textTransform: 'uppercase' },
  channelItem: { flexDirection: 'row', padding: 8, paddingHorizontal: 12, marginHorizontal: 8, alignItems: 'center', borderRadius: 4, marginTop: 1 },
  activeChannel: { backgroundColor: '#dbdee1' },
  channelText: { marginLeft: 6, color: '#5c5e62', fontWeight: '500', fontSize: 15, flex: 1 },
  userFooter: { padding: 10, backgroundColor: '#ebedef', flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#e0e0e0' },
  footerAvatar: { width: 32, height: 32, borderRadius: 16 },
  footerName: { fontWeight: 'bold', fontSize: 13, color: 'black' },
  footerUsername: { fontSize: 11, color: 'gray' }
});