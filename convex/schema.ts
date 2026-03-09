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

  servers: defineTable({
    name: v.string(),
    slug: v.string(),
    icon: v.string(),
    creatorId: v.id("users"),
    memberIds: v.array(v.id("users")),
  }),

  channels: defineTable({
    name: v.string(),
    type: v.string(),
    universityId: v.optional(v.id("universities")),
    serverId: v.optional(v.id("servers")),
    parentId: v.optional(v.id("channels")),
    sortOrder: v.number(),
    description: v.optional(v.string()),
  })
    .index("by_university", ["universityId"])
    .index("by_server", ["serverId"]),

  messages: defineTable({
    userId: v.id("users"),
    content: v.string(),
    likeCount: v.number(),
    commentCount: v.number(),
    retweetCount: v.number(),
    mediaFiles: v.optional(v.array(v.string())),
    websiteUrl: v.optional(v.string()),
    universityId: v.optional(v.id("universities")),
    serverId: v.optional(v.id("servers")),
    channelId: v.optional(v.id("channels")),
    threadId: v.optional(v.id("messages")),
    parentId: v.optional(v.id("messages")),
  })
    .index("by_channel", ["channelId"])
    .index("by_threadId", ["threadId"])
    .index("by_university", ["universityId"]),

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
    typingUserId: v.optional(v.id("users")), // NEW: Từ Script 1
  }).index("by_participant", ["participantIds"]),

  direct_messages: defineTable({
    conversationId: v.id("conversations"),
    senderId: v.id("users"),
    content: v.string(),
    status: v.union(v.literal("sent"), v.literal("delivered"), v.literal("read")),
    isDeleted: v.optional(v.boolean()),
    isPinned: v.optional(v.boolean()),
    isSystem: v.optional(v.boolean()), // NEW: Từ Script 1
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
    // Chấp nhận ID của cả Server hoặc University như bạn đã sửa
    serverId: v.optional(v.union(v.id('servers'), v.id('universities'))),
    isSubscribed: v.boolean(),
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
});