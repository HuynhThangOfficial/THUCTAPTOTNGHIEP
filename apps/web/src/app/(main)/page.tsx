"use client";

// Đổi tên import từ MainContent sang Feed
import Feed from '@/components/Feed';

export default function HomePage() {
  // Toàn bộ logic Sidebar, Topbar, AuthModal, Context... đã được Next.js tự động bọc 
  // từ file layout.tsx ở ngoài. Trang page.tsx giờ chỉ tập trung vào nội dung chính!
  return (
    <div className="flex-1 flex flex-col h-full w-full">
      {/* Gọi component Feed thay vì MainContent */}
      <Feed />
    </div>
  );
}