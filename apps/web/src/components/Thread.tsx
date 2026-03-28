"use client";

import { useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { useApp } from '../context/AppContext';
import { useUser } from '@clerk/nextjs';
import { MoreHorizontal, Edit2, History, Trash2, Flag, X, Send } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import UserProfileModal from './UserProfileModal';

interface Props {
  thread: any;
  isNested?: boolean;
  isDetailView?: boolean;
  onReplyClick?: (threadId: string, authorName: string) => void;
}

export default function Thread({ thread, isNested = false, isDetailView = false, onReplyClick }: Props) {
  const { setShowAuthModal, activeServerId } = useApp() as any;
  const { t } = useTranslation();

  const { user, isLoaded } = useUser();
  const isLoggedIn = isLoaded && user;

  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');

  const [showOptions, setShowOptions] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showUserProfile, setShowUserProfile] = useState(false);

  const [reportReason, setReportReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [isReporting, setIsReporting] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(thread.content);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const currentUser = useQuery(api.users.current);
  const currentServer = useQuery(api.university.getServerDetails, activeServerId ? { serverId: activeServerId } : "skip");

  const channelsData = useQuery(api.university.getChannels, {
    serverId: thread.serverId || undefined,
    universityId: thread.universityId || undefined
  });
  const myServers = useQuery(api.university.getMyServers);
  const universities = useQuery(api.university.getUniversities);

  const channelName = channelsData?.channels?.find((c: any) => c._id === thread.channelId)?.name;
  const serverName = thread.serverId ? myServers?.find((s: any) => s._id === thread.serverId)?.name : universities?.find((u: any) => u._id === thread.universityId)?.name;

  const isOwner = currentUser?._id === thread.userId;
  const amIAdmin = currentServer && currentUser?._id && (currentServer.creatorId === currentUser._id || currentServer.adminIds?.includes(currentUser._id));

  const likeThread = useMutation(api.messages.likeThread);
  const toggleRepost = useMutation(api.messages.toggleRepost);
  const deleteMessage = useMutation((api as any).messages.deleteThread);
  const createReport = useMutation((api as any).messages.reportMessage);
  const updateThread = useMutation((api as any).messages.updateThread);
  const addThread = useMutation(api.messages.addThread);

  const comments = useQuery(api.messages.getThreadComments, showComments ? { messageId: thread._id } : "skip");

  const isSelf = user?.id && thread.creator?.clerkId && user.id === thread.creator.clerkId;
  const isAnonymous = thread.isAnonymous;
  const displayName = isAnonymous ? t('thread.anonymous_member') : (isSelf ? (user?.fullName || user?.username) : (thread.creator?.first_name || thread.creator?.username || t('settings.default_user')));
  const displayAvatar = isAnonymous ? "https://www.gravatar.com/avatar/0?d=mp&f=y" : (isSelf ? user?.imageUrl : (thread.creator?.imageUrl || `https://ui-avatars.com/api/?name=${displayName}&background=random&color=fff`));

  const handleCommentClick = () => {
    if (!isLoggedIn) return setShowAuthModal(true);

    if (!isDetailView) {
      setShowComments(!showComments);
    } else {
      if (isNested) setShowComments(true);
    }

    if (onReplyClick) {
      onReplyClick(thread._id, displayName);
    } else {
      window.dispatchEvent(new CustomEvent('focusMainReply', { detail: { threadId: thread._id, authorName: displayName } }));
    }
  };

  const handleLike = async () => { if (!isLoggedIn) return setShowAuthModal(true); await likeThread({ messageId: thread._id }); };
  const handleRepost = async () => { if (!isLoggedIn) return setShowAuthModal(true); await toggleRepost({ messageId: thread._id }); };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoggedIn) return setShowAuthModal(true);
    if (!commentText.trim()) return;
    await addThread({ content: commentText.trim(), threadId: thread._id, channelId: thread.channelId, serverId: thread.serverId });
    setCommentText('');
  };

  const handleDelete = async () => {
    setShowOptions(false);
    if (window.confirm(t('thread.confirm_delete_msg'))) await deleteMessage({ messageId: thread._id });
  };

  const handleReportSubmit = async () => {
    setIsReporting(true);
    const finalReason = reportReason === 'reason_other' ? customReason : reportReason;
    try {
      await createReport({ messageId: thread._id, reason: finalReason, serverId: activeServerId });
      alert(t('report.success'));
      setShowReportModal(false);
    } catch (error: any) {
      if (error.message && error.message.includes("ALREADY_REPORTED")) {
        alert(t('report.already_reported'));
      } else {
        alert(t('common.error') + ": " + (error.message || "Lỗi hệ thống"));
      }
    } finally {
      setIsReporting(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editContent.trim() || editContent === thread.content) { setIsEditing(false); return; }
    setIsSavingEdit(true);
    try {
      await updateThread({ messageId: thread._id, content: editContent });
      setIsEditing(false);
    } catch (e) { alert(t('common.error')); }
    setIsSavingEdit(false);
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/post/${thread._id}`;
    try {
      await navigator.clipboard.writeText(t('thread.share_text', { url }));
      alert(t('chat.copied'));
    } catch(err) { console.error(err); }
  };

  const handleGoToProfile = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!thread.isAnonymous && thread.creator?._id) setShowUserProfile(true);
  };

  const timeString = new Date(thread._creationTime).toLocaleString(t('settings.app_language') === 'en' ? 'en-US' : 'vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });

  return (
    <div className={`bg-white ${isNested ? 'pt-3 pb-1' : 'p-4 border-b border-gray-200'} hover:bg-gray-50 transition-colors relative cursor-default`}>

      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-3 w-full min-w-0">
          <img loading="lazy"src={displayAvatar} alt="Avatar" onClick={handleGoToProfile} className={`${isNested ? 'w-8 h-8' : 'w-10 h-10'} rounded-full object-cover border border-gray-100 shrink-0 ${!isAnonymous ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`} />
          <div className="flex-1 min-w-0 pr-2">
            <div className="flex items-center gap-2">
              <h4 onClick={handleGoToProfile} className={`font-bold text-gray-800 ${isNested ? 'text-[14px]' : 'text-[15px]'} truncate ${!isAnonymous ? 'cursor-pointer hover:underline' : ''}`}>{displayName}</h4>
              {isAnonymous && <span className="text-xs shrink-0" title={t('common.anonymous')}>🎭</span>}
              {!isAnonymous && thread.isServerAdmin && <span className="bg-red-100 text-red-600 text-[10px] px-1.5 py-0.5 rounded font-bold shrink-0">{t('thread.admin_badge')}</span>}
              <div className="flex items-center gap-1 shrink-0"><span className="text-gray-400 text-[10px]">•</span><p className="text-[12px] text-gray-500">{timeString}</p>{thread.editHistory && thread.editHistory.length > 0 && <span className="text-[11px] text-gray-400 italic">({t('thread.edited').replace(' (', '').replace(')', '')})</span>}</div>
            </div>
            {(!isNested && (channelName || serverName)) && (
              <div className="flex items-center text-[12px] font-medium text-gray-500 mt-0.5 truncate w-full">
                {channelName && <span className="text-[#007AFF] hover:underline cursor-pointer truncate">#{channelName}</span>}
                {channelName && serverName && <span className="mx-1.5 shrink-0">•</span>}
                {serverName && <span className="truncate">{serverName}</span>}
              </div>
            )}
          </div>
        </div>

        <div className="relative shrink-0">
          <button onClick={(e) => { e.stopPropagation(); isLoggedIn ? setShowOptions(!showOptions) : setShowAuthModal(true); }} className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"><MoreHorizontal className="w-5 h-5" /></button>
          {showOptions && (
            <>
              <div className="fixed inset-0 z-[40]" onClick={(e) => { e.stopPropagation(); setShowOptions(false); }}></div>
              <div className="absolute right-0 mt-1 w-56 bg-white rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.1)] border border-gray-100 z-[50] py-1.5 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                {isOwner ? (
                  <><button onClick={(e) => { e.stopPropagation(); setIsEditing(true); setShowOptions(false); }} className="w-full flex items-center px-4 py-2.5 text-[14px] text-gray-700 hover:bg-gray-50 transition-colors"><Edit2 className="w-4 h-4 mr-3 text-gray-400" /> {t('thread.opt_edit')}</button><button onClick={(e) => { e.stopPropagation(); setShowHistoryModal(true); setShowOptions(false); }} className="w-full flex items-center px-4 py-2.5 text-[14px] text-gray-700 hover:bg-gray-50 transition-colors"><History className="w-4 h-4 mr-3 text-gray-400" /> {t('thread.opt_history')}</button><div className="h-px bg-gray-100 my-1"></div><button onClick={(e) => { e.stopPropagation(); handleDelete(); }} className="w-full flex items-center px-4 py-2.5 text-[14px] text-red-600 hover:bg-red-50 font-medium transition-colors"><Trash2 className="w-4 h-4 mr-3 text-red-500" /> {t('thread.opt_delete')}</button></>
                ) : (
                  <><button onClick={(e) => { e.stopPropagation(); setShowReportModal(true); setShowOptions(false); }} className="w-full flex items-center px-4 py-2.5 text-[14px] text-gray-700 hover:bg-gray-50 transition-colors"><Flag className="w-4 h-4 mr-3 text-gray-400" /> {t('thread.opt_report')}</button><button onClick={(e) => { e.stopPropagation(); setShowHistoryModal(true); setShowOptions(false); }} className="w-full flex items-center px-4 py-2.5 text-[14px] text-gray-700 hover:bg-gray-50 transition-colors"><History className="w-4 h-4 mr-3 text-gray-400" /> {t('thread.opt_history')}</button>
                    {amIAdmin && (<><div className="h-px bg-gray-100 my-1"></div><button onClick={(e) => { e.stopPropagation(); handleDelete(); }} className="w-full flex items-center px-4 py-2.5 text-[14px] text-red-600 hover:bg-red-50 font-medium transition-colors"><Trash2 className="w-4 h-4 mr-3 text-red-500" /> {t('thread.opt_delete_admin')}</button></>)}
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="mb-4">
        {isEditing ? (
          <div className="bg-[#f2f3f5] p-3 rounded-xl border border-gray-200" onClick={e => e.stopPropagation()}>
            <textarea value={editContent} onChange={e => setEditContent(e.target.value)} className="w-full bg-transparent outline-none text-[15px] resize-none min-h-[80px]" autoFocus />
            <div className="flex justify-end gap-2 mt-2"><button onClick={() => { setIsEditing(false); setEditContent(thread.content); }} className="px-4 py-1.5 rounded-lg text-sm font-bold text-gray-600 hover:bg-gray-200">{t('common.cancel')}</button><button onClick={handleSaveEdit} disabled={isSavingEdit || !editContent.trim()} className="px-4 py-1.5 rounded-lg text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50">{isSavingEdit ? '...' : t('common.save')}</button></div>
          </div>
        ) : (
          <p className={`text-gray-800 whitespace-pre-wrap leading-relaxed ${isNested ? 'text-[14px]' : 'text-[15px]'}`}>{thread.content}</p>
        )}
        
        {/* 👇 HIỂN THỊ ẢNH ĐÃ ĐƯỢC CHỈNH LẠI CSS 👇 */}
        {thread.mediaFiles && thread.mediaFiles.length > 0 && (
          <div className={`mt-3 grid gap-2 ${thread.mediaFiles.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
            {thread.mediaFiles.map((url: string, idx: number) => (
              <img 
                loading="lazy"
                key={idx} 
                src={url} 
                alt="Media" 
                className={`rounded-xl border border-gray-100 ${
                  thread.mediaFiles.length === 1 
                  ? 'w-full max-h-[500px] object-contain bg-[#f8f9fa]' 
                  : 'w-full h-56 object-cover'
                }`} 
              />
            ))}
          </div>
        )}
      </div>

      <div className={`flex items-center gap-6 pt-3 ${isNested ? 'mt-1' : 'border-t border-gray-100'}`}>
        <button onClick={(e) => { e.stopPropagation(); handleLike(); }} className={`flex items-center gap-1.5 font-medium transition-colors ${thread.isLiked ? 'text-red-500' : 'text-gray-500 hover:text-red-500'}`}><svg className="w-5 h-5 transition-transform active:scale-75" fill={thread.isLiked ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={thread.isLiked ? 0 : 2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg><span className="text-sm">{thread.likeCount || 0}</span></button>
        <button onClick={(e) => { e.stopPropagation(); handleCommentClick(); }} className="flex items-center gap-1.5 text-gray-500 hover:text-green-600 font-medium transition-colors"><svg className="w-5 h-5 transition-transform active:scale-75" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg><span className="text-sm">{thread.commentCount || 0}</span></button>
        <button onClick={(e) => { e.stopPropagation(); handleRepost(); }} className={`flex items-center gap-1.5 font-medium transition-colors ${thread.isReposted ? 'text-blue-500' : 'text-gray-500 hover:text-blue-500'}`}><svg className="w-5 h-5 transition-transform active:scale-75" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg><span className="text-sm">{thread.retweetCount || 0}</span></button>
        <button onClick={handleShare} className="flex items-center gap-1.5 text-gray-500 hover:text-[#007AFF] font-medium transition-colors"><Send className="w-5 h-5 transition-transform active:scale-75 -rotate-12" /><span className="text-sm">{thread.shareCount || 0}</span></button>
      </div>

      {showComments && (
        <div className={`mt-3 ${isNested ? '' : 'pt-4 border-t border-gray-100'} animate-in fade-in slide-in-from-top-2 duration-200`} onClick={e => e.stopPropagation()}>

          {(!isDetailView && thread.allowComments !== false) && (
            <form onSubmit={handleCommentSubmit} className={`flex gap-3 mb-4 ${isNested ? 'pl-2' : ''}`}>
              <img loading="lazy"src={user?.imageUrl || "https://ui-avatars.com/api/?name=Guest"} alt="Avt" className="w-8 h-8 rounded-full object-cover shrink-0 border border-gray-200" />
              <div className="flex-1 flex bg-[#f2f3f5] rounded-xl border border-transparent focus-within:border-green-400 focus-within:bg-white transition-all overflow-hidden px-2">
                <input type="text" value={commentText} onChange={(e) => setCommentText(e.target.value)} onClick={() => !isLoggedIn && setShowAuthModal(true)} readOnly={!isLoggedIn} placeholder={isLoggedIn ? t('thread.reply_placeholder') : t('login.login_button')} className={`flex-1 bg-transparent py-2.5 px-2 outline-none text-sm text-gray-800 ${!isLoggedIn ? 'cursor-pointer' : 'cursor-text'}`} />
                <button type="submit" disabled={!commentText.trim() || !isLoggedIn} className="px-3 text-green-600 font-bold text-sm disabled:opacity-50 transition-colors">{t('thread.send')}</button>
              </div>
            </form>
          )}

          {comments === undefined ? (
            <div className="text-center text-xs text-gray-400 py-2">{t('chat.loading')}</div>
          ) : comments.length === 0 ? (
            !isDetailView && <div className="text-center text-xs text-gray-400 py-2">{t('comments.no_comments')}</div>
          ) : (
            <div className="flex flex-col relative border-l-[2px] border-gray-100 ml-4 pl-3">
              {comments.map((comment: any) => (
                <div key={comment._id} className="relative z-10 mb-1">
                  <div className="absolute -left-[14px] top-6 w-3 h-4 border-b-[2px] border-l-[2px] border-gray-100 rounded-bl-xl -z-10"></div>
                  <Thread thread={comment} isNested={true} isDetailView={isDetailView} onReplyClick={onReplyClick} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showHistoryModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in" onClick={(e) => { e.stopPropagation(); setShowHistoryModal(false); }}>
          <div className="bg-white rounded-2xl w-full max-w-[450px] p-6 shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}><div className="flex justify-between items-center mb-4"><h2 className="text-[18px] font-extrabold text-gray-900">{t('thread.edit_history')}</h2><button onClick={() => setShowHistoryModal(false)} className="text-gray-400 hover:text-gray-800"><X className="w-5 h-5"/></button></div><div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2 hidden-scrollbar">{(!thread.editHistory || thread.editHistory.length === 0) ? (<div className="text-center text-gray-400 italic py-6">{t('thread.no_edit_history')}</div>) : ([...thread.editHistory].reverse().map((history: any, idx: number) => (<div key={idx} className="bg-[#f2f3f5] p-3 rounded-xl border border-gray-100"><p className="text-xs text-gray-500 font-bold mb-1.5">{new Date(history.editedAt).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })}</p><p className="text-sm text-gray-800">{history.content}</p></div>)))}</div></div>
        </div>
      )}

      {showReportModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in" onClick={(e) => { e.stopPropagation(); setShowReportModal(false); }}>
          <div className="bg-white rounded-2xl w-full max-w-[450px] p-6 shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}><h2 className="text-[20px] font-extrabold text-gray-900 mb-1">{t('report.title')}</h2><p className="text-sm text-gray-500 mb-5 border-b border-gray-100 pb-4">{t('alerts.report_thanks')}</p><div className="space-y-3 mb-6 max-h-[40vh] overflow-y-auto pr-2 hidden-scrollbar">{['reason_spam', 'reason_harassment', 'reason_inappropriate', 'reason_wrong_channel', 'reason_minors', 'reason_adult', 'reason_other'].map(r => (<label key={r} className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors"><input type="radio" name="report_reason" value={r} checked={reportReason === r} onChange={(e) => setReportReason(e.target.value)} className="w-4 h-4 text-[#5865F2] cursor-pointer" /><span className="text-[14px] font-medium text-gray-800">{t(`report.${r}`)}</span></label>))}{reportReason === 'reason_other' && <div className="mt-3"><textarea placeholder={t('report.custom_reason_placeholder')} className="w-full border border-gray-200 bg-gray-50 rounded-xl p-3 text-[14px] outline-none min-h-[80px]" onChange={e => setCustomReason(e.target.value)} autoFocus /></div>}</div><div className="flex gap-3"><button onClick={() => setShowReportModal(false)} className="flex-1 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold transition-colors text-[14px]">{t('common.cancel')}</button><button onClick={handleReportSubmit} disabled={!reportReason || (reportReason === 'reason_other' && !customReason.trim()) || isReporting} className="flex-1 py-3 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold disabled:bg-indigo-300 text-[14px] flex justify-center items-center">{isReporting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : t('common.confirm')}</button></div></div>
        </div>
      )}

      {showUserProfile && thread.creator?._id && <UserProfileModal onClose={() => setShowUserProfile(false)} targetUserId={thread.creator._id} />}
    </div>
  );
}