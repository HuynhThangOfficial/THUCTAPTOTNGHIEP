import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

// 1. Tạo hoặc lấy cuộc trò chuyện giữa 2 người
export const getOrCreateConversation = mutation({
  args: { otherUserId: v.id('users') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Chưa đăng nhập");
    const currentUser = await ctx.db.query("users").withIndex("byClerkId", q => q.eq("clerkId", identity.subject)).unique();
    if (!currentUser) throw new Error("Lỗi user");

    // Kiểm tra xem 2 người đã từng chat chưa
    const allConversations = await ctx.db.query('conversations').collect();
    const existing = allConversations.find(c =>
      c.participantIds.includes(currentUser._id) &&
      c.participantIds.includes(args.otherUserId) // 👈 ĐÃ SỬA LỖI TYPO Ở ĐÂY
    );

    if (existing) return existing._id;

    // Nếu chưa, tạo phòng chat mới
    const newConvId = await ctx.db.insert('conversations', {
      participantIds: [currentUser._id, args.otherUserId],
      updatedAt: Date.now(),
    });
    return newConvId;
  }
});

// 2. Gửi tin nhắn (Đã cập nhật để hỗ trợ Trả lời - Reply)
export const sendMessage = mutation({
  args: {
    conversationId: v.id('conversations'),
    content: v.string(),
    replyToMessageId: v.optional(v.id('direct_messages')), 
    imageId: v.optional(v.id('_storage')),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Chưa đăng nhập");
    const currentUser = await ctx.db.query("users").withIndex("byClerkId", q => q.eq("clerkId", identity.subject)).unique();

    await ctx.db.insert('direct_messages', {
      conversationId: args.conversationId,
      senderId: currentUser!._id,
      content: args.content,
      status: 'sent', // REQUIRED: Use status instead of isRead
      isDeleted: false,
      replyToMessageId: args.replyToMessageId, 
      imageId: args.imageId,
    });

    await ctx.db.patch(args.conversationId, {
      updatedAt: Date.now(),
      lastMessageText: args.content,
    });
  }
});

// THÊM MỚI: Hàm Thả/Hủy Cảm Xúc
export const toggleReaction = mutation({
  args: { 
    messageId: v.id('direct_messages'), 
    emoji: v.string() 
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Chưa đăng nhập");
    const currentUser = await ctx.db.query("users").withIndex("byClerkId", q => q.eq("clerkId", identity.subject)).unique();

    const msg = await ctx.db.get(args.messageId);
    if (!msg) return;

    // Lấy danh sách cảm xúc hiện tại, nếu chưa có thì tạo mảng rỗng
    let reactions = msg.reactions || [];
    
    // Kiểm tra xem user này đã thả cảm xúc này chưa
    const existingIdx = reactions.findIndex(r => r.userId === currentUser!._id && r.emoji === args.emoji);

    if (existingIdx > -1) {
      reactions.splice(existingIdx, 1); // Nếu có rồi thì XÓA đi (Bấm 2 lần để hủy)
    } else {
      reactions.push({ userId: currentUser!._id, emoji: args.emoji }); // Nếu chưa có thì THÊM vào
    }

    await ctx.db.patch(args.messageId, { reactions });
  }
});

// THÊM MỚI: Hàm Thu hồi tin nhắn
export const unsendMessage = mutation({
  args: { messageId: v.id('direct_messages') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Chưa đăng nhập");
    
    // Cập nhật tin nhắn thành trạng thái đã thu hồi
    await ctx.db.patch(args.messageId, {
      content: "Tin nhắn đã bị thu hồi",
      isDeleted: true,
    });
  }
});

export const markAsRead = mutation({
  args: { messageId: v.id('direct_messages') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return;

    await ctx.db.patch(args.messageId, {
      status: 'read'
    });
  }
});

// 2. Mark all messages in a conversation as read by the other user
export const markConversationAsRead = mutation({
  args: { conversationId: v.id('conversations') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return;
    const currentUser = await ctx.db.query("users").withIndex("byClerkId", q => q.eq("clerkId", identity.subject)).unique();
    if (!currentUser) return;

    // Find all messages in this conversation NOT sent by current user and NOT read
    const unreadMessages = await ctx.db.query('direct_messages')
      .withIndex('by_conversation', q => q.eq('conversationId', args.conversationId))
      .filter(q => q.neq(q.field('senderId'), currentUser._id))
      .filter(q => q.neq(q.field('status'), 'read'))
      .collect();

    // Mark them all as read
    for (const msg of unreadMessages) {
      await ctx.db.patch(msg._id, { status: 'read' });
    }
  }
});

// 3. Update Typing Status
export const setTypingStatus = mutation({
  args: {
    conversationId: v.id('conversations'),
    isTyping: v.boolean(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return;
    const currentUser = await ctx.db.query("users").withIndex("byClerkId", q => q.eq("clerkId", identity.subject)).unique();
    if (!currentUser) return;

    await ctx.db.patch(args.conversationId, {
      typingUserId: args.isTyping ? currentUser._id : undefined
    });
  }
});

// 3. Lấy tin nhắn của 1 phòng chat (Real-time)
export const getMessages = query({
  args: { conversationId: v.id('conversations') },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query('direct_messages')
      .withIndex('by_conversation', (q) => q.eq('conversationId', args.conversationId))
      .collect();

    // Dịch mã imageId thành URL ảnh thực tế
    const messagesWithImages = await Promise.all(
      messages.map(async (msg) => {
        let imageUrl = null;
        if (msg.imageId) {
          imageUrl = await ctx.storage.getUrl(msg.imageId);
        }
        return { ...msg, imageUrl };
      })
    );

    return messagesWithImages;
  },
});

// 4. Lấy danh sách hộp thư đến (Inbox)
export const getInbox = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const currentUser = await ctx.db.query("users").withIndex("byClerkId", q => q.eq("clerkId", identity.subject)).unique();
    if (!currentUser) return [];

    const convos = await ctx.db.query('conversations').collect();
    const myConvos = convos.filter(c => c.participantIds.includes(currentUser._id));

    // Lấy thông tin người đang chat cùng
    const inbox = await Promise.all(myConvos.map(async (c) => {
      const otherUserId = c.participantIds.find(id => id !== currentUser._id);
      const otherUser = await ctx.db.get(otherUserId!);

      let imageUrl = otherUser?.imageUrl;
      if (imageUrl && !imageUrl.startsWith('http')) {
        imageUrl = await ctx.storage.getUrl(imageUrl as any) || imageUrl;
      }

      return {
        ...c,
        otherUser: { ...otherUser, imageUrl }
      };
    }));

    return inbox.sort((a, b) => b.updatedAt - a.updatedAt);
  }
});
// 5. Lấy thông tin người đang chat cùng để hiển thị trên Header
export const getConversationInfo = query({
  args: { conversationId: v.id('conversations') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const currentUser = await ctx.db.query("users").withIndex("byClerkId", q => q.eq("clerkId", identity.subject)).unique();
    if (!currentUser) return null;

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) return null;

    // Tìm ID của người kia
    const otherUserId = conversation.participantIds.find(id => id !== currentUser._id);
    if (!otherUserId) return null;

    const otherUser = await ctx.db.get(otherUserId);
    if (!otherUser) return null;

    let imageUrl = otherUser.imageUrl;
    if (imageUrl && !imageUrl.startsWith('http')) {
      imageUrl = await ctx.storage.getUrl(imageUrl as any) || imageUrl;
    }

    return {
      ...otherUser,
      imageUrl
    };
  }
});
export const getRawConversation = query({
  args: { conversationId: v.id('conversations') },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.conversationId);
  }
});

// 1. API Ghim / Bỏ ghim tin nhắn
export const togglePinMessage = mutation({
  args: { messageId: v.id('direct_messages'), conversationId: v.id('conversations') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return;
    const user = await ctx.db.query("users").withIndex("byClerkId", q => q.eq("clerkId", identity.subject)).unique();
    if (!user) return;

    const msg = await ctx.db.get(args.messageId);
    if (!msg) return;

    const newPinStatus = !msg.isPinned;
    await ctx.db.patch(args.messageId, { isPinned: newPinStatus });

    // Tạo tin nhắn hệ thống thông báo
    await ctx.db.insert('direct_messages', {
      conversationId: args.conversationId,
      senderId: user._id,
      content: newPinStatus 
        ? `${user.first_name} đã ghim một tin nhắn` 
        : `${user.first_name} đã bỏ ghim một tin nhắn`,
      status: 'read',
      isSystem: true // Đánh dấu đây là tin nhắn hệ thống
    });
  }
});

// 2. API Xóa ở phía bạn (Chỉ ẩn với người nhấn)
export const deleteForSelf = mutation({
  args: { messageId: v.id('direct_messages') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return;
    const currentUser = await ctx.db.query("users").withIndex("byClerkId", q => q.eq("clerkId", identity.subject)).unique();
    if (!currentUser) return;

    const msg = await ctx.db.get(args.messageId);
    if (!msg) return;

    // Thêm ID của user hiện tại vào mảng deletedBy
    const deletedBy = msg.deletedBy || [];
    if (!deletedBy.includes(currentUser._id)) {
      deletedBy.push(currentUser._id);
      await ctx.db.patch(args.messageId, { deletedBy });
    }
  }
});
export const generateUploadUrl = mutation(async (ctx) => {
  return await ctx.storage.generateUploadUrl();
});