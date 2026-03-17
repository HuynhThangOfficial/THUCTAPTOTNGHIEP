import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next'; // 👈 IMPORT DỊCH

const Layout = () => {
  const { t } = useTranslation(); // 👈 KHỞI TẠO HOOK

  return (
    <Stack
      screenOptions={{
        contentStyle: {
          backgroundColor: '#fff',
        },
      }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="profile/[id]" options={{ headerShown: false }} />
      <Stack.Screen
        name="[id]"
        options={{
          title: t('feed_layout.title'), // 👈 ĐÃ DỊCH TIÊU ĐỀ
          headerShadowVisible: false,
          headerRight: () => <Ionicons name="notifications-outline" size={24} color="black" />,
          headerTintColor: 'black',
          headerBackTitle: t('feed_layout.back'), // 👈 ĐÃ DỊCH NÚT BACK
        }}
      />
    </Stack>
  );
};
export default Layout;