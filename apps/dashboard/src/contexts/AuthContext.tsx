import { createContext, useContext } from 'react';
import { useUser, useClerk } from '@clerk/clerk-react';

const AuthContext = createContext<any>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  // Lấy dữ liệu user thực tế từ Clerk
  const { user } = useUser();
  const { signOut } = useClerk();

  const value = {
    user: user ? {
      name: user.fullName || user.username || 'Admin User',
      email: user.primaryEmailAddress?.emailAddress,
      role: 'Admin', // (Sau này có thể check role từ Convex)
    } : null,
    logout: () => signOut(), // Gọi hàm đăng xuất chuẩn của Clerk
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);