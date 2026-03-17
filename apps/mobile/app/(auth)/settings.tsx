import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, Share, Linking, Switch, Modal, FlatList, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { useAuth, useClerk, useUser } from '@clerk/clerk-expo';
import { useRouter, Stack } from 'expo-router';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useTranslation } from 'react-i18next'; // Hook đa ngôn ngữ
import { useUserProfile } from '@/hooks/useUserProfile';

export default function SettingsScreen() {
  const { signOut } = useAuth();
  const { client, setActive } = useClerk();
  const { user } = useUser();
  const router = useRouter();
  const { t, i18n } = useTranslation(); // Lấy hàm t và biến i18n ra
  
  const [isAccountModalVisible, setAccountModalVisible] = useState(false);
  const [isLanguageModalVisible, setLanguageModalVisible] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // 1. Lấy dữ liệu và Mutation từ Convex
  const userProfile = useQuery(api.users.current);
  const updateActiveStatus = useMutation(api.users.updateActiveStatus);
  const updateLanguage = useMutation(api.users.updateLanguage);

  const getLanguageName = (code: string) => {
    switch(code) {
      case 'vi': return 'Tiếng Việt 🇻🇳';
      case 'en': return 'English 🇺🇸';
      case 'zh': return '中文 🇨🇳';
      default: return 'English 🇺🇸';
    }
  };

  const LANGUAGES = [
    { code: 'vi', label: 'Tiếng Việt 🇻🇳' },
    { code: 'en', label: 'English 🇺🇸' },
    { code: 'zh', label: '中文 🇨🇳' }
  ];

  const handleLanguageChange = async (langCode: string) => {
    i18n.changeLanguage(langCode);
    setLanguageModalVisible(false);
    
    if (userProfile?._id) {
      try {
        await updateLanguage({ 
          userId: userProfile._id, 
          language: langCode 
        });
      } catch(e) {
        console.log("Lỗi lưu ngôn ngữ:", e);
      }
    }
  };

  const handleLogout = () => {
    Alert.alert(t('settings.logout'), t('settings.logout_confirm'), [
      { text: t('common.cancel', 'Hủy'), style: 'cancel' },
      { text: t('settings.logout'), style: 'destructive', onPress: async () => {
          await signOut();
          router.replace('/(public)' as any); 
      }},
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      t('settings.delete_account_warning_title'), 
      t('settings.delete_account_warning_desc'), 
      [
        { text: t('common.cancel', 'Hủy'), style: 'cancel' },
        { text: t('settings.delete_permanently'), style: 'destructive', onPress: async () => {
            try {
              setIsDeleting(true);
              await user?.delete();
              await signOut();
              router.replace('/(public)' as any);
            } catch (error: any) {
              Alert.alert(t('common.error', 'Lỗi'), error.errors?.[0]?.message || t('settings.delete_account_error'));
            } finally {
              setIsDeleting(false);
            }
        }},
      ]
    );
  };

  const handleShareProfile = async () => {
    try {
      const profileLink = `https://konket.app/profile/${userProfile?.username || userProfile?._id}`;
      await Share.share({
        message: t('settings.share_profile_msg', { url: profileLink }),
      });
    } catch (error) {
      console.log('Lỗi chia sẻ:', error);
    }
  };

  const openWebLink = (url: string) => {
    Linking.openURL(url).catch(() => {
      Alert.alert(t('common.error', 'Lỗi'), t('settings.open_link_error'));
    });
  };

  const handleSwitchAccount = async (sessionId: string) => {
    try {
      await setActive({ session: sessionId });
      setAccountModalVisible(false);
      router.replace('/(auth)/(tabs)/feed' as any);
    } catch (err) {
      Alert.alert(t('common.error', 'Lỗi'), t('settings.switch_account_error'));
    }
  };

  const handleAddAccount = async () => {
    setAccountModalVisible(false);
    await signOut();
    router.replace('/(public)' as any); 
  };

  const SettingsItem = ({ icon, title, onPress, color = '#000', subTitle = "" }: any) => (
    <TouchableOpacity style={styles.itemContainer} onPress={onPress}>
      <Ionicons name={icon} size={24} color={color} style={styles.icon} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.itemText, { color }]}>{title}</Text>
        {subTitle ? <Text style={styles.subText}>{subTitle}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={20} color={Colors.border} style={styles.chevron} />
    </TouchableOpacity>
  );

  return (
    <>
      <Stack.Screen 
        options={{ 
          title: t('settings.title'),
          headerTitleAlign: 'center',
          headerBackTitleVisible: false,
          headerShadowVisible: false,
        }} 
      />

      {isDeleting && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={{ marginTop: 10, fontWeight: 'bold' }}>{t('settings.deleting_account')}</Text>
        </View>
      )}

      <ScrollView style={styles.container}>
        <View style={styles.section}>
          <View style={styles.itemContainer}>
            <Ionicons 
              name="ellipse" 
              size={12} 
              color={userProfile?.showActiveStatus ? "#44b669" : "gray"} 
              style={[styles.icon, { marginLeft: 6, marginRight: 21 }]} 
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.itemText}>{t('settings.active_status')}</Text>
              <Text style={styles.subText}>{t('settings.active_status_desc')}</Text>
            </View>
            <Switch
              value={userProfile?.showActiveStatus ?? true}
              onValueChange={async (newValue) => {
                try {
                  await updateActiveStatus({ isEnabled: newValue });
                } catch (error) {
                  console.error("Lỗi cập nhật trạng thái:", error);
                }
              }}
              trackColor={{ false: "#d3d3d3", true: "#44b669" }}
              thumbColor="#fff"
            />
          </View>

          <SettingsItem 
            icon="people-circle-outline" 
            title={t('settings.switch_account')} 
            subTitle={t('settings.current_user', { username: user?.username || t('settings.default_user') })}
            onPress={() => setAccountModalVisible(true)} 
          />

          <SettingsItem 
            icon="language-outline" 
            title={t('settings.app_language')} 
            subTitle={getLanguageName(i18n.language)}
            onPress={() => setLanguageModalVisible(true)} 
          />
          
          <SettingsItem 
            icon="share-social-outline" 
            title={t('settings.share_profile')} 
            onPress={handleShareProfile} 
          />
        </View>

        <View style={styles.section}>
          <SettingsItem 
            icon="book-outline" 
            title={t('settings.community_guidelines')} 
            onPress={() => openWebLink('https://www.google.com/search?q=nguyen+tac+cong+dong')} 
          />
          <SettingsItem 
            icon="document-text-outline" 
            title={t('settings.terms_of_service')} 
            onPress={() => openWebLink('https://www.google.com/search?q=dieu+khoan+dich+vu')} 
          />
          <SettingsItem 
            icon="shield-checkmark-outline" 
            title={t('settings.privacy_policy')} 
            onPress={() => openWebLink('https://www.google.com/search?q=chinh+sach+bao+mat')} 
          />
        </View>

        <View style={styles.section}>
          <SettingsItem 
            icon="log-out-outline" 
            title={t('settings.logout')} 
            onPress={handleLogout} 
            color="red" 
          />
          <SettingsItem 
            icon="trash-outline" 
            title={t('settings.delete_account')} 
            onPress={handleDeleteAccount} 
            color="red" 
          />
        </View>
        
        <Text style={styles.versionText}>{t('settings.version')}</Text>
      </ScrollView>

      {/* MODAL CHỌN NGÔN NGỮ */}
      <Modal visible={isLanguageModalVisible} animationType="slide" transparent>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setLanguageModalVisible(false)}>
          <TouchableOpacity activeOpacity={1} style={styles.accountSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('settings.choose_language')}</Text>
              <TouchableOpacity onPress={() => setLanguageModalVisible(false)}>
                <Ionicons name="close" size={24} color="black" />
              </TouchableOpacity>
            </View>
            <View style={{ padding: 20 }}>
              {LANGUAGES.map((lang) => {
                const isActive = i18n.language === lang.code;
                return (
                  <TouchableOpacity 
                    key={lang.code}
                    style={[styles.langBtn, isActive && styles.langBtnActive]}
                    onPress={() => handleLanguageChange(lang.code)}
                  >
                    <Text style={[styles.langText, isActive && styles.langTextActive]}>
                      {lang.label}
                    </Text>
                    {isActive && <Ionicons name="checkmark-circle" size={24} color="#5865F2" />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* MODAL CHUYỂN ĐỔI TÀI KHOẢN */}
      <Modal visible={isAccountModalVisible} animationType="slide" transparent>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setAccountModalVisible(false)}>
          <TouchableOpacity activeOpacity={1} style={styles.accountSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('settings.switch_account')}</Text>
              <TouchableOpacity onPress={() => setAccountModalVisible(false)}>
                <Ionicons name="close" size={24} color="black" />
              </TouchableOpacity>
            </View>

            <FlatList
              data={client.sessions}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => {
                if (!item.user) return null;
                return (
                  <TouchableOpacity 
                    style={styles.accountItem} 
                    onPress={() => handleSwitchAccount(item.id)}
                  >
                    <Image source={{ uri: item.user.imageUrl }} style={styles.accountAvatar} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.accountName}>
                        {item.user.firstName || item.user.fullName || t('settings.default_user')}
                      </Text>
                      <Text style={styles.accountEmail}>
                        @{item.user.username || t('settings.no_id_yet')}
                      </Text>
                    </View>
                    {item.id === client.lastActiveSessionId && (
                      <Ionicons name="checkmark-circle" size={24} color="#44b669" />
                    )}
                  </TouchableOpacity>
                );
              }}
            />

            <TouchableOpacity style={styles.addAccountBtn} onPress={handleAddAccount}>
              <Ionicons name="add-circle-outline" size={24} color="#007aff" />
              <Text style={styles.addAccountText}>{t('settings.login_other_account')}</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f2f2f2' },
  section: { backgroundColor: '#fff', marginTop: 20, borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: Colors.border },
  itemContainer: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, backgroundColor: '#fff', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border },
  icon: { marginRight: 15 },
  itemText: { fontSize: 16, flex: 1 },
  subText: { fontSize: 12, color: 'gray', marginTop: 2 },
  chevron: { marginLeft: 'auto' },
  versionText: { textAlign: 'center', color: 'gray', fontSize: 12, marginVertical: 20 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  accountSheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 40, maxHeight: '60%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, borderBottomWidth: 0.5, borderBottomColor: '#eee' },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  accountItem: { flexDirection: 'row', alignItems: 'center', padding: 15, borderBottomWidth: 0.5, borderBottomColor: '#f9f9f9' },
  accountAvatar: { width: 45, height: 45, borderRadius: 22.5, marginRight: 15 },
  accountName: { fontSize: 16, fontWeight: '600' },
  accountEmail: { fontSize: 13, color: 'gray' },
  addAccountBtn: { flexDirection: 'row', alignItems: 'center', padding: 20, gap: 10 },
  addAccountText: { fontSize: 16, color: '#007aff', fontWeight: '600' },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.8)', zIndex: 10, justifyContent: 'center', alignItems: 'center' },
  langBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, backgroundColor: '#f9f9f9', borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#eee' },
  langBtnActive: { borderColor: '#5865F2', backgroundColor: '#eef0fd' },
  langText: { fontSize: 16, color: '#333' },
  langTextActive: { fontWeight: 'bold', color: '#5865F2' }
});