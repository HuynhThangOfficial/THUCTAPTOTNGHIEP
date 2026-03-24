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

// Import Menu và LayoutGrid (đã bỏ icon MessageSquare)
import { Menu, LayoutGrid } from "lucide-react"; 

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  return (
    <AppProvider> 
      <div className="flex h-screen bg-white overflow-hidden text-slate-800 relative">
        
        {/* =========================================
            NÚT TRÔI NỔI (ABSOLUTE) NẰM CÙNG HÀNG VỚI HEADER BÊN TRONG
            ========================================= */}
        
        {/* Nút Hamburger (Góc trái) */}
        <button 
          onClick={() => setIsMobileSidebarOpen(true)}
          className="md:hidden absolute top-[12px] left-3 z-[70] p-1.5 text-gray-700 bg-white/80 backdrop-blur-sm rounded-md hover:bg-gray-100"
        >
          <Menu className="w-6 h-6" />
        </button>

        {/* Nút Menu Phải (Góc phải) - Đã đổi thành LayoutGrid và bỏ chấm đỏ */}
        <button 
          onClick={() => setIsMobileDrawerOpen(true)}
          className="md:hidden absolute top-[12px] right-3 z-[70] p-1.5 text-gray-700 bg-white/80 backdrop-blur-sm rounded-md hover:bg-gray-100"
        >
          <LayoutGrid className="w-6 h-6" />
        </button>


        {/* Lớp phủ tối màu khi mở Menu */}
        {(isMobileSidebarOpen || isMobileDrawerOpen) && (
          <div 
            className="md:hidden fixed inset-0 bg-black/50 z-[50]"
            onClick={() => {
              setIsMobileSidebarOpen(false);
              setIsMobileDrawerOpen(false);
            }}
          />
        )}


        {/* CỘT 1 & 2: DANH SÁCH SERVER VÀ KÊNH */}
        <div className={`
          fixed inset-y-0 left-0 z-[60] flex transform transition-transform duration-300 ease-in-out bg-white shadow-2xl
          md:relative md:translate-x-0 md:shadow-none md:z-0
          ${isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full"}
        `}>
          <ServerSidebar />
          <ChannelSidebar />
        </div>

        {/* CỘT 3: NỘI DUNG CHÍNH */}
        <main className="flex-1 min-w-0 bg-[#f2f3f5] relative flex flex-col h-full w-full">
          {children}
        </main>

        {/* CỘT 4: THANH DRAWER BÊN PHẢI */}
        <div className={`
          fixed inset-y-0 right-0 z-[60] flex transform transition-transform duration-300 ease-in-out bg-white shadow-2xl
          md:relative md:translate-x-0 md:shadow-none md:z-0
          ${isMobileDrawerOpen ? "translate-x-0" : "translate-x-full"}
        `}>
          <NavigationDrawer />
        </div>
        
        <AuthModal />
        <ThreadComposer />
        <EditProfileModal />
        <FloatingPostButton />

      </div>
    </AppProvider>
  );
}