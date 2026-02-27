// hooks/useOnlineStatus.ts
import { useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';

export function useOnlineStatus() {
  // Đảm bảo mutation luôn sẵn sàng
  const updateLastSeen = useMutation(api.users.updateLastSeen);

  useEffect(() => {
    // Hàm bao bọc an toàn để gọi mutation
    const triggerUpdate = async () => {
      try {
        await updateLastSeen();
      } catch (err) {
        // Log nhẹ nếu cần, tránh làm crash app
        console.log("Update status failed:", err);
      }
    };

    // 1. Cập nhật ngay khi hook mount
    triggerUpdate();

    // 2. Interval cập nhật mỗi phút
    const interval = setInterval(triggerUpdate, 60000);

    // 3. Theo dõi trạng thái App (Foreground/Background)
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        triggerUpdate();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    // Cleanup khi component unmount
    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [updateLastSeen]); // updateLastSeen từ useMutation luôn ổn định nên sẽ không gây lỗi length
}