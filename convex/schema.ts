import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// Định nghĩa cấu trúc cho người dùng
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

  // 1. BẢNG TRƯỜNG ĐẠI HỌC (CHỈ DO HỆ THỐNG TẠO)
  universities: defineTable({
    name: v.string(),
    slug: v.string(),
    icon: v.string(),
    sortOrder: v.number(),
  }),

  // 2. BẢNG MÁY CHỦ RIÊNG (DO NGƯỜI DÙNG TẠO)
  servers: defineTable({
    name: v.string(),
    slug: v.string(),
    icon: v.string(),
    creatorId: v.id("users"), // Chủ máy chủ
    memberIds: v.array(v.id("users")), // Danh sách thành viên được mời
  }),

  // 3. BẢNG KÊNH
  channels: defineTable({
    name: v.string(),
    type: v.string(),
    universityId: v.optional(v.id("universities")), // Có thể thuộc trường
    serverId: v.optional(v.id("servers")), // Hoặc thuộc máy chủ riêng
    parentId: v.optional(v.id("channels")),
    sortOrder: v.number(),
    description: v.optional(v.string()),
  })
    .index("by_university", ["universityId"])
    .index("by_server", ["serverId"]), // Thêm index để truy vấn nhanh kênh của server

  // 4. BẢNG BÀI VIẾT
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

  // Bảng Cuộc hội thoại (Chat Room)
  conversations: defineTable({
    participantIds: v.array(v.id("users")), // Chứa ID của 2 người đang chat
    updatedAt: v.number(), // Để sắp xếp ai nhắn gần nhất lên đầu
    lastMessageText: v.optional(v.string()),
    // NEW: Theo dõi ai đang gõ tin nhắn
    typingUserId: v.optional(v.id("users")),
  }).index("by_participant", ["participantIds"]),

  // Bảng Tin nhắn riêng (Direct Messages)
  direct_messages: defineTable({
    conversationId: v.id("conversations"),
    senderId: v.id("users"),
    content: v.string(), // Sẽ là rỗng nếu isDeleted = true

    // Trạng thái tin nhắn
    status: v.union(v.literal("sent"), v.literal("delivered"), v.literal("read")),
    isDeleted: v.optional(v.boolean()), // Đánh dấu thu hồi
    isPinned: v.optional(v.boolean()), // Đánh dấu ghim
    isSystem: v.optional(v.boolean()), // THÊM DÒNG NÀY

    imageId: v.optional(v.id("_storage")),

    // Mảng lưu ID của những người đã ấn "Xóa ở phía bạn"
    deletedBy: v.optional(v.array(v.id("users"))),

    // Tính năng Trả lời (Reply)
    replyToMessageId: v.optional(v.id("direct_messages")),

    // Tính năng Thả cảm xúc (Lưu dạng mảng các object)
    reactions: v.optional(
      v.array(
        v.object({
          userId: v.id("users"),
          emoji: v.string(), // Ví dụ: '❤️', '😂', '👍'
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
    mediaType: v.string(), // "image" | "video"
    expiresAt: v.number(),
  }).index("by_user", ["userId"]),

  channel_subscriptions: defineTable({
    userId: v.id("users"),
    channelId: v.optional(v.id("channels")),
    serverId: v.optional(v.id("servers")),
    isSubscribed: v.boolean(),
  })
    .index("by_user_channel", ["userId", "channelId"])
    .index("by_user_server", ["userId", "serverId"])
    .index("by_channel", ["channelId"])
    .index("by_server", ["serverId"]),

  notifications: defineTable({
    userId: v.id("users"), // Người nhận thông báo
    senderId: v.optional(v.id("users")), // Người thực hiện hành động
    type: v.string(), // Loại: 'post', 'message', 'follow'
    channelId: v.optional(v.id("channels")),
    messageId: v.optional(v.id("messages")),
    isRead: v.boolean(),
  }).index("by_user", ["userId"]),
});