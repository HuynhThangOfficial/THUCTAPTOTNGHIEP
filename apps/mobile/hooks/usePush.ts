import { useEffect, useRef } from 'react';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useUserProfile } from '@/hooks/useUserProfile';
import { Id } from '@/convex/_generated/dataModel';
import { useTranslation } from 'react-i18next'; // 👈 IMPORT DỊCH

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export const usePush = () => {
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();
  const router = useRouter();
  const updateUser = useMutation(api.users.updateUser);
  const { userProfile } = useUserProfile();
  const { t } = useTranslation(); // 👈 KHỞI TẠO HOOK

  useEffect(() => {
    if (!Device.isDevice) return;
    registerForPushNotificationsAsync()
      .then((token) => {
        if (token && userProfile?._id) {
          updateUser({ pushToken: token, _id: userProfile?._id as Id<'users'> });
        }
      })
      .catch((error: any) => console.log('error', error));

    // Recieved notification
    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
      console.log('recieved notification', notification);
    });

    // Tapped on notification
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const threadId = response.notification.request.content.data.threadId;
      console.log(
        '🚀 ~ responseListener.current=Notifications.addNotificationResponseReceivedListener ~ threadId:',
        threadId
      );
      router.push(`/feed/${threadId}`);
    });

    return () => {
      notificationListener.current &&
        Notifications.removeNotificationSubscription(notificationListener.current);
      responseListener.current &&
        Notifications.removeNotificationSubscription(responseListener.current);
    };
  }, [userProfile?._id]);

  function handleRegistrationError(errorMessage: string) {
    alert(errorMessage);
    throw new Error(errorMessage);
  }

  async function registerForPushNotificationsAsync() {
    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        // 👇 DÙNG T() CHO THÔNG BÁO LỖI
        handleRegistrationError(t('push.permission_denied'));
        return;
      }
      const projectId =
        Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
      if (!projectId) {
        // 👇 DÙNG T() CHO THÔNG BÁO LỖI
        handleRegistrationError(t('push.project_id_not_found'));
      }
      try {
        const pushTokenString = (
          await Notifications.getExpoPushTokenAsync({
            projectId,
          })
        ).data;
        console.log(pushTokenString);
        return pushTokenString;
      } catch (e: unknown) {
        handleRegistrationError(`${e}`);
      }
    } else {
      // 👇 DÙNG T() CHO THÔNG BÁO LỖI
      handleRegistrationError(t('push.must_use_physical_device'));
    }
  }
};