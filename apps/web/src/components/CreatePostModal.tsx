"use client";

import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Post } from '../types';

interface Props {
  onClose: () => void;
}

export default function CreatePostModal({ onClose }: Props) {
  const { currentUser, activeServerId, activeChannelId, addPost, getChannel } = useApp();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [tag, setTag] = useState('');
  const channel = getChannel(activeChannelId || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !currentUser || !activeServerId || !activeChannelId) return;

    const post: Post = {
      id: `p_${Date.now()}`,
      authorId: currentUser.id,
      channelId: activeChannelId,
      serverId: activeServerId,
      title: title.trim() || undefined,
      content: content.trim(),
      imageUrl: imageUrl.trim() || undefined,
      createdAt: new Date().toISOString(),
      reactions: [],
      comments: [],
      tag: tag.trim() || undefined,
      accent: channel?.name === 'suggestion' ? 'amber' : 'green',
    };

    addPost(post);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white border border-green-100 rounded-3xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-green-100 bg-gradient-to-r from-green-50 to-emerald-50">
          <div>
            <h2 className="text-slate-800 font-bold text-xl">Tạo bài viết mới</h2>
            {channel && <p className="text-green-700 text-sm mt-0.5">Đăng vào #{channel.name}</p>}
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-full hover:bg-white text-slate-500 transition-colors">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-green-100 border border-green-200 flex items-center justify-center text-lg">
              {currentUser?.avatar}
            </div>
            <div>
              <div className="text-slate-800 font-semibold text-sm">{currentUser?.displayName}</div>
              <div className="text-slate-500 text-xs">@{currentUser?.username}</div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1.5 block">
                Tiêu đề bài viết
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ví dụ: Suggestion #19001"
                className="w-full bg-[#fbfffb] border border-green-200 rounded-xl px-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-green-400 text-sm"
              />
            </div>
            <div>
              <label className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1.5 block">
                Tag nhỏ (tuỳ chọn)
              </label>
              <input
                type="text"
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                placeholder="APP / HOT / NEW"
                className="w-full bg-[#fbfffb] border border-green-200 rounded-xl px-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-green-400 text-sm"
              />
            </div>
          </div>

          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={`Chia sẻ điều gì đó với cộng đồng...\n\nDùng **text** để in đậm`}
            rows={7}
            className="w-full bg-[#fbfffb] border border-green-200 rounded-2xl px-4 py-4 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-green-400 text-sm resize-none leading-relaxed"
          />

          <div>
            <label className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1.5 block">
              URL hình ảnh (tuỳ chọn)
            </label>
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://..."
              className="w-full bg-[#fbfffb] border border-green-200 rounded-xl px-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-green-400 text-sm"
            />
          </div>

          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex gap-2">
              {['🌿', '🔥', '💡', '🎨', '💚'].map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setContent((c) => c + emoji)}
                  className="w-9 h-9 hover:bg-green-50 rounded-xl flex items-center justify-center text-lg transition-colors border border-green-100"
                >
                  {emoji}
                </button>
              ))}
            </div>
            <span className={`text-xs ${content.length > 1800 ? 'text-red-500' : 'text-slate-400'}`}>
              {content.length}/2000
            </span>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-green-200 text-slate-600 hover:bg-green-50 transition-colors text-sm"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={!content.trim() || content.length > 2000}
              className="flex-1 py-3 rounded-xl bg-green-600 hover:bg-green-500 disabled:bg-green-200 text-white font-semibold transition-colors text-sm shadow-sm"
            >
              Đăng bài
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
