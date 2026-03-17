import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

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
  lastSeen: v.optional(v.number()),
  isOnline: v.optional(v.boolean()),
  showActiveStatus: v.optional(v.boolean()),
  stones: v.optional(v.number()),
  language: v.optional(v.string()),
};

export default defineSchema({
  users: defineTable(User)
    .index("byClerkId", ["clerkId"])
    .searchIndex("searchUsers", { searchField: "username" }),

  follows: defineTable({
    followerId: v.id("users"),
    followingId: v.id("users"),
  })
    .index("by_follower", ["followerId"])
    .index("by_following", ["followingId"])
    .index("by_both", ["followerId", "followingId"]),

  universities: defineTable({
    name: v.string(),
    slug: v.string(),
    icon: v.string(),
    sortOrder: v.number(),
  }),

  // 👇 Đã thêm v.optional cho adminIds để không bị lỗi lúc migrate 👇
  servers: defineTable({
    name: v.string(),
    slug: v.string(),
    icon: v.string(),
    creatorId: v.id("users"),
    memberIds: v.array(v.id("users")),
    adminIds: v.optional(v.array(v.id("users"))), 
    totalStones: v.optional(v.number()),
  }),

  server_boosts: defineTable({
    serverId: v.id("servers"),
    userId: v.id("users"),
    amount: v.number(),
    boostedAt: v.number(), // Thời gian quyên góp
  })
  .index("by_server", ["serverId"])
  .index("by_user", ["userId"]),

  channels: defineTable({
    name: v.string(),
    type: v.string(),
    universityId: v.optional(v.id("universities")),
    serverId: v.optional(v.id("servers")),
    parentId: v.optional(v.id("channels")),
    sortOrder: v.number(),
    description: v.optional(v.string()),
    isAnonymous: v.optional(v.boolean()),
  })
    .index("by_university", ["universityId"])
    .index("by_server", ["serverId"]),

messages: defineTable({
    channelId: v.optional(v.id("channels")),
    commentCount: v.number(),
    content: v.string(),
    likeCount: v.number(),
    mediaFiles: v.optional(v.array(v.string())),
    parentId: v.optional(v.id("messages")),
    retweetCount: v.number(),
    serverId: v.optional(v.id("servers")),
    shareCount: v.optional(v.number()),
    threadId: v.optional(v.id("messages")),
    universityId: v.optional(v.id("universities")),
    userId: v.id("users"),
    websiteUrl: v.optional(v.string()),
    isAnonymous: v.optional(v.boolean()),
    allowComments: v.optional(v.boolean()),
  })
  .index("by_university", ["universityId"])
  .index("by_server", ["serverId"])
  .index("by_channel", ["channelId"])
  .index("by_threadId", ["threadId"])
  .index("by_user", ["userId"]),

  // 👇 THÊM BẢNG retweets CHO TÍNH NĂNG ĐĂNG LẠI 👇
  retweets: defineTable({
    userId: v.id("users"),
    messageId: v.id("messages"),
  })
    .index("by_user", ["userId"])
    .index("by_user_message", ["userId", "messageId"]),

  likes: defineTable({
    userId: v.id("users"),
    messageId: v.id("messages"),
  }).index("by_user_message", ["userId", "messageId"]),

  edit_history: defineTable({
    messageId: v.id("messages"),
    oldContent: v.string(),
    imageChangeLog: v.optional(v.string()),
    isTextModified: v.optional(v.boolean()),
  }).index("by_messageId", ["messageId"]),

  conversations: defineTable({
    participantIds: v.array(v.id("users")),
    updatedAt: v.number(),
    lastMessageText: v.optional(v.string()),
    typingUserId: v.optional(v.id("users")), 
  }).index("by_participant", ["participantIds"]),

  direct_messages: defineTable({
    conversationId: v.id("conversations"),
    senderId: v.id("users"),
    content: v.string(),
    status: v.union(v.literal("sent"), v.literal("delivered"), v.literal("read")),
    isDeleted: v.optional(v.boolean()),
    isPinned: v.optional(v.boolean()),
    isSystem: v.optional(v.boolean()), 
    imageId: v.optional(v.id("_storage")),
    deletedBy: v.optional(v.array(v.id("users"))),
    replyToMessageId: v.optional(v.id("direct_messages")),
    reactions: v.optional(
      v.array(
        v.object({
          userId: v.id("users"),
          emoji: v.string(),
        })
      )
    ),
  }).index("by_conversation", ["conversationId"]),

  notes: defineTable({
    userId: v.id("users"),
    content: v.string(),
    expiresAt: v.number(),
    privacy: v.optional(v.string()),
  }).index("by_user", ["userId"]),

  stories: defineTable({
    userId: v.id("users"),
    mediaUrl: v.string(),
    mediaType: v.string(),
    expiresAt: v.number(),
  }).index("by_user", ["userId"]),

  channel_subscriptions: defineTable({
    userId: v.id("users"),
    channelId: v.optional(v.id("channels")),
    serverId: v.optional(v.union(v.id('servers'), v.id('universities'))),
    isSubscribed: v.boolean(),
    isHidden: v.optional(v.boolean()),
  })
    .index("by_user_channel", ["userId", "channelId"])
    .index("by_user_server", ["userId", "serverId"])
    .index("by_channel", ["channelId"])
    .index("by_server", ["serverId"]),

  notifications: defineTable({
    userId: v.id("users"),
    senderId: v.optional(v.id("users")),
    type: v.string(),
    channelId: v.optional(v.id("channels")),
    messageId: v.optional(v.id("messages")),
    isRead: v.boolean(),
  }).index("by_user", ["userId"]),

  server_members: defineTable({
    serverId: v.id("servers"),
    userId: v.id("users"),
    role: v.union(v.literal("owner"), v.literal("admin"), v.literal("member")),
    joinedAt: v.number(),
  })
    .index("by_server", ["serverId"])
    .index("by_user", ["userId"])
    .index("by_server_user", ["serverId", "userId"]),
});