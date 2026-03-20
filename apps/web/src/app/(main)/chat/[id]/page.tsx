"use client";

import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from 'convex/react';
// Sửa đường dẫn import api cho phù hợp với cấu trúc folder của bạn (có thể là '@/convex/_generated/api')
import { api } from '../../../../../../../convex/_generated/api'; 
import { Id } from '../../../../../../../convex/_generated/dataModel';
import { useTranslation } from 'react-i18next';
import { Send, Image as ImageIcon, MoreVertical, Pin, CheckCheck } from 'lucide-react';

export default function ChatPage({ params }: { params: { id: string } }) {
  const conversationId = params.id as Id<"conversations">;
  const { t } = useTranslation();
  
  const [text, setText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // --- MAP CÁC HOOK TỪ MOBILE SANG WEB ---
  const currentUser = useQuery(api.users.current); // Lấy user hiện tại thay cho useUserProfile
  const messages = useQuery(api.chat.getMessages, { conversationId });
  const otherUser = useQuery(api.chat.getConversationInfo, { conversationId });
  const rawConvo = useQuery(api.chat.getRawConversation, { conversationId });
  
  const send = useMutation(api.chat.sendMessage);
  const markConvAsRead = useMutation(api.chat.markConversationAsRead);
  const updateTyping = useMutation(api.chat.setTypingStatus);

  // Lọc tin nhắn rác/đã xóa
  const filteredMessages = messages?.filter((m: any) => !m.deletedBy?.includes(currentUser?._id as string)) || [];

  // Tự động cuộn xuống đáy khi có tin nhắn mới
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Đánh dấu đã đọc khi vào trang
  useEffect(() => {
    if (conversationId && messages && messages.length > 0) {
      markConvAsRead({ conversationId });
    }
  }, [conversationId, messages?.length]);

  // Xử lý Typing logic
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setText(e.target.value);
    updateTyping({ conversationId, isTyping: true });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => { 
      updateTyping({ conversationId, isTyping: false }); 
    }, 2000);
  };

  // Hàm Gửi
  const handleSend = async () => {
    if (!text.trim()) return;
    const content = text.trim();
    setText(""); // Clear UI ngay lập tức
    
    await send({ conversationId, content });
    updateTyping({ conversationId, isTyping: false });
  };

  // Trạng thái đang gõ của người kia
  const isOtherPersonTyping = rawConvo?.typingUserId && rawConvo.typingUserId !== currentUser?._id;

  if (messages === undefined || !otherUser || !currentUser) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mb-4"></div>
        <p className="text-gray-500 text-sm">{t('chat.loading') || 'Đang tải tin nhắn...'}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#f2f3f5] overflow-hidden">
      
      {/* --- HEADER CHAT --- */}
      <div className="h-16 border-b border-gray-200 bg-white flex items-center justify-between px-6 shrink-0 shadow-sm z-10">
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            <img 
              src={otherUser.imageUrl || "https://ui-avatars.com/api/?name=U"} 
              alt="Avatar" 
              className="w-10 h-10 rounded-full object-cover border border-gray-100" 
            />
            {otherUser.isOnline && (
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></span>
            )}
          </div>
          <div className="flex flex-col">
            <h1 className="text-[16px] font-extrabold text-gray-900 leading-tight">
              {otherUser.first_name} {otherUser.last_name}
            </h1>
            <p className="text-[12px] text-green-600 font-medium">
              {otherUser.isOnline ? 'Đang hoạt động' : 'Ngoại tuyến'}
            </p>
          </div>
        </div>
        <button className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors">
          <MoreVertical className="w-5 h-5" />
        </button>
      </div>

      {/* --- DANH SÁCH TIN NHẮN --- */}
      <div className="flex-1 overflow-y-auto hidden-scrollbar p-6 space-y-4">
        {filteredMessages.map((msg: any, index: number) => {
          const isMe = msg.senderId === currentUser._id;
          
          // Bỏ qua tin nhắn hệ thống
          if (msg.isSystem) return null;

          return (
            <div key={msg._id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`flex gap-3 max-w-[70%] ${isMe ? 'flex-row-reverse' : 'flex-row'} items-end`}>
                
                {/* Avatar người gửi (Chỉ hiện của đối phương) */}
                {!isMe && (
                  <img 
                    src={msg.senderImageUrl || otherUser.imageUrl} 
                    alt="Avt" 
                    className="w-8 h-8 rounded-full object-cover shrink-0 mb-1" 
                  />
                )}
                
                {/* Bong bóng tin nhắn */}
                <div className="flex flex-col">
                  {msg.isPinned && (
                    <div className={`flex items-center gap-1 mb-1 text-[10px] text-gray-500 ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <Pin className="w-3 h-3" /> Đã ghim
                    </div>
                  )}
                  
                  <div className={`px-4 py-2.5 rounded-2xl text-[14px] shadow-sm
                    ${isMe 
                      ? 'bg-[#007aff] text-white rounded-br-sm' 
                      : 'bg-white text-gray-900 border border-gray-100 rounded-bl-sm'
                    }`}
                  >
                    {msg.content}
                  </div>
                  
                  {/* Trạng thái đã xem (Chỉ hiện tin cuối cùng của mình) */}
                  {isMe && index === filteredMessages.length - 1 && (
                    <div className="flex items-center justify-end gap-1 mt-1 text-[11px] text-gray-500">
                      {msg.status === 'read' ? (
                        <><CheckCheck className="w-3.5 h-3.5 text-blue-500" /> Đã xem</>
                      ) : (
                        <><CheckCheck className="w-3.5 h-3.5" /> Đã gửi</>
                      )}
                    </div>
                  )}
                </div>

              </div>
            </div>
          );
        })}

        {/* Typing Indicator */}
        {isOtherPersonTyping && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-100 px-4 py-3 rounded-2xl rounded-bl-sm shadow-sm flex items-center gap-1">
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* --- KHUNG NHẬP TIN NHẮN --- */}
      <div className="p-4 bg-white border-t border-gray-200 shrink-0">
        <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-full px-3 py-2 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
          <button className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-full transition-colors">
            <ImageIcon className="w-5 h-5" />
          </button>
          
          <input 
            type="text" 
            value={text}
            onChange={handleTextChange}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={t('chat.input_placeholder') || "Nhập tin nhắn..."}
            className="flex-1 bg-transparent border-none outline-none text-[15px] text-gray-800 placeholder-gray-400"
          />
          
          <button 
            onClick={handleSend}
            disabled={!text.trim()}
            className={`p-2 rounded-full flex items-center justify-center transition-all
              ${text.trim() 
                ? 'bg-blue-500 text-white hover:bg-blue-600 shadow-md transform hover:scale-105' 
                : 'bg-gray-200 text-gray-400'
              }`}
          >
            <Send className="w-4 h-4 ml-0.5" />
          </button>
        </div>
      </div>

    </div>
  );
}