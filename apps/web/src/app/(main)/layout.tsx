"use client";

import { useState } from "react";
import ServerSidebar from "@/components/ServerSidebar";
import ChannelSidebar from "@/components/ChannelSidebar";
import NavigationDrawer from "@/components/NavigationDrawer"; 
import { AppProvider } from "@/context/AppContext";

import AuthModal from "@/components/AuthModal";
import ThreadComposer from "@/components/ThreadComposer"; 
import FloatingPostButton from "@/components/FloatingPostButton";
import EditProfileModal from "@/components/EditProfileModal";

// Import thêm icon cho nút bấm trên Mobile
import { Menu, MessageSquare } from "lucide-react"; 

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // State quản lý việc mở/đóng Sidebar và Drawer trên điện thoại
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  return (
    <AppProvider> 
      <div className="flex h-screen bg-white overflow-hidden text-slate-800 relative">
        
        {/* =========================================
            NÚT ĐIỀU HƯỚNG DÀNH RIÊNG CHO MOBILE
            ========================================= */}
        
        {/* Nút mở Menu Trái (Server & Kênh) */}
        <button 
          onClick={() => setIsMobileSidebarOpen(true)}
          className="md:hidden absolute top-4 left-4 z-[40] p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-md border border-gray-200"
        >
          <Menu className="w-5 h-5 text-gray-700" />
        </button>

        {/* Nút mở Menu Phải (Tin nhắn & Thông báo) */}
        <button 
          onClick={() => setIsMobileDrawerOpen(true)}
          className="md:hidden absolute top-4 right-4 z-[40] p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-md border border-gray-200 text-blue-500"
        >
          <MessageSquare className="w-5 h-5" />
        </button>

        {/* Lớp phủ tối màu khi mở Menu trên Mobile (Bấm vào để đóng) */}
        {(isMobileSidebarOpen || isMobileDrawerOpen) && (
          <div 
            className="md:hidden fixed inset-0 bg-black/50 z-[50]"
            onClick={() => {
              setIsMobileSidebarOpen(false);
              setIsMobileDrawerOpen(false);
            }}
          />
        )}


        {/* =========================================
            CỘT 1 & 2: DANH SÁCH SERVER VÀ KÊNH
            ========================================= */}
        {/* PC: Luôn hiện thẳng hàng | Mobile: Trượt từ trái qua */}
        <div className={`
          fixed inset-y-0 left-0 z-[60] flex transform transition-transform duration-300 ease-in-out bg-white shadow-2xl
          md:relative md:translate-x-0 md:shadow-none md:z-0
          ${isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full"}
        `}>
          <ServerSidebar />
          <ChannelSidebar />
        </div>


        {/* =========================================
            CỘT 3: NỘI DUNG CHÍNH (BẢNG TIN / FEED)
            ========================================= */}
        {/* Chiếm toàn bộ phần còn lại, trên Mobile là 100% width */}
        <main className="flex-1 min-w-0 bg-[#f2f3f5] relative flex flex-col h-full w-full">
          {children}
        </main>


        {/* =========================================
            CỘT 4: THANH DRAWER (TIN NHẮN / THÔNG BÁO)
            ========================================= */}
        {/* PC: Luôn hiện góc phải | Mobile: Trượt từ phải qua */}
        <div className={`
          fixed inset-y-0 right-0 z-[60] flex transform transition-transform duration-300 ease-in-out bg-white shadow-2xl
          md:relative md:translate-x-0 md:shadow-none md:z-0
          ${isMobileDrawerOpen ? "translate-x-0" : "translate-x-full"}
        `}>
          <NavigationDrawer />
        </div>

        
        {/* =========================================
            CÁC LỚP PHỦ TOÀN CỤC (MODALS & BUTTONS)
            ========================================= */}
        <AuthModal />
        <ThreadComposer />
        <EditProfileModal />
        
        {/* Nút "+" trôi nổi hiện ra khi lướt xuống sâu */}
        <FloatingPostButton />

      </div>
    </AppProvider>
  );
}