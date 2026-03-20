"use client";

import { useState, useEffect } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { Id } from '../../../../convex/_generated/dataModel';
import CreateServerModal from './CreateServerModal';
import { useApp } from '../context/AppContext';

// Component hỗ trợ hiển thị Icon cho Server / University
const WorkspaceIcon = ({ icon, name }: { icon?: string; name: string }) => {
  if (!icon) return <span className="text-lg font-bold">{name.charAt(0)}</span>;
  
  // Xử lý icon cục bộ (hardcode) giống mobile
  if (icon === 'local:login') return <span className="text-2xl">✈️</span>; // Học viện Hàng không
  if (icon === 'local:community') return <span className="text-2xl">🌍</span>; // Cộng đồng chung
  
  // Render ảnh
  return <img src={icon} alt={name} className="w-full h-full object-cover" />;
};

export default function ServerSidebar() {
  // GIẢ ĐỊNH: Context của bạn đã được cập nhật thêm activeUniversityId
  const { 
    activeServerId, 
    setActiveServerId, 
    activeUniversityId, 
    setActiveUniversityId, 
    setActiveChannelId 
  } = useApp();

  const [showCreate, setShowCreate] = useState(false);
  const [pinnedServers, setPinnedServers] = useState<string[]>([]);

  // 1. FETCH DỮ LIỆU TỪ CONVEX
  const universities = useQuery(api.university.getUniversities);
  const myServers = useQuery(api.university.getMyServers);

  // 2. LOGIC TỰ ĐỘNG CHỌN WORKSPACE MẶC ĐỊNH
  useEffect(() => {
    if (universities && universities.length > 0 && !activeUniversityId && !activeServerId) {
       setActiveUniversityId(universities[0]._id);
    }
  }, [universities, activeUniversityId, activeServerId, setActiveUniversityId]);

  // 3. LOGIC CHUYỂN ĐỔI WORKSPACE
  const switchToUniversity = (id: string) => {
    if (id === activeUniversityId) return;
    setActiveServerId('');
    setActiveUniversityId(id);
    setActiveChannelId('');
  };

  const switchToServer = (id: string) => {
    if (id === activeServerId) return;
    setActiveUniversityId('');
    setActiveServerId(id);
    setActiveChannelId('');
  };

  // 4. LOGIC GHIM SERVER (Click chuột phải)
  const handleContextMenu = (e: React.MouseEvent, serverId: string) => {
    e.preventDefault(); // Ngăn chặn menu chuột phải mặc định của trình duyệt
    setPinnedServers(prev => 
      prev.includes(serverId) ? prev.filter(id => id !== serverId) : [...prev, serverId]
    );
  };

  // 5. SẮP XẾP SERVER (Ghim lên đầu)
  const sortedServers = myServers ? [...myServers].sort((a, b) => {
    const aPinned = pinnedServers.includes(a._id);
    const bPinned = pinnedServers.includes(b._id);
    if (aPinned && !bPinned) return -1;
    if (!aPinned && bPinned) return 1;
    return 0;
  }) : [];

  // Skeleton Loading khi chưa có dữ liệu
  if (universities === undefined || myServers === undefined) {
    return (
      <aside className="w-[72px] bg-[#f1f8f2] border-r border-green-100 flex flex-col items-center py-3 gap-2 shrink-0 animate-pulse">
         <div className="w-12 h-12 rounded-full bg-green-200/50" />
         <div className="w-8 h-px bg-green-200 my-1" />
         <div className="w-12 h-12 rounded-full bg-green-200/50" />
         <div className="w-12 h-12 rounded-full bg-green-200/50" />
      </aside>
    );
  }

  return (
    <>
      <aside className="w-[72px] bg-[#f1f8f2] border-r border-green-100 flex flex-col items-center py-3 gap-2 overflow-y-auto shrink-0 scrollbar-hide">
        
        {/* KHU VỰC 1: UNIVERSITIES (TRƯỜNG HỌC / ĐẠI SẢNH) */}
        {universities.map((uni) => {
          const isActive = activeUniversityId === uni._id;
          return (
            <div key={uni._id} className="relative group flex justify-center w-full">
              <div
                className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 rounded-r-full transition-all duration-300 ${
                  isActive ? 'h-8 bg-green-600' : 'h-0 group-hover:h-5 bg-green-400'
                }`}
              />
              <button
                onClick={() => switchToUniversity(uni._id)}
                className={`relative w-12 h-12 flex items-center justify-center overflow-hidden shadow-sm transition-all duration-300 ${
                  isActive
                    ? 'rounded-[16px] bg-white text-green-700 scale-105 border-2 border-green-500'
                    : 'rounded-[24px] bg-white text-green-700 hover:text-white hover:rounded-[16px] hover:scale-105 border border-green-100 hover:bg-green-500'
                }`}
                title={uni.name}
              >
                <WorkspaceIcon icon={uni.icon} name={uni.name} />
              </button>
              
              {/* Tooltip */}
              <div className="absolute left-16 top-1/2 -translate-y-1/2 bg-white border border-green-100 text-slate-700 text-xs px-3 py-1.5 rounded-lg pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 shadow-lg font-semibold">
                {uni.name}
              </div>
            </div>
          );
        })}

        <div className="w-8 h-[2px] bg-green-200/60 my-2 rounded-full" />

        {/* KHU VỰC 2: MÁY CHỦ CÁ NHÂN (SERVERS) */}
        {sortedServers.map((server) => {
          const isActive = activeServerId === server._id;
          const isPinned = pinnedServers.includes(server._id);

          return (
            <div key={server._id} className="relative group flex justify-center w-full">
              <div
                className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 rounded-r-full transition-all duration-300 ${
                  isActive ? 'h-8 bg-green-600' : 'h-0 group-hover:h-5 bg-green-400'
                }`}
              />
              <button
                onClick={() => switchToServer(server._id)}
                onContextMenu={(e) => handleContextMenu(e, server._id)}
                className={`relative w-12 h-12 flex items-center justify-center overflow-hidden shadow-sm transition-all duration-300 ${
                  isActive
                    ? 'rounded-[16px] scale-105 border-2 border-green-500'
                    : 'rounded-[24px] bg-white hover:rounded-[16px] hover:scale-105 border border-green-100'
                }`}
              >
                <WorkspaceIcon icon={server.icon} name={server.name} />
                
                {/* Icon Ghim */}
                {isPinned && (
                  <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-[2px] shadow-sm">
                    <svg className="w-3 h-3 text-gray-700 rotate-45" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
                    </svg>
                  </div>
                )}
              </button>

              {/* Tooltip */}
              <div className="absolute left-16 top-1/2 -translate-y-1/2 bg-white border border-green-100 text-slate-700 text-xs px-3 py-1.5 rounded-lg pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 shadow-lg font-semibold">
                {server.name}
                <div className="text-[10px] text-gray-400 font-normal mt-0.5">Click chuột phải để ghim</div>
              </div>
            </div>
          );
        })}

        <div className="w-8 h-[2px] bg-green-200/60 my-2 rounded-full" />

        {/* NÚT TẠO SERVER MỚI */}
        <button
          onClick={() => setShowCreate(true)}
          className="w-12 h-12 rounded-[24px] bg-white border border-dashed border-green-400 hover:border-green-600 hover:bg-green-50 text-green-600 text-2xl flex items-center justify-center shadow-sm transition-all hover:rounded-[16px]"
          title="Thêm server"
        >
          +
        </button>
      </aside>

      {showCreate && <CreateServerModal onClose={() => setShowCreate(false)} />}
    </>
  );
}