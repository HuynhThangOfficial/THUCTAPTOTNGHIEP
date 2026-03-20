"use client";

import { usePaginatedQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useApp } from "@/context/AppContext";
import Thread from "./Thread";
import { useUser } from "@clerk/nextjs";
import { useRef, useCallback } from "react";

export default function Feed() {
  const { user } = useUser();
  const { activeChannelId, activeChannelName, setShowComposeModal, setShowAuthModal } = useApp() as any;
  const isLoggedIn = user !== null;
  const scrollRef = useRef<HTMLDivElement>(null);

  const { results, status, loadMore } = usePaginatedQuery(
    api.messages.getThreads,
    { channelId: activeChannelId || undefined, sortBy: 'newest' },
    { initialNumItems: 10 }
  );

  // Hàm xử lý Infinite Scroll
  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    
    // Nếu cuộn gần chạm đáy (cách đáy 100px) và đang có thể tải thêm
    if (scrollHeight - scrollTop - clientHeight < 100 && status === "CanLoadMore") {
      loadMore(5);
    }
  }, [status, loadMore]);

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header Discord */}
      <div className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 shrink-0 z-10 shadow-sm sticky top-0">
         {/* ... Giữ nguyên phần Header cũ ... */}
        <div className="flex items-center gap-2">
          <span className="text-gray-400 text-2xl font-light">#</span>
          <span className="font-bold text-gray-800 text-[16px]">{activeChannelName || "đại-sảnh"}</span>
        </div>
        <div className="flex items-center gap-4">
           {/* ... Các icon Search, Bell, Pin ... */}
           <div className="hidden md:flex items-center bg-[#f2f3f5] px-2.5 py-1.5 rounded-md border border-transparent focus-within:border-gray-300 transition-colors">
            <input type="text" placeholder="Tìm kiếm..." className="bg-transparent text-sm outline-none w-40 focus:w-56 transition-all text-gray-700 placeholder-gray-500" />
            <svg className="w-4 h-4 text-gray-500 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </div>
          <button className="text-gray-500 hover:text-gray-800 transition-colors" title="Thông báo">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
          </button>
        </div>
      </div>

      {/* Vùng cuộn bài viết - Thêm onScroll và ref */}
      <div 
        id="main-scroll-area" 
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto hidden-scrollbar p-4 pb-20"
      >
        <div className="flex flex-col bg-white border border-gray-200 rounded-2xl overflow-hidden mb-10 shadow-sm">
            {activeChannelName !== 'đại-sảnh' && (
              <div 
                // SỬA ONCLICK Ở ĐÂY:
                onClick={() => isLoggedIn ? setShowComposeModal(true) : setShowAuthModal(true)}
                className="p-4 border-b border-gray-200 flex items-center gap-3 cursor-pointer hover:bg-gray-50 transition-colors"
              >
                <img src={user?.imageUrl || "https://ui-avatars.com/api/?name=Guest&background=E5E7EB&color=9CA3AF"} alt="My Avatar" className="w-10 h-10 rounded-full object-cover shrink-0 border border-gray-200" />
                <span className="text-gray-400 text-[15px] font-medium flex-1 pt-0.5">Có gì mới?</span>
                <button className="px-5 py-1.5 bg-gray-900 text-white font-semibold rounded-full text-sm">Đăng</button>
              </div>
            )}

            {/* Danh sách bài đăng */}
            <div className="flex flex-col">
              {results.map((thread) => (
                <Thread key={thread._id} thread={thread as any} />
              ))}
            </div>

            {/* Trạng thái đang tải lần đầu HOẶC đang tự động tải thêm */}
            {(status === "LoadingFirstPage" || status === "LoadingMore") && (
                <div className="flex justify-center items-center p-8">
                    <div className="animate-spin h-6 w-6 border-2 border-gray-400 border-t-transparent rounded-full"></div>
                </div>
            )}

            {status === "Exhausted" && results.length > 0 && (
                <p className="text-center text-gray-400 text-sm py-6 border-t border-gray-100">Bạn đã xem hết bảng tin.</p>
            )}

            {!results.length && status !== "LoadingFirstPage" && (
                <div className="text-center text-gray-500 py-20 flex flex-col items-center">
                  <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                  <p>Chào mừng đến với #{activeChannelName || "đại-sảnh"}!</p>
                  <p className="text-sm mt-1">Hãy là người đầu tiên đăng bài ở đây.</p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
}