import { Slot, useNavigationContainerRef, useSegments } from 'expo-router';
import {
  useFonts,
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_700Bold,
} from '@expo-google-fonts/dm-sans';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { ClerkProvider, ClerkLoaded, useAuth, useUser } from '@clerk/clerk-expo';
import { tokenCache } from '@/utils/cache';
import { LogBox } from 'react-native';
import { useRouter } from 'expo-router';
import { ConvexReactClient } from 'convex/react';
import { ConvexProviderWithClerk } from 'convex/react-clerk';
import * as Sentry from '@sentry/react-native'; 
import { ActionSheetProvider } from '@expo/react-native-action-sheet';
import { ChannelProvider } from '@/context/ChannelContext';
import { MenuProvider } from '@/context/MenuContext';
import { RootSiblingParent } from 'react-native-root-siblings'; // Giải quyết lỗi Bundling

// Ngăn màn hình chào tự tắt cho đến khi font tải xong
SplashScreen.preventAutoHideAsync();

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;

if (!publishableKey) {
  throw new Error('Missing Publishable Key');
}

// Bỏ qua các log cảnh báo không cần thiết của Clerk
LogBox.ignoreLogs(['Clerk:']);

const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL!, {
  unsavedChangesWarning: false,
});

// --- CẤU HÌNH SENTRY ---
const routingInstrumentation = new Sentry.ReactNavigationInstrumentation();

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  attachScreenshot: true,
  debug: false,
  tracesSampleRate: 1.0,
  integrations: [
    new Sentry.ReactNativeTracing({
      routingInstrumentation,
      enableNativeFramesTracking: false,
    }),
  ],
});

const InitialLayout = () => {
  const [fontsLoaded] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
  });
  const { isLoaded, isSignedIn } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const { user } = useUser();

  // Ẩn Splash Screen khi font đã sẵn sàng
  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  // Logic điều hướng tự động (Auth Guard)
  useEffect(() => {
    if (!isLoaded) return;
    const inTabsGroup = segments[0] === '(auth)';

    if (isSignedIn && !inTabsGroup) {
      // Nếu đã đăng nhập mà đang ở trang public -> Chuyển vào Feed
      router.replace('/(auth)/(tabs)/feed');
    } else if (!isSignedIn && inTabsGroup) {
      // Nếu chưa đăng nhập mà cố vào vùng auth -> Chuyển ra Login
      router.replace('/(public)');
    }
  }, [isSignedIn, isLoaded, segments]);

  // Gửi thông tin định danh User lên Sentry để dễ debug lỗi theo người dùng
  useEffect(() => {
    if (user) {
      Sentry.setUser({
        email: user.emailAddresses[0].emailAddress,
        id: user.id
      });
    } else {
      Sentry.setUser(null);
    }
  }, [user]);

  return <Slot />;
};

const RootLayoutNav = () => {
  const ref = useNavigationContainerRef();

  // Kết nối công cụ đo lường Sentry với Expo Router Navigation
  useEffect(() => {
    if (ref) {
      routingInstrumentation.registerNavigationContainer(ref);
    }
  }, [ref]);

  return (
    <ClerkProvider publishableKey={publishableKey!} tokenCache={tokenCache}>
      <ClerkLoaded>
        <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
          <ActionSheetProvider>
            <ChannelProvider>
              <MenuProvider>
                {/* Bọc RootSiblingParent tại đây để các thành phần con
                  có thể sử dụng Toast, Popover, Siblings ở lớp trên cùng
                */}
                <RootSiblingParent>
                  <InitialLayout />
                </RootSiblingParent>
              </MenuProvider>
            </ChannelProvider>
          </ActionSheetProvider>
        </ConvexProviderWithClerk>
      </ClerkLoaded>
    </ClerkProvider>
  );
};

// Bọc toàn bộ App bằng Sentry.wrap để bắt mọi lỗi crash từ gốc
export default Sentry.wrap(RootLayoutNav);