"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { usePaginatedQuery, useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { useApp } from "@/context/AppContext";
import Thread from "./Thread";
import { useUser } from "@clerk/nextjs";
import { useTranslation } from "react-i18next";
import { useRouter } from "next/navigation";
import { Bell, BellOff, Search, ChevronRight, X, User, Server, Hash, MessageSquare, ArrowLeft, Send } from "lucide-react";

export default function Feed() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useUser();
  const isLoggedIn = user !== null;
  const scrollRef = useRef<HTMLDivElement>(null);

  const {
    activeServerId, activeUniversityId, activeChannelId, activeChannelName,
    setShowComposeModal, setShowAuthModal,
    setActiveServerId, setActiveUniversityId, setActiveChannelId
  } = useApp() as any;

  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [showCustomNotifModal, setShowCustomNotifModal] = useState(false);

  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [searchTab, setSearchTab] = useState<'users' | 'servers' | 'channel' | 'server'>('users');

  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'newest' | 'trending'>('newest');

  const { results, status, loadMore } = usePaginatedQuery(
    api.messages.getThreads,
    { channelId: activeChannelId || undefined, sortBy: sortBy },
    { initialNumItems: 10 }
  );

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    if (scrollHeight - scrollTop - clientHeight < 100 && status === "CanLoadMore") {
      loadMore(5);
    }
  }, [status, loadMore]);

  const targetWorkspaceId = activeServerId || activeUniversityId;
  const isLobby = activeChannelName === 'đại-sảnh' || activeChannelName === 'chung';

  const subStatus = useQuery(api.messages.getSubscriptionStatus, {
    channelId: activeChannelId ? (activeChannelId as Id<"channels">) : undefined,
    serverId: activeServerId ? (activeServerId as Id<"servers">) : undefined,
    universityId: activeUniversityId ? (activeUniversityId as Id<"universities">) : undefined,
  });

  const customChannels = useQuery(api.messages.getServerChannelsWithSubStatus, targetWorkspaceId ? {
    serverId: activeServerId ? (activeServerId as Id<"servers">) : undefined,
    universityId: activeUniversityId ? (activeUniversityId as Id<"universities">) : undefined,
  } : "skip");

  const toggleServerSub = useMutation(api.messages.toggleServerSubscription);
  const toggleChannelSub = useMutation(api.messages.toggleChannelSubscription);

  const handleToggleServer = async (action: 'on' | 'off') => {
    try {
      await toggleServerSub({ serverId: activeServerId ? (activeServerId as Id<"servers">) : undefined, universityId: activeUniversityId ? (activeUniversityId as Id<"universities">) : undefined, action });
      setShowNotifMenu(false);
    } catch (e) { console.error(e); }
  };

  const handleToggleCurrentChannel = async () => {
    if (!activeChannelId) return;
    try { await toggleChannelSub({ channelId: activeChannelId as Id<"channels"> }); }
    catch (e) { console.error(e); }
  };

  const handleToggleSpecificChannel = async (channelId: string) => {
    try { await toggleChannelSub({ channelId: channelId as Id<"channels"> }); }
    catch (e) { console.error(e); }
  };

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(searchQuery), 500);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const searchUsersResult = useQuery(api.users.searchUsers, searchTab === 'users' && debouncedSearch ? { search: debouncedSearch } : "skip");
  const searchServersResult = useQuery((api as any).university.searchServers, searchTab === 'servers' && debouncedSearch ? { search: debouncedSearch } : "skip");
  const searchChannelPosts = useQuery(api.messages.searchMessages, searchTab === 'channel' && debouncedSearch ? { search: debouncedSearch, channelId: activeChannelId as Id<"channels"> } : "skip");
  const searchServerPosts = useQuery(api.messages.searchMessages, searchTab === 'server' && debouncedSearch && targetWorkspaceId ? { search: debouncedSearch, ...(activeServerId ? { serverId: activeServerId } : { universityId: activeUniversityId }) } : "skip");

  const joinServer = useMutation((api as any).university.joinServer);

  const handleServerClick = async (server: any) => {
    if (!isLoggedIn) { setShowSearchModal(false); return setShowAuthModal(true); }
    if (server.isJoined) {
      setActiveUniversityId(''); setActiveServerId(server._id); setActiveChannelId(''); setShowSearchModal(false);
    } else {
      try {
        await joinServer({ serverId: server._id });
        setActiveUniversityId(''); setActiveServerId(server._id); setActiveChannelId(''); setShowSearchModal(false);
      } catch (error: any) {
        if (error.message.includes("SERVER_LIMIT_REACHED")) alert(t('server_errors.server_limit_reached'));
        else alert(t('common.error') + ": " + error.message);
      }
    }
  };

  if (selectedThreadId) {
    return <PostDetailView messageId={selectedThreadId} onBack={() => setSelectedThreadId(null)} />;
  }

  return (
    <div className="flex-1 flex flex-col h-full relative">
      <div className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 shrink-0 z-10 shadow-sm sticky top-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-gray-400 text-2xl font-light">#</span><span className="font-bold text-gray-800 text-[16px] truncate">{activeChannelName || t('common.lobby')}</span>
        </div>
        <div className="flex items-center gap-4 relative shrink-0 ml-2">
          <div onClick={() => setShowSearchModal(true)} className="hidden md:flex items-center bg-[#f2f3f5] px-2.5 py-1.5 rounded-md border border-transparent hover:border-gray-300 cursor-pointer transition-colors">
            <span className="w-40 text-sm text-gray-500 truncate select-none">{t('follow_list.search_placeholder')}</span><Search className="w-4 h-4 text-gray-500 ml-1" />
          </div>
          <div className="relative flex items-center justify-center">
            <button onClick={() => setShowNotifMenu(!showNotifMenu)} className="p-1.5 text-gray-500 hover:text-gray-800 transition-colors rounded-full hover:bg-gray-100" title={t('common.notification')}>
              {subStatus?.channelSubbed ? <Bell className="w-5 h-5 text-[#007AFF]" fill="currentColor" /> : <BellOff className="w-5 h-5 text-gray-400" />}
            </button>
            {showNotifMenu && (
              <><div className="fixed inset-0 z-[40]" onClick={() => setShowNotifMenu(false)}></div><div className="absolute right-0 top-10 w-72 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-xl border border-gray-100 z-[50] py-2 animate-in fade-in slide-in-from-top-2"><div className="px-4 py-2 font-extrabold text-[15px] text-center text-gray-800 border-b border-gray-100 mb-1 pb-3">{t('feed.notification_settings')}</div>{!isLobby && (<div className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer" onClick={handleToggleCurrentChannel}><span className="text-[14px] text-gray-700">{t('feed.notify_this_channel')}</span><div className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${subStatus?.channelSubbed ? 'bg-[#007AFF]' : 'bg-gray-200'}`}><span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${subStatus?.channelSubbed ? 'translate-x-5' : 'translate-x-0.5'}`} /></div></div>)}<button onClick={() => handleToggleServer('on')} className="w-full flex items-center justify-between px-4 py-3 text-[14px] text-gray-700 hover:bg-gray-50 transition-colors"><span>{t('feed.turn_on_all_server')}</span><Bell className="w-4 h-4 text-gray-500" /></button><button onClick={() => handleToggleServer('off')} className="w-full flex items-center justify-between px-4 py-3 text-[14px] text-red-500 hover:bg-red-50 transition-colors"><span>{t('feed.turn_off_all_server')}</span><BellOff className="w-4 h-4 text-red-500" /></button><div className="h-px bg-gray-100 my-1"></div><button onClick={() => { setShowNotifMenu(false); setShowCustomNotifModal(true); }} className="w-full flex items-center justify-between px-4 py-3 text-[14px] text-gray-700 hover:bg-gray-50 transition-colors"><span>{t('feed.custom_per_channel')}</span><ChevronRight className="w-4 h-4 text-gray-400" /></button></div></>
            )}
          </div>
        </div>
      </div>

      <div id="main-scroll-area" ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto hidden-scrollbar p-4 pb-20">
        <div className="flex flex-col bg-white border border-gray-200 rounded-2xl overflow-hidden mb-10 shadow-sm">
            {!isLobby && (
              <div onClick={() => isLoggedIn ? setShowComposeModal(true) : setShowAuthModal(true)} className="p-4 border-b border-gray-200 flex items-center gap-3 cursor-pointer hover:bg-gray-50 transition-colors">
                <img src={user?.imageUrl || "https://ui-avatars.com/api/?name=Guest&background=E5E7EB&color=9CA3AF"} alt="My Avatar" className="w-10 h-10 rounded-full object-cover shrink-0 border border-gray-200" />
                <span className="text-gray-400 text-[15px] font-medium flex-1 pt-0.5">{t('composer.whats_on_your_mind')}</span><button className="px-5 py-1.5 bg-gray-900 text-white font-semibold rounded-full text-sm">{t('composer.post')}</button>
              </div>
            )}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50/50">
              <span className="font-extrabold text-[15px] text-gray-900">{t('feed.posts_title')}</span>
              <div className="relative">
                <select value={sortBy} onChange={e => setSortBy(e.target.value as 'newest' | 'trending')} className="appearance-none bg-white border border-gray-200 shadow-sm text-[13px] font-bold text-gray-700 py-1.5 pl-3 pr-8 rounded-lg outline-none cursor-pointer hover:bg-gray-50 transition-colors"><option value="newest">{t('feed.sort_newest')}</option><option value="trending">{t('feed.sort_trending')}</option></select>
                <svg className="w-3.5 h-3.5 text-gray-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </div>
            </div>

            <div className="flex flex-col">
              {results.map((thread) => (
                <div key={thread._id} onClick={() => setSelectedThreadId(thread._id)} className="cursor-pointer hover:bg-gray-50 transition-colors">
                  <Thread thread={thread as any} />
                </div>
              ))}
            </div>
            {(status === "LoadingFirstPage" || status === "LoadingMore") && <div className="flex justify-center items-center p-8"><div className="animate-spin h-6 w-6 border-2 border-gray-400 border-t-transparent rounded-full"></div></div>}
            {status === "Exhausted" && results.length > 0 && <p className="text-center text-gray-400 text-sm py-6 border-t border-gray-100">{t('profile_tabs.no_posts')}</p>}
            {!results.length && status !== "LoadingFirstPage" && <div className="text-center text-gray-500 py-20 flex flex-col items-center"><svg className="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg><p className="font-bold mb-1">{t('channel_details.default_desc')}</p><p className="text-sm">{t('comments.no_comments')}</p></div>}
        </div>
      </div>

      {showCustomNotifModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in" onClick={() => setShowCustomNotifModal(false)}>
          <div className="bg-[#f2f3f5] w-full max-w-[400px] max-h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-200 bg-white flex justify-between items-center shrink-0"><h2 className="text-[18px] font-extrabold text-gray-900">{t('feed.custom_per_channel')}</h2><button onClick={() => setShowCustomNotifModal(false)} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-full transition-colors"><X className="w-5 h-5"/></button></div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-white hidden-scrollbar">
              {customChannels?.map((channel: any) => (<div key={channel._id} className="flex items-center justify-between p-3 border-b border-gray-50 hover:bg-gray-50 transition-colors"><span className="text-[15px] font-medium text-gray-800 flex items-center gap-2"><Hash className="w-4 h-4 text-gray-400"/> {channel.name}</span><button onClick={() => handleToggleSpecificChannel(channel._id)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${channel.isSubscribed ? 'bg-[#007AFF]' : 'bg-gray-200'}`}><span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${channel.isSubscribed ? 'translate-x-5' : 'translate-x-0.5'}`} /></button></div>))}
            </div>
          </div>
        </div>
      )}

      {showSearchModal && (
        <div className="fixed inset-0 z-[99999] flex items-start justify-center bg-black/60 backdrop-blur-sm pt-[10vh] animate-in fade-in" onClick={() => setShowSearchModal(false)}>
          <div className="bg-white w-full max-w-[750px] h-[75vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-100 shrink-0"><div className="bg-gray-100 rounded-xl flex items-center px-4 py-3"><Search className="w-5 h-5 text-gray-400 mr-3" /><input type="text" autoFocus placeholder={t('follow_list.search_placeholder')} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="bg-transparent border-none outline-none flex-1 text-[16px] text-gray-800" />{searchQuery && <button onClick={() => setSearchQuery('')} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5"/></button>}</div></div>
            <div className="border-b border-gray-100 shrink-0"><div className="flex px-2 w-max min-w-full"><button onClick={() => setSearchTab('users')} className={`px-4 py-3 text-[14px] font-bold whitespace-nowrap shrink-0 border-b-2 transition-colors flex items-center gap-2 ${searchTab === 'users' ? 'border-[#007AFF] text-[#007AFF]' : 'border-transparent text-gray-500 hover:bg-gray-50'}`}><User className="w-4 h-4 shrink-0"/> {t('search.tab_users')}</button><button onClick={() => setSearchTab('servers')} className={`px-4 py-3 text-[14px] font-bold whitespace-nowrap shrink-0 border-b-2 transition-colors flex items-center gap-2 ${searchTab === 'servers' ? 'border-[#007AFF] text-[#007AFF]' : 'border-transparent text-gray-500 hover:bg-gray-50'}`}><Server className="w-4 h-4 shrink-0"/> {t('search.tab_servers')}</button><button onClick={() => setSearchTab('channel')} className={`px-4 py-3 text-[14px] font-bold whitespace-nowrap shrink-0 border-b-2 transition-colors flex items-center gap-2 ${searchTab === 'channel' ? 'border-[#007AFF] text-[#007AFF]' : 'border-transparent text-gray-500 hover:bg-gray-50'}`}><Hash className="w-4 h-4 shrink-0"/> {t('search.tab_channel_posts')}</button>{(activeServerId || activeUniversityId) && (<button onClick={() => setSearchTab('server')} className={`px-4 py-3 text-[14px] font-bold whitespace-nowrap shrink-0 border-b-2 transition-colors flex items-center gap-2 ${searchTab === 'server' ? 'border-[#007AFF] text-[#007AFF]' : 'border-transparent text-gray-500 hover:bg-gray-50'}`}><MessageSquare className="w-4 h-4 shrink-0"/> {t('search.tab_server_posts')}</button>)}</div></div>
            <div className="flex-1 overflow-y-auto bg-[#f2f3f5] p-4 hidden-scrollbar">
              {!debouncedSearch ? (<div className="h-full flex flex-col items-center justify-center text-gray-400"><Search className="w-12 h-12 mb-3 opacity-20" /><p>{t('follow_list.search_placeholder')}</p></div>) : (<div className="space-y-3">{searchTab === 'users' && searchUsersResult?.map((u: any) => (<div key={u._id} onClick={() => { setShowSearchModal(false); router.push(`/profile/${u._id}`); }} className="bg-white p-3 rounded-xl flex items-center gap-3 cursor-pointer hover:bg-blue-50 transition-colors border border-gray-100 shadow-sm"><img src={u.imageUrl || "https://ui-avatars.com/api/?name=U"} className="w-10 h-10 rounded-full object-cover"/><div><div className="font-bold text-gray-900 text-[15px]">{u.first_name || u.username}</div><div className="text-[13px] text-gray-500">@{u.username}</div></div></div>))}{searchTab === 'servers' && searchServersResult?.map((s: any) => (<div key={s._id} className="bg-white p-3 rounded-xl flex items-center gap-3 border border-gray-100 shadow-sm"><img src={s.icon || "https://ui-avatars.com/api/?name=S"} className="w-12 h-12 rounded-xl object-cover border border-gray-200"/><div className="flex-1"><div className="font-bold text-gray-900 text-[15px]">{s.name}</div><div className="text-[13px] text-gray-500">{s.memberIds?.length || 0} {t('common.member')}</div></div><button onClick={() => handleServerClick(s)} className={`px-4 py-1.5 rounded-full text-sm font-bold ${s.isJoined ? 'bg-gray-100 text-gray-600' : 'bg-[#007AFF] hover:bg-blue-600 text-white'} transition-colors`}>{s.isJoined ? t('search.joined') : t('search.join')}</button></div>))}{(searchTab === 'channel' || searchTab === 'server') && (() => { const results = searchTab === 'channel' ? searchChannelPosts : searchServerPosts; if (results === undefined) return <div className="text-center py-10"><span className="animate-spin w-6 h-6 border-2 border-[#007AFF] border-t-transparent rounded-full inline-block"></span></div>; if (results.length === 0) return <div className="text-center text-gray-400 py-10">{t('search.no_results')}</div>; return results.map((thread: any) => (<div key={thread._id} className="rounded-xl overflow-hidden shadow-sm border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => { setShowSearchModal(false); setSelectedThreadId(thread._id); }}><div className="pointer-events-none"><Thread thread={thread} /></div></div>)); })()}</div>)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =========================================================================
// COMPONENT: MÀN HÌNH CHI TIẾT BÀI VIẾT
// =========================================================================
function PostDetailView({ messageId, onBack }: { messageId: string, onBack: () => void }) {
  const { t } = useTranslation();
  const { user } = useUser();
  const mainThread = useQuery(api.messages.getThreadById, { messageId: messageId as Id<"messages"> });
  const comments = useQuery(api.messages.getThreadComments, { messageId: messageId as Id<"messages"> });
  const addThread = useMutation(api.messages.addThread);

  const [replyContent, setReplyContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [replyTargetId, setReplyTargetId] = useState<string | null>(null);
  const [replyTargetName, setReplyTargetName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleFocusMainReply = (e: any) => {
      setReplyTargetId(e.detail.threadId);
      setReplyTargetName(e.detail.authorName);
      if (inputRef.current) inputRef.current.focus();
    };

    window.addEventListener('focusMainReply', handleFocusMainReply);
    return () => window.removeEventListener('focusMainReply', handleFocusMainReply);
  }, []);

  if (mainThread === undefined || comments === undefined) return <div className="flex-1 flex justify-center items-center h-full"><div className="animate-spin w-6 h-6 border-2 border-[#007AFF] border-t-transparent rounded-full"></div></div>;
  if (mainThread === null) return (<div className="flex-1 flex flex-col h-full bg-white relative"><div className="h-14 flex items-center justify-center px-4 border-b border-gray-200 relative shrink-0"><button onClick={onBack} className="absolute left-2 p-2 hover:bg-gray-100 rounded-full transition-colors cursor-pointer" title={t('feed_layout.back')}><ArrowLeft className="w-6 h-6 text-gray-900" /></button><span className="font-bold text-[18px] text-gray-900">{t('post_detail.title')}</span></div><div className="flex-1 flex justify-center items-center"><p className="text-gray-500 font-medium">{t('thread.post_not_exist')}</p></div></div>);

  const handleReply = async () => {
     if (!replyContent.trim()) return;
     setIsSubmitting(true);
     try {
        await addThread({
          content: replyContent.trim(),
         threadId: (replyTargetId as Id<"messages">) || mainThread._id,
          channelId: mainThread.channelId,
          serverId: mainThread.serverId,
          universityId: mainThread.universityId
        });
        setReplyContent("");
        setReplyTargetId(null);
        setReplyTargetName(null);
     } catch (e) { console.error(e); } finally { setIsSubmitting(false); }
  };

  const authorName = mainThread.isAnonymous ? t('post_detail.anonymous_member') : (mainThread.creator?.first_name || mainThread.creator?.username || t('settings.default_user'));

  return (
     <div className="flex-1 flex flex-col h-full bg-white relative animate-in fade-in slide-in-from-right-4 duration-200">
        <div className="h-14 flex items-center justify-center px-4 border-b border-gray-200 shrink-0 bg-white sticky top-0 relative z-10">
           <button onClick={onBack} className="absolute left-2 p-2 hover:bg-gray-100 rounded-full transition-colors cursor-pointer" title={t('feed_layout.back')}><ArrowLeft className="w-6 h-6 text-gray-900" /></button>
           <span className="font-bold text-[18px] text-gray-900">{t('post_detail.title')}</span>
        </div>

        <div className="flex-1 overflow-y-auto hidden-scrollbar pb-24">
           <div className="border-b border-gray-100 shadow-sm">
             {/* 👇 TRUYỀN CỜ XÁC NHẬN ĐANG Ở TRANG CHI TIẾT 👇 */}
             <Thread thread={mainThread as any} isDetailView={true} />
           </div>
           <div className="px-4 py-2 mt-2">
              {comments.length === 0 ? (
                 <p className="text-center text-gray-400 italic text-[14px] py-10">{t('comments.no_comments')}</p>
              ) : (
                 <div className="flex flex-col border-l-2 border-gray-100 ml-[26px] pl-4 space-y-2 pb-10">
                    {comments.map((comment: any) => (
                       <div key={comment._id} className="relative">
                          <div className="absolute -left-[18px] top-8 w-4 h-4 border-b-2 border-l-2 border-gray-200 rounded-bl-xl"></div>
                          {/* 👇 TRUYỀN CỜ XÁC NHẬN ĐANG Ở TRANG CHI TIẾT 👇 */}
                          <Thread thread={comment as any} isDetailView={true} isNested={true} />
                       </div>
                    ))}
                 </div>
              )}
           </div>
        </div>

        {mainThread.allowComments === false ? (
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gray-50 border-t border-gray-200 shadow-[0_-4px_10px_rgba(0,0,0,0.02)] z-50">
               <p className="text-center text-gray-500 text-[14px]">{t('post_detail.comments_disabled_msg')}</p>
            </div>
        ) : (
            <div className="absolute bottom-0 left-0 right-0 p-3 bg-white border-t border-gray-200 shadow-[0_-4px_10px_rgba(0,0,0,0.02)] z-50">

               {replyTargetName && (
                 <div className="flex items-center justify-between bg-blue-50 px-3 py-1.5 rounded-t-xl mx-2 border border-blue-100 mb-[-5px]">
                   <span className="text-xs text-blue-600 font-medium">
                     {t('chat.replying_to', {defaultValue: 'Đang trả lời'})} <span className="font-bold">@{replyTargetName}</span>...
                   </span>
                   <button onClick={() => { setReplyTargetId(null); setReplyTargetName(null); }} className="text-blue-400 hover:text-blue-700">
                     <X className="w-3.5 h-3.5" />
                   </button>
                 </div>
               )}

               <div className="flex items-center gap-3 bg-[#f2f3f5] rounded-full px-4 py-2 relative z-10">
                  <img src={user?.imageUrl || "https://ui-avatars.com/api/?name=U"} alt="avatar" className="w-8 h-8 rounded-full object-cover border border-gray-200" />

                  <input
                    type="text"
                    ref={inputRef}
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    placeholder={replyTargetName ? `${t('thread.reply_placeholder')} @${replyTargetName}...` : t('post_detail.add_reply_to', { name: authorName })}
                    className="flex-1 bg-transparent border-none outline-none text-[15px] text-gray-800 placeholder-gray-500"
                    onKeyDown={(e) => { if (e.key === 'Enter') handleReply(); }}
                  />

                  <button onClick={handleReply} disabled={!replyContent.trim() || isSubmitting} className="p-1 text-[#007AFF] hover:text-blue-600 disabled:text-gray-400 transition-colors font-bold text-[14px]">{isSubmitting ? t('chat.loading') : <Send className="w-5 h-5" />}</button>
               </div>
            </div>
        )}
     </div>
  );
}