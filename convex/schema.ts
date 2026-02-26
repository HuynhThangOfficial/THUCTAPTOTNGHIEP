import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export const User = {
  email: v.string(),
  clerkId: v.string(),
  imageUrl: v.optional(v.string()),
  first_name: v.optional(v.string()),
  last_name: v.optional(v.string()),
  username: v.string(),
  bio: v.optional(v.string()),
  location: v.optional(v.string()),
  websiteUrl: v.optional(v.string()),
  linkTitle: v.optional(v.string()),
  followersCount: v.number(),
  pushToken: v.optional(v.string()),
};

export default defineSchema({
  users: defineTable(User)
    .index('byClerkId', ['clerkId'])
    .searchIndex('searchUsers', { searchField: 'username' }),

  follows: defineTable({
    followerId: v.id('users'),
    followingId: v.id('users'),
  })
  .index('by_follower', ['followerId'])
  .index('by_following', ['followingId'])
  .index('by_both', ['followerId', 'followingId']),

  // 1. BẢNG TRƯỜNG ĐẠI HỌC (CHỈ DO HỆ THỐNG TẠO) - GIỮ NGUYÊN
  universities: defineTable({
    name: v.string(),
    slug: v.string(),
    icon: v.string(),
    sortOrder: v.number(),
  }),

  // 2. BẢNG MÁY CHỦ RIÊNG (DO NGƯỜI DÙNG TẠO) - MỚI THÊM
  servers: defineTable({
    name: v.string(),
    slug: v.string(),
    icon: v.string(),
    creatorId: v.id('users'), // Chủ máy chủ
    memberIds: v.array(v.id('users')), // Danh sách thành viên được mời
  }),

  // 3. BẢNG KÊNH
  channels: defineTable({
    name: v.string(),
    type: v.string(),
    universityId: v.optional(v.id('universities')), // Có thể thuộc trường
    serverId: v.optional(v.id('servers')),          // Hoặc thuộc máy chủ riêng
    parentId: v.optional(v.id('channels')),
    sortOrder: v.number(),
    description: v.optional(v.string())
  })
  .index('by_university', ['universityId'])
  .index('by_server', ['serverId']), // Thêm index để truy vấn nhanh kênh của server

  // 4. BẢNG BÀI VIẾT
  messages: defineTable({
    userId: v.id('users'),
    content: v.string(),
    likeCount: v.number(),
    commentCount: v.number(),
    retweetCount: v.number(),
    mediaFiles: v.optional(v.array(v.string())),
    websiteUrl: v.optional(v.string()),

    universityId: v.optional(v.id("universities")),
    serverId: v.optional(v.id('servers')), // <--- Thêm dòng này

    channelId: v.optional(v.id('channels')),
    threadId: v.optional(v.id('messages')),
  })
  .index('by_channel', ['channelId'])
  .index('by_threadId', ['threadId']),

  likes: defineTable({
    userId: v.id('users'),
    messageId: v.id('messages'),
  }).index('by_user_message', ['userId', 'messageId']),

  edit_history: defineTable({
    messageId: v.id('messages'),
    oldContent: v.string(),
    imageChangeLog: v.optional(v.string()),
    isTextModified: v.optional(v.boolean()),
  }).index('by_messageId', ['messageId']),
});