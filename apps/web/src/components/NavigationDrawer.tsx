"use client";

import { useState, useEffect } from 'react';
import { X, MessageSquare, Bell, Users } from 'lucide-react';
import MembersSidebar from './MembersSidebar'; 
import NotificationList from './NotificationList'; 
import DirectMessagesList from './DirectMessagesList';

type ActivePanel = 'messages' | 'notifications' | 'members' | null;

export default function NavigationDrawer() {
  const [activePanel, setActivePanel] = useState<ActivePanel>(null);

  // 👇 THÊM ĐOẠN NÀY ĐỂ BẮT SỰ KIỆN MỞ DRAWER TỪ PROFILE MODAL 👇
  useEffect(() => {
    const handleOpenDrawer = () => {
      setActivePanel('messages'); // Tự động kéo panel tin nhắn ra
    };
    
    // Lắng nghe pháo hiệu có tên 'openChatInDrawer'
    window.addEventListener('openChatInDrawer', handleOpenDrawer);
    return () => window.removeEventListener('openChatInDrawer', handleOpenDrawer);
  }, []);

  const togglePanel = (panel: ActivePanel) => {
    if (activePanel === panel) setActivePanel(null);
    else setActivePanel(panel);
  };

  const navButtons = [
    { id: 'messages', icon: MessageSquare, label: 'Nhắn tin' },
    { id: 'notifications', icon: Bell, label: 'Thông báo' },
    { id: 'members', icon: Users, label: 'Thành viên' },
  ];

  const renderPanelContent = () => {
    switch (activePanel) {
      case 'messages':
        return <DirectMessagesList />; // ĐÃ THAY BẰNG COMPONENT XỊN
      case 'notifications':
        return <NotificationList />;
      case 'members':
        return <MembersSidebar />;
      default:
        return null;
    }
  };

  const getPanelTitle = () => {
    switch (activePanel) {
      case 'messages': return 'Tin nhắn cá nhân';
      case 'notifications': return 'Thông báo';
      case 'members': return 'Thành viên';
      default: return '';
    }
  };

  return (
    <div className="relative h-full flex flex-row shrink-0 z-[100]">
      {/* 1. THANH NÚT DỌC */}
      <div className="w-[60px] h-full bg-[#fbfefb] border-l border-green-100 flex flex-col items-center py-5 space-y-3 shrink-0 relative z-20">
        {navButtons.map((btn) => {
          const Icon = btn.icon;
          const isActive = activePanel === btn.id;
          return (
            <button 
              key={btn.id}
              onClick={() => togglePanel(btn.id as ActivePanel)}
              title={btn.label}
              className={`p-3 rounded-2xl transition-all duration-200 ${isActive ? 'bg-green-100 text-green-700' : 'text-gray-400 hover:bg-green-50 hover:text-green-600'}`}
            >
              <Icon className="w-6 h-6" />
            </button>
          );
        })}
      </div>

      {/* 2. PANEL XỔ RA */}
      <div className={`absolute top-0 right-[60px] h-full bg-white border-l border-green-100 shadow-xl flex flex-col transition-all duration-300 ease-out origin-right overflow-hidden
        ${activePanel ? 'w-[300px] visible opacity-100' : 'w-0 invisible opacity-0'}`}
      >
        <div className="flex items-center justify-between p-4 border-b border-green-100 shrink-0 bg-[#fbfefb]">
          <h2 className="text-[15px] font-bold text-slate-800 truncate">{getPanelTitle()}</h2>
          <button onClick={() => setActivePanel(null)} className="p-1.5 text-gray-400 hover:text-gray-800 rounded-full hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-hidden relative bg-white">
          {renderPanelContent()}
        </div>
      </div>
    </div>
  );
}