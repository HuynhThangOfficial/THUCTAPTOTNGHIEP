"use client";

import { useState } from 'react';
import { useApp } from '../context/AppContext';

export default function MembersSidebar() {
  const { servers, activeServerId, users } = useApp();
  const [showPanel, setShowPanel] = useState(true);

  const activeServer = servers.find((s) => s.id === activeServerId);
  if (!activeServer) return null;

  const members = users.filter((u) => activeServer.members.includes(u.id));
  const onlineMembers = members.filter((m) => m.status === 'online' || m.status === 'idle' || m.status === 'dnd');
  const offlineMembers = members.filter((m) => m.status === 'offline');

  const statusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'bg-green-500';
      case 'idle':
        return 'bg-amber-400';
      case 'dnd':
        return 'bg-red-500';
      default:
        return 'bg-slate-300';
    }
  };

  return (
    <aside className={`bg-[#fbfefb] border-l border-green-100 shrink-0 transition-all ${showPanel ? 'w-64' : 'w-12'}`}>
      <div className="h-12 border-b border-green-100 bg-white flex items-center justify-between px-3">
        {showPanel ? (
          <>
            <div>
              <div className="text-sm font-semibold text-slate-800">Thành viên</div>
              <div className="text-[11px] text-slate-500">{members.length} người tham gia</div>
            </div>
            <button
              onClick={() => setShowPanel(false)}
              className="w-8 h-8 rounded-lg hover:bg-green-50 text-green-700 transition-colors"
              title="Thu gọn"
            >
              ⟩
            </button>
          </>
        ) : (
          <button
            onClick={() => setShowPanel(true)}
            className="w-full h-8 rounded-lg hover:bg-green-50 text-green-700 transition-colors flex items-center justify-center"
            title="Mở danh sách thành viên"
          >
            👥
          </button>
        )}
      </div>

      {showPanel && (
        <div className="h-[calc(100vh-88px)] overflow-y-auto p-3 space-y-4">
          <div>
            <div className="px-2 mb-2 text-[11px] uppercase tracking-[0.12em] font-bold text-green-700">
              Online — {onlineMembers.length}
            </div>
            <div className="space-y-1">
              {onlineMembers.map((member) => (
                <div key={member.id} className="flex items-center gap-2 px-2 py-2 rounded-xl hover:bg-green-50 transition-colors cursor-pointer">
                  <div className="relative">
                    <div className="w-9 h-9 rounded-full bg-green-100 border border-green-200 flex items-center justify-center text-base">
                      {member.avatar}
                    </div>
                    <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${statusColor(member.status)}`} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-800 truncate">{member.displayName}</div>
                    <div className="text-xs text-slate-500 truncate">{member.bio || 'Đang hoạt động trong server'}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="px-2 mb-2 text-[11px] uppercase tracking-[0.12em] font-bold text-slate-400">
              Offline — {offlineMembers.length}
            </div>
            <div className="space-y-1">
              {offlineMembers.map((member) => (
                <div key={member.id} className="flex items-center gap-2 px-2 py-2 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer opacity-80">
                  <div className="relative">
                    <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-base grayscale">
                      {member.avatar}
                    </div>
                    <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${statusColor(member.status)}`} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-600 truncate">{member.displayName}</div>
                    <div className="text-xs text-slate-400 truncate">Ngoại tuyến</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
