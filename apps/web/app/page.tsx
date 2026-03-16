"use client";
import { usePaginatedQuery } from "convex/react"; // Dùng cái này vì getThreads có phân trang
import { api } from "@convex/_generated/api";

export default function Home() {
  // Gọi hàm getThreads với các tham số cần thiết
  const { results, status, loadMore } = usePaginatedQuery(
    api.messages.getThreads, 
    {}, // Các filter như channelId, userId... để trống nếu muốn lấy hết
    { initialNumItems: 10 } // Lấy 10 bài đầu tiên
  );

  return (
    <main className="p-10 bg-black min-h-screen text-white">
      <h1 className="text-3xl font-bold text-[#1ED760] mb-6">Bản tin TTTN2</h1>

      {/* Kiểm tra trạng thái tải dữ liệu */}
      {status === "LoadingFirstPage" && <p>Đang tải bài viết...</p>}

      <div className="space-y-4">
        {results?.map((thread) => (
          <div key={thread._id} className="p-4 border border-gray-700 rounded-lg bg-gray-900">
            <div className="flex items-center gap-2 mb-2">
              {/* Hiển thị avatar người đăng (nếu có) */}
              <img 
                src={thread.creator?.imageUrl || "https://via.placeholder.com/40"} 
                className="w-8 h-8 rounded-full"
              />
              <span className="font-semibold text-[#1ED760]">
                {thread.isAnonymous ? "Người dùng ẩn danh" : thread.creator?.username}
              </span>
            </div>
            
            <p className="text-gray-200">{thread.content}</p>
            
            <div className="mt-2 text-sm text-gray-500 flex gap-4">
              <span>❤️ {thread.likeCount}</span>
              <span>💬 {thread.commentCount}</span>
              <span>🔄 {thread.retweetCount}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Nút bấm để tải thêm bài viết */}
      {status === "CanLoadMore" && (
        <button 
          onClick={() => loadMore(10)}
          className="mt-6 px-4 py-2 bg-[#1ED760] text-black font-bold rounded-full hover:bg-[#19b352] transition-colors"
        >
          Xem thêm bài viết
        </button>
      )}
    </main>
  );
}