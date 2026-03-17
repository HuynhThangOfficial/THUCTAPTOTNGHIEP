import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next'; // 👈 IMPORT DỊCH

export default function CreateScreen() {
  const { t } = useTranslation(); // 👈 KHỞI TẠO HOOK

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('create.title')}</Text>
      {/* Chỗ này sau này Thắng có thể gắn Component ThreadComposer vào để đăng bài */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
});