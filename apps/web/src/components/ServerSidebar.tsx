"use client";

import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Server } from '../types';
import CreateServerModal from './CreateServerModal';

export default function ServerSidebar() {
  const { servers, activeServerId, setActiveServerId, setActiveChannelId } = useApp();
  const [showCreate, setShowCreate] = useState(false);

  const handleSelectServer = (server: Server) => {
    setActiveServerId(server.id);
    if (server.channels.length > 0) {
      setActiveChannelId(server.channels[0].id);
    }
  };

  return (
    <>
      <aside className="w-[72px] bg-[#f1f8f2] border-r border-green-100 flex flex-col items-center py-3 gap-2 overflow-y-auto shrink-0">
        <button
          onClick={() => {
            setActiveServerId('');
            setActiveChannelId('');
          }}
          className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-500 text-white shadow-md flex items-center justify-center text-xl transition-all hover:rounded-[18px] hover:scale-105"
          title="Trang chủ"
        >
          🌿
        </button>

        <div className="w-8 h-px bg-green-200 my-1" />

        {servers.map((server) => (
          <div key={server.id} className="relative group">
            <div
              className={`absolute -left-3 top-1/2 -translate-y-1/2 w-1 rounded-r-full transition-all ${
                activeServerId === server.id ? 'h-8 bg-green-500' : 'h-0 group-hover:h-5 bg-green-300'
              }`}
            />
            <button
              onClick={() => handleSelectServer(server)}
              className={`relative w-12 h-12 flex items-center justify-center text-xl shadow-sm transition-all ${
                activeServerId === server.id
                  ? 'rounded-2xl text-white scale-105'
                  : 'rounded-full bg-white text-green-700 hover:text-white hover:rounded-2xl hover:scale-105'
              }`}
              style={{
                backgroundColor: activeServerId === server.id ? server.color : '#ffffff',
                border: activeServerId === server.id ? 'none' : '1px solid #dcfce7',
              }}
              title={server.name}
            >
              {server.icon}
              {!!server.notificationCount && activeServerId !== server.id && (
                <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-[#f1f8f2]">
                  {server.notificationCount}
                </span>
              )}
            </button>
            <div className="absolute left-16 top-1/2 -translate-y-1/2 bg-white border border-green-100 text-slate-700 text-xs px-3 py-1.5 rounded-lg pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 shadow-lg">
              {server.name}
            </div>
          </div>
        ))}

        <div className="w-8 h-px bg-green-200 my-1" />

        <button
          onClick={() => setShowCreate(true)}
          className="w-12 h-12 rounded-full bg-white border border-dashed border-green-300 hover:border-green-500 hover:bg-green-50 text-green-600 text-2xl flex items-center justify-center shadow-sm transition-all hover:rounded-2xl"
          title="Thêm server"
        >
          +
        </button>
      </aside>

      {showCreate && <CreateServerModal onClose={() => setShowCreate(false)} />}
    </>
  );
}
