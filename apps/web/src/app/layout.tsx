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
      domain="newyas.com"
      isSatellite={true}
      // Vì bạn dùng Modal đăng nhập (AuthModal) ngay trên trang, 
      // nên signInUrl cứ trỏ thẳng về trang chủ của web là an toàn nhất với TypeScript
      signInUrl="https://konket.newyas.com" 
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