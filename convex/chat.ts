import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { internal } from './_generated/api';
import { isHttpUrl } from './utils'; // 👇 IMPORT HÀM BEST PRACTICE VÀO ĐÂY

// 1. Tạo hoặc lấy cuộc trò chuyện giữa 2 người
export const getOrCreateConversation = mutation({
  args: { otherUserId: v.id('users') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Chưa đăng nhập");
    const currentUser = await ctx.db.query("users").withIndex("byClerkId", q => q.eq("clerkId", identity.subject)).unique();
    if (!currentUser) throw new Error("Lỗi user");

    const allConversations = await ctx.db.query('conversations').collect();
    const existing = allConversations.find(c =>
      c.participantIds.includes(currentUser._id) &&
      c.participantIds.includes(args.otherUserId)
    );

    if (existing) return existing._id;

    const newConvId = await ctx.db.insert('conversations', {
      participantIds: [currentUser._id, args.otherUserId],
      updatedAt: Date.now(),
    });
    return newConvId;
  }
});

// 2. Gửi tin nhắn (Hợp nhất Reply, Image và Tự động bắn thông báo)
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

    const messageId = await ctx.db.insert('direct_messages', {
      conversationId: args.conversationId,
      senderId: currentUser!._id,
      content: args.content,
      status: 'sent',
      isDeleted: false,
      replyToMessageId: args.replyToMessageId,
      imageId: args.imageId,
    });

    await ctx.db.patch(args.conversationId, {
      updatedAt: Date.now(),
      lastMessageText: args.content,
    });

    // BẮN THÔNG BÁO TIN NHẮN TỰ ĐỘNG
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
    return messageId;
  }
});

export const toggleReaction = mutation({
  args: { messageId: v.id('direct_messages'), emoji: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Chưa đăng nhập");
    const currentUser = await ctx.db.query("users").withIndex("byClerkId", q => q.eq("clerkId", identity.subject)).unique();
    const msg = await ctx.db.get(args.messageId);
    if (!msg) return;
    let reactions = msg.reactions || [];
    const existingIdx = reactions.findIndex(r => r.userId === currentUser!._id && r.emoji === args.emoji);
    if (existingIdx > -1) reactions.splice(existingIdx, 1);
    else reactions.push({ userId: currentUser!._id, emoji: args.emoji });
    await ctx.db.patch(args.messageId, { reactions });
  }
});

export const unsendMessage = mutation({
  args: { messageId: v.id('direct_messages') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Chưa đăng nhập");
    await ctx.db.patch(args.messageId, { content: "Tin nhắn đã bị thu hồi", isDeleted: true });
  }
});

export const markAsRead = mutation({
  args: { messageId: v.id('direct_messages') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return;
    await ctx.db.patch(args.messageId, { status: 'read' });
  }
});

export const markConversationAsRead = mutation({
  args: { conversationId: v.id('conversations') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return;
    const currentUser = await ctx.db.query("users").withIndex("byClerkId", q => q.eq("clerkId", identity.subject)).unique();
    if (!currentUser) return;
    const unreadMessages = await ctx.db.query('direct_messages')
      .withIndex('by_conversation', q => q.eq('conversationId', args.conversationId))
      .filter(q => q.and(q.neq(q.field('senderId'), currentUser._id), q.neq(q.field('status'), 'read')))
      .collect();
    for (const msg of unreadMessages) await ctx.db.patch(msg._id, { status: 'read' });
  }
});

export const setTypingStatus = mutation({
  args: { conversationId: v.id('conversations'), isTyping: v.boolean() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return;
    const currentUser = await ctx.db.query("users").withIndex("byClerkId", q => q.eq("clerkId", identity.subject)).unique();
    if (currentUser) await ctx.db.patch(args.conversationId, { typingUserId: args.isTyping ? currentUser._id : undefined });
  }
});

export const getMessages = query({
  args: { conversationId: v.id('conversations') },
  handler: async (ctx, args) => {
    const messages = await ctx.db.query('direct_messages').withIndex('by_conversation', (q) => q.eq('conversationId', args.conversationId)).collect();
    return await Promise.all(messages.map(async (msg) => ({ ...msg, imageUrl: msg.imageId ? await ctx.storage.getUrl(msg.imageId) : null })));
  },
});

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
      
      // 👇 ĐÃ CẬP NHẬT CHUẨN BEST PRACTICE TẠI ĐÂY
      if (imageUrl && !isHttpUrl(imageUrl)) imageUrl = await ctx.storage.getUrl(imageUrl as any) || imageUrl;
      
      return { ...c, otherUser: { ...otherUser, imageUrl } };
    }));
    return inbox.sort((a, b) => b.updatedAt - a.updatedAt);
  }
});

export const getConversationInfo = query({
  args: { conversationId: v.id('conversations') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const currentUser = await ctx.db.query("users").withIndex("byClerkId", q => q.eq("clerkId", identity.subject)).unique();
    if (!currentUser) return null;
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) return null;
    const otherUserId = conversation.participantIds.find(id => id !== currentUser._id);
    if (!otherUserId) return null;
    const otherUser = await ctx.db.get(otherUserId);
    if (!otherUser) return null;
    let imageUrl = otherUser.imageUrl;
    
    // 👇 ĐÃ CẬP NHẬT CHUẨN BEST PRACTICE TẠI ĐÂY
    if (imageUrl && !isHttpUrl(imageUrl)) imageUrl = await ctx.storage.getUrl(imageUrl as any) || imageUrl;
    
    return { ...otherUser, imageUrl };
  }
});

export const togglePinMessage = mutation({
  args: { messageId: v.id('direct_messages'), conversationId: v.id('conversations') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return;
    const user = await ctx.db.query("users").withIndex("byClerkId", q => q.eq("clerkId", identity.subject)).unique();
    const msg = await ctx.db.get(args.messageId);
    if (!msg || !user) return;
    const newPinStatus = !msg.isPinned;
    await ctx.db.patch(args.messageId, { isPinned: newPinStatus });
    await ctx.db.insert('direct_messages', {
      conversationId: args.conversationId, senderId: user._id, status: 'read', isSystem: true,
      content: newPinStatus ? `${user.first_name} đã ghim một tin nhắn` : `${user.first_name} đã bỏ ghim một tin nhắn`,
    });
  }
});

export const deleteForSelf = mutation({
  args: { messageId: v.id('direct_messages') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return;
    const currentUser = await ctx.db.query("users").withIndex("byClerkId", q => q.eq("clerkId", identity.subject)).unique();
    if (!currentUser) return;
    const msg = await ctx.db.get(args.messageId);
    if (!msg) return;
    const deletedBy = msg.deletedBy || [];
    if (!deletedBy.includes(currentUser._id)) {
      deletedBy.push(currentUser._id);
      await ctx.db.patch(args.messageId, { deletedBy });
    }
  }
});

export const generateUploadUrl = mutation(async (ctx) => await ctx.storage.generateUploadUrl());

// 👇 HÀM MỚI ĐƯỢC THÊM VÀO ĐỂ FIX LỖI 👇
export const getRawConversation = query({
  args: { conversationId: v.id('conversations') },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.conversationId);
  }
});