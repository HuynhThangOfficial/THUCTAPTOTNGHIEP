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
  linkTitle: v.optional(v.string()), // <--- THÊM DÒNG NÀY
  followersCount: v.number(),
  pushToken: v.optional(v.string()),
};

export default defineSchema({
  users: defineTable(User)
    .index('byClerkId', ['clerkId'])
    .searchIndex('searchUsers', { searchField: 'username' }),

    // --- THÊM BẢNG NÀY ---
  follows: defineTable({
    followerId: v.id('users'), // Người đi theo dõi (Là bạn)
    followingId: v.id('users'), // Người được theo dõi (Idol)
  })
  .index('by_follower', ['followerId'])
  .index('by_following', ['followingId'])
  .index('by_both', ['followerId', 'followingId']), // Để kiểm tra xem đã follow chưa
  // ---------------------

  universities: defineTable({
    name: v.string(),
    slug: v.string(),
    icon: v.string(),
    sortOrder: v.number(),
  }),

  channels: defineTable({
    name: v.string(),
    type: v.string(),
    universityId: v.id('universities'),
    parentId: v.optional(v.id('channels')),
    sortOrder: v.number(),
  }).index('by_university', ['universityId']),

  messages: defineTable({
    userId: v.id('users'),
    content: v.string(),
    likeCount: v.number(),
    commentCount: v.number(),
    retweetCount: v.number(),
    mediaFiles: v.optional(v.array(v.string())),
    websiteUrl: v.optional(v.string()),
    universityId: v.optional(v.id("universities")),

    channelId: v.optional(v.id('channels')), // Kênh
    threadId: v.optional(v.id('messages')),  // <--- THÊM MỚI: ID bài gốc (nếu là cmt)
  })
  .index('by_channel', ['channelId'])
  .index('by_threadId', ['threadId']),       // <--- THÊM INDEX ĐỂ TÌM CMT NHANH

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