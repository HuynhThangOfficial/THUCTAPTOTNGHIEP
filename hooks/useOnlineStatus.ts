import { useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';

// Thêm tham số isSignedIn vào đây
export function useOnlineStatus(isSignedIn?: boolean) {
  const updateLastSeen = useMutation(api.users.updateLastSeen);

  useEffect(() => {
    // Nếu chưa đăng nhập thì DỪNG LẠI, không làm gì cả
    if (!isSignedIn) return;

    const triggerUpdate = async () => {
      try {
        await updateLastSeen();
      } catch (err) {
        console.log("Update status failed:", err);
      }
    };

    triggerUpdate();
    const interval = setInterval(triggerUpdate, 60000);

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        triggerUpdate();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [updateLastSeen, isSignedIn]); // Thêm isSignedIn vào dependency array
}