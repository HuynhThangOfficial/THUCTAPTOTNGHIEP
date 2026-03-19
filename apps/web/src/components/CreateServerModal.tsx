"use client";

import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Server } from '../types';

interface Props {
  onClose: () => void;
}

const SERVER_COLORS = ['#22c55e', '#16a34a', '#15803d', '#4ade80', '#86efac', '#14532d', '#65a30d', '#84cc16'];

export default function CreateServerModal({ onClose }: Props) {
  const { addServer, currentUser, setActiveServerId, setActiveChannelId } = useApp();
  const [name, setName] = useState('');
  const [colorIdx, setColorIdx] = useState(0);

  const handleCreate = () => {
    if (!name.trim() || !currentUser) return;

    const serverId = `s_${Date.now()}`;
    const initials = name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

    const newServer: Server = {
      id: serverId,
      name: name.trim(),
      icon: initials,
      color: SERVER_COLORS[colorIdx],
      ownerId: currentUser.id,
      members: [currentUser.id],
      description: 'Server cộng đồng mới được tạo.',
      bannerTitle: name.trim(),
      bannerSubtitle: 'Hãy bắt đầu đăng bài và xây dựng cộng đồng của bạn',
      channels: [
        {
          id: `${serverId}_ch_1`,
          name: 'general',
          type: 'text',
          serverId,
          category: 'GENERAL',
          description: 'Kênh chung',
          icon: 'hash',
        },
        {
          id: `${serverId}_ch_2`,
          name: 'announcements',
          type: 'announcement',
          serverId,
          category: 'INFORMATION',
          description: 'Thông báo',
          icon: 'announcement',
        },
      ],
    };

    addServer(newServer);
    setActiveServerId(newServer.id);
    setActiveChannelId(newServer.channels[0].id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 backdrop-blur-sm p-4">
      <div className="bg-white border border-green-100 rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="bg-gradient-to-r from-green-100 via-emerald-50 to-lime-50 p-5 text-center border-b border-green-100">
          <h2 className="text-xl font-bold text-slate-800">Tạo Server mới</h2>
          <p className="text-green-700 text-sm mt-1">Xây dựng cộng đồng bài viết của bạn</p>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1 block">
              Tên Server
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: Creative Garden"
              className="w-full bg-[#fbfffb] border border-green-200 rounded-xl px-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-green-400 text-sm"
            />
          </div>

          <div>
            <label className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2 block">
              Màu sắc
            </label>
            <div className="flex gap-2 flex-wrap">
              {SERVER_COLORS.map((color, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setColorIdx(i)}
                  className={`w-9 h-9 rounded-full border-2 transition-all ${
                    colorIdx === i ? 'border-slate-700 scale-110' : 'border-transparent hover:scale-105'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-green-200 text-slate-600 hover:bg-green-50 transition-colors text-sm"
            >
              Hủy
            </button>
            <button
              onClick={handleCreate}
              disabled={!name.trim()}
              className="flex-1 py-3 rounded-xl bg-green-600 hover:bg-green-500 disabled:bg-green-200 text-white font-semibold transition-colors text-sm"
            >
              Tạo server
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
