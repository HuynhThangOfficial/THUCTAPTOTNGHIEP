import '../i18n'; // Luôn để i18n ở dòng đầu tiên
import { Slot, useNavigationContainerRef, useSegments, useRouter } from 'expo-router';
import {
  useFonts,
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_700Bold,
} from '@expo-google-fonts/dm-sans';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { ClerkProvider, ClerkLoaded, useAuth, useUser } from '@clerk/clerk-expo'; // 👈 BẮT BUỘC LÀ clerk-expo
import { tokenCache } from '@/utils/cache';
import { LogBox, ActivityIndicator, View } from 'react-native';
import { ConvexReactClient } from 'convex/react';
import { ConvexProviderWithClerk } from 'convex/react-clerk';
import * as Sentry from '@sentry/react-native'; 
import { ActionSheetProvider } from '@expo/react-native-action-sheet';
import { ChannelProvider } from '@/context/ChannelContext';
import { MenuProvider } from '@/context/MenuContext';
import { RootSiblingParent } from 'react-native-root-siblings';

// 👇 Import thêm Hook ngôn ngữ và Profile
import { useTranslation } from 'react-i18next';
import { useUserProfile } from '@/hooks/useUserProfile';

SplashScreen.preventAutoHideAsync();

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;

if (!publishableKey) {
  throw new Error('Missing Publishable Key');
}

LogBox.ignoreLogs(['Clerk:']);

const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL!, {
  unsavedChangesWarning: false,
});

const routingInstrumentation = new Sentry.ReactNavigationInstrumentation();

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  attachScreenshot: true,
  tracesSampleRate: 1.0,
  integrations: [
    new Sentry.ReactNativeTracing({
      routingInstrumentation,
      enableNativeFramesTracking: false,
    }),
  ],
});

// --- COMPONENT XỬ LÝ ĐIỀU HƯỚNG & AUTH ---
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

  // Gọi Hook ngôn ngữ
  const { i18n } = useTranslation();
  const { language, isLoading: isProfileLoading } = useUserProfile();

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  // Logic điều hướng
  useEffect(() => {
    if (!isLoaded || !fontsLoaded) return; // Đợi cả Auth và Font load xong

    const inAuthGroup = segments[0] === '(auth)';

    if (isSignedIn && !inAuthGroup) {
      router.replace('/(auth)/(tabs)/feed');
    } else if (!isSignedIn && inAuthGroup) {
      router.replace('/(public)');
    }
  }, [isSignedIn, isLoaded, segments, fontsLoaded]);

  // Logic Đồng bộ ngôn ngữ từ Database về App
  useEffect(() => {
    if (!isProfileLoading && language) {
      if (i18n.language !== language) {
        i18n.changeLanguage(language);
      }
    }
  }, [language, isProfileLoading]);

  // Logic Sentry
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

  // Nếu chưa load xong thì hiện màn hình chờ trắng để tránh lỗi hook
  if (!isLoaded || !fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#5865F2" />
      </View>
    );
  }

  return <Slot />;
};

// --- COMPONENT CHỨA CÁC PROVIDER ---
const RootLayoutNav = () => {
  const ref = useNavigationContainerRef();

  useEffect(() => {
    if (ref) {
      routingInstrumentation.registerNavigationContainer(ref);
    }
  }, [ref]);

  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <ClerkLoaded>
        <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
          <ActionSheetProvider>
            <ChannelProvider>
              <MenuProvider>
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

export default RootLayoutNav;