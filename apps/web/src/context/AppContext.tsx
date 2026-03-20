"use client";
import { createContext, useContext, useState, ReactNode } from 'react';

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
  
  // DÒNG THÊM MỚI CHO CHỈNH SỬA HỒ SƠ
  showEditProfileModal: boolean;
  setShowEditProfileModal: (show: boolean) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [activeUniversityId, setActiveUniversityId] = useState('');
  const [activeServerId, setActiveServerId] = useState('');
  const [activeChannelId, setActiveChannelId] = useState('');
  const [activeChannelName, setActiveChannelName] = useState('đại-sảnh');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showComposeModal, setShowComposeModal] = useState(false);
  
  // THÊM STATE
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);

  const value = {
    activeUniversityId, setActiveUniversityId,
    activeServerId, setActiveServerId,
    activeChannelId, setActiveChannelId,
    activeChannelName, setActiveChannelName,
    showAuthModal, setShowAuthModal,
    showComposeModal, setShowComposeModal,
    showEditProfileModal, setShowEditProfileModal // THÊM VÀO VALUE
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) throw new Error('useApp must be used within an AppProvider');
  return context;
}