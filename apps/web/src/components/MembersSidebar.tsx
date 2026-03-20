"use client";

import { useState } from 'react';
// import { useQuery } from 'convex/react';
// import { api } from '../../../../convex/_generated/api';
import { useApp } from '../context/AppContext';

export default function MembersSidebar() {
  // 1. Chỉ lấy activeServerId từ Context (Vì mock data đã bị xóa)
  const { activeServerId } = useApp() as any; 
  const [showPanel, setShowPanel] = useState(true);

  // 2. CHUẨN BỊ API CONVEX (Hiện tại tạm đóng, chờ bạn viết API getMembers ở Backend)
  // const serverMembers = useQuery(api.servers.getMembers, activeServerId ? { serverId: activeServerId } : "skip");
  
  // Mảng tạm thời để giao diện không bị lỗi trong lúc chờ API thật
  const members: any[] = []; 

  if (!activeServerId) return null;

  const onlineMembers = members.filter((m: any) => m.status === 'online' || m.status === 'idle' || m.status === 'dnd');
  const offlineMembers = members.filter((m: any) => m.status === 'offline' || !m.status);

  const statusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'idle': return 'bg-amber-400';
      case 'dnd': return 'bg-red-500';
      default: return 'bg-slate-300';
    }
  };

  return (
    <aside className={`bg-[#fbfefb] border-l border-green-100 shrink-0 transition-all hidden md:block ${showPanel ? 'w-64' : 'w-12'}`}>
      <div className="h-12 border-b border-green-100 bg-white flex items-center justify-between px-3">
        {showPanel ? (
          <>
            <div>
              <div className="text-sm font-semibold text-slate-800">Thành viên</div>
              <div className="text-[11px] text-slate-500">{members.length} người tham gia</div>
            </div>
            <button
              onClick={() => setShowPanel(false)}
              className="w-8 h-8 rounded-lg hover:bg-green-50 text-green-700 transition-colors flex justify-center items-center"
              title="Thu gọn"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
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
          
          {members.length === 0 ? (
            <div className="text-center text-gray-400 text-sm mt-10 italic">
              Chưa có dữ liệu thành viên
            </div>
          ) : (
            <>
              {/* ONLINE MEMBERS */}
              {onlineMembers.length > 0 && (
                <div>
                  <div className="px-2 mb-2 text-[11px] uppercase tracking-[0.12em] font-bold text-green-700">
                    Online — {onlineMembers.length}
                  </div>
                  <div className="space-y-1">
                    {onlineMembers.map((member: any) => (
                      <div key={member.id} className="flex items-center gap-2 px-2 py-2 rounded-xl hover:bg-green-50 transition-colors cursor-pointer">
                        <div className="relative">
                          <div className="w-9 h-9 rounded-full bg-green-100 border border-green-200 flex items-center justify-center text-base overflow-hidden">
                            <img src={member.avatar || "https://ui-avatars.com/api/?name=U&background=random"} alt="avatar" />
                          </div>
                          <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${statusColor(member.status)}`} />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-slate-800 truncate">{member.displayName}</div>
                          <div className="text-xs text-slate-500 truncate">{member.bio || 'Đang hoạt động'}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* OFFLINE MEMBERS */}
              {offlineMembers.length > 0 && (
                <div>
                  <div className="px-2 mb-2 text-[11px] uppercase tracking-[0.12em] font-bold text-slate-400">
                    Offline — {offlineMembers.length}
                  </div>
                  <div className="space-y-1">
                    {offlineMembers.map((member: any) => (
                      <div key={member.id} className="flex items-center gap-2 px-2 py-2 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer opacity-80">
                        <div className="relative">
                          <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-base grayscale overflow-hidden">
                            <img src={member.avatar || "https://ui-avatars.com/api/?name=U&background=random"} alt="avatar" />
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
              )}
            </>
          )}
        </div>
      )}
    </aside>
  );
}