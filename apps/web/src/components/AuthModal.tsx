"use client";

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { User } from '../types';

interface AuthModalProps {
  onClose: () => void;
}

const AVATARS = ['🌿', '🌱', '🍃', '🌳', '🌲', '🍀', '🌾', '🪴', '🌵', '🌴'];

export default function AuthModal({ onClose }: AuthModalProps) {
  const { setCurrentUser, users } = useApp();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [form, setForm] = useState({ username: '', displayName: '', password: '', bio: '' });
  const [error, setError] = useState('');
  const [avatarIdx, setAvatarIdx] = useState(0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (mode === 'login') {
      const found = users.find((u) => u.username === form.username);
      if (!found) {
        setError('Không tìm thấy tài khoản. Hãy đăng ký!');
        return;
      }
      setCurrentUser({ ...found, status: 'online' });
      onClose();
    } else {
      if (!form.username || !form.displayName || !form.password) {
        setError('Vui lòng điền đầy đủ thông tin!');
        return;
      }
      if (users.find((u) => u.username === form.username)) {
        setError('Tên đăng nhập đã tồn tại!');
        return;
      }
      const newUser: User = {
        id: `u_${Date.now()}`,
        username: form.username,
        displayName: form.displayName,
        avatar: AVATARS[avatarIdx],
        status: 'online',
        bio: form.bio,
        joinedAt: new Date().toISOString().split('T')[0],
      };
      setCurrentUser(newUser);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 backdrop-blur-sm p-4">
      <div className="bg-white border border-green-100 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-gradient-to-r from-green-100 via-emerald-50 to-lime-50 p-6 text-center border-b border-green-100">
          <div className="text-4xl mb-2">🌿</div>
          <h1 className="text-2xl font-bold text-slate-800">GreenVibe</h1>
          <p className="text-green-700 text-sm mt-1">Mạng xã hội dạng server/channel để đăng bài viết</p>
        </div>

        <div className="flex border-b border-green-100 bg-[#fcfffc]">
          <button
            onClick={() => {
              setMode('login');
              setError('');
            }}
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${
              mode === 'login' ? 'text-green-700 border-b-2 border-green-500' : 'text-slate-500 hover:text-green-700'
            }`}
          >
            Đăng nhập
          </button>
          <button
            onClick={() => {
              setMode('register');
              setError('');
            }}
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${
              mode === 'register' ? 'text-green-700 border-b-2 border-green-500' : 'text-slate-500 hover:text-green-700'
            }`}
          >
            Đăng ký
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-xl">{error}</div>}

          {mode === 'register' && (
            <>
              <div>
                <label className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2 block">
                  Chọn Avatar
                </label>
                <div className="flex gap-2 flex-wrap">
                  {AVATARS.map((av, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setAvatarIdx(i)}
                      className={`w-11 h-11 rounded-full text-xl flex items-center justify-center border-2 transition-all ${
                        avatarIdx === i
                          ? 'border-green-500 bg-green-50 scale-110'
                          : 'border-green-100 bg-white hover:border-green-300'
                      }`}
                    >
                      {av}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1 block">
                  Tên hiển thị
                </label>
                <input
                  type="text"
                  value={form.displayName}
                  onChange={(e) => setForm((f: any) => ({ ...f, displayName: e.target.value }))}
                  placeholder="Tên của bạn"
                  className="w-full bg-[#fbfffb] border border-green-200 rounded-xl px-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-green-400 text-sm"
                />
              </div>
            </>
          )}

          <div>
            <label className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1 block">
              Tên đăng nhập
            </label>
            <input
              type="text"
              value={form.username}
              onChange={(e) => setForm((f: any) => ({ ...f, username: e.target.value }))}
              placeholder="username"
              className="w-full bg-[#fbfffb] border border-green-200 rounded-xl px-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-green-400 text-sm"
            />
          </div>

          <div>
            <label className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1 block">
              Mật khẩu
            </label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm((f: any) => ({ ...f, password: e.target.value }))}
              placeholder="••••••••"
              className="w-full bg-[#fbfffb] border border-green-200 rounded-xl px-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-green-400 text-sm"
            />
          </div>

          {mode === 'register' && (
            <div>
              <label className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1 block">
                Bio (tùy chọn)
              </label>
              <input
                type="text"
                value={form.bio}
                onChange={(e) => setForm((f: any) => ({ ...f, bio: e.target.value }))}
                placeholder="Giới thiệu bản thân..."
                className="w-full bg-[#fbfffb] border border-green-200 rounded-xl px-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-green-400 text-sm"
              />
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-green-600 hover:bg-green-500 text-white font-semibold py-3 rounded-xl transition-colors shadow-sm mt-2"
          >
            {mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}
          </button>

          {mode === 'login' && (
            <p className="text-center text-slate-500 text-sm">
              Chưa có tài khoản?{' '}
              <button type="button" onClick={() => setMode('register')} className="text-green-700 hover:underline">
                Đăng ký ngay
              </button>
            </p>
          )}
        </form>
      </div>
    </div>
  );
}