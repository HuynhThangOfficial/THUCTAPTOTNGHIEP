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
import { RootSiblingParent } from 'react-native-root-siblings'; // <--- IMPORT MỚI

SplashScreen.preventAutoHideAsync();

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;

if (!publishableKey) {
  throw new Error('Missing Publishable Key');
}
LogBox.ignoreLogs(['Clerk:']);

const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL!, {
  unsavedChangesWarning: false,
});

// --- CẤU HÌNH SENTRY AN TOÀN ---
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

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  useEffect(() => {
    if (!isLoaded) return;
    const inTabsGroup = segments[0] === '(auth)';
    if (isSignedIn && !inTabsGroup) {
      router.replace('/(auth)/(tabs)/feed');
    } else if (!isSignedIn && inTabsGroup) {
      router.replace('/(public)');
    }
  }, [isSignedIn, isLoaded]);

  // Gửi thông tin User lên Sentry
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

  // Kết nối Sentry với Expo Router
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
                {/* Bọc RootSiblingParent ở đây để Toast có thể 
                  hiển thị ở bất cứ đâu trong ứng dụng 
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

// Bọc App bằng Sentry.wrap để bắt lỗi từ gốc
export default Sentry.wrap(RootLayoutNav);