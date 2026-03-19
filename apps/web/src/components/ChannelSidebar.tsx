"use client";

import { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { Channel } from '../types';

const iconForChannel = (channel: Channel) => {
  switch (channel.icon || channel.type) {
    case 'announcement':
      return '📣';
    case 'guide':
      return '📘';
    case 'people':
      return '👥';
    case 'media':
      return '🖼️';
    case 'voice':
      return '🔊';
    default:
      return '#';
  }
};

export default function ChannelSidebar() {
  const { servers, activeServerId, activeChannelId, setActiveChannelId, currentUser, setCurrentUser } = useApp();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const activeServer = servers.find((s) => s.id === activeServerId);

  const initialCollapsed = useMemo(() => ({
    GENERAL: false,
    INFORMATION: false,
    'News-n-Info': false,
    'Find-friends': false,
    'content creation': false,
    Suggestion: false,
  }), []);

  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>(initialCollapsed);

  if (!activeServer) {
    return (
      <aside className="w-72 bg-[#f7fbf7] border-r border-green-100 flex flex-col shrink-0">
        <div className="flex-1 flex items-center justify-center text-green-700 text-sm px-6 text-center">
          Chọn một server để xem danh sách category và channel.
        </div>
      </aside>
    );
  }

  const categories: Record<string, Channel[]> = {};
  for (const ch of activeServer.channels) {
    const cat = ch.category || 'GENERAL';
    if (!categories[cat]) categories[cat] = [];
    categories[cat].push(ch);
  }

  const toggleCategory = (category: string) => {
    setCollapsedCategories((prev) => ({ ...prev, [category]: !prev[category] }));
  };

  return (
    <aside className="w-72 bg-[#f7fbf7] border-r border-green-100 flex flex-col shrink-0">
      <div className="h-12 px-4 border-b border-green-100 bg-white flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="w-7 h-7 rounded-full text-sm text-white flex items-center justify-center shadow-sm"
            style={{ backgroundColor: activeServer.color }}
          >
            {activeServer.icon}
          </div>
          <span className="font-semibold text-sm text-slate-800 truncate">{activeServer.name}</span>
        </div>
        <button className="w-7 h-7 rounded-md hover:bg-green-50 text-green-700 transition-colors">
          ▾
        </button>
      </div>

      <div className="px-3 pt-3">
        <div className="rounded-2xl overflow-hidden border border-green-100 bg-white shadow-sm">
          <div className="h-24 bg-gradient-to-r from-green-400 via-emerald-300 to-lime-200 p-3 text-white relative">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.6),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.45),transparent_30%)]" />
            <div className="relative">
              <div className="font-bold text-lg drop-shadow-sm">{activeServer.bannerTitle || activeServer.name}</div>
              <div className="text-xs text-white/90 max-w-[200px] leading-relaxed mt-1">
                {activeServer.bannerSubtitle || activeServer.description}
              </div>
            </div>
          </div>
          <div className="p-3 bg-gradient-to-r from-lime-100 to-emerald-50 border-t border-green-100">
            <div className="rounded-xl bg-white/80 border border-green-100 px-3 py-2 flex items-center justify-between text-sm">
              <div>
                <div className="text-green-800 font-semibold">Nâng cấp</div>
                <div className="text-green-600 text-xs">{activeServer.members.length * 137} Năng cấp Mục Tiêu</div>
              </div>
              <span className="text-lg">✨</span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-2 text-[15px]">
        <button className="w-full flex items-center gap-2 rounded-lg px-2 py-2 text-slate-700 hover:bg-green-50 transition-colors">
          <span>📅</span>
          <span>1 Sự kiện</span>
        </button>
        <button className="w-full flex items-center gap-2 rounded-lg px-2 py-2 text-slate-700 hover:bg-green-50 transition-colors">
          <span>🧾</span>
          <span>Kênh &amp; Vai trò</span>
        </button>
      </div>

      <div className="mx-4 mt-3 h-px bg-green-100" />

      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-2">
        {Object.entries(categories).map(([category, channels]) => {
          const isCollapsed = !!collapsedCategories[category];
          return (
            <div key={category}>
              <button
                onClick={() => toggleCategory(category)}
                className="w-full flex items-center gap-1 px-2 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-green-700 hover:text-green-900"
              >
                <span className={`transition-transform ${isCollapsed ? '' : 'rotate-90'}`}>›</span>
                <span>{category}</span>
              </button>
              {!isCollapsed && (
                <div className="mt-1 space-y-0.5">
                  {channels.map((ch) => {
                    const isActive = activeChannelId === ch.id;
                    return (
                      <button
                        key={ch.id}
                        onClick={() => setActiveChannelId(ch.id)}
                        className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm transition-colors ${
                          isActive
                            ? 'bg-green-100 text-green-900 shadow-sm'
                            : 'text-slate-600 hover:bg-green-50 hover:text-slate-800'
                        }`}
                      >
                        <span className={`w-5 text-center text-sm ${isActive ? 'text-green-700' : 'text-slate-400'}`}>
                          {iconForChannel(ch)}
                        </span>
                        <span className="truncate text-left flex-1">{ch.name}</span>
                        {ch.isNew && <span className="text-[11px] font-semibold text-blue-500">New</span>}
                        {!!ch.badgeCount && (
                          <span className="min-w-5 h-5 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                            {ch.badgeCount}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {currentUser && (
        <div className="h-16 bg-white border-t border-green-100 px-3 flex items-center gap-2 relative shrink-0">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-green-100 border border-green-200 flex items-center justify-center text-lg shadow-sm">
              {currentUser.avatar}
            </div>
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-slate-800 truncate">{currentUser.displayName}</div>
            <div className="text-xs text-slate-500 truncate">@{currentUser.username}</div>
          </div>
          <button className="w-8 h-8 rounded-lg hover:bg-green-50 text-slate-500">🎤</button>
          <button className="w-8 h-8 rounded-lg hover:bg-green-50 text-slate-500">🎧</button>
          <button
            onClick={() => setShowUserMenu((v) => !v)}
            className="w-8 h-8 rounded-lg hover:bg-green-50 text-slate-500"
            title="Cài đặt"
          >
            ⚙️
          </button>

          {showUserMenu && (
            <div className="absolute bottom-18 left-3 right-3 bg-white border border-green-100 rounded-xl shadow-xl p-2 z-50">
              <div className="px-3 py-2 text-xs text-slate-500 border-b border-green-100 mb-1">
                Đang đăng nhập với <span className="font-semibold text-green-700">@{currentUser.username}</span>
              </div>
              <button
                onClick={() => {
                  setCurrentUser(null);
                  setShowUserMenu(false);
                }}
                className="w-full text-left px-3 py-2 text-sm text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              >
                🚪 Đăng xuất
              </button>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
