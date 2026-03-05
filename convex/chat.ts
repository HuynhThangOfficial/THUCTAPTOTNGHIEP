import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { internal } from './_generated/api'; // 👇 ĐÃ THÊM IMPORT NÀY

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
      c.participantIds.includes(args.otherUserId)
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

// 2. Gửi tin nhắn
export const sendMessage = mutation({
  args: {
    conversationId: v.id('conversations'),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Chưa đăng nhập");
    const currentUser = await ctx.db.query("users").withIndex("byClerkId", q => q.eq("clerkId", identity.subject)).unique();

    await ctx.db.insert('direct_messages', {
      conversationId: args.conversationId,
      senderId: currentUser!._id,
      content: args.content,
      isRead: false,
    });

    await ctx.db.patch(args.conversationId, {
      updatedAt: Date.now(),
      lastMessageText: args.content,
    });

    // 👇 ĐÃ THÊM: TỰ ĐỘNG BẮN THÔNG BÁO KHI CÓ TIN NHẮN TỚI 👇
    const conversation = await ctx.db.get(args.conversationId);
    if (conversation) {
      const otherUserId = conversation.participantIds.find(id => id !== currentUser!._id);
      if (otherUserId) {
        await ctx.runMutation(internal.messages.createInternalNotification, {
          receiverId: otherUserId,
          type: 'message',
          senderId: currentUser!._id
        });
      }
    }
  }
});

// 3. Lấy tin nhắn của 1 phòng chat (Real-time)
export const getMessages = query({
  args: { conversationId: v.id('conversations') },
  handler: async (ctx, args) => {
    return await ctx.db.query('direct_messages')
      .withIndex('by_conversation', q => q.eq('conversationId', args.conversationId))
      .order('asc')
      .collect();
  }
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