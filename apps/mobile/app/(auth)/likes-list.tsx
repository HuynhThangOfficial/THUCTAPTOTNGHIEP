import { StyleSheet, Text, View, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import React from 'react';
import { useLocalSearchParams, Stack, useNavigation } from 'expo-router';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import ProfileSearchResult from '@/components/ProfileSearchResult';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next'; // 👈 IMPORT DỊCH

const LikesListPage = () => {
  const { messageId } = useLocalSearchParams<{ messageId: string }>();
  const navigation = useNavigation();
  const { t } = useTranslation(); // 👈 KHỞI TẠO HOOK

  // Gọi API lấy danh sách người đã thả tim
  const likers = useQuery(api.messages.getLikers, { 
    messageId: messageId as Id<'messages'> 
  });

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={26} color="black" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('likes_list.title')}</Text>
        <View style={{ width: 26 }} /> 
      </View>

      {/* DANH SÁCH LIKES */}
      {likers === undefined ? (
        <ActivityIndicator style={{ marginTop: 20 }} size="large" color="black" />
      ) : (
        <FlatList
          data={likers}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => <ProfileSearchResult user={item} />}
          ListEmptyComponent={
            <Text style={styles.emptyText}>{t('likes_list.empty_text')}</Text>
          }
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      )}
    </View>
  );
};

export default LikesListPage;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee', marginTop: 30, // Thêm margin để tránh tai thỏ (notch)
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  backBtn: { padding: 5 },
  emptyText: { textAlign: 'center', marginTop: 30, color: 'gray' },
});