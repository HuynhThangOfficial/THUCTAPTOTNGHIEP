"use client";

import { useState } from 'react';
import { Post } from '../types';
import { useApp } from '../context/AppContext';

interface Props {
  post: Post;
}

const QUICK_EMOJIS = ['❤️', '👍', '😄', '🔥', '👏', '😍', '🌿', '💡'];

export default function PostCard({ post }: Props) {
  const { getUser, addReaction, addComment, currentUser } = useApp();
  const author = getUser(post.authorId);
  const [showComments, setShowComments] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [commentText, setCommentText] = useState('');

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }) +
      ' • ' + d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  const formatContent = (content: string) => {
    return content.split('\n').map((line, i) => {
      const parts = line.split(/(\*\*[^*]+\*\*)/g);
      return (
        <p key={i} className={line === '' ? 'h-2' : ''}>
          {parts.map((part, j) =>
            part.startsWith('**') && part.endsWith('**')
              ? <strong key={j} className="font-semibold text-slate-900">{part.slice(2, -2)}</strong>
              : <span key={j}>{part}</span>
          )}
        </p>
      );
    });
  };

  const handleComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !currentUser) return;
    addComment(post.id, commentText.trim());
    setCommentText('');
  };

  const accentClass =
    post.accent === 'amber'
      ? 'border-amber-300 bg-amber-50'
      : post.accent === 'blue'
        ? 'border-blue-200 bg-blue-50'
        : 'border-green-200 bg-white';

  return (
    <article className="group">
      <div className="flex gap-3 px-4 py-3 hover:bg-green-50/70 rounded-2xl transition-colors">
        <div className="w-11 h-11 rounded-full bg-green-100 border border-green-200 flex items-center justify-center text-lg shrink-0">
          {author?.avatar || '?'}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-green-700 font-bold text-sm hover:underline cursor-pointer">
                  {author?.displayName || 'Unknown'}
                </span>
                {post.tag && (
                  <span className="px-1.5 py-0.5 rounded-md bg-blue-500 text-white text-[10px] font-bold uppercase tracking-wide">
                    {post.tag}
                  </span>
                )}
                <span className="text-xs text-slate-400">{formatDate(post.createdAt)}</span>
              </div>
              {post.title && <div className="mt-1 text-xl font-bold text-slate-800">{post.title}</div>}
            </div>

            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-white border border-green-100 rounded-xl shadow-sm p-1">
              <button className="w-8 h-8 rounded-lg hover:bg-green-50 text-slate-500">↩</button>
              <button className="w-8 h-8 rounded-lg hover:bg-green-50 text-slate-500">↪</button>
              <button className="w-8 h-8 rounded-lg hover:bg-green-50 text-slate-500">⋯</button>
            </div>
          </div>

          <div className={`mt-2 rounded-2xl border p-4 text-sm leading-7 text-slate-700 shadow-sm ${accentClass}`}>
            <div className="space-y-1">{formatContent(post.content)}</div>
            {post.imageUrl && (
              <img src={post.imageUrl} alt="post" className="mt-3 rounded-xl max-h-72 object-cover w-full border border-green-100" />
            )}
            <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
              <span className="text-green-700 font-medium">Heartopia</span>
              <span>•</span>
              <span>Submitted at</span>
              <span>•</span>
              <span>{formatDate(post.createdAt)}</span>
            </div>
          </div>

          {post.reactions.length > 0 && (
            <div className="mt-2 flex gap-2 flex-wrap">
              {post.reactions.map((r) => (
                <button
                  key={r.emoji}
                  onClick={() => currentUser && addReaction(post.id, r.emoji)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-sm border transition-all ${
                    currentUser && r.userIds.includes(currentUser.id)
                      ? 'bg-green-100 border-green-300 text-green-800'
                      : 'bg-white border-green-100 text-slate-600 hover:border-green-300 hover:bg-green-50'
                  }`}
                >
                  <span>{r.emoji}</span>
                  <span className="text-xs font-semibold">{r.count}</span>
                </button>
              ))}
            </div>
          )}

          <div className="mt-2 flex items-center gap-2">
            <div className="relative">
              <button
                onClick={() => setShowEmojiPicker((v) => !v)}
                disabled={!currentUser}
                className="px-3 py-1.5 rounded-xl text-sm text-slate-500 hover:text-green-700 hover:bg-green-50 transition-colors disabled:opacity-40"
              >
                😊 React
              </button>
              {showEmojiPicker && (
                <div className="absolute top-11 left-0 bg-white border border-green-100 rounded-2xl p-2 shadow-xl z-30 flex gap-1.5 flex-wrap w-48">
                  {QUICK_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => {
                        addReaction(post.id, emoji);
                        setShowEmojiPicker(false);
                      }}
                      className="w-9 h-9 hover:bg-green-50 rounded-xl text-xl flex items-center justify-center transition-colors"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => setShowComments((v) => !v)}
              className="px-3 py-1.5 rounded-xl text-sm text-slate-500 hover:text-green-700 hover:bg-green-50 transition-colors"
            >
              💬 {post.comments.length} bình luận
            </button>

            <button className="px-3 py-1.5 rounded-xl text-sm text-slate-500 hover:text-green-700 hover:bg-green-50 transition-colors">
              🔗 Chia sẻ
            </button>
          </div>

          {showComments && (
            <div className="mt-3 border border-green-100 bg-white rounded-2xl p-3 space-y-3 shadow-sm">
              {post.comments.map((comment) => {
                const commentAuthor = getUser(comment.authorId);
                return (
                  <div key={comment.id} className="flex gap-2.5 items-start">
                    <div className="w-8 h-8 rounded-full bg-green-100 border border-green-200 flex items-center justify-center text-sm shrink-0">
                      {commentAuthor?.avatar || '?'}
                    </div>
                    <div className="flex-1 bg-green-50 rounded-2xl px-3 py-2 border border-green-100">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <span className="text-xs font-semibold text-green-800">{commentAuthor?.displayName}</span>
                        <span className="text-xs text-slate-400">{formatDate(comment.createdAt)}</span>
                      </div>
                      <p className="text-sm text-slate-700">{comment.content}</p>
                    </div>
                  </div>
                );
              })}

              {currentUser ? (
                <form onSubmit={handleComment} className="flex gap-2 items-center mt-2">
                  <div className="w-8 h-8 rounded-full bg-green-100 border border-green-200 flex items-center justify-center text-sm shrink-0">
                    {currentUser.avatar}
                  </div>
                  <input
                    type="text"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Viết bình luận..."
                    className="flex-1 bg-[#f8fff8] border border-green-200 focus:border-green-400 rounded-full px-4 py-2 text-sm text-slate-800 placeholder-slate-400 outline-none transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={!commentText.trim()}
                    className="px-3 h-9 rounded-full bg-green-600 hover:bg-green-500 disabled:bg-green-200 text-white text-sm transition-colors"
                  >
                    Gửi
                  </button>
                </form>
              ) : (
                <p className="text-center text-slate-400 text-xs py-2">Đăng nhập để bình luận</p>
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
