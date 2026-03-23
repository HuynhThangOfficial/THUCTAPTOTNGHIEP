"use client";

import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from 'convex/react';
// 👇 Nhớ check lại đường dẫn api cho chuẩn với thư mục hiện tại của bác nhé
import { api } from '../../../../convex/_generated/api'; 
import { Id } from '../../../../convex/_generated/dataModel';
import { useTranslation } from 'react-i18next';
import { Send, Image as ImageIcon, MoreVertical, Pin, CheckCheck, Reply, Copy, Trash2, Smile, X, ChevronDown, ChevronUp, ArrowLeft } from 'lucide-react';

// --- HÀM TIỆN ÍCH ---
const formatTimeDivider = (timestamp: number, t: any) => {
  const date = new Date(timestamp);
  const now = new Date();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const timeStr = `${hours}:${minutes}`;

  if (date.toDateString() === now.toDateString()) return timeStr;
  
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return t('chat.yesterday_time', { defaultValue: `Hôm qua ${timeStr}`, time: timeStr });

  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year} ${timeStr}`;
};

const EMOJIS = ['❤️', '😂', '😮', '😢', '😡', '👍'];

function SharedPostPreview({ postId }: { postId: string }) {
  const { t } = useTranslation();
  const thread = useQuery(api.messages.getThreadById, { messageId: postId as Id<'messages'> });

  if (thread === undefined) return <div className="p-4 bg-white rounded-xl border border-gray-200 w-64 animate-pulse h-24"></div>;
  if (thread === null) return <div className="p-4 bg-white rounded-xl border border-gray-200 w-64 text-center text-gray-500 italic text-sm">{t('chat.post_not_exist', {defaultValue: 'Bài viết không còn tồn tại'})}</div>;

  const isAnon = thread.isAnonymous;
  const displayAvatar = isAnon ? "https://www.gravatar.com/avatar/0?d=mp&f=y" : (thread.creator?.imageUrl || "https://ui-avatars.com/api/?name=U");
  const displayName = isAnon ? t('chat.anonymous_member', {defaultValue: 'Thành viên ẩn danh'}) : `${thread.creator?.first_name || t('chat.default_user', {defaultValue: 'Người dùng'})}`;

  return (
    <div className="bg-white rounded-xl p-3 w-[260px] border border-gray-200 shadow-sm cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => window.open(`/post/${postId}`, '_blank')}>
      <div className="flex items-center gap-2 mb-2">
        <img src={displayAvatar} className="w-6 h-6 rounded-full object-cover" alt="avatar" />
        <span className="font-bold text-sm text-gray-900 truncate">{displayName}</span>
      </div>
      <p className="text-sm text-gray-800 line-clamp-3 mb-2 leading-relaxed">{thread.content}</p>
      <div className="flex items-center gap-4 pt-2 border-t border-gray-100 text-xs text-gray-500">
        <span className="flex items-center gap-1"><span className="text-red-500">♥</span> {thread.likeCount || 0}</span>
        <span className="flex items-center gap-1">💬 {thread.commentCount || 0}</span>
      </div>
    </div>
  );
}

// 👇 Đã sửa prop nhận vào
export default function ChatBox({ conversationId, onBack }: { conversationId: Id<"conversations">, onBack: () => void }) {
  const { t } = useTranslation();
  
  const [text, setText] = useState("");
  const [replyingTo, setReplyingTo] = useState<any>(null);
  const [isPinnedExpanded, setIsPinnedExpanded] = useState(false);
  const [viewerImage, setViewerImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentUser = useQuery(api.users.current);
  const messages = useQuery(api.chat.getMessages, { conversationId });
  const conversationInfo = useQuery(api.chat.getConversationInfo, { conversationId });
  const otherUser = useQuery(api.chat.getConversationInfo, { conversationId });
  const rawConvo = useQuery(api.chat.getRawConversation, { conversationId });
  
  const send = useMutation(api.chat.sendMessage);
  const markConvAsRead = useMutation(api.chat.markConversationAsRead);
  const updateTyping = useMutation(api.chat.setTypingStatus);
  const togglePin = useMutation(api.chat.togglePinMessage);
  const unsend = useMutation(api.chat.unsendMessage);
  const toggleReaction = useMutation(api.chat.toggleReaction);
  const generateUploadUrl = useMutation(api.chat.generateUploadUrl);

  const filteredMessages = messages?.filter((m: any) => !m.deletedBy?.includes(currentUser?._id as string)) || [];
  const pinnedMessages = filteredMessages.filter((m: any) => m.isPinned && !m.isDeleted && !m.isSystem);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isPinnedExpanded, replyingTo]);

  useEffect(() => {
    if (conversationId && messages && messages.length > 0) markConvAsRead({ conversationId });
  }, [conversationId, messages?.length]);

  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setText(e.target.value);
    updateTyping({ conversationId, isTyping: true });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => { updateTyping({ conversationId, isTyping: false }); }, 2000);
  };

  const handleSend = async () => {
    if (!text.trim()) return;
    const content = text.trim();
    setText(""); 
    
    await send({ conversationId, content, replyToMessageId: replyingTo?._id });
    setReplyingTo(null);
    updateTyping({ conversationId, isTyping: false });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const postUrl = await generateUploadUrl();
      const result = await fetch(postUrl, { method: "POST", headers: { "Content-Type": file.type }, body: file });
      const { storageId } = await result.json();
      await send({ conversationId, content: t('chat.image_label', {defaultValue: '[Hình ảnh]'}), imageId: storageId, replyToMessageId: replyingTo?._id });
      setReplyingTo(null);
    } catch (error) {
      console.error("Upload error:", error);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const isOtherPersonTyping = rawConvo?.typingUserId && rawConvo.typingUserId !== currentUser?._id;

  if (messages === undefined || !otherUser || !currentUser) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-white h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mb-4"></div>
        <p className="text-gray-500 text-sm">{t('chat.loading') || 'Đang tải...'}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#f2f3f5] relative overflow-hidden w-full">
      
      {/* --- HEADER CHAT --- */}
      <div className="h-16 border-b border-gray-200 bg-white flex items-center justify-between px-4 md:px-6 shrink-0 shadow-sm z-20">
        <div className="flex items-center gap-3">
          {/* Nút Back dành cho màn hình điện thoại */}
          <button onClick={onBack} className="md:hidden p-2 -ml-2 text-gray-500 hover:bg-gray-100 rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <div className="relative shrink-0">
            <img src={otherUser.imageUrl || "https://ui-avatars.com/api/?name=U"} alt="Avatar" className="w-10 h-10 rounded-full object-cover border border-gray-100" />
            {otherUser.isOnline && <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></span>}
          </div>
          <div className="flex flex-col">
            <h1 className="text-[16px] font-extrabold text-gray-900 leading-tight">{otherUser.first_name} {otherUser.last_name}</h1>
            <p className="text-[12px] text-green-600 font-medium">{otherUser.isOnline ? t('chat.active_now', {defaultValue:'Đang hoạt động'}) : t('chat.offline', {defaultValue:'Ngoại tuyến'})}</p>
          </div>
        </div>
        <button className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"><MoreVertical className="w-5 h-5" /></button>
      </div>

      {/* --- PINNED MESSAGES BANNER --- */}
      {pinnedMessages.length > 0 && (
        <div className="bg-white border-b border-gray-200 shadow-sm z-10 w-full">
          {isPinnedExpanded ? (
            <div className="p-3">
              <div className="flex justify-between items-center mb-2 px-2">
                <span className="text-sm font-bold text-gray-800">{t('chat.pinned_count', { count: pinnedMessages.length, defaultValue: `${pinnedMessages.length} tin nhắn đã ghim` })}</span>
                <button onClick={() => setIsPinnedExpanded(false)} className="p-1 hover:bg-gray-100 rounded-full"><ChevronUp className="w-4 h-4 text-gray-500" /></button>
              </div>
              <div className="max-h-40 overflow-y-auto">
                {[...pinnedMessages].reverse().map((pm: any) => (
                  <div key={pm._id} className="flex items-center gap-2 p-2 hover:bg-gray-50 cursor-pointer border-b border-gray-50">
                    <Pin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span className="text-sm text-gray-700 truncate">{pm.imageUrl ? t('chat.image_bracket', {defaultValue: '[Hình ảnh]'}) : pm.content}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50" onClick={() => pinnedMessages.length > 1 ? setIsPinnedExpanded(true) : null}>
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-7 h-7 rounded-full bg-blue-50 flex items-center justify-center shrink-0"><Pin className="w-3.5 h-3.5 text-blue-600" /></div>
                <div className="flex flex-col truncate">
                  <span className="text-xs text-blue-600 font-bold">{t('chat.pinned_msg', {defaultValue: 'Tin nhắn đã ghim'})}</span>
                  <span className="text-sm text-gray-700 truncate">{pinnedMessages[pinnedMessages.length - 1].imageUrl ? t('chat.image_bracket', {defaultValue: '[Hình ảnh]'}) : pinnedMessages[pinnedMessages.length - 1].content}</span>
                </div>
              </div>
              {pinnedMessages.length > 1 && <ChevronDown className="w-5 h-5 text-gray-400" />}
            </div>
          )}
        </div>
      )}

      {/* --- DANH SÁCH TIN NHẮN --- */}
      <div className="flex-1 overflow-y-auto hidden-scrollbar p-4 md:p-6 space-y-2">
        {filteredMessages.map((msg: any, index: number) => {
          const olderItem = index > 0 ? filteredMessages[index - 1] : null;
          const newerItem = index < filteredMessages.length - 1 ? filteredMessages[index + 1] : null;

          const showTimeDivider = !olderItem || (msg._creationTime - olderItem._creationTime > 3600000);
          const isFirstInGroup = !olderItem || olderItem.senderId !== msg.senderId || (msg._creationTime - olderItem._creationTime > 120000) || showTimeDivider;
          const isLastInGroup = !newerItem || newerItem.senderId !== msg.senderId || (newerItem._creationTime - msg._creationTime > 120000);
          
          if (msg.isSystem) {
            let sysText = msg.content;
            if (msg.content.startsWith('SYS_PINNED|')) sysText = t('chat.sys_pinned', { name: msg.content.split('|')[1], defaultValue: `${msg.content.split('|')[1]} đã ghim một tin nhắn.` });
            else if (msg.content.startsWith('SYS_UNPINNED|')) sysText = t('chat.sys_unpinned', { name: msg.content.split('|')[1], defaultValue: `${msg.content.split('|')[1]} đã bỏ ghim một tin nhắn.` });

            return (
              <div key={msg._id} className="flex flex-col items-center">
                {showTimeDivider && <div className="text-xs font-medium text-gray-400 my-4">{formatTimeDivider(msg._creationTime, t)}</div>}
                <div className="bg-gray-200/60 px-4 py-1.5 rounded-full text-xs font-medium text-gray-500 my-2">{sysText}</div>
              </div>
            );
          }

          const isMe = msg.senderId === currentUser._id;
          const repliedMsg = msg.replyToMessageId ? filteredMessages.find((m: any) => m._id === msg.replyToMessageId) : null;
          const isSharedPost = msg.content && msg.content.trim().startsWith('https://konket.app/feed/');
          const postId = isSharedPost ? msg.content.trim().split('/').pop() : null;
          const uniqueEmojis = msg.reactions ? [...new Set(msg.reactions.map((r: any) => r.emoji))] : [];
          const hasReactions = uniqueEmojis.length > 0 && !msg.isDeleted;

          return (
            <div key={msg._id} className="flex flex-col">
              {showTimeDivider && <div className="text-xs font-medium text-gray-400 my-4 text-center">{formatTimeDivider(msg._creationTime, t)}</div>}
              
              <div className={`flex gap-3 group relative ${isMe ? 'flex-row-reverse' : 'flex-row'} items-end ${hasReactions ? 'mb-4' : (isLastInGroup ? 'mb-2' : 'mb-0.5')}`}>
                
                {!isMe && (
                  <div className="w-8 h-8 shrink-0">
                    {isLastInGroup && <img src={msg.senderImageUrl || otherUser.imageUrl} alt="Avt" className="w-full h-full rounded-full object-cover" />}
                  </div>
                )}
                
                <div className={`flex flex-col max-w-[75%] md:max-w-[65%] ${isMe ? 'items-end' : 'items-start'} relative`}>
                  
                  {msg.isPinned && !msg.isDeleted && (
                    <div className="flex items-center gap-1 mb-1 text-[10px] text-gray-500 font-medium">
                      <Pin className="w-3 h-3" /> {t('chat.pinned_badge', {defaultValue: 'Đã ghim'})}
                    </div>
                  )}

                  <div className="flex items-center relative">
                    {!msg.isDeleted && (
                      <div className={`hidden group-hover:flex items-center gap-1 absolute top-1/2 -translate-y-1/2 bg-white border border-gray-200 shadow-sm rounded-lg px-1 py-0.5 z-10 ${isMe ? 'right-full mr-2' : 'left-full ml-2'}`}>
                        <button onClick={() => setActiveMenuId(activeMenuId === msg._id ? null : msg._id)} className="p-1.5 text-gray-400 hover:text-gray-700 rounded transition-colors" title="Thả cảm xúc"><Smile className="w-4 h-4" /></button>
                        <button onClick={() => setReplyingTo(msg)} className="p-1.5 text-gray-400 hover:text-blue-500 rounded transition-colors" title="Trả lời"><Reply className="w-4 h-4" /></button>
                        <button onClick={() => { navigator.clipboard.writeText(msg.content); alert(t('chat.copied', {defaultValue:'Đã copy'})); }} className="p-1.5 text-gray-400 hover:text-gray-700 rounded transition-colors" title="Copy"><Copy className="w-4 h-4" /></button>
                        <button onClick={() => togglePin({ messageId: msg._id, conversationId })} className="p-1.5 text-gray-400 hover:text-orange-500 rounded transition-colors" title="Ghim"><Pin className="w-4 h-4" /></button>
                        {isMe && <button onClick={() => unsend({ messageId: msg._id })} className="p-1.5 text-gray-400 hover:text-red-500 rounded transition-colors" title="Thu hồi"><Trash2 className="w-4 h-4" /></button>}
                        
                        {activeMenuId === msg._id && (
                          <div className={`absolute top-full mt-2 bg-white border border-gray-200 shadow-lg rounded-full flex px-2 py-1 z-50 ${isMe ? 'right-0' : 'left-0'}`}>
                            {EMOJIS.map(e => (
                              <button key={e} onClick={() => { toggleReaction({ messageId: msg._id, emoji: e }); setActiveMenuId(null); }} className="p-1.5 text-xl hover:bg-gray-100 rounded-full transition-colors">{e}</button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    <div className={`
                      relative flex flex-col shadow-sm
                      ${msg.isDeleted ? 'bg-transparent border border-gray-300' : (isSharedPost || msg.imageUrl ? 'bg-transparent shadow-none' : (isMe ? 'bg-[#007aff]' : 'bg-white border border-gray-100'))}
                      ${isMe ? 'text-white' : 'text-gray-900'}
                      ${isSharedPost || msg.imageUrl ? 'p-0' : 'px-4 py-2.5'}
                    `}
                    style={{
                      borderTopLeftRadius: isMe || !isFirstInGroup ? 18 : 4,
                      borderTopRightRadius: !isMe || !isFirstInGroup ? 18 : 4,
                      borderBottomLeftRadius: !isMe && isLastInGroup ? 4 : 18,
                      borderBottomRightRadius: isMe && isLastInGroup ? 4 : 18,
                    }}>
                      
                      {repliedMsg && !msg.isDeleted && (
                        <div className={`mb-2 p-2 rounded-lg border-l-4 ${isMe ? 'bg-white/20 border-white' : 'bg-gray-100 border-[#007aff]'}`}>
                          <p className={`text-xs line-clamp-2 ${isMe ? 'text-gray-100' : 'text-gray-500'}`}>
                            {repliedMsg.isDeleted ? t('chat.msg_recalled', {defaultValue: 'Tin nhắn đã thu hồi'}) : (repliedMsg.imageUrl ? t('chat.image_bracket', {defaultValue: '[Hình ảnh]'}) : repliedMsg.content)}
                          </p>
                        </div>
                      )}

                      {isSharedPost && !msg.isDeleted && postId ? (
                        <SharedPostPreview postId={postId} />
                      ) : msg.imageUrl && !msg.isDeleted ? (
                        <img 
                          src={msg.imageUrl} 
                          alt="upload" 
                          className="w-56 h-auto max-h-72 rounded-xl object-cover cursor-pointer hover:opacity-90 transition-opacity" 
                          onClick={() => setViewerImage(msg.imageUrl)} 
                        />
                      ) : (
                        <span className={`text-[15px] whitespace-pre-wrap ${msg.isDeleted ? 'italic text-gray-500' : ''}`}>
                          {msg.isDeleted ? t('chat.msg_recalled', {defaultValue: 'Tin nhắn đã thu hồi'}) : msg.content}
                        </span>
                      )}

                      {hasReactions && (
                        <div className={`absolute -bottom-3 ${isMe ? 'right-2' : 'left-2'} bg-white border border-gray-200 shadow-sm rounded-full px-1.5 py-0.5 flex items-center text-xs z-10`}>
                          {uniqueEmojis.join('')}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {isMe && isLastInGroup && index === filteredMessages.length - 1 && (
                    <div className={`flex items-center justify-end gap-1 mt-1.5 text-[11px] text-gray-500 ${hasReactions ? 'mt-4' : ''}`}>
                      {msg.status === 'read' ? <><CheckCheck className="w-3.5 h-3.5 text-blue-500" /> {t('chat.status_read', {defaultValue:'Đã xem'})}</> : <><CheckCheck className="w-3.5 h-3.5" /> {t('chat.status_sent', {defaultValue:'Đã gửi'})}</>}
                    </div>
                  )}
                </div>

              </div>
            </div>
          );
        })}

        {isOtherPersonTyping && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-100 px-4 py-3 rounded-2xl rounded-bl-sm shadow-sm flex items-center gap-1 w-fit">
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></span>
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* --- KHUNG NHẬP TIN NHẮN --- */}
      <div className="bg-white border-t border-gray-200 shrink-0 flex flex-col">
        {replyingTo && (
          <div className="flex items-center justify-between px-4 py-2 bg-blue-50/50 border-b border-blue-100">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-blue-600 flex items-center gap-1"><Reply className="w-3 h-3" /> {t('chat.replying_to', {defaultValue: 'Đang trả lời'})}</span>
              <span className="text-sm text-gray-600 line-clamp-1">{replyingTo.isDeleted ? t('chat.msg_recalled', {defaultValue: 'Tin nhắn đã thu hồi'}) : (replyingTo.imageUrl ? t('chat.image_bracket', {defaultValue: '[Hình ảnh]'}) : replyingTo.content)}</span>
            </div>
            <button onClick={() => setReplyingTo(null)} className="p-1 text-gray-400 hover:text-gray-700 rounded-full transition-colors"><X className="w-4 h-4" /></button>
          </div>
        )}

        <div className="p-3 md:p-4 flex items-center gap-2 md:gap-3">
          <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageUpload} />
          <button onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-full transition-colors disabled:opacity-50">
            <ImageIcon className="w-6 h-6" />
          </button>
          
          <div className="flex-1 flex items-center bg-gray-50 border border-gray-200 rounded-full px-4 py-2.5 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
            <input 
              type="text" 
              value={text}
              onChange={handleTextChange}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder={isUploading ? t('chat.sending_image', {defaultValue: 'Đang gửi ảnh...'}) : (t('chat.input_placeholder') || "Nhập tin nhắn...")}
              disabled={isUploading}
              className="flex-1 bg-transparent border-none outline-none text-[14px] md:text-[15px] text-gray-800 placeholder-gray-400 disabled:opacity-50"
            />
          </div>
          
          <button 
            onClick={handleSend}
            disabled={!text.trim() || isUploading}
            className={`p-3 rounded-full flex items-center justify-center transition-all
              ${text.trim() && !isUploading ? 'bg-blue-500 text-white hover:bg-blue-600 shadow-md transform hover:scale-105' : 'bg-gray-100 text-gray-400'}`}
          >
            <Send className="w-5 h-5 ml-0.5" />
          </button>
        </div>
      </div>

      {viewerImage && (
        <div className="fixed inset-0 z-[99999] bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in" onClick={() => setViewerImage(null)}>
          <button onClick={() => setViewerImage(null)} className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors text-white">
            <X className="w-6 h-6" />
          </button>
          <img src={viewerImage} alt="phóng to" className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()} />
        </div>
      )}

    </div>
  );
}