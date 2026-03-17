import { View, Text, StyleSheet, TouchableOpacity, StatusBar, SafeAreaView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ImageView from "react-native-image-viewing";
import { useTranslation } from 'react-i18next'; // 👈 IMPORT DỊCH

export default function ImageViewer() {
  const { url } = useLocalSearchParams<{ url: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation(); // 👈 KHỞI TẠO HOOK
  const decodedUrl = decodeURIComponent(url || '');

  // Chuẩn bị mảng ảnh (chỉ có 1 ảnh)
  const images = [{ uri: decodedUrl }];

  // Component Header (Nút X bên phải)
  const ImageHeader = () => (
    <SafeAreaView style={styles.headerContainer}>
      <TouchableOpacity
        style={styles.closeButton}
        onPress={() => router.back()}
        hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
      >
         <Ionicons name="close" size={28} color="white" />
      </TouchableOpacity>
    </SafeAreaView>
  );

  // Component Footer (Số trang dùng t() để linh hoạt)
  const ImageFooter = () => (
    <View style={[styles.footerContainer, { paddingBottom: insets.bottom + 20 }]}>
      <Text style={styles.footerText}>
        {t('image_viewer.page_indicator', { current: 1, total: 1 })}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ImageView
        images={images}
        imageIndex={0}
        visible={true}
        onRequestClose={() => router.back()}
        HeaderComponent={ImageHeader}
        FooterComponent={ImageFooter}
        presentationStyle="overFullScreen"
        animationType="fade"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  headerContainer: {
    position: 'absolute',
    top: 0,
    width: '100%',
    zIndex: 10,
    alignItems: 'flex-end',
    paddingRight: 20,
  },
  closeButton: {
    padding: 10,
  },
  footerContainer: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    zIndex: 10,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingTop: 15,
  },
  footerText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  }
});