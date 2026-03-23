import { useUser, useClerk } from '@clerk/clerk-react';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();

  useEffect(() => {
    // Nếu đã load xong thông tin user và user đã đăng nhập
    if (isLoaded && user) {
      // Kiểm tra trong metadata của Clerk xem có role: "admin" không
      if (user.publicMetadata?.role !== 'admin') {
        alert("Tài khoản của bạn không có quyền truy cập trang Quản trị!");
        signOut(); // Đá người dùng ra màn hình đăng nhập
      }
    }
  }, [isLoaded, user, signOut]);

  // Đang kiểm tra thì hiện loading
  if (!isLoaded) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  // Nếu không có user hoặc không phải admin thì không render giao diện Admin ra (tránh lộ UI)
  if (!user || user.publicMetadata?.role !== 'admin') {
    return null;
  }

  // Nếu đúng là Admin thì cho phép render nội dung bên trong
  return <>{children}</>;
}