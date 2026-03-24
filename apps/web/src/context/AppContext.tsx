"use client";
import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useQuery } from 'convex/react'; // Đã xóa useMutation vì không cần gọi API cập nhật status nữa
import { api } from '../../../../convex/_generated/api';
import { useTranslation } from 'react-i18next';
import '../i18n';

interface AppContextType {
  activeUniversityId: string;
  setActiveUniversityId: (id: string) => void;
  activeServerId: string;
  setActiveServerId: (id: string) => void;
  activeChannelId: string;
  setActiveChannelId: (id: string) => void;
  activeChannelName: string;
  setActiveChannelName: (name: string) => void;

  showAuthModal: boolean;
  setShowAuthModal: (show: boolean) => void;
  showComposeModal: boolean;
  setShowComposeModal: (show: boolean) => void;

  showEditProfileModal: boolean;
  setShowEditProfileModal: (show: boolean) => void;

  pinnedServers: string[];
  togglePinServer: (id: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [activeUniversityId, setActiveUniversityId] = useState('');
  const [activeServerId, setActiveServerId] = useState('');
  const [activeChannelId, setActiveChannelId] = useState('');
  const [activeChannelName, setActiveChannelName] = useState('đại-sảnh');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);

  const [pinnedServers, setPinnedServers] = useState<string[]>([]);

  const userProfile = useQuery(api.users.current);
  const { i18n } = useTranslation();

  useEffect(() => {
   if (userProfile?.language) {
     i18n.changeLanguage(userProfile.language);
   }
  }, [userProfile?.language, i18n]);

  // Lấy dữ liệu ghim từ bộ nhớ trình duyệt khi Web load
  useEffect(() => {
    const stored = localStorage.getItem('pinnedServers');
    if (stored) setPinnedServers(JSON.parse(stored));
  }, []);

  const togglePinServer = (id: string) => {
    setPinnedServers(prev => {
      const next = prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id];
      localStorage.setItem('pinnedServers', JSON.stringify(next));
      return next;
    });
  };

  const value = {
    activeUniversityId, setActiveUniversityId,
    activeServerId, setActiveServerId,
    activeChannelId, setActiveChannelId,
    activeChannelName, setActiveChannelName,
    showAuthModal, setShowAuthModal,
    showComposeModal, setShowComposeModal,
    showEditProfileModal, setShowEditProfileModal,
    pinnedServers, togglePinServer
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) throw new Error('useApp must be used within an AppProvider');
  return context;
}