"use client";

import { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { useApp } from '../context/AppContext';
import { useTranslation } from 'react-i18next';

export default function MembersSidebar() {
  const { t } = useTranslation();
  const { activeServerId } = useApp() as any;
  const [showPanel, setShowPanel] = useState(true);

  const serverMembersRaw = useQuery(api.university.getServerMembers, activeServerId ? { serverId: activeServerId } : "skip");
  const members = serverMembersRaw || [];

  if (!activeServerId) return null;

  // 👇 HÀM KIỂM TRA TRẠNG THÁI HOẠT ĐỘNG THỰC TẾ 👇
  const isUserOnline = (member: any) => {
    if (member.isOnline) return true;
    if (member.lastSeen) {
      const fiveMinsAgo = Date.now() - 5 * 60 * 1000;
      return member.lastSeen > fiveMinsAgo; // Online nếu hoạt động trong 5 phút qua
    }
    return false;
  };

  // Lọc Online: Đang online VÀ (ShowActiveStatus === true hoặc chưa cài đặt)
  const onlineMembers = members.filter((m: any) => isUserOnline(m) && m.showActiveStatus !== false);

  // Lọc Offline: Không online HOẶC đang cố tình tắt ShowActiveStatus (Ẩn mình)
  const offlineMembers = members.filter((m: any) => !isUserOnline(m) || m.showActiveStatus === false);

  const statusColor = (member: any) => {
    const online = isUserOnline(member) && member.showActiveStatus !== false;
    return online ? 'bg-green-500' : 'bg-slate-300';
  };

  return (
    <aside className={`bg-[#fbfefb] border-l border-green-100 shrink-0 transition-all hidden md:block ${showPanel ? 'w-64' : 'w-12'}`}>
      <div className="h-12 border-b border-green-100 bg-white flex items-center justify-between px-3">
        {showPanel ? (
          <>
            <div>
              <div className="text-sm font-semibold text-slate-800">{t('members.title')}</div>
              <div className="text-[11px] text-slate-500">{t('members.count', { count: members.length })}</div>
            </div>
            <button onClick={() => setShowPanel(false)} className="w-8 h-8 rounded-lg hover:bg-green-50 text-green-700 flex justify-center items-center">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
          </>
        ) : (
          <button onClick={() => setShowPanel(true)} className="w-full h-8 rounded-lg hover:bg-green-50 text-green-700 flex items-center justify-center">
            <svg className="w-5 h-5 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
        )}
      </div>

      {showPanel && (
        <div className="h-[calc(100vh-88px)] overflow-y-auto p-3 space-y-4 hidden-scrollbar">
          {members.length === 0 ? (
            <div className="text-center text-gray-400 text-[13px] mt-10 italic">{t('follow_list.empty_list')}</div>
          ) : (
            <>
              {/* ONLINE MEMBERS */}
              {onlineMembers.length > 0 && (
                <div>
                  <div className="px-2 mb-2 text-[11px] uppercase tracking-[0.12em] font-bold text-green-700">
                    {t('chat.active_now')} — {onlineMembers.length}
                  </div>
                  <div className="space-y-1">
                    {onlineMembers.map((member: any) => (
                      <div key={member._id} className="flex items-center gap-2 px-2 py-2 rounded-xl hover:bg-green-50 transition-colors cursor-pointer">
                        <div className="relative">
                          <div className="w-9 h-9 rounded-full bg-green-100 border border-green-200 flex items-center justify-center text-base overflow-hidden shrink-0">
                            <img src={member.imageUrl || `https://ui-avatars.com/api/?name=${member.first_name || member.username || 'U'}&background=random`} alt="avatar" className="w-full h-full object-cover" />
                          </div>
                          <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${statusColor(member)}`} />
                        </div>
                        <div className="min-w-0 flex-1 flex flex-col">
                          <div className="flex items-center gap-1">
                            <div className="text-sm font-medium text-slate-800 truncate leading-tight">
                              {member.first_name || member.username || t('settings.default_user')}
                            </div>
                            {(member.isAdmin || member.isCreator) && <span className="text-amber-500 text-[10px]" title={t('members.admin')}>👑</span>}
                          </div>
                          <div className="text-xs text-slate-500 truncate leading-tight">{member.bio || t('chat.active_now')}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* OFFLINE MEMBERS */}
              {offlineMembers.length > 0 && (
                <div>
                  <div className="px-2 mb-2 text-[11px] uppercase tracking-[0.12em] font-bold text-slate-400 mt-4">
                    {t('common.member')} — {offlineMembers.length}
                  </div>
                  <div className="space-y-1">
                    {offlineMembers.map((member: any) => (
                      <div key={member._id} className="flex items-center gap-2 px-2 py-2 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer opacity-70">
                        <div className="relative">
                          <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-base grayscale overflow-hidden shrink-0">
                            <img src={member.imageUrl || `https://ui-avatars.com/api/?name=${member.first_name || member.username || 'U'}&background=random`} alt="avatar" className="w-full h-full object-cover" />
                          </div>
                          <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${statusColor(member)}`} />
                        </div>
                        <div className="min-w-0 flex-1 flex flex-col">
                          <div className="flex items-center gap-1">
                            <div className="text-sm font-medium text-slate-600 truncate leading-tight">
                              {member.first_name || member.username || t('settings.default_user')}
                            </div>
                            {(member.isAdmin || member.isCreator) && <span className="text-slate-400 text-[10px]" title={t('members.admin')}>👑</span>}
                          </div>
                          <div className="text-xs text-slate-400 truncate leading-tight">@{member.username}</div>
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