"use client";

import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useUser } from '@clerk/nextjs';

export default function FloatingPostButton() {
  const { setShowComposeModal, setShowAuthModal, activeChannelName } = useApp() as any;
  const [showButton, setShowButton] = useState(false);
  const { user, isLoaded } = useUser();
  const isLoggedIn = isLoaded && user;

  useEffect(() => {
    const scrollableArea = document.getElementById('main-scroll-area');
    if (!scrollableArea) return;

    const handleScroll = () => {
      // Nếu cuộn qua 300px thì mới hiện
      if (scrollableArea.scrollTop > 300) {
        setShowButton(true);
      } else {
        setShowButton(false);
      }
    };

    // Gọi check ngay lần đầu tiên component load để tránh lỗi hiện sai lúc ở đầu trang
    handleScroll();

    scrollableArea.addEventListener('scroll', handleScroll);
    return () => scrollableArea.removeEventListener('scroll', handleScroll);
    
    // Thêm activeChannelName vào đây để mỗi khi đổi kênh, nó sẽ tính toán lại thanh cuộn từ đầu
  }, [activeChannelName]); 

  // 1. CHỐT CHẶN LOGIC: Đang ở đại-sảnh thì ẨN TUYỆT ĐỐI cái nút này
  if (activeChannelName === 'đại-sảnh') return null;

  // 2. Nếu chưa cuộn xuống đủ sâu thì không render
  if (!showButton) return null;

  return (
    <button
      // 3. SỬA ONCLICK Ở ĐÂY: Nếu chưa login thì bật Auth Modal
      onClick={() => isLoggedIn ? setShowComposeModal(true) : setShowAuthModal(true)}
      className="fixed bottom-8 right-8 z-[9000] w-[64px] h-[64px] bg-white text-black flex items-center justify-center rounded-[22px] shadow-[0_8px_24px_rgba(0,0,0,0.08)] border border-gray-200/80 hover:scale-95 active:scale-90 transition-all duration-200 animate-in fade-in zoom-in-95"
      title="Thêm bài viết mới"
    >
      <svg className="w-8 h-8 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 5v14M5 12h14" />
      </svg>
    </button>
  );
}