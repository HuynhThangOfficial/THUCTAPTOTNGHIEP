import React, { createContext, useContext, useState, useEffect } from 'react';
import { Id } from '@/convex/_generated/dataModel';
import { useTranslation } from 'react-i18next'; // 👈 IMPORT DỊCH

interface ChannelContextType {
  activeChannelId: Id<'channels'> | null;
  setActiveChannelId: (id: Id<'channels'> | null) => void;

  activeUniversityId: Id<'universities'> | null;
  setActiveUniversityId: (id: Id<'universities'> | null) => void;

  activeServerId: Id<'servers'> | null;
  setActiveServerId: (id: Id<'servers'> | null) => void;

  activeChannelName: string;
  setActiveChannelName: (name: string) => void;

  clearActiveStatus: () => void;
}

const ChannelContext = createContext<ChannelContextType | undefined>(undefined);

export const ChannelProvider = ({ children }: { children: React.ReactNode }) => {
  const { t, i18n } = useTranslation(); // 👈 KHỞI TẠO HOOK
  
  const [activeChannelId, setActiveChannelId] = useState<Id<'channels'> | null>(null);
  const [activeUniversityId, setActiveUniversityId] = useState<Id<'universities'> | null>(null);
  const [activeServerId, setActiveServerId] = useState<Id<'servers'> | null>(null);
  
  // Khởi tạo với giá trị dịch
  const [activeChannelName, setActiveChannelName] = useState<string>(t('tabs.home'));

  // Cập nhật lại tên "Trang chủ" khi người dùng đổi ngôn ngữ máy (nếu đang ở trạng thái mặc định)
  useEffect(() => {
    if (!activeChannelId && !activeServerId && !activeUniversityId) {
      setActiveChannelName(t('tabs.home'));
    }
  }, [i18n.language]); // Theo dõi sự thay đổi ngôn ngữ

  const clearActiveStatus = () => {
    setActiveChannelId(null);
    setActiveServerId(null);
    setActiveUniversityId(null);
    setActiveChannelName(t('tabs.home')); // 👈 DÙNG t() KHI RESET
  };

  return (
    <ChannelContext.Provider
      value={{
        activeChannelId, setActiveChannelId,
        activeUniversityId, setActiveUniversityId,
        activeServerId, setActiveServerId,
        activeChannelName, setActiveChannelName,
        clearActiveStatus
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