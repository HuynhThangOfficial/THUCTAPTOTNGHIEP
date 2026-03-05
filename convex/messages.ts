import { v } from 'convex/values';
import { mutation, query, QueryCtx, internalMutation } from './_generated/server';
import { paginationOptsValidator } from 'convex/server';
import { Id } from './_generated/dataModel';

async function getCurrentUserId(ctx: QueryCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  const user = await ctx.db.query("users").withIndex("byClerkId", (q) => q.eq("clerkId", identity.subject)).unique();
  return user?._id;
}

// --- GIỮ NGUYÊN CÁC HÀM CŨ ---
export const addThread = mutation({
  args: {
    content: v.string(),
    mediaFiles: v.optional(v.array(v.string())),
    websiteUrl: v.optional(v.string()),
    threadId: v.optional(v.id('messages')),
    channelId: v.optional(v.id('channels')),
    universityId: v.optional(v.id('universities')),
    serverId: v.optional(v.id('servers')),
    parentId: v.optional(v.id('messages')),
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    const messageId = await ctx.db.insert('messages', {
      userId, content: args.content, mediaFiles: args.mediaFiles, websiteUrl: args.websiteUrl,
      threadId: args.threadId, channelId: args.channelId, serverId: args.serverId,
      universityId: args.universityId, parentId: args.parentId, likeCount: 0, commentCount: 0, retweetCount: 0,
    });

    if (args.threadId) {
      const originalMessage = await ctx.db.get(args.threadId);
      if (originalMessage) await ctx.db.patch(args.threadId, { commentCount: (originalMessage.commentCount || 0) + 1 });
    }

    // GỬI THÔNG BÁO THÔNG MINH
    if (args.channelId && !args.threadId) {
      const notifyUserIds = new Set<Id<"users">>();
      const targetId = args.serverId || args.universityId;

      // 1. Thêm người bật Server
      if (targetId) {
        const serverSubs = await ctx.db.query('channel_subscriptions')
          .withIndex('by_server', q => q.eq('serverId', targetId as any)).filter(q => q.eq(q.field('isSubscribed'), true)).collect();
        serverSubs.forEach(s => notifyUserIds.add(s.userId));
      }

      // 2. LOẠI BỎ người cố tình "Tắt" công tắc kênh lẻ
      const channelUnsubs = await ctx.db.query('channel_subscriptions')
        .withIndex('by_channel', q => q.eq('channelId', args.channelId)).filter(q => q.eq(q.field('isSubscribed'), false)).collect();
      channelUnsubs.forEach(s => notifyUserIds.delete(s.userId));

      // 3. Thêm người "Bật" kênh lẻ
      const channelSubs = await ctx.db.query('channel_subscriptions')
        .withIndex('by_channel', q => q.eq('channelId', args.channelId)).filter(q => q.eq(q.field('isSubscribed'), true)).collect();
      channelSubs.forEach(s => notifyUserIds.add(s.userId));

      for (const uid of notifyUserIds) {
        if (uid !== userId) {
          await ctx.db.insert('notifications', { userId: uid, senderId: userId, type: 'post', channelId: args.channelId, messageId: messageId, isRead: false });
        }
      }
    }
    return messageId;
  },
});

export const deleteThread = mutation({
  args: { messageId: v.id('messages') },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);
    if (!userId) throw new Error("Unauthorized");
    const message = await ctx.db.get(args.messageId);
    if (!message || message.userId !== userId) throw new Error("Unauthorized");
    await ctx.db.delete(args.messageId);
    const relatedLikes = await ctx.db.query('likes').withIndex('by_user_message', (q) => q.eq('userId', userId).eq('messageId', args.messageId)).collect();
    for (const like of relatedLikes) await ctx.db.delete(like._id);
    return { success: true };
  },
});

export const updateThread = mutation({
  args: { messageId: v.id('messages'), content: v.string(), mediaFiles: v.optional(v.array(v.string())) },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);
    if (!userId) throw new Error("Unauthorized");
    const message = await ctx.db.get(args.messageId);
    if (!message || message.userId !== userId) throw new Error("Unauthorized");
    await ctx.db.patch(args.messageId, { content: args.content, mediaFiles: args.mediaFiles !== undefined ? args.mediaFiles : message.mediaFiles });
  },
});

export const getEditHistory = query({
  args: { messageId: v.id('messages') },
  handler: async (ctx, args) => await ctx.db.query('edit_history').withIndex('by_messageId', (q) => q.eq('messageId', args.messageId)).order('desc').collect()
});

const getMessageCreator = async (ctx: QueryCtx, userId: Id<'users'>) => {
  const user = await ctx.db.get(userId);
  if (!user?.imageUrl || user.imageUrl.startsWith('http')) return user;
  const url = await ctx.storage.getUrl(user.imageUrl as Id<'_storage'>);
  return { ...user, imageUrl: url ?? undefined };
};

const getMediaUrls = async (ctx: QueryCtx, mediaFiles: string[] | undefined) => {
  if (!mediaFiles || mediaFiles.length === 0) return [];
  const urlPromises = mediaFiles.map((file) => ctx.storage.getUrl(file as Id<'_storage'>));
  const results = await Promise.allSettled(urlPromises);
  return results.filter((result): result is PromiseFulfilledResult<string> => result.status === 'fulfilled' && !!result.value).map((result) => result.value);
};

export const getThreads = query({
  args: { paginationOpts: paginationOptsValidator, userId: v.optional(v.id('users')), channelId: v.optional(v.id('channels')), sortBy: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const currentUserId = await getCurrentUserId(ctx);
    let threads;
    if (args.channelId) {
        const channel = await ctx.db.get(args.channelId);
        if (channel && channel.name === 'đại-sảnh' && channel.universityId) {
            threads = await ctx.db.query('messages').withIndex('by_university', q => q.eq('universityId', channel.universityId)).filter(q => q.eq(q.field('threadId'), undefined)).order('desc').paginate(args.paginationOpts);
        } else {
            threads = await ctx.db.query('messages').withIndex('by_channel', q => q.eq('channelId', args.channelId)).filter(q => q.eq(q.field('threadId'), undefined)).order('desc').paginate(args.paginationOpts);
        }
    } else {
        threads = await ctx.db.query('messages').filter((q) => q.eq(q.field('threadId'), undefined)).order('desc').paginate(args.paginationOpts);
    }
    let page = await Promise.all(threads.page.map(async (thread) => {
        const creator = await getMessageCreator(ctx, thread.userId);
        const mediaUrls = await getMediaUrls(ctx, thread.mediaFiles);
        let isLiked = false;
        if (currentUserId) {
          const like = await ctx.db.query('likes').withIndex('by_user_message', (q) => q.eq('userId', currentUserId).eq('messageId', thread._id)).unique();
          isLiked = !!like;
        }
        return { ...thread, mediaFiles: mediaUrls, creator, isLiked };
      })
    );
    return { ...threads, page };
  },
});

export const likeThread = mutation({
  args: { messageId: v.id('messages') },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);
    if (!userId) throw new Error("Unauthorized");
    const existingLike = await ctx.db.query('likes').withIndex('by_user_message', (q) => q.eq('userId', userId).eq('messageId', args.messageId)).unique();
    if (existingLike) {
      await ctx.db.delete(existingLike._id);
      const updatedMsg = await ctx.db.get(args.messageId);
      await ctx.db.patch(args.messageId, { likeCount: Math.max(0, (updatedMsg!.likeCount || 0) - 1) });
    } else {
      await ctx.db.insert('likes', { userId: userId, messageId: args.messageId });
      const updatedMsg = await ctx.db.get(args.messageId);
      await ctx.db.patch(args.messageId, { likeCount: (updatedMsg!.likeCount || 0) + 1 });
    }
  },
});

export const getChannelAttachments = query({
  args: { channelId: v.id("channels") },
  handler: async (ctx, args) => {
    const messages = await ctx.db.query("messages").withIndex("by_channel", q => q.eq("channelId", args.channelId)).order("desc").collect();
    const mediaIds: string[] = [];
    const linkList: { url: string; title: string; date: number }[] = [];
    for (const msg of messages) {
      if (msg.threadId) continue;
      if (msg.mediaFiles?.length) mediaIds.push(...msg.mediaFiles);
      if (msg.websiteUrl) linkList.push({ url: msg.websiteUrl, title: msg.content.substring(0, 50), date: msg._creationTime });
    }
    const mediaList = await getMediaUrls(ctx, mediaIds);
    return { mediaList, linkList };
  },
});

export const getLikers = query({
  args: { messageId: v.id("messages") },
  handler: async (ctx, args) => {
    const likes = await ctx.db.query("likes").filter((q) => q.eq(q.field("messageId"), args.messageId)).collect();
    const likers = await Promise.all(likes.map(async (like) => {
      const user = await ctx.db.get(like.userId);
      if (!user) return null;
      if (user.imageUrl && !user.imageUrl.startsWith("http")) user.imageUrl = await ctx.storage.getUrl(user.imageUrl as Id<"_storage">) ?? user.imageUrl;
      return user;
    }));
    return likers.filter((u) => u !== null);
  },
});

export const generateUploadUrl = mutation(async (ctx) => {
  const userId = await getCurrentUserId(ctx);
  if (!userId) throw new Error("Unauthorized");
  return await ctx.storage.generateUploadUrl();
});

// ==========================================
// LOGIC CHUÔNG THÔNG BÁO
// ==========================================

export const toggleChannelSubscription = mutation({
  args: { channelId: v.id('channels') },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);
    if (!userId) return;

    const existing = await ctx.db.query('channel_subscriptions')
      .withIndex('by_user_channel', q => q.eq('userId', userId).eq('channelId', args.channelId)).unique();

    if (existing) {
      await ctx.db.patch(existing._id, { isSubscribed: !existing.isSubscribed });
    } else {
      // Nếu chưa có, tạo mới và lật ngược trạng thái mặc định của Server
      const channel = await ctx.db.get(args.channelId);
      const targetId = channel?.serverId || channel?.universityId;
      let serverState = false;
      if (targetId) {
         const sSub = await ctx.db.query('channel_subscriptions')
            .withIndex('by_user_server', q => q.eq('userId', userId).eq('serverId', targetId as any)).unique();
         serverState = sSub?.isSubscribed ?? false;
      }
      await ctx.db.insert('channel_subscriptions', { userId, channelId: args.channelId, isSubscribed: !serverState });
    }
  }
});

export const toggleServerSubscription = mutation({
  args: {
    serverId: v.optional(v.id('servers')),
    universityId: v.optional(v.id('universities')),
    action: v.union(v.literal("on"), v.literal("off")) // Thêm hành động bật hoặc tắt
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);
    if (!userId) return;

    const targetId = args.serverId || args.universityId;
    if (!targetId) return;

    // Xác định trạng thái mong muốn
    const isSubbing = args.action === "on";

    // 1. Cập nhật trạng thái chính của Server
    const existingServerSub = await ctx.db.query('channel_subscriptions')
      .withIndex('by_user_server', q => q.eq('userId', userId).eq('serverId', targetId as any))
      .unique();

    if (existingServerSub) {
      await ctx.db.patch(existingServerSub._id, { isSubscribed: isSubbing });
    } else {
      await ctx.db.insert('channel_subscriptions', {
        userId,
        serverId: targetId as any,
        isSubscribed: isSubbing
      });
    }

    // 2. THAO TÁC NHANH: Ép tất cả kênh con phải giống trạng thái này
    const allChannels = await ctx.db.query('channels').collect();
    const serverChannels = allChannels.filter(c =>
      ((args.serverId && c.serverId === args.serverId) || (args.universityId && c.universityId === args.universityId)) &&
      c.type !== 'category'
    );
    const channelIds = serverChannels.map(c => c._id);

    const userSubs = await ctx.db.query('channel_subscriptions')
      .withIndex('by_user_channel', q => q.eq('userId', userId))
      .collect();

    for (const channelId of channelIds) {
      const existingSub = userSubs.find(s => s.channelId === channelId);
      if (existingSub) {
        await ctx.db.patch(existingSub._id, { isSubscribed: isSubbing });
      } else {
        await ctx.db.insert('channel_subscriptions', {
          userId,
          channelId,
          isSubscribed: isSubbing
        });
      }
    }
  }
});

export const getSubscriptionStatus = query({
  args: {
    channelId: v.optional(v.id('channels')),
    serverId: v.optional(v.id('servers')),
    universityId: v.optional(v.id('universities'))
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);
    if (!userId || !args.channelId) return { channelSubbed: false, serverSubbed: false };

    // Chỉ quan tâm kênh này có đang bật hay không
    const cSub = await ctx.db.query('channel_subscriptions')
      .withIndex('by_user_channel', q => q.eq('userId', userId).eq('channelId', args.channelId))
      .unique();

    return {
      channelSubbed: cSub?.isSubscribed ?? false,
      serverSubbed: false // Luôn là false vì nút Server giờ là nút bấm hành động
    };
  }
});

export const getServerChannelsWithSubStatus = query({
  args: {
    serverId: v.optional(v.id('servers')),
    universityId: v.optional(v.id('universities'))
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);
    if (!userId) return [];

    let serverSubbed = false;
    const targetId = args.serverId || args.universityId;
    if (targetId) {
      const sSub = await ctx.db.query('channel_subscriptions')
        .withIndex('by_user_server', q => q.eq('userId', userId).eq('serverId', targetId as any)).unique();
      if (sSub?.isSubscribed) serverSubbed = true;
    }

    const allChannels = await ctx.db.query('channels').collect();
    const channels = allChannels.filter(c =>
      ((args.serverId && c.serverId === args.serverId) ||
       (args.universityId && c.universityId === args.universityId)) &&
      c.type !== 'category'
    );

    const userSubs = await ctx.db.query('channel_subscriptions')
      .withIndex('by_user_channel', q => q.eq('userId', userId))
      .collect();

    return channels.map(ch => {
      const cSub = userSubs.find(s => s.channelId === ch._id);
      // Ưu tiên bản ghi riêng, nếu không có thì lấy theo server
      const isSub = cSub ? cSub.isSubscribed : serverSubbed;
      return {
        _id: ch._id,
        name: ch.name,
        isSubscribed: isSub
      };
    });
  }
});

// Giữ nguyên các hàm Notifications
export const getNotifications = query({
  handler: async (ctx) => {
    const userId = await getCurrentUserId(ctx);
    if (!userId) return [];
    const notifs = await ctx.db.query('notifications').withIndex('by_user', q => q.eq('userId', userId)).order('desc').take(50);

    return await Promise.all(notifs.map(async (n) => {
      const sender = n.senderId ? await ctx.db.get(n.senderId) : null;
      let imageUrl = sender?.imageUrl;
      if (imageUrl && !imageUrl.startsWith('http')) {
         imageUrl = await ctx.storage.getUrl(imageUrl as Id<'_storage'>) || imageUrl;
      }
      const channel = n.channelId ? await ctx.db.get(n.channelId) : null;
      return { ...n, sender: { ...sender, imageUrl }, channel };
    }));
  }
});

export const markNotificationRead = mutation({
  args: { notificationId: v.id('notifications') },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.notificationId, { isRead: true });
  }
});

export const createInternalNotification = internalMutation({
  args: { receiverId: v.id('users'), type: v.string(), senderId: v.id('users') },
  handler: async (ctx, args) => {
     await ctx.db.insert('notifications', { userId: args.receiverId, senderId: args.senderId, type: args.type, isRead: false });
  }
});