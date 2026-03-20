"use client";

import ServerSidebar from "@/components/ServerSidebar";
import ChannelSidebar from "@/components/ChannelSidebar";
// Đã thay thế MembersSidebar bằng NavigationDrawer mới
import NavigationDrawer from "@/components/NavigationDrawer"; 
import { AppProvider } from "@/context/AppContext";

// 1. IMPORT ĐẦY ĐỦ CÁC THÀNH PHẦN MODAL VÀ NÚT
import AuthModal from "@/components/AuthModal";
import ThreadComposer from "@/components/ThreadComposer"; 
import FloatingPostButton from "@/components/FloatingPostButton";
import EditProfileModal from "@/components/EditProfileModal";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // Toàn bộ giao diện chính phải nằm trong AppProvider để dùng được các state ẩn/hiện
    <AppProvider> 
      <div className="flex h-screen bg-white overflow-hidden text-slate-800">
        
        {/* Cột 1: Danh sách Server (Trái cùng) */}
        <ServerSidebar />

        {/* Cột 2: Danh sách Kênh (Kế tiếp) */}
        <ChannelSidebar />

        {/* Cột 3: Nội dung chính (Feed Bảng tin)
            LƯU Ý: Phải có id="main-scroll-area" và overflow-y-auto 
            để FloatingPostButton biết khi nào bạn cuộn xuống để hiện dấu +
        */}
        <main className="flex-1 min-w-0 bg-[#f2f3f5] relative flex flex-col h-full">
          {children}
        </main>

        {/* Cột 4: THANH DRAWER MỚI (Phải cùng) - Sẽ xổ panel ra khi bấm */}
        <NavigationDrawer />

        {/* =========================================
            CÁC LỚP PHỦ TOÀN CỤC (MODALS & BUTTONS)
            Dán ở đây để chúng luôn nằm trên cùng giao diện
            ========================================= */}
        
        {/* Modal Đăng nhập Hoyoverse */}
        <AuthModal />

        {/* Modal Đăng bài viết (Threads Style) */}
        <ThreadComposer />

        <EditProfileModal />
        
        {/* Nút "+" trôi nổi hiện ra khi lướt xuống sâu */}
        <FloatingPostButton />

      </div>
    </AppProvider>
  );
}