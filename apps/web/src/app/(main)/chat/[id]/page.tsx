"use client";

import { useState, useEffect, useRef, use } from 'react';
import { useQuery, useMutation } from 'convex/react';
// Sửa đường dẫn import api cho phù hợp với cấu trúc folder của bạn
import { api } from '../../../../../../../convex/_generated/api';
import { Id } from '../../../../../../../convex/_generated/dataModel';
import { useTranslation } from 'react-i18next';
// 👇 Đã import thêm ArrowLeft và useRouter 👇
import { Send, Image as ImageIcon, MoreVertical, Pin, CheckCheck, Reply, Copy, Trash2, Smile, X, ChevronDown, ChevronUp, Flag, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

// --- HÀM TIỆN ÍCH ---

const formatLastSeen = (timestamp: number | undefined, t: any) => {
  if (!timestamp) return '';
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);

  if (diffMins <= 2) return t('chat.active_now');
  if (diffMins < 60) return t('chat.active_mins_ago', { count: diffMins });

  if (diffHours < 24) {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.getDate() === yesterday.getDate()) return t('chat.active_yesterday');
    return t('chat.active_hours_ago', { count: diffHours });
  }

  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return t('chat.active_date', { date: `${day}/${month}/${year}` });
};

const formatTimeDivider = (timestamp: number, t: any) => {
  const date = new Date(timestamp);
  const now = new Date();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const timeStr = `${hours}:${minutes}`;

  if (date.toDateString() === now.toDateString()) return timeStr;

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return t('chat.yesterday_time', { time: timeStr });

  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year} ${timeStr}`;
};

const formatTimeAgo = (timestamp: number, t: any) => {
  const now = new Date();
  const postDate = new Date(timestamp);
  const diffMs = now.getTime() - postDate.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return t('chat.just_now');
  if (diffMins < 60) return t('chat.mins_short', { count: diffMins });
  if (diffHours < 24) return t('chat.hours_short', { count: diffHours });
  if (diffDays < 7) return t('chat.days_short', { count: diffDays });

  const day = postDate.getDate();
  const month = postDate.getMonth() + 1;
  return `${day} ${t('chat.month_short')} ${month}`;
};

const EMOJIS = ['❤️', '😂', '😮', '😢', '😡', '👍'];

// --- COMPONENT PREVIEW BÀI VIẾT ĐƯỢC CHIA SẺ ---
function SharedPostPreview({ postId }: { postId: string }) {
  const { t } = useTranslation();
  const thread = useQuery(api.messages.getThreadById, { messageId: postId as Id<'messages'> });

  if (thread === undefined) {
    return <div className="p-4 bg-white rounded-xl border border-gray-200 w-64 animate-pulse h-24"></div>;
  }

  if (thread === null) {
    return <div className="p-4 bg-white rounded-xl border border-gray-200 w-64 text-center text-gray-500 italic text-sm">{t('chat.post_not_exist')}</div>;
  }

  const isAnon = thread.isAnonymous;
  const displayAvatar = isAnon ? "https://www.gravatar.com/avatar/0?d=mp&f=y" : (thread.creator?.imageUrl || "https://ui-avatars.com/api/?name=U");
  const displayName = isAnon ? t('chat.anonymous_member') : `${thread.creator?.first_name || t('chat.default_user')}`;

  return (
    <div
      className="bg-white rounded-xl p-3 w-[260px] border border-gray-200 shadow-sm cursor-pointer hover:bg-gray-50 transition-colors"
      onClick={() => window.open(`/post/${postId}`, '_blank')}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <img src={displayAvatar} className="w-6 h-6 rounded-full object-cover shrink-0" alt="avatar" />
          <span className="font-bold text-sm text-gray-900 truncate">{displayName}</span>
        </div>
        <span className="text-[11px] text-gray-500 shrink-0 ml-2">• {formatTimeAgo(thread._creationTime, t)}</span>
      </div>
      <p className="text-sm text-gray-800 line-clamp-3 mb-2 leading-relaxed">{thread.content}</p>
      <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs text-gray-500">
        <div className="flex gap-4">
          <span className="flex items-center gap-1"><span className={thread.isLiked ? "text-red-500" : ""}>♥</span> {thread.likeCount || 0}</span>
          <span className="flex items-center gap-1">💬 {thread.commentCount || 0}</span>
          <span className="flex items-center gap-1"><span className={thread.isReposted ? "text-[#00BA7C]" : ""}>🔁</span> {thread.retweetCount || 0}</span>
        </div>
        <span className="flex items-center gap-1">🚀 {thread.shareCount || 0}</span>
      </div>
    </div>
  );
}

export default function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { t } = useTranslation();
  const router = useRouter(); // 👈 Khởi tạo Router để điều hướng

  const resolvedParams = use(params);
  const conversationId = resolvedParams.id as Id<"conversations">;

  const [text, setText] = useState("");
  const [replyingTo, setReplyingTo] = useState<any>(null);
  const [isPinnedExpanded, setIsPinnedExpanded] = useState(false);
  const [viewerImage, setViewerImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- HOOKS ---
  const currentUser = useQuery(api.users.current);
  const messages = useQuery(api.chat.getMessages, { conversationId });
  const otherUser = useQuery(api.chat.getConversationInfo, { conversationId });
  const rawConvo = useQuery(api.chat.getRawConversation, { conversationId });

  const send = useMutation(api.chat.sendMessage);
  const markConvAsRead = useMutation(api.chat.markConversationAsRead);
  const updateTyping = useMutation(api.chat.setTypingStatus);
  const togglePin = useMutation(api.chat.togglePinMessage);
  const unsend = useMutation(api.chat.unsendMessage);
  const deleteForSelf = useMutation(api.chat.deleteForSelf);
  const toggleReaction = useMutation(api.chat.toggleReaction);
  const generateUploadUrl = useMutation(api.chat.generateUploadUrl);

  const filteredMessages = messages?.filter((m: any) => !m.deletedBy?.includes(currentUser?._id as string)) || [];
  const pinnedMessages = filteredMessages.filter((m: any) => m.isPinned && !m.isDeleted && !m.isSystem);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isPinnedExpanded, replyingTo]);

  useEffect(() => {
    if (conversationId && messages && messages.length > 0) {
      markConvAsRead({ conversationId });
    }
  }, [conversationId, messages?.length]);

  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setText(e.target.value);
    updateTyping({ conversationId, isTyping: true });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      updateTyping({ conversationId, isTyping: false });
    }, 2000);
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
      await send({ conversationId, content: t('chat.image_label'), imageId: storageId, replyToMessageId: replyingTo?._id });
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
      <div className="flex-1 flex flex-col items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mb-4"></div>
        <p className="text-gray-500 text-sm">{t('chat.loading')}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#f2f3f5] relative overflow-hidden" onClick={() => setActiveDropdownId(null)}>

      {/* --- HEADER CHAT --- */}
      <div className="h-16 border-b border-gray-200 bg-white flex items-center justify-between px-4 shrink-0 shadow-sm z-20">
        <div className="flex items-center gap-3">

          {/* 👇 ĐÃ THÊM NÚT BACK Ở ĐÂY 👇 */}
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors shrink-0"
            title={t('common.back')}
          >
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>

          <div className="relative shrink-0">
            <img src={otherUser.imageUrl || "https://ui-avatars.com/api/?name=U"} alt="Avatar" className="w-10 h-10 rounded-full object-cover border border-gray-100" />
            {otherUser.isOnline && <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></span>}
          </div>
          <div className="flex flex-col">
            <h1 className="text-[16px] font-extrabold text-gray-900 leading-tight">{otherUser.first_name} {otherUser.last_name}</h1>
            <p className="text-[12px] text-green-600 font-medium">
              {otherUser.isOnline ? t('chat.active_now') : formatLastSeen(otherUser.lastSeen, t)}
            </p>
          </div>
        </div>
      </div>

      {/* --- PINNED MESSAGES BANNER --- */}
      {pinnedMessages.length > 0 && (
        <div className="bg-white border-b border-gray-200 shadow-sm z-10 w-full">
          {isPinnedExpanded ? (
            <div className="p-3">
              <div className="flex justify-between items-center mb-2 px-2">
                <span className="text-sm font-bold text-gray-800">{t('chat.pinned_count', { count: pinnedMessages.length })}</span>
                <button onClick={() => setIsPinnedExpanded(false)} className="p-1 hover:bg-gray-100 rounded-full"><ChevronUp className="w-4 h-4 text-gray-500" /></button>
              </div>
              <div className="max-h-40 overflow-y-auto">
                {[...pinnedMessages].reverse().map((pm: any) => (
                  <div key={pm._id} className="flex items-center gap-2 p-2 hover:bg-gray-50 cursor-pointer border-b border-gray-50" onClick={() => {
                    const element = document.getElementById(`msg-${pm._id}`);
                    element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    setIsPinnedExpanded(false);
                  }}>
                    <Pin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span className="text-sm text-gray-700 truncate">{pm.imageUrl ? t('chat.image_bracket') : pm.content}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50" onClick={() => pinnedMessages.length > 1 ? setIsPinnedExpanded(true) : null}>
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-7 h-7 rounded-full bg-blue-50 flex items-center justify-center shrink-0"><Pin className="w-3.5 h-3.5 text-blue-600" /></div>
                <div className="flex flex-col truncate">
                  <span className="text-xs text-blue-600 font-bold">{t('chat.pinned_badge')}</span>
                  <span className="text-sm text-gray-700 truncate">{pinnedMessages[pinnedMessages.length - 1].imageUrl ? t('chat.image_bracket') : pinnedMessages[pinnedMessages.length - 1].content}</span>
                </div>
              </div>
              {pinnedMessages.length > 1 && <ChevronDown className="w-5 h-5 text-gray-400" />}
            </div>
          )}
        </div>
      )}

      {/* --- DANH SÁCH TIN NHẮN --- */}
      <div className="flex-1 overflow-y-auto hidden-scrollbar p-6 space-y-2">
        {filteredMessages.map((msg: any, index: number) => {
          const olderItem = index > 0 ? filteredMessages[index - 1] : null;
          const newerItem = index < filteredMessages.length - 1 ? filteredMessages[index + 1] : null;

          const showTimeDivider = !olderItem || (msg._creationTime - olderItem._creationTime > 3600000);
          const isFirstInGroup = !olderItem || olderItem.senderId !== msg.senderId || (msg._creationTime - olderItem._creationTime > 120000) || showTimeDivider;
          const isLastInGroup = !newerItem || newerItem.senderId !== msg.senderId || (newerItem._creationTime - msg._creationTime > 120000);

          // --- XỬ LÝ TIN NHẮN HỆ THỐNG ---
          if (msg.isSystem) {
            let sysText = msg.content;

            // 👇 SỬA LẠI TÊN KEY DỊCH (từ 'chat.sys_pinned' -> 'sys_pinned') 👇
            if (msg.content.startsWith('SYS_PINNED|')) {
              sysText = t('sys_pinned', { name: msg.content.split('|')[1] });
            } else if (msg.content.startsWith('SYS_UNPINNED|')) {
              sysText = t('sys_unpinned', { name: msg.content.split('|')[1] });
            }

            return (
              <div key={msg._id} id={`msg-${msg._id}`} className="flex flex-col items-center">
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
            <div key={msg._id} id={`msg-${msg._id}`} className="flex flex-col">
              {showTimeDivider && <div className="text-xs font-medium text-gray-400 my-4 text-center">{formatTimeDivider(msg._creationTime, t)}</div>}

              <div className={`flex gap-3 group relative ${isMe ? 'flex-row-reverse' : 'flex-row'} items-end ${hasReactions ? 'mb-4' : (isLastInGroup ? 'mb-2' : 'mb-0.5')}`}>

                {/* Avatar đối phương */}
                {!isMe && (
                  <div className="w-8 h-8 shrink-0">
                    {isLastInGroup && <img src={msg.senderImageUrl || otherUser.imageUrl} alt="Avt" className="w-full h-full rounded-full object-cover" />}
                  </div>
                )}

                {/* Khu vực Bong bóng */}
                <div className={`flex flex-col max-w-[65%] ${isMe ? 'items-end' : 'items-start'} relative`}>

                  {msg.isPinned && !msg.isDeleted && (
                    <div className="flex items-center gap-1 mb-1 text-[10px] text-gray-500 font-medium">
                      <Pin className="w-3 h-3" /> {t('chat.pinned_badge')}
                    </div>
                  )}

                  <div className="flex items-center relative">

                    {/* MENU HÀNH ĐỘNG KHI HOVER */}
                    {!msg.isDeleted && (
                      <div className={`hidden group-hover:flex items-center gap-1 absolute top-1/2 -translate-y-1/2 bg-white border border-gray-200 shadow-sm rounded-lg px-1 py-0.5 z-20 ${isMe ? 'right-full mr-2' : 'left-full ml-2'}`}>

                        <button onClick={() => setActiveMenuId(activeMenuId === msg._id ? null : msg._id)} className="p-1.5 text-gray-400 hover:text-gray-700 rounded transition-colors">
                          <Smile className="w-4 h-4" />
                        </button>

                        <button onClick={() => setReplyingTo(msg)} className="p-1.5 text-gray-400 hover:text-blue-500 rounded transition-colors" title={t('chat.action_reply')}>
                          <Reply className="w-4 h-4" />
                        </button>

                        <button onClick={() => { navigator.clipboard.writeText(msg.content); alert(t('chat.copied')); }} className="p-1.5 text-gray-400 hover:text-gray-700 rounded transition-colors" title={t('chat.action_copy')}>
                          <Copy className="w-4 h-4" />
                        </button>

                        <button onClick={() => togglePin({ messageId: msg._id, conversationId })} className="p-1.5 text-gray-400 hover:text-orange-500 rounded transition-colors" title={msg.isPinned ? t('chat.action_unpin') : t('chat.action_pin')}>
                          <Pin className="w-4 h-4" />
                        </button>

                        <div className="relative">
                          <button
                            onClick={(e) => { e.stopPropagation(); setActiveDropdownId(activeDropdownId === msg._id ? null : msg._id); }}
                            className="p-1.5 text-gray-400 hover:text-gray-700 rounded transition-colors"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {activeDropdownId === msg._id && (
                            <div className={`absolute top-full mt-1 bg-white border border-gray-200 shadow-xl rounded-lg py-1.5 w-48 z-50 ${isMe ? 'right-0' : 'left-0'}`}>
                               {isMe && (
                                 <button onClick={() => { unsend({ messageId: msg._id }); setActiveDropdownId(null); }} className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 font-medium transition-colors">
                                   <Trash2 className="w-4 h-4" /> {t('chat.delete_for_all')}
                                 </button>
                               )}
                               <button onClick={() => { deleteForSelf({ messageId: msg._id }); setActiveDropdownId(null); }} className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 font-medium transition-colors">
                                 <Trash2 className="w-4 h-4" /> {t('chat.delete_for_self')}
                               </button>
                               {!isMe && (
                                 <button onClick={() => { alert(t('chat.report_sent')); setActiveDropdownId(null); }} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 font-medium transition-colors">
                                   <Flag className="w-4 h-4" /> {t('chat.action_report')}
                                 </button>
                               )}
                            </div>
                          )}
                        </div>

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

                      {/* Box Reply bên trong Bong bóng */}
                      {repliedMsg && !msg.isDeleted && (
                        <div className={`mb-2 p-2 rounded-lg border-l-4 ${isMe ? 'bg-white/20 border-white' : 'bg-gray-100 border-[#007aff]'}`}>
                          <p className={`text-xs line-clamp-2 ${isMe ? 'text-gray-100' : 'text-gray-500'}`}>
                            {repliedMsg.isDeleted ? t('chat.msg_recalled') : (repliedMsg.imageUrl ? t('chat.image_bracket') : repliedMsg.content)}
                          </p>
                        </div>
                      )}

                      {/* Content: Shared Post, Image, or Text */}
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
                          {msg.isDeleted ? t('chat.msg_recalled') : msg.content}
                        </span>
                      )}

                      {/* Reactions Badge */}
                      {hasReactions && (
                        <div className={`absolute -bottom-3 ${isMe ? 'right-2' : 'left-2'} bg-white border border-gray-200 shadow-sm rounded-full px-1.5 py-0.5 flex items-center text-xs z-10`}>
                          {uniqueEmojis.join('')}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Trạng thái đã xem */}
                  {isMe && isLastInGroup && index === filteredMessages.length - 1 && (
                    <div className={`flex items-center justify-end gap-1 mt-1.5 text-[11px] text-gray-500 ${hasReactions ? 'mt-4' : ''}`}>
                      {msg.status === 'read' ? <><CheckCheck className="w-3.5 h-3.5 text-blue-500" /> {t('chat.status_read')}</> : <><CheckCheck className="w-3.5 h-3.5" /> {t('chat.status_sent')}</>}
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
            <div className="bg-white border border-gray-100 px-4 py-3 rounded-2xl rounded-bl-sm shadow-sm flex items-center gap-2 w-fit">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></span>
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
              </div>
              <span className="text-xs text-gray-500 italic ml-1">{t('chat.typing')}</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* --- KHUNG NHẬP TIN NHẮN --- */}
      <div className="bg-white border-t border-gray-200 shrink-0 flex flex-col">

        {/* Banner báo đang Reply */}
        {replyingTo && (
          <div className="flex items-center justify-between px-4 py-2 bg-blue-50/50 border-b border-blue-100">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-blue-600 flex items-center gap-1"><Reply className="w-3 h-3" /> {t('chat.replying_to')}</span>
              <span className="text-sm text-gray-600 line-clamp-1">{replyingTo.isDeleted ? t('chat.msg_recalled') : (replyingTo.imageUrl ? t('chat.image_bracket') : replyingTo.content)}</span>
            </div>
            <button onClick={() => setReplyingTo(null)} className="p-1 text-gray-400 hover:text-gray-700 rounded-full transition-colors"><X className="w-4 h-4" /></button>
          </div>
        )}

        <div className="p-4 flex items-center gap-3">
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
              placeholder={isUploading ? t('chat.sending_image') : t('chat.input_placeholder')}
              disabled={isUploading}
              className="flex-1 bg-transparent border-none outline-none text-[15px] text-gray-800 placeholder-gray-400 disabled:opacity-50"
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

      {/* --- MODAL XEM ẢNH PHÓNG TO --- */}
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