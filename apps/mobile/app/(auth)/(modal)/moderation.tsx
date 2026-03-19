import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator, Image } from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';

export default function ModerationScreen() {
  const { serverId } = useLocalSearchParams<{ serverId: string }>();
  const { t } = useTranslation();
  const router = useRouter();

  const reports = useQuery(api.messages.getServerReports, { serverId: serverId as Id<'servers'> });
  const resolveReport = useMutation(api.messages.resolveReport);

  const handleAction = (reportIds: Id<'reports'>[], action: 'delete' | 'dismiss') => {
    Alert.alert(
      t('common.confirm'),
      action === 'delete' ? t('report.action_delete') : t('report.action_dismiss'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.confirm'),
          style: action === 'delete' ? 'destructive' : 'default',
          onPress: () => resolveReport({ reportIds, action })
        }
      ]
    );
  };

  const renderReason = (reasonStr: string) => {
    const keys = ['reason_spam', 'reason_harassment', 'reason_inappropriate', 'reason_wrong_channel', 'reason_minors', 'reason_adult'];
    if (keys.includes(reasonStr)) return t(`report.${reasonStr}`);
    return reasonStr;
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: t('report.moderation_title'),
          presentation: 'modal',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={{ padding: 5 }}>
              <Ionicons name="close" size={24} color="black" />
            </TouchableOpacity>
          )
        }}
      />

      {reports === undefined ? (
        <ActivityIndicator size="large" style={{ marginTop: 50 }} color={Colors.primary} />
      ) : (
        <FlatList
          data={reports}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          ListEmptyComponent={<Text style={styles.empty}>{t('report.moderation_empty')}</Text>}
          renderItem={({ item }) => (
            <View style={styles.card}>

              {/* PHẦN 1: THÔNG TIN NHỮNG NGƯỜI BÁO CÁO (ĐÃ GỘP) */}
              <View style={styles.headerRow}>
                <View style={styles.badgeContainer}>
                  <Text style={styles.badgeText}>{item.reportCount} Báo cáo</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  {item.reporters.map((rep: any, idx: number) => (
                    <Text key={idx} style={{ fontSize: 13, marginBottom: 4, color: '#333' }}>
                      <Text style={{fontWeight: 'bold'}}>• {rep.first_name}</Text>: {renderReason(rep.reason)}
                    </Text>
                  ))}
                </View>
              </View>

              {/* PHẦN 2: THÔNG TIN BÀI VIẾT */}
              <View style={styles.contentBox}>
                <View style={styles.postHeader}>
                  <Image source={{ uri: item.author?.imageUrl || 'https://via.placeholder.com/30' }} style={styles.authorAvatar} />
                  <View>
                    <Text style={styles.authorName}>
                      {item.message?.isAnonymous ? t('thread.anonymous_member') : (item.author?.first_name || 'User')}
                    </Text>
                    {item.channel && (
                      <Text style={styles.channelInfo}>
                        {t('common.channel')}: <Text style={{fontWeight: 'bold'}}>#{item.channel.name}</Text>
                      </Text>
                    )}
                  </View>
                </View>

                <Text numberOfLines={4} style={styles.messageText}>
                  {item.message?.content || t('chat.post_not_exist')}
                </Text>

                {item.message?.mediaFiles && item.message.mediaFiles.length > 0 && (
                  <View style={styles.imageIndicator}>
                    <Ionicons name="image-outline" size={14} color="gray" />
                    <Text style={{ fontSize: 12, color: 'gray', marginLeft: 4 }}>
                      {item.message.mediaFiles.length} {t('chat.image_bracket')}
                    </Text>
                  </View>
                )}
              </View>

              {/* PHẦN 3: HÀNH ĐỘNG */}
              <View style={styles.actionRow}>
                <TouchableOpacity style={[styles.btn, styles.btnDismiss]} onPress={() => handleAction(item.reportIds, 'dismiss')}>
                  <Text style={styles.btnTextDismiss}>{t('report.action_dismiss')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.btn, styles.btnDelete]} onPress={() => handleAction(item.reportIds, 'delete')}>
                  <Text style={styles.btnTextDelete}>{t('report.action_delete')}</Text>
                </TouchableOpacity>
              </View>

            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f2f2f7' },
  empty: { textAlign: 'center', marginTop: 40, color: 'gray', fontSize: 16 },
  card: { backgroundColor: 'white', borderRadius: 12, padding: 16, marginBottom: 15, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },

  headerRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 15, backgroundColor: '#fef2f2', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#fecaca' },
  badgeContainer: { backgroundColor: '#ef4444', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, alignSelf: 'flex-start' },
  badgeText: { color: 'white', fontWeight: 'bold', fontSize: 12 },

  contentBox: { backgroundColor: '#f8f9fa', padding: 12, borderRadius: 8, marginBottom: 15, borderWidth: 1, borderColor: '#e5e7eb' },
  postHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#eee' },
  authorAvatar: { width: 30, height: 30, borderRadius: 15, marginRight: 10 },
  authorName: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  channelInfo: { fontSize: 12, color: '#007aff', marginTop: 2 },
  messageText: { fontSize: 14, color: '#444', lineHeight: 20 },
  imageIndicator: { flexDirection: 'row', alignItems: 'center', marginTop: 10, padding: 6, backgroundColor: '#eee', alignSelf: 'flex-start', borderRadius: 6 },

  actionRow: { flexDirection: 'row', gap: 10 },
  btn: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  btnDismiss: { backgroundColor: '#e5e5ea' },
  btnTextDismiss: { color: 'black', fontWeight: 'bold', fontSize: 15 },
  btnDelete: { backgroundColor: '#ff3b30' },
  btnTextDelete: { color: 'white', fontWeight: 'bold', fontSize: 15 }
});