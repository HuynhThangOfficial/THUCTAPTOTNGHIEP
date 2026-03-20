"use client";
import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useQuery, useMutation } from 'convex/react';
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

  // 👇 STATE MỚI CHO TÍNH NĂNG GHIM SERVER 👇
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

  // LOGIC GHIM SERVER LƯU VÀO LOCALSTORAGE
  const [pinnedServers, setPinnedServers] = useState<string[]>([]);

  const userProfile = useQuery(api.users.current);
  const { i18n } = useTranslation();
  const updateOnlineStatus = useMutation(api.users.updateOnlineStatus);

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

  useEffect(() => {
    if (!userProfile?._id) return;
    const pingOnline = () => { updateOnlineStatus({ isOnline: true }).catch(() => {}); };
    const pingOffline = () => { updateOnlineStatus({ isOnline: false }).catch(() => {}); };
    pingOnline();
    const interval = setInterval(pingOnline, 60000);
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') pingOnline();
      else pingOffline();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      pingOffline();
    };
  }, [userProfile?._id]);

  const value = {
    activeUniversityId, setActiveUniversityId,
    activeServerId, setActiveServerId,
    activeChannelId, setActiveChannelId,
    activeChannelName, setActiveChannelName,
    showAuthModal, setShowAuthModal,
    showComposeModal, setShowComposeModal,
    showEditProfileModal, setShowEditProfileModal,
    pinnedServers, togglePinServer // THÊM VÀO EXPORT
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) throw new Error('useApp must be used within an AppProvider');
  return context;
}