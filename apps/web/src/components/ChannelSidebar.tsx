"use client";

import { useState, useEffect } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { Id } from '../../../../convex/_generated/dataModel';
import { useApp } from '../context/AppContext';
import { useUser } from '@clerk/nextjs';
import SettingsModal from './SettingsModal';
import UserProfileModal from './UserProfileModal'; // MỚI: Import Modal Hồ Sơ

export default function ChannelSidebar() {
  const { activeServerId, activeUniversityId, activeChannelId, setActiveChannelId, setActiveChannelName, setShowAuthModal } = useApp() as any;

  const { user, isLoaded } = useUser();
  const isLoggedIn = isLoaded && user;

  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  
  // STATE CHO CÁC MODAL
  const [showSettings, setShowSettings] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  const universities = useQuery(api.university.getUniversities);
  const myServers = useQuery(api.university.getMyServers);
  const currentUser = useQuery(api.users.current);

  const channelsData = useQuery(api.university.getChannels, {
    universityId: activeUniversityId ? (activeUniversityId as Id<"universities">) : undefined,
    serverId: activeServerId ? (activeServerId as Id<"servers">) : undefined,
  });

  let currentWorkspaceName = "Đang tải...";
  if (activeUniversityId && universities) {
    currentWorkspaceName = universities.find(u => u._id === activeUniversityId)?.name || "Trường học";
  } else if (activeServerId && myServers) {
    currentWorkspaceName = myServers.find(s => s._id === activeServerId)?.name || "Máy chủ";
  }

  const groups = channelsData?.groups || [];
  const channels = channelsData?.channels || [];
  const orphanChannels = channels.filter(c => !c.parentId);

  useEffect(() => {
    if (channels.length > 0 && !activeChannelId) {
      const defaultChannel = channels.find(c => c.name === 'đại-sảnh') || channels[0];
      setActiveChannelId(defaultChannel._id);
      setActiveChannelName(defaultChannel.name);
    }
  }, [channels, activeChannelId, setActiveChannelId, setActiveChannelName]);

  const toggleGroup = (groupId: string) => {
    setCollapsedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const renderChannels = (channelList: any[]) => {
    return channelList.map(channel => {
      const isActive = activeChannelId === channel._id;
      return (
        <button key={channel._id} onClick={() => { setActiveChannelId(channel._id); setActiveChannelName(channel.name); }} className={`w-full flex items-center px-2 py-1.5 mb-[2px] rounded-md text-left transition-colors ${isActive ? 'bg-green-100 text-green-800 font-semibold' : 'text-gray-600 hover:bg-green-50 hover:text-green-700'}`}>
          <span className="text-xl mr-2 text-gray-400">#</span>
          <span className="truncate flex-1 text-[15px]">{channel.name}</span>
          {channel.isAnonymous && <span className="ml-1 text-xs" title="Kênh ẩn danh">🎭</span>}
        </button>
      );
    });
  };

  if (channelsData === undefined) {
    return (
      <div className="w-60 bg-[#f9fcfb] flex flex-col h-screen border-r border-green-100 shrink-0 animate-pulse">
        <div className="h-14 border-b border-green-100 bg-green-50/50" />
        <div className="p-4 space-y-3"><div className="h-4 bg-green-100 rounded w-2/3" /><div className="h-4 bg-green-100 rounded w-1/2" /><div className="h-4 bg-green-100 rounded w-3/4" /></div>
      </div>
    );
  }

  return (
    <div className="w-60 bg-[#f9fcfb] flex flex-col h-screen border-r border-green-100 shrink-0 relative">
      <div className="h-14 border-b border-green-100 flex items-center px-4 font-bold text-gray-800 text-[16px] shadow-sm bg-white/50 shrink-0">
        <span className="truncate">{currentWorkspaceName}</span>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-4">
        {orphanChannels.length > 0 && <div className="space-y-[2px]">{renderChannels(orphanChannels)}</div>}
        {groups.map((group) => {
          const isCollapsed = collapsedGroups[group._id];
          const childChannels = channels.filter(c => c.parentId === group._id);
          if (childChannels.length === 0) return null;
          return (
            <div key={group._id} className="mt-4">
              <button onClick={() => toggleGroup(group._id)} className="flex items-center w-full px-1 mb-1 text-xs font-bold text-gray-400 uppercase tracking-wide hover:text-gray-600 transition-colors">
                <svg className={`w-3 h-3 mr-1 transition-transform duration-200 ${isCollapsed ? '-rotate-90' : 'rotate-0'}`} fill="currentColor" viewBox="0 0 24 24"><path d="M16.59 8.59 12 13.17 7.41 8.59 6 10l6 6 6-6z" /></svg>{group.name}
              </button>
              {!isCollapsed && <div className="space-y-[2px]">{renderChannels(childChannels)}</div>}
            </div>
          );
        })}
      </div>

      <div className="h-16 bg-[#f1f8f2] border-t border-green-100 flex items-center px-3 shrink-0 relative">
        {isLoggedIn ? (
          <div className="flex items-center gap-2 flex-1">
            
            {/* ẤN VÀO KHU VỰC AVATAR/TÊN -> MỞ HỒ SƠ */}
            <div className="flex items-center gap-2 hover:bg-green-100/60 p-1.5 rounded-lg flex-1 transition-colors cursor-pointer" onClick={() => setShowProfile(true)}>
              <div className="relative shrink-0">
                {/* ƯU TIÊN USER CỦA CLERK TRƯỚC ĐỂ LUÔN UPDATE TỨC THÌ */}
                <img src={user?.imageUrl || currentUser?.imageUrl || "https://ui-avatars.com/api/?name=User"} alt="Avatar" className="w-9 h-9 rounded-full object-cover border border-green-200" />
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-[#f1f8f2]" />
              </div>
              <div className="flex flex-col flex-1 min-w-0">
                <span className="font-bold text-sm text-gray-800 truncate">{user?.fullName || currentUser?.first_name || currentUser?.username || "Đang tải..."}</span>
                <span className="text-[11px] text-gray-500 truncate">@{user?.username || currentUser?.username || "..."}</span>
              </div>
            </div>

            {/* ẤN VÀO RĂNG CƯA -> MỞ CÀI ĐẶT */}
            <button onClick={() => setShowSettings(true)} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-green-200/50 rounded-md transition-colors" title="Cài đặt người dùng">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            </button>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center w-full px-1">
             <button onClick={() => setShowAuthModal(true)} className="w-full bg-[#00BA7C] hover:bg-[#009665] text-white font-bold py-2.5 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 active:scale-95 group">
               <svg className="w-5 h-5 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
               <span className="text-[15px]">Đăng nhập ngay</span>
             </button>
          </div>
        )}
      </div>

      {showSettings && isLoggedIn && <SettingsModal onClose={() => setShowSettings(false)} />}
      {showProfile && isLoggedIn && <UserProfileModal onClose={() => setShowProfile(false)} targetUserId={currentUser?._id} />}
    </div>
  );
}