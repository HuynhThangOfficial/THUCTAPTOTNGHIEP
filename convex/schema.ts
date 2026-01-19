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
  followersCount: v.number(),
  pushToken: v.optional(v.string()),
};

export const Message = {
  userId: v.id('users'),
  threadId: v.optional(v.string()),
  content: v.string(),
  likeCount: v.number(),
  commentCount: v.number(),
  retweetCount: v.number(),
  mediaFiles: v.optional(v.array(v.string())),
  websiteUrl: v.optional(v.string()),
};

export default defineSchema({
  users: defineTable(User)
    .index('byClerkId', ['clerkId'])
    .searchIndex('searchUsers', {
      searchField: 'username',
    }),

  messages: defineTable(Message),

  edit_history: defineTable({
    messageId: v.id('messages'),
    oldContent: v.string(),
    imageChangeLog: v.optional(v.string()),
    isTextModified: v.optional(v.boolean()),
  }).index('by_messageId', ['messageId']),

  likes: defineTable({
    userId: v.id('users'),
    messageId: v.id('messages'),
  })
    .index('by_user_message', ['userId', 'messageId'])
    .index('by_user', ['userId']),

  categories: defineTable({
    name: v.string(),
    slug: v.string(),
    icon: v.optional(v.string()),
    type: v.string(),         // 'university', 'category', 'channel'
    parentId: v.optional(v.id('categories')),
    sortOrder: v.number(),
  }).index('by_type', ['type']),
});