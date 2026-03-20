import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

import { AppProvider } from "@/context/AppContext";
import { ConvexClientProvider } from "./ConvexClientProvider";
import AuthModal from "@/components/AuthModal";
import { ClerkProvider } from '@clerk/nextjs';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "KonKet",
  description: "Mạng xã hội đa kênh",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider 
  publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
  // 🚨 BẮT BUỘC: domain phải là "newyas.com" (không có clerk hay konket)
  domain="newyas.com" 
  // 🚨 Vì ta dùng /dashboard (rewrite), cả 2 đều là nhà chính
  isSatellite={false} 
  signInUrl="/sign-in"
>
      <html lang="vi">
        <body className={inter.className}>
          <ConvexClientProvider>
            <AppProvider>
              {/* Toàn bộ các trang sẽ được render ở đây */}
              {children}
              
              {/* Modal đăng nhập ẩn chực chờ nhảy ra */}
              <AuthModal />
            </AppProvider>
          </ConvexClientProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}