import { useQuery } from 'convex/react';
import { useUser } from '@clerk/clerk-expo';
import { api } from '@/convex/_generated/api';

/**
 * Hook để lấy thông tin hồ sơ người dùng từ Convex dựa trên Clerk ID.
 * Đã tối ưu hóa để dùng cho việc đồng bộ ngôn ngữ và trạng thái hoạt động.
 */
export function useUserProfile() {
  const { user, isLoaded: isClerkLoaded } = useUser();
  const clerkId = user?.id;

  // Sử dụng "skip" nếu Clerk chưa load xong hoặc chưa có clerkId
  // Việc này giúp tránh lỗi query với tham số undefined
  const userProfile = useQuery(
    api.users.getUserByClerkId, 
    clerkId ? { clerkId } : "skip"
  );

  return {
    // Trả về toàn bộ object user trong database
    userProfile,

    // Trích xuất riêng ngôn ngữ để dễ dàng dùng cho i18n.changeLanguage()
    language: userProfile?.language || null,

    // Trạng thái load: 
    // - Clerk chưa xong HOẶC Convex đang trả về undefined (đang fetch)
    isLoading: !isClerkLoaded || userProfile === undefined,

    // Lỗi: Khi đã fetch xong mà không tìm thấy user trong database
    error: isClerkLoaded && userProfile === null,
  };
}