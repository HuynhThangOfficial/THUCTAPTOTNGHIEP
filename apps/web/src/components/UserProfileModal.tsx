"use client";

import { useState } from 'react';
import { useQuery, usePaginatedQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { Id } from '../../../../convex/_generated/dataModel';
import { useUser } from '@clerk/nextjs';
import Thread from './Thread';
import { useApp } from '../context/AppContext';

interface Props {
  onClose: () => void;
  targetUserId?: Id<"users">;
}

// -------------------------------------------------------------
// COMPONENT MỚI: Render Nhóm Reply (Gồm Bài gốc + Đường chỉ nối)
// -------------------------------------------------------------
function ReplyItem({ reply }: { reply: any }) {
  // ĐÃ FIX: Gọi đúng tên hàm getThreadById của Backend
  const parentThread = useQuery(
    (api as any).messages.getThreadById, 
    reply.threadId ? { messageId: reply.threadId } : "skip"
  );

  return (
    <div className="relative border-b border-gray-200">
      {parentThread && (
        <>
          {/* ĐƯỜNG CHỈ NỐI DỌC GIỐNG THREADS */}
          <div className="absolute left-[35px] top-[65px] bottom-[80px] w-[2px] bg-gray-200 z-0 rounded-full"></div>
          
          {/* BÀI VIẾT GỐC (Dùng CSS ẩn border bottom đi cho liền mạch) */}
          <div className="[&>div]:border-b-0 relative z-10">
            <Thread thread={parentThread} />
          </div>
        </>
      )}
      
      {/* BÌNH LUẬN (REPLY) */}
      <div className="relative z-10">
        <Thread thread={reply} />
      </div>
    </div>
  );
}
// -------------------------------------------------------------

export default function UserProfileModal({ onClose, targetUserId }: Props) {
  const { user } = useUser();
  const { setShowEditProfileModal } = useApp() as any;
  
  const profile = useQuery(api.users.getUserById, targetUserId ? { userId: targetUserId } : "skip");
  const postCount = useQuery(api.users.getPostCount, targetUserId ? { userId: targetUserId } : "skip") || 0;
  
  const [activeTab, setActiveTab] = useState<'posts' | 'replies' | 'reposts' | 'likes'>('posts');

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
      case 'posts': return { data: posts, status: postStatus, loadMore: () => loadPosts(5), emptyText: 'Chưa có bài viết nào.' };
      case 'replies': return { data: replies, status: replyStatus, loadMore: () => loadReplies(5), emptyText: 'Chưa có bình luận nào.' };
      case 'reposts': return { data: reposts, status: repostStatus, loadMore: () => loadReposts(5), emptyText: 'Chưa có lượt đăng lại nào.' };
      case 'likes': return { data: likes, status: likeStatus, loadMore: () => loadLikes(5), emptyText: 'Chưa có lượt thích nào.' };
      default: return { data: [], status: "Exhausted", loadMore: () => {}, emptyText: 'Chưa có nội dung.' };
    }
  };

  const currentTab = getActiveTabState();

  const handleEditClick = () => {
    onClose();
    setTimeout(() => setShowEditProfileModal(true), 150);
  };

  return (
    <div className="fixed inset-0 z-[9990] flex items-center justify-center bg-black/50 backdrop-blur-sm transition-all animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-white w-full max-w-[620px] h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
        
        <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-white shrink-0">
          <h2 className="text-lg font-bold text-gray-800">Hồ sơ người dùng</h2>
          <button onClick={onClose} className="p-1.5 text-gray-500 hover:bg-gray-100 hover:text-black rounded-full transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto hidden-scrollbar relative bg-[#f2f3f5]">
          <div className="bg-white p-6 mb-2">
            <div className="flex items-start justify-between mb-4">
              <img src={(isSelf ? user?.imageUrl : profile?.imageUrl) || "https://ui-avatars.com/api/?name=User"} alt="Avatar" className="w-20 h-20 rounded-full object-cover border border-gray-200 shadow-sm" />
              {isSelf && (
                <button onClick={handleEditClick} className="px-4 py-1.5 border border-gray-300 rounded-full font-semibold text-sm hover:bg-gray-50 transition-colors">
                  Chỉnh sửa hồ sơ
                </button>
              )}
            </div>

            <h1 className="text-2xl font-bold text-gray-900">{isSelf ? user?.fullName : `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || 'Người dùng'}</h1>
            <p className="text-gray-500 font-medium">@{isSelf ? user?.username : profile?.username}</p>
            <p className="mt-3 text-[15px] text-gray-800 leading-relaxed">{profile?.bio || "Chưa có tiểu sử."}</p>

            <div className="flex items-center gap-4 mt-4 text-sm text-gray-600">
              <span><strong className="text-gray-900">{profile?.followersCount || 0}</strong> Người theo dõi</span>
              <span><strong className="text-gray-900">0</strong> Đang theo dõi</span>
              <span><strong className="text-gray-900">{postCount}</strong> Bài viết</span>
            </div>
            
            {profile?.websiteUrl && (
              <a href={profile.websiteUrl.startsWith('http') ? profile.websiteUrl : `https://${profile.websiteUrl}`} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 mt-2 text-[#0095f6] hover:underline text-[15px] font-medium w-fit">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                {profile.linkTitle || profile.websiteUrl}
              </a>
            )}
          </div>

          <div className="flex bg-white border-b border-gray-200 sticky top-0 z-10">
            {[
              { id: 'posts', label: 'Bài viết' },
              { id: 'replies', label: 'Bình luận' },
              { id: 'reposts', label: 'Đăng lại' },
              { id: 'likes', label: 'Lượt thích' }
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
            {/* THAY ĐỔI RENDER TÙY THEO TAB */}
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
                <div className="animate-spin w-6 h-6 border-2 border-gray-400 border-t-transparent rounded-full"></div>
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
                  Tải thêm
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}