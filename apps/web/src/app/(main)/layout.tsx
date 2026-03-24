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

// 👇 IMPORT ICON MỚI CHO NÚT BÊN PHẢI (LayoutGrid thay cho MessageSquare)
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
      {/* 👇 ĐỔI flex THÀNH flex-col trên mobile để nó tự đẩy nội dung xuống dưới 👇 */}
      <div className="flex flex-col md:flex-row h-screen bg-white overflow-hidden text-slate-800 relative">
        
        {/* =========================================
            THANH TOP BAR ĐIỀU HƯỚNG DÀNH RIÊNG CHO MOBILE
            Sẽ không còn bị trôi nổi đè lên chữ nữa!
            ========================================= */}
        <div className="md:hidden flex items-center justify-between bg-white px-4 py-2 border-b border-gray-200 z-[40] shrink-0">
          {/* Nút mở Menu Trái (Server & Kênh) */}
          <button 
            onClick={() => setIsMobileSidebarOpen(true)}
            className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Menu className="w-6 h-6" />
          </button>
          
          {/* Tên App (Bác có thể đổi chữ KonKet thành tên đồ án của bác) */}
          <div className="font-extrabold text-lg text-blue-600 tracking-tight">KonKet</div>

          {/* Nút mở Menu Phải đa năng (Tin nhắn, Thông báo, Thành viên) */}
          <button 
            onClick={() => setIsMobileDrawerOpen(true)}
            className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors relative"
          >
            <LayoutGrid className="w-6 h-6" />
            {/* Chấm đỏ nhỏ tạo hiệu ứng kích thích người dùng bấm vào xem */}
            <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
          </button>
        </div>


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
        {/* Nội dung chính sẽ ngoan ngoãn nằm gọn bên dưới thanh Top Bar */}
        <main className="flex-1 min-w-0 bg-[#f2f3f5] relative flex flex-col h-full w-full">
          {children}
        </main>


        {/* =========================================
            CỘT 4: THANH DRAWER BÊN PHẢI (TIN NHẮN / THÔNG BÁO)
            ========================================= */}
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
        
        {/* Nút "+" trôi nổi góc dưới (Không bị ảnh hưởng) */}
        <FloatingPostButton />

      </div>
    </AppProvider>
  );
}