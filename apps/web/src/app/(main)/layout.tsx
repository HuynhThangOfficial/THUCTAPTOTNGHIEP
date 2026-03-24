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

// 👇 IMPORT ĐẦY ĐỦ CÁC ICON CHO HEADER MỚI CỦA BÁC
import { Menu, LayoutGrid, Search, Bell } from "lucide-react"; 

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  return (
    <AppProvider> 
      {/* Đổi thành flex-col trên mobile để Header đẩy nội dung xuống dưới */}
      <div className="flex flex-col md:flex-row h-screen bg-white overflow-hidden text-slate-800 relative">
        
        {/* =========================================
            HEADER CHUNG DÀNH RIÊNG CHO MOBILE (1 HÀNG DUY NHẤT)
            Thứ tự: Hamburger -> Tên Kênh -> Trống -> Kính lúp -> Chuông -> LayoutGrid
            ========================================= */}
        <header className="md:hidden flex items-center w-full h-14 bg-white px-2 border-b border-gray-200 z-[40] shrink-0">
          
          {/* 1. Nút Hamburger */}
          <button 
            onClick={() => setIsMobileSidebarOpen(true)}
            className="p-2 text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
          >
            <Menu className="w-6 h-6" />
          </button>

          {/* 2. Tên kênh */}
          <div className="ml-1 font-extrabold text-[17px] text-gray-900 truncate max-w-[120px]">
            # đại-sảnh
          </div>

          {/* 3. Khoảng trống dài đẩy các nút sang phải */}
          <div className="flex-1"></div>

          {/* 4. Nút Tìm kiếm */}
          <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
            <Search className="w-5 h-5" />
          </button>

          {/* 5. Nút Thông báo */}
          <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors ml-1">
            <Bell className="w-5 h-5" />
          </button>

          {/* 6. Nút LayoutGrid (Đã bỏ chấm đỏ) */}
          <button 
            onClick={() => setIsMobileDrawerOpen(true)}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors ml-1"
          >
            <LayoutGrid className="w-5 h-5" />
          </button>

        </header>

        {/* Lớp phủ tối màu khi mở Menu trên Mobile */}
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
            Được Header phía trên đẩy xuống ngoan ngoãn
            ========================================= */}
        <main className="flex-1 min-w-0 bg-[#f2f3f5] relative flex flex-col h-full w-full">
          {children}
        </main>

        {/* =========================================
            CỘT 4: THANH DRAWER BÊN PHẢI 
            ========================================= */}
        <div className={`
          fixed inset-y-0 right-0 z-[60] flex transform transition-transform duration-300 ease-in-out bg-white shadow-2xl
          md:relative md:translate-x-0 md:shadow-none md:z-0
          ${isMobileDrawerOpen ? "translate-x-0" : "translate-x-full"}
        `}>
          <NavigationDrawer />
        </div>
        
        {/* =========================================
            MODALS & BUTTONS
            ========================================= */}
        <AuthModal />
        <ThreadComposer />
        <EditProfileModal />
        <FloatingPostButton />

      </div>
    </AppProvider>
  );
}