"use client";

import { useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { useApp } from '../context/AppContext';
import { useTranslation } from 'react-i18next';

export default function MembersSidebar() {
  const { t } = useTranslation();
  const { activeServerId } = useApp() as any;

  // Tự động lấy danh sách member theo server đang chọn
  const serverMembersRaw = useQuery(api.university.getServerMembers, activeServerId ? { serverId: activeServerId } : "skip");
  const members = serverMembersRaw || [];

  if (!activeServerId) return <div className="p-4 text-center text-gray-400 text-sm">Vui lòng chọn một máy chủ</div>;

  // 👇 HÀM NÀY SẼ ÉP GIAO DIỆN HIỂN THỊ @hocvienhang BẰNG CÁCH CẮT EMAIL 👇
  const getHandle = (member: any) => {
    const handle = member.username || member.first_name || 'user';
    return handle.toLowerCase().replace(/\s+/g, '');
  };

  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-4 hidden-scrollbar h-full">
      {members.length === 0 ? (
        <div className="text-center text-gray-400 text-[13px] mt-10 italic">{t('follow_list.empty_list')}</div>
      ) : (
        <div>
          {/* GỘP CHUNG THÀNH MỘT DANH SÁCH THÀNH VIÊN DUY NHẤT */}
          <div className="px-2 mb-2 text-[11px] uppercase tracking-[0.12em] font-bold text-slate-400 mt-2">
            {t('common.member')} — {members.length}
          </div>
          <div className="space-y-1">
            {members.map((member: any) => (
              <div key={member._id} className="flex items-center gap-2 px-2 py-2 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer">
                <div className="relative">
                  <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-base overflow-hidden shrink-0">
                    <img loading="lazy"src={member.imageUrl || `https://ui-avatars.com/api/?name=${member.first_name || member.username || 'U'}&background=random`} alt="avatar" className="w-full h-full object-cover" />
                  </div>
                  {/* ĐÃ XÓA CHẤM TRẠNG THÁI Ở ĐÂY */}
                </div>
                
                <div className="min-w-0 flex-1 flex flex-col">
                  <div className="flex items-center gap-1">
                    <div className="text-sm font-medium text-slate-700 truncate leading-tight">
                      {member.first_name || member.username || t('settings.default_user')}
                    </div>
                    {(member.isAdmin || member.isCreator) && <span className="text-amber-500 text-[10px]">👑</span>}
                  </div>
                  {/* HIỂN THỊ HANDLE CHUẨN XÁC TẠI ĐÂY */}
                  <div className="text-xs text-slate-400 truncate leading-tight font-medium">@{getHandle(member)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}