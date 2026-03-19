"use client";
import { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import PostCard from './PostCard';
import CreatePostModal from './CreatePostModal';
import AuthModal from './AuthModal';

interface Props {
  showMembers: boolean;
  onToggleMembers: () => void;
}

export default function MainContent({ showMembers, onToggleMembers }: Props) {
  const { activeServerId, activeChannelId, getServer, getChannel, getPostsForChannel, currentUser } = useApp();
  const [showCreate, setShowCreate] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [search, setSearch] = useState('');

  const server = getServer(activeServerId || '');
  const channel = getChannel(activeChannelId || '');
  const posts = activeChannelId ? getPostsForChannel(activeChannelId) : [];

  const filteredPosts = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return posts;
    return posts.filter(
      (post) =>
        post.content.toLowerCase().includes(keyword) ||
        (post.title || '').toLowerCase().includes(keyword)
    );
  }, [posts, search]);

  if (!activeServerId || !server) {
    return (
      <main className="flex-1 bg-white flex items-center justify-center flex-col gap-4 px-8 text-center">
        <div className="text-6xl">🌿</div>
        <h2 className="text-green-700 text-3xl font-bold">Chào mừng đến GreenVibe</h2>
        <p className="text-slate-500 text-sm max-w-lg">
          Chọn một server ở bên trái để xem category, channel và đọc các bài viết giống phong cách Discord.
        </p>
        {!currentUser && (
          <button
            onClick={() => setShowAuth(true)}
            className="mt-2 px-6 py-3 bg-green-600 hover:bg-green-500 text-white font-semibold rounded-2xl transition-colors shadow-sm"
          >
            Đăng nhập / Đăng ký
          </button>
        )}
        {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
      </main>
    );
  }

  return (
    <main className="flex-1 flex flex-col bg-white overflow-hidden">
      <div className="h-14 px-4 flex items-center gap-3 border-b border-green-100 bg-white shadow-sm shrink-0">
        <span className="text-slate-400 text-2xl">#</span>
        <span className="text-slate-800 font-semibold text-xl">{channel?.name || 'Chọn kênh'}</span>
        {channel?.description && (
          <>
            <div className="w-px h-5 bg-green-100" />
            <span className="text-slate-500 text-sm truncate">{channel.description}</span>
          </>
        )}

        <div className="ml-auto flex items-center gap-2">
          <button className="w-8 h-8 rounded-lg hover:bg-green-50 text-slate-500" title="Chủ đề">
            🧵
          </button>
          <button className="w-8 h-8 rounded-lg hover:bg-green-50 text-slate-500" title="Thông báo kênh">
            🔕
          </button>
          <button className="w-8 h-8 rounded-lg hover:bg-green-50 text-slate-500" title="Ghim">
            📌
          </button>
          <button className="w-8 h-8 rounded-lg hover:bg-green-50 text-slate-500" title="Thành viên" onClick={onToggleMembers}>
            {showMembers ? '👥' : '🧑‍🤝‍🧑'}
          </button>
          <div className="ml-1 hidden md:flex items-center gap-2 px-3 h-9 bg-[#f7fbf7] border border-green-100 rounded-xl min-w-[220px]">
            <span className="text-slate-400">⌕</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Tìm kiếm ${server.name}`}
              className="bg-transparent outline-none text-sm text-slate-700 placeholder-slate-400 w-full"
            />
          </div>
        </div>
      </div>

      <div className="px-4 pt-3 shrink-0">
        <div className="rounded-xl bg-indigo-500 text-white text-sm font-semibold px-4 py-2 shadow-sm flex items-center justify-between">
          <span>30+ bài viết mới từ 13:45</span>
          <button className="text-white/95 hover:text-white">Đánh dấu đã đọc ↩</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        <div className="rounded-3xl border border-green-100 bg-gradient-to-br from-green-50 via-white to-emerald-50 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div
              className="w-14 h-14 rounded-2xl text-2xl text-white flex items-center justify-center shadow-sm"
              style={{ backgroundColor: server.color }}
            >
              {server.icon}
            </div>
            <div>
              <h3 className="text-2xl font-bold text-slate-800">#{channel?.name}</h3>
              <p className="text-slate-500 text-sm">{channel?.description || 'Nơi để đăng bài viết, thảo luận và phản hồi cộng đồng.'}</p>
            </div>
          </div>
          <p className="text-slate-500 text-sm mt-4">
            Vui lòng follow phần hướng dẫn để đăng bài đúng chủ đề. Kênh này hoạt động theo dạng feed bài viết thay vì nhắn tin nhanh.
          </p>
        </div>

        {filteredPosts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="text-5xl mb-4">🌱</div>
            <p className="text-slate-600 font-semibold mb-1">Không tìm thấy bài viết</p>
            <p className="text-slate-400 text-sm">Hãy thử từ khóa khác hoặc đăng bài mới.</p>
          </div>
        ) : (
          filteredPosts.map((post) => <PostCard key={post.id} post={post} />)
        )}
      </div>

      <div className="px-4 pb-4 pt-2 shrink-0 bg-white">
        {currentUser ? (
          <div className="rounded-2xl border border-green-100 bg-[#fcfffc] px-4 py-3 shadow-sm">
            <button
              onClick={() => setShowCreate(true)}
              className="w-full flex items-center gap-3 rounded-xl bg-[#f7fbf7] hover:bg-green-50 px-4 py-3 text-slate-500 hover:text-slate-700 transition-colors text-left"
            >
              <span className="text-2xl text-slate-400">＋</span>
              <span className="flex-1">Nhắn #{channel?.name}</span>
              <div className="flex items-center gap-3 text-slate-400 text-lg">
                <span>🎁</span>
                <span>GIF</span>
                <span>😊</span>
                <span>✨</span>
              </div>
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowAuth(true)}
            className="w-full flex items-center justify-center gap-2 bg-[#fcfffc] border border-green-100 rounded-2xl px-4 py-3 text-slate-600 hover:text-green-700 hover:border-green-300 transition-all text-sm shadow-sm"
          >
            <span>🔐</span>
            <span>Đăng nhập để đăng bài viết</span>
          </button>
        )}
      </div>

      {showCreate && <CreatePostModal onClose={() => setShowCreate(false)} />}
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </main>
  );
}
