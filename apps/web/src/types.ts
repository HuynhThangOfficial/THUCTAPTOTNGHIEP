export interface User {
  id: string;
  username: string;
  displayName: string;
  avatar: string;
  status: 'online' | 'idle' | 'dnd' | 'offline';
  bio?: string;
  joinedAt: string;
}

export interface Server {
  id: string;
  name: string;
  icon: string;
  color: string;
  ownerId: string;
  members: string[];
  channels: Channel[];
  notificationCount?: number;
  description?: string;
  bannerTitle?: string;
  bannerSubtitle?: string;
}

export interface Channel {
  id: string;
  name: string;
  type: 'text' | 'announcement' | 'voice';
  serverId: string;
  category?: string;
  description?: string;
  badgeCount?: number;
  isNew?: boolean;
  icon?: 'hash' | 'announcement' | 'guide' | 'people' | 'media' | 'voice';
}

export interface Post {
  id: string;
  authorId: string;
  channelId: string;
  serverId: string;
  title?: string;
  content: string;
  imageUrl?: string;
  createdAt: string;
  reactions: Reaction[];
  comments: Comment[];
  tag?: string;
  accent?: 'green' | 'amber' | 'blue';
}

export interface Reaction {
  emoji: string;
  count: number;
  userIds: string[];
}

export interface Comment {
  id: string;
  authorId: string;
  content: string;
  createdAt: string;
}
