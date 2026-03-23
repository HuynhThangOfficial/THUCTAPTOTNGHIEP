"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { Search } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import ChatBox from "./ChatBox"; // 👉 Sửa lại import trỏ đúng vào file page.tsx (ChatBox) của bác nhé!

export default function DirectMessagesList() {
  const { t } = useTranslation();
  const conversations = useQuery(api.chat.getInbox);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [activeChatId, setActiveChatId] = useState<Id<"conversations"> | null>(null);

  if (conversations === undefined) {
    return <div className="p-4 text-center text-gray-400 text-sm">{t('chat.loading', {defaultValue: 'Đang tải...'})}</div>;
  }

  const filteredConversations = conversations?.filter((conv: any) => {
    if (!searchTerm) return true; 
    const searchLower = searchTerm.toLowerCase();
    const otherUser = conv.otherUser;
    if (!otherUser) return false;

    return (
      otherUser.first_name?.toLowerCase().includes(searchLower) ||
      otherUser.last_name?.toLowerCase().includes(searchLower) ||
      otherUser.username?.toLowerCase().includes(searchLower) ||
      otherUser.email?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="flex flex-col h-full w-full bg-white overflow-hidden">
      {/* NẾU CHƯA CHỌN CHAT -> HIỆN DANH SÁCH */}
      {!activeChatId ? (
        <div className="flex flex-col h-full w-full">
          <div className="p-3 border-b border-gray-100 shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t('members.search_placeholder', {defaultValue: 'Tìm kiếm...'})}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2 pl-9 pr-3 text-[13px] outline-none focus:bg-white focus:border-blue-400 transition-all"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto hidden-scrollbar p-2">
            {filteredConversations?.map((conv: any) => {
              const otherUser = conv.otherUser;
              return (
                <div
                  key={conv._id}
                  onClick={() => setActiveChatId(conv._id)}
                  className="flex items-center gap-3 p-2 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors relative"
                >
                  <div className="relative shrink-0">
                    <img
                      src={otherUser?.imageUrl || "https://ui-avatars.com/api/?name=U"}
                      alt="Avt"
                      className="w-10 h-10 rounded-full object-cover border border-gray-100"
                    />
                    {otherUser?.isOnline && <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white"></span>}
                  </div>

                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <div className="text-[13px] font-bold text-gray-900 truncate">
                      {otherUser?.first_name || ''} {otherUser?.last_name || ''}
                    </div>
                    <p className="text-[12px] text-gray-500 truncate">
                      @{otherUser?.username?.toLowerCase() || 'user'}
                    </p>
                  </div>

                  {conv.unreadCount > 0 && (
                    <div className="shrink-0">
                       <span className="bg-blue-500 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full">
                         {conv.unreadCount}
                       </span>
                    </div>
                  )}
                </div>
              );
            })}
            
            {filteredConversations?.length === 0 && (
              <div className="text-center text-gray-400 text-[13px] mt-6">
                Không tìm thấy kết quả.
              </div>
            )}
          </div>
        </div>
      ) : (
        /* NẾU ĐÃ CHỌN CHAT -> HIỆN KHUNG CHAT */
        <div className="flex flex-col h-full w-full bg-[#f2f3f5]">
          <ChatBox 
            conversationId={activeChatId} 
            onBack={() => setActiveChatId(null)} 
          />
        </div>
      )}
    </div>
  );
}