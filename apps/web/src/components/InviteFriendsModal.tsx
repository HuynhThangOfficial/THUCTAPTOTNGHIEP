"use client";

import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { Id } from '../../../../convex/_generated/dataModel';
import { useTranslation } from 'react-i18next';

interface Props {
  serverId: string;
  onClose: () => void;
}

export default function InviteFriendsModal({ serverId, onClose }: Props) {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [invitedUsers, setInvitedUsers] = useState<string[]>([]);

  // 1. SỬ DỤNG ĐÚNG HÀM getUsers TỪ BACKEND
  // Truyền luôn searchTerm xuống Database để Convex tự tìm kiếm cho nhẹ máy
  const users = useQuery(api.users.getUsers, searchTerm ? { search: searchTerm } : {}) || [];

  // 2. KẾT NỐI API THÊM THÀNH VIÊN VÀO SERVER
  const addFriendToServer = useMutation(api.university.addFriendToServer);

  const handleInvite = async (userId: string) => {
    // Đổi giao diện nút bấm ngay lập tức cho mượt
    setInvitedUsers(prev => [...prev, userId]);

    try {
      // Gọi API thêm thành viên
      await addFriendToServer({
        serverId: serverId as Id<"servers">,
        friendId: userId as Id<"users">
      });
    } catch (error: any) {
      alert(t('common.error') + ": " + error.message);
      // Nếu lỗi thì nhả nút bấm về trạng thái cũ
      setInvitedUsers(prev => prev.filter(id => id !== userId));
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <div
        className="bg-white w-full max-w-[400px] h-[80vh] max-h-[600px] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 shrink-0">
          <h2 className="text-[19px] font-bold text-black">{t('server.invite_friends')}</h2>
          <button onClick={onClose} className="text-[#007AFF] font-semibold text-[17px] hover:opacity-80 transition-opacity">
            {t('common.done')}
          </button>
        </div>

        {/* Search Bar */}
        <div className="px-4 pb-3 shrink-0">
          <div className="bg-[#f2f2f7] rounded-xl flex items-center px-3 py-2">
            <svg className="w-5 h-5 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input
              type="text"
              placeholder={t('members.search_placeholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent border-none outline-none flex-1 text-[15px] text-black placeholder-gray-500"
            />
          </div>
        </div>

        {/* Danh sách User */}
        <div className="flex-1 overflow-y-auto hidden-scrollbar px-2 pb-4">
          {users.length === 0 ? (
            <div className="text-center text-gray-400 mt-10 text-sm">
              {t('search.no_results')}
            </div>
          ) : (
            users.map((u: any, index: number) => {
              const isInvited = invitedUsers.includes(u._id);
              return (
                <div key={u._id} className="flex items-center justify-between py-3 px-2 border-b border-gray-50 hover:bg-gray-50 transition-colors rounded-lg">
                  <div className="flex items-center gap-3">
                    <img
                      src={u.imageUrl || `https://ui-avatars.com/api/?name=${u.first_name || u.username || 'U'}&background=random`}
                      className="w-11 h-11 rounded-full object-cover border border-gray-100"
                      alt="avatar"
                    />
                    <div className="flex flex-col">
                      <span className="text-[15px] font-bold text-gray-900 leading-tight">
                        {u.first_name || u.username || t('settings.default_user')}
                      </span>
                      <span className="text-[13px] text-gray-500 leading-tight">@{u.username}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleInvite(u._id)}
                    disabled={isInvited}
                    className={`px-4 py-1.5 rounded-full text-[14px] font-bold transition-colors ${
                      isInvited
                        ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                        : 'bg-[#5865F2] hover:bg-[#4752C4] text-white shadow-sm'
                    }`}
                  >
                    {isInvited ? t('common.done') : (index === 0 ? t('common.add') : t('common.invite'))}
                  </button>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  );
}