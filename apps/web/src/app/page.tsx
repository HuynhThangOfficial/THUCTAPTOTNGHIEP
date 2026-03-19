"use client";
import { useState } from 'react';
import { AppProvider } from '@/context/AppContext';
import ServerSidebar from '@/components/ServerSidebar';
import ChannelSidebar from '@/components/ChannelSidebar';
import MainContent from '@/components/MainContent';
import MembersSidebar from '@/components/MembersSidebar';
import AuthModal from '@/components/AuthModal';
import { useApp } from '@/context/AppContext';

function AppLayout() {
  const { currentUser, activeServerId } = useApp();
  const [showAuth, setShowAuth] = useState(false);
  const [showMembers, setShowMembers] = useState(true);

  return (
    <div className="h-screen flex flex-col bg-[#f4fbf4] text-slate-800 overflow-hidden">
      <div className="h-10 bg-white border-b border-green-100 flex items-center px-4 gap-3 shrink-0 z-10 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-green-600 text-lg">🌿</span>
          <span className="text-green-800 font-bold text-sm tracking-wide">KonKet</span>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          {currentUser ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowMembers((v) => !v)}
                className={`h-8 px-3 rounded-xl flex items-center justify-center transition-colors text-sm border ${
                  showMembers
                    ? 'bg-green-50 text-green-700 border-green-200'
                    : 'text-slate-500 border-transparent hover:bg-green-50 hover:text-green-700'
                }`}
                title="Thành viên"
              >
                👥
              </button>
              <div className="flex items-center gap-2 bg-green-50 rounded-full px-3 py-1 border border-green-100">
                <div className="w-6 h-6 rounded-full bg-white border border-green-200 flex items-center justify-center text-xs">
                  {currentUser.avatar}
                </div>
                <span className="text-green-800 text-xs font-medium">{currentUser.displayName}</span>
                <div className="w-2 h-2 bg-green-500 rounded-full" />
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAuth(true)}
              className="px-4 py-1.5 bg-green-600 hover:bg-green-500 text-white text-xs font-semibold rounded-full transition-colors shadow-sm"
            >
              Đăng nhập
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <ServerSidebar />
        <ChannelSidebar />
        <MainContent showMembers={showMembers} onToggleMembers={() => setShowMembers((v) => !v)} />
        {activeServerId && showMembers && <MembersSidebar />}
      </div>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppLayout />
    </AppProvider>
  );
}
