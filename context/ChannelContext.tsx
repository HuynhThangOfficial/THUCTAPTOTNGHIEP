import React, { createContext, useContext, useState } from 'react';
import { Id } from '@/convex/_generated/dataModel';

interface ChannelContextType {
  activeChannelId: Id<'channels'> | null;
  setActiveChannelId: (id: Id<'channels'> | null) => void;
  activeUniversityId: Id<'universities'> | null;
  setActiveUniversityId: (id: Id<'universities'> | null) => void;
  activeChannelName: string;
  setActiveChannelName: (name: string) => void;
}

const ChannelContext = createContext<ChannelContextType | undefined>(undefined);

export const ChannelProvider = ({ children }: { children: React.ReactNode }) => {
  const [activeChannelId, setActiveChannelId] = useState<Id<'channels'> | null>(null);
  const [activeUniversityId, setActiveUniversityId] = useState<Id<'universities'> | null>(null);
  const [activeChannelName, setActiveChannelName] = useState<string>('Trang chủ');

  return (
    <ChannelContext.Provider
      value={{
        activeChannelId, setActiveChannelId,
        activeUniversityId, setActiveUniversityId,
        activeChannelName, setActiveChannelName
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