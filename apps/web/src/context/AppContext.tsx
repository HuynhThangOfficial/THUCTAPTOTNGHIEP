"use client";
import { createContext, useContext, useState, ReactNode } from 'react';
import { User, Server, Post, Channel } from '../types';
import { mockUsers, mockServers, mockPosts } from '../data/mockData';

interface AppContextType {
  currentUser: User | null;
  users: User[];
  servers: Server[];
  posts: Post[];
  activeServerId: string | null;
  activeChannelId: string | null;
  setCurrentUser: (user: User | null) => void;
  setActiveServerId: (id: string) => void;
  setActiveChannelId: (id: string) => void;
  addPost: (post: Post) => void;
  addReaction: (postId: string, emoji: string) => void;
  addComment: (postId: string, content: string) => void;
  addServer: (server: Server) => void;
  getUser: (id: string) => User | undefined;
  getServer: (id: string) => Server | undefined;
  getChannel: (id: string) => Channel | undefined;
  getPostsForChannel: (channelId: string) => Post[];
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>(mockUsers);
  const [servers, setServers] = useState<Server[]>(mockServers);
  const [posts, setPosts] = useState<Post[]>(mockPosts);
  const [activeServerId, setActiveServerId] = useState<string | null>('s1');
  const [activeChannelId, setActiveChannelId] = useState<string | null>('c2');

  const getUser = (id: string) => users.find(u => u.id === id);
  const getServer = (id: string) => servers.find(s => s.id === id);
  const getChannel = (id: string) => {
    for (const s of servers) {
      const ch = s.channels.find(c => c.id === id);
      if (ch) return ch;
    }
    return undefined;
  };
  const getPostsForChannel = (channelId: string) =>
    posts.filter(p => p.channelId === channelId).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

  const addPost = (post: Post) => {
    setPosts(prev => [post, ...prev]);
  };

  const addReaction = (postId: string, emoji: string) => {
    if (!currentUser) return;
    setPosts(prev =>
      prev.map(p => {
        if (p.id !== postId) return p;
        const existing = p.reactions.find(r => r.emoji === emoji);
        if (existing) {
          const hasReacted = existing.userIds.includes(currentUser.id);
          return {
            ...p,
            reactions: p.reactions.map(r =>
              r.emoji === emoji
                ? {
                    ...r,
                    count: hasReacted ? r.count - 1 : r.count + 1,
                    userIds: hasReacted
                      ? r.userIds.filter(id => id !== currentUser.id)
                      : [...r.userIds, currentUser.id],
                  }
                : r
            ).filter(r => r.count > 0),
          };
        } else {
          return {
            ...p,
            reactions: [...p.reactions, { emoji, count: 1, userIds: [currentUser.id] }],
          };
        }
      })
    );
  };

  const addComment = (postId: string, content: string) => {
    if (!currentUser) return;
    const comment = {
      id: `cm_${Date.now()}`,
      authorId: currentUser.id,
      content,
      createdAt: new Date().toISOString(),
    };
    setPosts(prev =>
      prev.map(p =>
        p.id === postId ? { ...p, comments: [...p.comments, comment] } : p
      )
    );
  };

  const addServer = (server: Server) => {
    setServers(prev => [...prev, server]);
    setUsers(prev =>
      prev.map(u =>
        u.id === currentUser?.id ? u : u
      )
    );
  };

  const handleSetCurrentUser = (user: User | null) => {
    setCurrentUser(user);
    if (user) {
      setUsers(prev => {
        const exists = prev.find(u => u.id === user.id);
        if (!exists) return [...prev, user];
        return prev.map(u => u.id === user.id ? user : u);
      });
    }
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        users,
        servers,
        posts,
        activeServerId,
        activeChannelId,
        setCurrentUser: handleSetCurrentUser,
        setActiveServerId,
        setActiveChannelId,
        addPost,
        addReaction,
        addComment,
        addServer,
        getUser,
        getServer,
        getChannel,
        getPostsForChannel,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};
