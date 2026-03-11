import React, { createContext, useContext, useState } from 'react';
import { Id } from '@/convex/_generated/dataModel';

interface ChannelContextType {
  activeChannelId: Id<'channels'> | null;
  setActiveChannelId: (id: Id<'channels'> | null) => void;

  activeUniversityId: Id<'universities'> | null;
  setActiveUniversityId: (id: Id<'universities'> | null) => void;

  activeServerId: Id<'servers'> | null;
  setActiveServerId: (id: Id<'servers'> | null) => void;

  activeChannelName: string;
  setActiveChannelName: (name: string) => void;

  // 👇 THÊM HÀM NÀY ĐỂ RESET NHANH
  clearActiveStatus: () => void;
}

const ChannelContext = createContext<ChannelContextType | undefined>(undefined);

export const ChannelProvider = ({ children }: { children: React.ReactNode }) => {
  const [activeChannelId, setActiveChannelId] = useState<Id<'channels'> | null>(null);
  const [activeUniversityId, setActiveUniversityId] = useState<Id<'universities'> | null>(null);
  const [activeServerId, setActiveServerId] = useState<Id<'servers'> | null>(null);
  const [activeChannelName, setActiveChannelName] = useState<string>('Trang chủ');

  // Hàm giúp xóa sạch trạng thái hiện tại
  const clearActiveStatus = () => {
    setActiveChannelId(null);
    setActiveServerId(null);
    setActiveUniversityId(null);
    setActiveChannelName('Trang chủ');
  };

  return (
    <ChannelContext.Provider
      value={{
        activeChannelId, setActiveChannelId,
        activeUniversityId, setActiveUniversityId,
        activeServerId, setActiveServerId,
        activeChannelName, setActiveChannelName,
        clearActiveStatus // MỚI
      }}
    >
      {children}
    </ChannelContext.Provider>
  );
};

export const useChannel = () => {
  const context = useContext(ChannelContext);
  if (!context) throw new Error('useChannel must be used within ChannelProvider');
  return context;
};