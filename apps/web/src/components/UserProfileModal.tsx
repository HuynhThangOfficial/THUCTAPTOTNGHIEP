"use client";

import { useState } from 'react';
import { useQuery, usePaginatedQuery, useMutation } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { Id } from '../../../../convex/_generated/dataModel';
import { useUser } from '@clerk/nextjs';
import Thread from './Thread';
import { useApp } from '../context/AppContext';
import { useTranslation } from 'react-i18next';
import { X, ArrowLeft, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Props {
  onClose: () => void;
  targetUserId?: Id<"users">;
}

function ReplyItem({ reply }: { reply: any }) {
  const parentThread = useQuery(
    (api as any).messages.getThreadById,
    reply.threadId ? { messageId: reply.threadId } : "skip"
  );

  return (
    <div className="relative border-b border-gray-200">
      {parentThread && (
        <>
          <div className="absolute left-[35px] top-[65px] bottom-[80px] w-[2px] bg-gray-200 z-0 rounded-full"></div>
          <div className="[&>div]:border-b-0 relative z-10">
            <Thread thread={parentThread} />
          </div>
        </>
      )}
      <div className="relative z-10">
        <Thread thread={reply} />
      </div>
    </div>
  );
}

export default function UserProfileModal({ onClose, targetUserId }: Props) {
  const { t } = useTranslation();
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const isLoggedIn = isLoaded && user;
  const { setShowEditProfileModal, setShowAuthModal } = useApp() as any;

  const profile = useQuery(api.users.getUserById, targetUserId ? { userId: targetUserId } : "skip");
  const postCount = useQuery(api.users.getPostCount, targetUserId ? { userId: targetUserId } : "skip") || 0;

  const followers = useQuery(api.users.getFollowers, targetUserId ? { userId: targetUserId } : "skip");
  const following = useQuery(api.users.getFollowing, targetUserId ? { userId: targetUserId } : "skip");
  const friends = useQuery(api.users.getFriends, targetUserId ? { userId: targetUserId } : "skip");

  const followingCount = following?.length || 0;

  const relationship = useQuery(api.users.checkRelationship, targetUserId ? { targetUserId } : "skip");
  const followUser = useMutation(api.users.followUser);
  const unfollowUser = useMutation(api.users.unfollowUser);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const getOrCreateConversation = useMutation(api.chat.getOrCreateConversation);

  const [activeTab, setActiveTab] = useState<'posts' | 'replies' | 'reposts' | 'likes'>('posts');

  const [showFollowList, setShowFollowList] = useState(false);
  const [followListTab, setFollowListTab] = useState<'followers' | 'following' | 'friends'>('followers');
  const [searchUser, setSearchUser] = useState('');

  const { results: posts, status: postStatus, loadMore: loadPosts } = usePaginatedQuery(
    api.messages.getThreads, targetUserId ? { userId: targetUserId, filterType: 'posts' } : "skip", { initialNumItems: 10 }
  );

  const { results: replies, status: replyStatus, loadMore: loadReplies } = usePaginatedQuery(
    api.messages.getThreads, targetUserId ? { userId: targetUserId, filterType: 'replies' } : "skip", { initialNumItems: 10 }
  );

  const { results: reposts, status: repostStatus, loadMore: loadReposts } = usePaginatedQuery(
    api.messages.getUserReposts, targetUserId ? { userId: targetUserId } : "skip", { initialNumItems: 10 }
  );

  const { results: likes, status: likeStatus, loadMore: loadLikes } = usePaginatedQuery(
    api.messages.getFavoriteThreads, targetUserId ? { userId: targetUserId } : "skip", { initialNumItems: 10 }
  );

  if (profile === undefined) return null;

  const isSelf = user?.id === profile?.clerkId;

  const getActiveTabState = () => {
    switch (activeTab) {
      case 'posts': return { data: posts, status: postStatus, loadMore: () => loadPosts(5), emptyText: t('profile_tabs.no_posts') };
      case 'replies': return { data: replies, status: replyStatus, loadMore: () => loadReplies(5), emptyText: t('profile_tabs.no_replies') };
      case 'reposts': return { data: reposts, status: repostStatus, loadMore: () => loadReposts(5), emptyText: t('profile_tabs.no_reposts') };
      case 'likes': return { data: likes, status: likeStatus, loadMore: () => loadLikes(5), emptyText: isSelf ? t('profile_tabs.no_likes_self') : t('profile_tabs.no_likes_other') };
      default: return { data: [], status: "Exhausted", loadMore: () => {}, emptyText: t('profile_tabs.no_posts') };
    }
  };

  const currentTab = getActiveTabState();

  // ĐÃ SỬA LỖI TẠI ĐÂY: Thêm e.stopPropagation() và gỡ bỏ setTimeout
  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowEditProfileModal(true);
    onClose();
  };

  const handleToggleFollow = async () => {
    if (!isLoggedIn) return setShowAuthModal(true);
    if (!targetUserId || isFollowLoading) return;

    setIsFollowLoading(true);
    try {
       if (relationship?.isFollowing) {
         await unfollowUser({ targetUserId });
       } else {
         await followUser({ targetUserId });
       }
    } catch (error: any) {
       console.error(error);
       alert(t('common.error'));
    } finally {
       setIsFollowLoading(false);
    }
  };

  const handleMessageClick = async () => {
    if (!isLoggedIn || !user) {
      onClose(); 
      return setShowAuthModal(true);
    }
    if (!targetUserId) return;
    
    try {
      const convId = await getOrCreateConversation({ otherUserId: targetUserId });
      onClose();
      router.push(`/chat/${convId}`);
    } catch (error: any) {
      console.error("Lỗi tạo cuộc trò chuyện:", error);
      if (error.data === "UNAUTHORIZED" || error.message?.includes("UNAUTHORIZED")) {
        alert("Phiên đăng nhập đã hết hạn hoặc chưa đồng bộ. Vui lòng F5 lại trang!");
      } else {
        alert("Có lỗi xảy ra: " + (error.data || error.message));
      }
    }
  };

  if (showFollowList) {
    const getListUsers = () => {
      let list = [];
      if (followListTab === 'followers') list = followers || [];
      else if (followListTab === 'following') list = following || [];
      else list = friends || [];

      if (searchUser.trim()) {
        list = list.filter((u: any) => (u.first_name || u.username)?.toLowerCase().includes(searchUser.toLowerCase()));
      }
      return list;
    }
    const displayUsers = getListUsers();

    return (
      <div className="fixed inset-0 z-[9990] flex items-center justify-center bg-black/50 backdrop-blur-sm transition-all animate-in fade-in duration-200" onClick={onClose}>
        <div className="bg-white w-full max-w-[500px] h-[80vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>

           <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-white shrink-0">
             <div className="flex items-center gap-3">
               <button onClick={() => setShowFollowList(false)} className="p-1.5 -ml-1.5 text-gray-900 hover:bg-gray-100 rounded-full transition-colors"><ArrowLeft className="w-5 h-5" /></button>
               <h2 className="text-lg font-bold text-gray-900">
                  {followListTab === 'followers' ? t('follow_list.tab_followers') : followListTab === 'following' ? t('follow_list.tab_following') : t('follow_list.tab_friends')}
               </h2>
             </div>
             <button onClick={onClose} className="p-1.5 -mr-1.5 text-gray-500 hover:bg-gray-100 hover:text-black rounded-full transition-colors"><X className="w-5 h-5" /></button>
           </div>

           <div className="flex bg-white border-b border-gray-200 shrink-0 px-2">
             {[
               {id: 'followers', label: t('follow_list.tab_followers'), count: profile?.followersCount || 0},
               {id: 'following', label: t('follow_list.tab_following'), count: followingCount},
               {id: 'friends', label: t('follow_list.tab_friends'), count: friends?.length || 0}
             ].map(tab => (
                <button key={tab.id} onClick={() => setFollowListTab(tab.id as any)} className={`flex-1 py-3 transition-colors border-b-2 flex flex-col items-center gap-0.5 ${followListTab === tab.id ? 'border-black text-black' : 'border-transparent text-gray-400 hover:text-gray-700 hover:bg-gray-50'}`}>
                   <span className="text-[16px] font-bold">{tab.count}</span>
                   <span className="text-[12px] font-semibold">{tab.label}</span>
                </button>
             ))}
           </div>

           <div className="p-3 border-b border-gray-100 shrink-0">
              <div className="bg-[#f2f3f5] rounded-xl flex items-center px-3 py-2">
                 <Search className="w-4 h-4 text-gray-500 mr-2" />
                 <input type="text" placeholder={t('follow_list.search_placeholder')} value={searchUser} onChange={e => setSearchUser(e.target.value)} className="bg-transparent border-none outline-none flex-1 text-[14px] text-gray-800" />
              </div>
           </div>

           <div className="flex-1 overflow-y-auto hidden-scrollbar bg-white">
              {displayUsers.length === 0 ? (
                <div className="text-center text-gray-400 py-10 text-[14px]">
                   {searchUser ? t('search.no_results') : (followListTab === 'friends' ? t('follow_list.empty_friends') : t('follow_list.empty_list'))}
                </div>
              ) : (
                displayUsers.map((u: any) => (
                  <div key={u._id} className="flex items-center justify-between p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => { onClose(); router.push(`/profile/${u._id}`); }}>
                     <div className="flex items-center gap-3">
                       <img loading="lazy"src={u.imageUrl || "https://ui-avatars.com/api/?name=U"} className="w-10 h-10 rounded-full object-cover border border-gray-200" />
                       <div>
                          <div className="font-bold text-[15px] text-gray-900">{u.first_name || u.username}</div>
                          <div className="text-[13px] text-gray-500">@{u.username}</div>
                       </div>
                     </div>
                  </div>
                ))
              )}
           </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[9990] flex items-center justify-center bg-black/50 backdrop-blur-sm transition-all animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-white w-full max-w-[620px] h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>

        <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-white shrink-0">
          <h2 className="text-lg font-bold text-gray-800">{t('tabs.profile')}</h2>
          <button onClick={onClose} className="p-1.5 text-gray-500 hover:bg-gray-100 hover:text-black rounded-full transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto hidden-scrollbar relative bg-[#f2f3f5]">
          <div className="bg-white p-6 mb-2">
            <div className="flex items-start justify-between mb-4">
              <img loading="lazy"src={(isSelf ? user?.imageUrl : profile?.imageUrl) || "https://ui-avatars.com/api/?name=User"} alt="Avatar" className="w-20 h-20 rounded-full object-cover border border-gray-200 shadow-sm" />
              {isSelf && (
                <button onClick={handleEditClick} className="px-4 py-1.5 border border-gray-300 rounded-full font-semibold text-sm hover:bg-gray-50 transition-colors">
                  {t('profile.edit_profile')}
                </button>
              )}
            </div>

            <h1 className="text-2xl font-bold text-gray-900">{isSelf ? user?.fullName : `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || t('settings.default_user')}</h1>
            <p className="text-gray-500 font-medium">@{isSelf ? user?.username : profile?.username}</p>

            <div className="flex items-center gap-2 mt-3 text-[15px] text-gray-800">
              <button onClick={() => { setFollowListTab('followers'); setShowFollowList(true); }} className="hover:underline focus:outline-none">
                <strong>{profile?.followersCount || 0}</strong> {t('profile.followers')}
              </button>
              <span className="text-gray-400 font-bold">&middot;</span>
              <button onClick={() => { setFollowListTab('following'); setShowFollowList(true); }} className="hover:underline focus:outline-none">
                <strong>{followingCount}</strong> {t('profile.following')}
              </button>
              <span className="text-gray-400 font-bold">&middot;</span>
              <span className="cursor-default"><strong>{postCount}</strong> {t('profile.posts')}</span>
            </div>

            <p className="mt-3 text-[15px] text-gray-800 leading-relaxed">{profile?.bio || t('profile.no_bio')}</p>

            {profile?.websiteUrl && (
              <a href={profile.websiteUrl.startsWith('http') ? profile.websiteUrl : `https://${profile.websiteUrl}`} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 mt-2 text-[#007AFF] hover:underline text-[15px] font-medium w-fit">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                {profile.linkTitle || profile.websiteUrl}
              </a>
            )}

            {!isSelf && (
              <div className="flex gap-3 mt-5">
                <button
                  onClick={handleToggleFollow}
                  disabled={isFollowLoading}
                  className={`flex-1 py-2 rounded-lg font-bold text-[14px] border transition-colors focus:outline-none ${
                    relationship?.isFollowing
                      ? 'border-gray-300 text-gray-900 bg-white hover:bg-gray-50'
                      : 'border-transparent bg-[#007AFF] text-white hover:bg-blue-600'
                  }`}
                >
                  {isFollowLoading ? '...' : relationship?.isFollowing ? t('profile.btn_following') : t('profile.btn_follow')}
                </button>
                <button
                  onClick={handleMessageClick}
                  className="flex-1 py-2 rounded-lg font-bold text-[14px] border border-gray-300 text-gray-900 bg-white hover:bg-gray-50 transition-colors focus:outline-none"
                >
                  {t('profile.btn_message')}
                </button>
              </div>
            )}
          </div>

          <div className="flex bg-white border-b border-gray-200 sticky top-0 z-10">
            {[
              { id: 'posts', label: t('profile_tabs.tab_posts') },
              { id: 'replies', label: t('profile_tabs.tab_replies') },
              { id: 'reposts', label: t('profile_tabs.tab_reposts') },
              { id: 'likes', label: t('profile_tabs.tab_likes') }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 py-3 text-[15px] font-semibold transition-colors border-b-2 ${activeTab === tab.id ? 'border-black text-black' : 'border-transparent text-gray-400 hover:text-gray-700 hover:bg-gray-50'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col pb-10">
            {activeTab === 'replies' ? (
              currentTab.data?.map((thread: any) => (
                <ReplyItem key={thread._id} reply={thread} />
              ))
            ) : (
              currentTab.data?.map((thread: any) => (
                <Thread key={thread._id} thread={thread} />
              ))
            )}

            {currentTab.status === "LoadingFirstPage" && (
              <div className="flex justify-center p-8">
                <div className="animate-spin w-6 h-6 border-2 border-[#007AFF] border-t-transparent rounded-full"></div>
              </div>
            )}

            {currentTab.data?.length === 0 && currentTab.status !== "LoadingFirstPage" && (
              <div className="text-center text-gray-400 py-16 flex flex-col items-center">
                <svg className="w-12 h-12 text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
                {currentTab.emptyText}
              </div>
            )}

            {currentTab.status === "CanLoadMore" && (
              <div className="flex justify-center p-4">
                <button onClick={currentTab.loadMore} className="px-6 py-2 border border-gray-200 bg-white rounded-full text-sm font-bold hover:bg-gray-50 transition-colors shadow-sm">
                  {t('chat.loading')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}