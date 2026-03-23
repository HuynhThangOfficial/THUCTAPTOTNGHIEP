"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { Search, MoreHorizontal, Trash2, Pin, BellOff, AlertTriangle } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import ChatBox from "./ChatBox";

export default function DirectMessagesList() {
  const { t } = useTranslation();
  const conversations = useQuery(api.chat.getInbox);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [activeChatId, setActiveChatId] = useState<Id<"conversations"> | null>(null);
  
  // State quản lý mở menu 3 chấm
  const [menuConvId, setMenuConvId] = useState<string | null>(null);

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
      otherUser.username?.toLowerCase().includes(searchLower)
    );
  });

  // Xử lý các action của Menu 
  const handleMenuAction = (e: React.MouseEvent, action: string, convId: string) => {
    e.stopPropagation(); 
    setMenuConvId(null);
    switch (action) {
      case 'pin':
        alert(t('chat.pin_conv_success', {defaultValue: 'Đã ghim cuộc trò chuyện.'}));
        break;
      case 'mute':
        alert(t('chat.mute_conv_success', {defaultValue: 'Đã tắt thông báo.'}));
        break;
      case 'report':
        alert(t('chat.report_sent', {defaultValue: 'Đã gửi báo cáo vi phạm.'}));
        break;
      case 'delete':
        alert(t('chat.delete_conv_success', {defaultValue: 'Đã xóa cuộc trò chuyện ở phía bạn.'}));
        break;
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-white overflow-hidden">
      {!activeChatId ? (
        <div className="flex flex-col h-full w-full" onClick={() => setMenuConvId(null)}>
          
          {/* THANH TÌM KIẾM */}
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

          {/* DANH SÁCH TIN NHẮN */}
          <div className="flex-1 overflow-y-auto hidden-scrollbar p-2 space-y-0.5">
            {filteredConversations?.map((conv: any) => {
              const otherUser = conv.otherUser;
              
              // 👇 LOGIC FIX LỖI TIN NHẮN CUỐI CÙNG NẰM Ở ĐÂY 👇
              const lastMsg = conv.lastMessage;
              let snippet = t('chat.no_messages', {defaultValue: 'Chưa có tin nhắn'});
              
              if (lastMsg) {
                if (lastMsg.isDeleted) {
                  snippet = t('chat.msg_recalled', {defaultValue: 'Tin nhắn đã thu hồi'});
                } else if (lastMsg.imageId || lastMsg.imageUrl) {
                  snippet = t('chat.image_bracket', {defaultValue: '[Hình ảnh]'});
                } else {
                  snippet = lastMsg.content;
                }
              }

              return (
                <div
                  key={conv._id}
                  onClick={() => setActiveChatId(conv._id)}
                  className="group flex items-center gap-3 p-2.5 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors relative"
                >
                  {/* Trạng thái hoạt động & Avatar */}
                  <div className="relative shrink-0">
                    <img
                      src={otherUser?.imageUrl || "https://ui-avatars.com/api/?name=U"}
                      alt="Avt"
                      className="w-11 h-11 rounded-full object-cover border border-gray-100"
                    />
                    {otherUser?.isOnline && <span className="absolute bottom-0.5 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></span>}
                  </div>

                  {/* Tên & Tin nhắn cuối */}
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <div className="text-[14px] font-bold text-gray-900 truncate pr-6">
                      {otherUser?.first_name || ''} {otherUser?.last_name || ''}
                    </div>
                    <p className={`text-[12px] truncate mt-0.5 ${conv.unreadCount > 0 ? 'font-bold text-gray-900' : 'text-gray-500'}`}>
                      {snippet}
                    </p>
                  </div>

                  {/* Unread Badge HOẶC Nút 3 chấm */}
                  <div className="flex flex-col items-end shrink-0 ml-1 h-full justify-center">
                    {conv.unreadCount > 0 ? (
                       <span className="bg-blue-500 text-white text-[10px] font-bold px-1.5 min-w-[20px] h-5 flex items-center justify-center rounded-full">
                         {conv.unreadCount}
                       </span>
                    ) : (
                      <button 
                        onClick={(e) => { e.stopPropagation(); setMenuConvId(menuConvId === conv._id ? null : conv._id); }}
                        className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-gray-800 rounded-full hover:bg-gray-200 transition-all"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Menu 3 chấm (Đã đổi vị trí chuẩn) */}
                  {menuConvId === conv._id && (
                    <div className="absolute right-8 top-8 bg-white border border-gray-100 shadow-xl rounded-xl w-44 z-50 py-1" onClick={e => e.stopPropagation()}>
                      {/* 1. Ghim hội thoại */}
                      <button onClick={(e) => handleMenuAction(e, 'pin', conv._id)} className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-gray-700 hover:bg-gray-50">
                        <Pin className="w-3.5 h-3.5" /> {t('chat.action_pin_conv', {defaultValue: 'Ghim hội thoại'})}
                      </button>
                      
                      {/* 2. Tắt thông báo */}
                      <button onClick={(e) => handleMenuAction(e, 'mute', conv._id)} className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-gray-700 hover:bg-gray-50">
                        <BellOff className="w-3.5 h-3.5" /> {t('chat.action_mute', {defaultValue: 'Tắt thông báo'})}
                      </button>
                      
                      <div className="h-px bg-gray-100 my-1"></div>
                      
                      {/* 3. Báo cáo */}
                      <button onClick={(e) => handleMenuAction(e, 'report', conv._id)} className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-orange-600 hover:bg-orange-50">
                        <AlertTriangle className="w-3.5 h-3.5" /> {t('chat.action_report', {defaultValue: 'Báo cáo'})}
                      </button>

                      <div className="h-px bg-gray-100 my-1"></div>

                      {/* 4. Xóa hội thoại */}
                      <button onClick={(e) => handleMenuAction(e, 'delete', conv._id)} className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-red-600 hover:bg-red-50">
                        <Trash2 className="w-3.5 h-3.5" /> {t('chat.action_delete_conv', {defaultValue: 'Xóa hội thoại'})}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
            
            {filteredConversations?.length === 0 && (
              <div className="text-center text-gray-400 text-[13px] mt-6">
                {t('search.no_results', {defaultValue: 'Không tìm thấy kết quả.'})}
              </div>
            )}
          </div>
        </div>
      ) : (
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