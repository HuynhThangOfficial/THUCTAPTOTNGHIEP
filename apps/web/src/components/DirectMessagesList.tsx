"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { Search, MessageSquare } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import ChatBox from "./ChatBox"; // Nhúng khung chat vào đây

export default function DirectMessagesList() {
  const { t } = useTranslation();
  const conversations = useQuery(api.chat.getInbox);
  
  const [searchTerm, setSearchTerm] = useState("");
  // State để lưu cuộc trò chuyện đang được chọn thay vì chuyển trang
  const [activeChatId, setActiveChatId] = useState<Id<"conversations"> | null>(null);

  if (conversations === undefined) {
    return <div className="p-4 text-center text-gray-400 text-sm">{t('chat.loading', {defaultValue: 'Đang tải...'})}</div>;
  }

  // Lọc danh sách theo từ khóa tìm kiếm
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
    // Wrapper chính chia đôi màn hình
    <div className="flex h-full w-full bg-white overflow-hidden rounded-xl shadow-sm border border-gray-200">
      
      {/* 📱 PANEL TRÁI: DANH SÁCH TIN NHẮN */}
      {/* Trên mobile sẽ ẩn đi nếu đang mở Chat, trên PC thì chiếm 320px */}
      <div className={`flex-col h-full border-r border-gray-100 bg-white ${activeChatId ? 'hidden md:flex w-full md:w-[320px]' : 'flex w-full md:w-[320px] shrink-0'}`}>
        
        {/* Header tìm kiếm */}
        <div className="p-3 border-b border-gray-100 shrink-0">
          <h2 className="text-lg font-bold text-gray-800 mb-3 px-1">Tin nhắn</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t('members.search_placeholder', {defaultValue: 'Tìm kiếm...'})}
              className="w-full bg-gray-100 border border-transparent rounded-xl py-2 pl-9 pr-3 text-[13px] outline-none focus:bg-white focus:border-blue-400 transition-all"
            />
          </div>
        </div>

        {/* Danh sách người dùng */}
        <div className="flex-1 overflow-y-auto hidden-scrollbar space-y-1 p-2">
          {filteredConversations?.map((conv: any) => {
            const otherUser = conv.otherUser;
            const isActive = activeChatId === conv._id; // Kiểm tra xem có đang chọn người này không

            return (
              <div
                key={conv._id}
                // Thay vì router.push, giờ ta set ID vào state
                onClick={() => setActiveChatId(conv._id)}
                className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-colors relative
                  ${isActive ? 'bg-blue-50 border border-blue-100' : 'hover:bg-gray-50 border border-transparent'}`}
              >
                <div className="relative shrink-0">
                  <img
                    src={otherUser?.imageUrl || "https://ui-avatars.com/api/?name=U"}
                    alt="Avt"
                    className="w-12 h-12 rounded-full object-cover shadow-sm"
                  />
                  {otherUser?.isOnline && <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></span>}
                </div>

                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <div className="text-[14px] font-bold text-gray-900 truncate leading-tight">
                    {otherUser?.first_name || ''} {otherUser?.last_name || ''}
                  </div>
                  <p className="text-[13px] text-gray-500 truncate mt-0.5">
                    @{otherUser?.username?.toLowerCase() || 'user'}
                  </p>
                </div>

                {conv.unreadCount > 0 && (
                  <div className="flex flex-col items-end shrink-0 ml-1">
                     <span className="bg-blue-500 text-white text-[11px] font-bold w-5 h-5 flex items-center justify-center rounded-full shadow-sm">
                       {conv.unreadCount}
                     </span>
                  </div>
                )}
              </div>
            );
          })}
          
          {filteredConversations?.length === 0 && (
            <div className="text-center text-gray-400 text-[13px] mt-10">
              {searchTerm ? t('search.no_results', {defaultValue: 'Không tìm thấy kết quả'}) : "Chưa có cuộc trò chuyện nào."}
            </div>
          )}
        </div>
      </div>

      {/* 💬 PANEL PHẢI: KHUNG CHAT */}
      {/* Ẩn đi trên điện thoại nếu chưa chọn chat, hiện trên PC */}
      <div className={`flex-1 h-full bg-[#f2f3f5] ${!activeChatId ? 'hidden md:flex flex-col items-center justify-center' : 'flex'}`}>
        {activeChatId ? (
          // Component ChatBox mà bác vừa tạo ở Bước 1
          <ChatBox 
            conversationId={activeChatId} 
            onBack={() => setActiveChatId(null)} // Nút back cho mobile
          />
        ) : (
          // Màn hình chờ khi chưa click vào ai (giống Zalo PC)
          <div className="flex flex-col items-center justify-center opacity-40">
            <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mb-4">
              <MessageSquare className="w-10 h-10 text-gray-400" />
            </div>
            <p className="text-lg font-bold text-gray-600">Tin nhắn của bạn</p>
            <p className="text-sm text-gray-500 mt-1">Chọn một cuộc trò chuyện từ danh sách bên trái.</p>
          </div>
        )}
      </div>

    </div>
  );
}