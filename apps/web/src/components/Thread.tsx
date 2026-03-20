"use client";

import { useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { useApp } from '../context/AppContext';
import { useUser } from '@clerk/nextjs';

interface Props {
  thread: any;
}

export default function Thread({ thread }: Props) {
  const { setShowAuthModal } = useApp() as any; 
  
  // Lấy thông tin người dùng từ Clerk
  const { user, isLoaded } = useUser();
  const isLoggedIn = isLoaded && user;

  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');

  // Các Mutations
  const likeThread = useMutation(api.messages.likeThread);
  const addThread = useMutation(api.messages.addThread); 
  const toggleRepost = useMutation(api.messages.toggleRepost);

  // Lấy bình luận
  const comments = useQuery(
    api.messages.getThreadComments,
    showComments ? { messageId: thread._id } : "skip"
  );

  // --- XỬ LÝ SỰ KIỆN CÓ CHẶN KHÁCH (GUEST) ---
  
  const handleLike = async () => {
    if (!isLoggedIn) return setShowAuthModal(true); // Bẫy khách
    try {
      await likeThread({ messageId: thread._id });
    } catch (error) {
      console.error("Lỗi khi thích:", error);
    }
  };

  const handleRepost = async () => {
    if (!isLoggedIn) return setShowAuthModal(true); // Bẫy khách
    try {
      await toggleRepost({ messageId: thread._id });
    } catch (error) {
      console.error("Lỗi khi đăng lại:", error);
    }
  };

  const handleCommentClick = () => {
    if (!isLoggedIn) return setShowAuthModal(true); // Bẫy khách khi ấn icon bình luận
    setShowComments(!showComments);
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoggedIn) return setShowAuthModal(true); // Bẫy khách khi submit
    if (!commentText.trim()) return;

    try {
      await addThread({
        content: commentText.trim(),
        threadId: thread._id,
        channelId: thread.channelId,
        serverId: thread.serverId,
        universityId: thread.universityId,
      });
      setCommentText(''); 
    } catch (error) {
      console.error("Lỗi khi bình luận:", error);
    }
  };

  const handleMenuClick = () => {
    if (!isLoggedIn) return setShowAuthModal(true); // Bẫy khách khi ấn dấu 3 chấm
    alert("Chức năng tùy chọn đang phát triển");
  };

  // --- FORMAT DỮ LIỆU ---
  const timeString = new Date(thread._creationTime).toLocaleString('vi-VN', {
    hour: '2-digit', minute: '2-digit', 
    day: '2-digit', month: '2-digit', year: 'numeric'
  });

  // Kiểm tra xem bài viết này có phải của chính user đang đăng nhập không
  const isSelf = user?.id && thread.creator?.clerkId && user.id === thread.creator.clerkId;

  const isAnonymous = thread.isAnonymous;
  
  // Ưu tiên lấy Tên và Avatar từ Clerk nếu là bài của chính mình!
  const displayName = isAnonymous 
    ? "Người dùng ẩn danh" 
    : (isSelf ? (user?.fullName || user?.username) : (thread.creator?.first_name || thread.creator?.username || "Người dùng"));
    
  const displayAvatar = isAnonymous 
    ? "https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y" 
    : (isSelf ? user?.imageUrl : (thread.creator?.imageUrl || `https://ui-avatars.com/api/?name=${displayName}&background=random&color=fff`));

  return (
    <div className="bg-white p-4 border-b border-gray-200 hover:bg-gray-50 transition-colors">
      
      {/* 1. HEADER */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-3">
          <img 
            src={displayAvatar} 
            alt="Avatar" 
            className="w-10 h-10 rounded-full object-cover border border-gray-100 shrink-0"
          />
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-gray-800 text-[15px]">
                {displayName}
              </h4>
              {isAnonymous && <span className="text-xs">🎭</span>}
              {!isAnonymous && thread.isServerAdmin && (
                <span className="bg-red-100 text-red-600 text-[10px] px-1.5 py-0.5 rounded font-bold">
                  Quản trị viên
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500">{timeString}</p>
          </div>
        </div>
        
        {/* Nút 3 chấm */}
        <button onClick={handleMenuClick} className="text-gray-400 hover:text-gray-600 p-1 transition-colors rounded-full hover:bg-gray-100">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z" />
          </svg>
        </button>
      </div>

      {/* 2. BODY */}
      <div className="mb-4">
        <p className="text-gray-800 whitespace-pre-wrap leading-relaxed text-[15px]">
          {thread.content}
        </p>
        
        {thread.mediaFiles && thread.mediaFiles.length > 0 && (
          <div className={`mt-3 grid gap-2 ${thread.mediaFiles.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
            {thread.mediaFiles.map((url: string, idx: number) => (
              <img 
                key={idx} 
                src={url} 
                alt="Thread Media" 
                className="rounded-lg object-cover w-full h-auto max-h-80 border border-gray-100"
              />
            ))}
          </div>
        )}
      </div>

      {/* 3. ACTIONS (Nút tương tác) */}
      <div className="flex items-center gap-6 pt-3 border-t border-gray-100">
        
        {/* Nút Like */}
        <button 
          onClick={handleLike}
          className={`flex items-center gap-1.5 font-medium transition-colors ${
            thread.isLiked ? 'text-red-500' : 'text-gray-500 hover:text-red-500'
          }`}
        >
          <svg className="w-5 h-5 transition-transform active:scale-75" fill={thread.isLiked ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={thread.isLiked ? 0 : 2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
          <span className="text-sm">{thread.likeCount || 0}</span>
        </button>

        {/* Nút Bình luận */}
        <button 
          onClick={handleCommentClick}
          className="flex items-center gap-1.5 text-gray-500 hover:text-green-600 font-medium transition-colors"
        >
          <svg className="w-5 h-5 transition-transform active:scale-75" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <span className="text-sm">{thread.commentCount || 0}</span>
        </button>

        {/* Nút Đăng lại */}
        <button 
          onClick={handleRepost}
          className={`flex items-center gap-1.5 font-medium transition-colors ${
            thread.isReposted ? 'text-blue-500' : 'text-gray-500 hover:text-blue-500'
          }`}
        >
          <svg className="w-5 h-5 transition-transform active:scale-75" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span className="text-sm">{thread.retweetCount || 0}</span>
        </button>
      </div>

      {/* 4. COMMENTS */}
      {showComments && (
        <div className="mt-4 pt-4 border-t border-gray-100 animate-in fade-in slide-in-from-top-2 duration-200">
          
          {/* Ô nhập bình luận */}
          {thread.allowComments !== false && (
            <form onSubmit={handleCommentSubmit} className="flex gap-3 mb-4">
              <img 
                src={user?.imageUrl || "https://ui-avatars.com/api/?name=Guest&background=E5E7EB&color=9CA3AF"} 
                alt="My Avatar" 
                className="w-8 h-8 rounded-full object-cover shrink-0 border border-gray-200"
              />
              <div className="flex-1 flex bg-[#f2f3f5] rounded-xl border border-transparent focus-within:border-green-400 focus-within:bg-white transition-all overflow-hidden px-2">
                <input 
                  type="text" 
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onClick={() => !isLoggedIn && setShowAuthModal(true)} // Bẫy click vào ô input
                  readOnly={!isLoggedIn} // Khóa không cho gõ nếu chưa login
                  placeholder={isLoggedIn ? "Viết bình luận..." : "Đăng nhập để bình luận..."}
                  className={`flex-1 bg-transparent py-2.5 px-2 outline-none text-sm text-gray-800 transition-colors ${!isLoggedIn ? 'cursor-pointer' : 'cursor-text'}`}
                />
                <button 
                  type="submit" 
                  disabled={!commentText.trim() || !isLoggedIn}
                  className="px-3 text-green-600 font-bold text-sm disabled:opacity-50 disabled:text-gray-400 transition-colors"
                >
                  Gửi
                </button>
              </div>
            </form>
          )}

          {/* Danh sách bình luận */}
          {comments === undefined ? (
            <div className="text-center text-xs text-gray-400 py-2 flex items-center justify-center gap-2">
              <div className="w-3 h-3 border-2 border-gray-300 border-t-transparent rounded-full animate-spin"></div>
              Đang tải bình luận...
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center text-xs text-gray-400 py-2">Chưa có bình luận nào.</div>
          ) : (
            <div className="space-y-4">
              {comments.map((comment: any) => (
                <div key={comment._id} className="flex gap-3">
                  <img 
                    src={comment.creator?.imageUrl || "https://ui-avatars.com/api/?name=U&background=random"} 
                    alt="Cmt Avatar" 
                    className="w-8 h-8 rounded-full object-cover shrink-0 border border-gray-100"
                  />
                  <div className="flex-1">
                    <div className="bg-[#f2f3f5] rounded-2xl rounded-tl-none px-3.5 py-2.5 inline-block max-w-full">
                      <h5 className="font-bold text-xs text-gray-800 mb-0.5">
                        {comment.creator?.first_name || comment.creator?.username || "Người dùng"}
                      </h5>
                      <p className="text-[14px] text-gray-800 leading-snug break-words whitespace-pre-wrap">{comment.content}</p>
                    </div>
                    <div className="flex items-center gap-4 mt-1 ml-2 text-[11px] text-gray-500 font-medium">
                      <span>
                        {new Date(comment._creationTime).toLocaleTimeString('vi-VN', {hour: '2-digit', minute: '2-digit'})}
                      </span>
                      <button className="hover:text-gray-800 transition-colors">Thích</button>
                      <button className="hover:text-gray-800 transition-colors">Phản hồi</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}