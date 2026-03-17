import { v } from 'convex/values';
import { mutation, query, QueryCtx, internalMutation } from './_generated/server';
import { paginationOptsValidator } from 'convex/server';
import { Id, Doc } from './_generated/dataModel';
import { isHttpUrl } from './utils';

async function getCurrentUserId(ctx: QueryCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  const user = await ctx.db.query("users").withIndex("byClerkId", (q) => q.eq("clerkId", identity.subject)).unique();
  return user?._id;
}

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
    allowComments: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    let isAnon = false;
    let finalChannelId = args.channelId;
    let finalServerId = args.serverId;
    let finalUniId = args.universityId;

    if (args.threadId) {
      // 1. NẾU LÀ BÌNH LUẬN -> TUYỆT ĐỐI KHÔNG CHO ẨN DANH (isAnon bắt buộc = false)
      isAnon = false; 
      
      const parentPost = await ctx.db.get(args.threadId);
      if (parentPost) {
        finalChannelId = finalChannelId || parentPost.channelId;
        finalServerId = finalServerId || parentPost.serverId;
        finalUniId = finalUniId || parentPost.universityId;
      }
    } else if (finalChannelId) {
      // 2. NẾU LÀ BÀI VIẾT GỐC -> Mới kiểm tra xem kênh có bật ẩn danh không
      const channel = await ctx.db.get(finalChannelId);
      // @ts-ignore
      if (channel?.isAnonymous) isAnon = true;
    }

    // LƯU VÀO DATABASE
    const messageId = await ctx.db.insert('messages', {
      userId,
      content: args.content,
      mediaFiles: args.mediaFiles,
      websiteUrl: args.websiteUrl,
      threadId: args.threadId,
      channelId: finalChannelId,
      serverId: finalServerId,
      universityId: finalUniId,
      parentId: args.parentId,
      likeCount: 0,
      commentCount: 0,
      retweetCount: 0,
      allowComments: args.allowComments ?? true,
      // @ts-ignore
      isAnonymous: isAnon, // Chỉ bài gốc mới được true, bình luận luôn false
    });

    // Cập nhật số bình luận của bài gốc
    if (args.threadId) {
      const originalMessage = await ctx.db.get(args.threadId);
      if (originalMessage) {
        await ctx.db.patch(args.threadId, {
          commentCount: (originalMessage.commentCount || 0) + 1
        });
      }
    }

    // Xử lý gửi thông báo (Giữ nguyên logic cũ của bạn)
    if (args.channelId && !args.threadId) {
      const notifyUserIds = new Set<Id<"users">>();
      const targetId = args.serverId || args.universityId;

      if (targetId) {
        const serverSubs = await ctx.db.query('channel_subscriptions')
          .withIndex('by_server', q => q.eq('serverId', targetId as any))
          .filter(q => q.eq(q.field('isSubscribed'), true))
          .collect();
        serverSubs.forEach(s => notifyUserIds.add(s.userId));
      }

      const channelUnsubs = await ctx.db.query('channel_subscriptions')
        .withIndex('by_channel', q => q.eq('channelId', args.channelId))
        .filter(q => q.eq(q.field('isSubscribed'), false))
        .collect();
      channelUnsubs.forEach(s => notifyUserIds.delete(s.userId));

      const channelSubs = await ctx.db.query('channel_subscriptions')
        .withIndex('by_channel', q => q.eq('channelId', args.channelId))
        .filter(q => q.eq(q.field('isSubscribed'), true))
        .collect();
      channelSubs.forEach(s => notifyUserIds.add(s.userId));

      for (const uid of notifyUserIds) {
        if (uid !== userId) {
          await ctx.db.insert('notifications', {
            userId: uid,
            senderId: userId, // Dù ẩn danh vẫn lưu senderId ở DB để sau này cần tra cứu (nhưng FE sẽ ko hiện)
            type: 'post',
            channelId: args.channelId,
            messageId: messageId,
            isRead: false,
          });
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
    if (!message) throw new Error("Message not found");

    let canDelete = false;
    if (message.userId === userId) {
      canDelete = true;
    } else if (message.serverId) {
      const server = await ctx.db.get(message.serverId);
      if (server?.adminIds?.includes(userId)) canDelete = true;
    }

    // 👇 ĐỔI SANG MÃ LỖI CHUẨN
    if (!canDelete) throw new Error("FORBIDDEN_DELETE");

    await ctx.db.delete(args.messageId);

    const relatedLikes = await ctx.db.query('likes')
      .withIndex('by_user_message', (q) => q.eq('userId', userId).eq('messageId', args.messageId))
      .collect();
    for (const like of relatedLikes) await ctx.db.delete(like._id);

    return { success: true };
  },
});

export const updateThread = mutation({
  args: {
    messageId: v.id('messages'),
    content: v.string(),
    mediaFiles: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);
    if (!userId) throw new Error("Unauthorized");
    const message = await ctx.db.get(args.messageId);
    if (!message || message.userId !== userId) throw new Error("Unauthorized");

    let changeLog = "";
    if (args.mediaFiles !== undefined) {
      const oldMedia = message.mediaFiles || [];
      const newMedia = args.mediaFiles;
      const addedCount = newMedia.filter(id => !oldMedia.includes(id)).length;
      const removedCount = oldMedia.filter(id => !newMedia.includes(id)).length;
      
      // 👇 SỬ DỤNG SYSTEM CODES CHO LOG LỊCH SỬ CHỈNH SỬA
      if (addedCount > 0 && removedCount > 0 && addedCount === removedCount) {
        changeLog = `SYS_MEDIA_CHANGED|${addedCount}`;
      } else if (addedCount > 0 && removedCount === 0) {
        changeLog = `SYS_MEDIA_ADDED|${addedCount}`;
      } else if (removedCount > 0 && addedCount === 0) {
        changeLog = `SYS_MEDIA_REMOVED|${removedCount}`;
      } else if (addedCount !== removedCount && (addedCount > 0 || removedCount > 0)) {
        changeLog = `SYS_MEDIA_UPDATED`;
      }
    }

    const isTextModified = args.content.trim() !== message.content.trim();
    if (isTextModified || changeLog !== "") {
        await ctx.db.insert('edit_history', {
          messageId: args.messageId,
          oldContent: message.content,
          imageChangeLog: changeLog,
          isTextModified: isTextModified,
        });
    }

    await ctx.db.patch(args.messageId, {
      content: args.content,
      mediaFiles: args.mediaFiles !== undefined ? args.mediaFiles : message.mediaFiles,
    });
  },
});

export const getEditHistory = query({
  args: { messageId: v.id('messages') },
  handler: async (ctx, args) => {
    return await ctx.db.query('edit_history')
      .withIndex('by_messageId', (q) => q.eq('messageId', args.messageId))
      .order('desc')
      .collect();
  },
});

const getMessageCreator = async (ctx: QueryCtx, userId: Id<'users'>) => {
  const user = await ctx.db.get(userId);
  if (!user?.imageUrl || isHttpUrl(user.imageUrl)) return user;
  const url = await ctx.storage.getUrl(user.imageUrl as Id<'_storage'>);
  return { ...user, imageUrl: url ?? undefined };
};

const getMediaUrls = async (ctx: QueryCtx, mediaFiles: string[] | undefined) => {
  if (!mediaFiles || mediaFiles.length === 0) return [];
  const urlPromises = mediaFiles.map((file) => ctx.storage.getUrl(file as Id<'_storage'>));
  const results = await Promise.allSettled(urlPromises);
  return results
    .filter((result): result is PromiseFulfilledResult<string> => result.status === 'fulfilled' && !!result.value)
    .map((result) => result.value);
};

export const getThreads = query({
  args: {
      paginationOpts: paginationOptsValidator,
      userId: v.optional(v.id('users')),
      channelId: v.optional(v.id('channels')),
      sortBy: v.optional(v.string()),
      filterType: v.optional(v.string()) 
  },
  handler: async (ctx, args) => {
    const currentUserId = await getCurrentUserId(ctx);
    let threadsResult;

    if (args.channelId) {
      const channel = await ctx.db.get(args.channelId);
      if (!channel) {
        return { page: [], isDone: true, continueCursor: "" };
      }

      if (channel && channel.name === 'đại-sảnh') {
        if (channel.universityId) {
          threadsResult = await ctx.db.query('messages')
            .withIndex('by_university', q => q.eq('universityId', channel.universityId))
            .filter(q => q.eq(q.field('threadId'), undefined))
            .order('desc')
            .paginate(args.paginationOpts);
        } else if (channel.serverId) {
          threadsResult = await ctx.db.query('messages')
            .withIndex('by_server', q => q.eq('serverId', channel.serverId))
            .filter(q => q.eq(q.field('threadId'), undefined))
            .order('desc')
            .paginate(args.paginationOpts);
        } else {
          threadsResult = await ctx.db.query('messages')
            .filter(q => q.eq(q.field('threadId'), undefined))
            .order('desc')
            .paginate(args.paginationOpts);
        }
      } else {
        threadsResult = await ctx.db.query('messages')
          .withIndex('by_channel', q => q.eq('channelId', args.channelId))
          .filter(q => q.eq(q.field('threadId'), undefined))
          .order('desc')
          .paginate(args.paginationOpts);
      }
} else if (args.userId) {
      if (args.filterType === 'replies') {
        threadsResult = await ctx.db.query('messages')
          .filter((q) => q.and(
             q.eq(q.field('userId'), args.userId),
             q.neq(q.field('threadId'), undefined),
             q.or(
                q.eq(q.field('isAnonymous'), false),
                q.eq(q.field('isAnonymous'), undefined)
             )
          ))
          .order('desc').paginate(args.paginationOpts);
      } else {
        threadsResult = await ctx.db.query('messages')
          .filter((q) => q.and(
             q.eq(q.field('userId'), args.userId),
             q.eq(q.field('threadId'), undefined),
             q.or(
                q.eq(q.field('isAnonymous'), false),
                q.eq(q.field('isAnonymous'), undefined)
             )
          ))
          .order('desc').paginate(args.paginationOpts);
      }
    } else {
      threadsResult = await ctx.db.query('messages')
        .filter((q) => q.eq(q.field('threadId'), undefined))
        .order('desc').paginate(args.paginationOpts);
    }

    if (!threadsResult) return { page: [], isDone: true, continueCursor: "" };

    let page = await Promise.all(
      threadsResult.page.map(async (thread) => {
        const creator = await getMessageCreator(ctx, thread.userId);
        const mediaUrls = await getMediaUrls(ctx, thread.mediaFiles);
        let isLiked = false;
        let isReposted = false;
        let isServerAdmin = false;
        let amIAdmin = false;

        if (currentUserId) {
          const like = await ctx.db.query('likes')
            .withIndex('by_user_message', (q) => q.eq('userId', currentUserId).eq('messageId', thread._id))
            .unique();
          isLiked = !!like;

          const repost = await ctx.db.query('retweets')
            .withIndex('by_user_message', (q) => q.eq('userId', currentUserId).eq('messageId', thread._id))
            .unique();
          isReposted = !!repost;
        }

        if (thread.serverId) {
           const server = await ctx.db.get(thread.serverId);
           if (server?.adminIds) {
               if (server.adminIds.includes(thread.userId)) isServerAdmin = true;
               if (currentUserId && server.adminIds.includes(currentUserId)) amIAdmin = true;
           }
        }

        return { ...thread, mediaFiles: mediaUrls, creator, isLiked, isReposted, isServerAdmin, amIAdmin };
      })
    );

    if (args.sortBy === 'trending') {
        page = page.sort((a, b) => (b.likeCount || 0) - (a.likeCount || 0));
    }

    return { ...threadsResult, page, isDone: threadsResult.isDone ?? false };
  },
});

export const likeThread = mutation({
  args: { messageId: v.id('messages') },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    const existingLike = await ctx.db.query('likes')
      .withIndex('by_user_message', (q) => q.eq('userId', userId).eq('messageId', args.messageId))
      .unique();

    const message = await ctx.db.get(args.messageId);
    if (!message) throw new Error("Message not found");

    if (existingLike) {
      await ctx.db.delete(existingLike._id);
      await ctx.db.patch(args.messageId, { likeCount: Math.max(0, (message.likeCount || 0) - 1) });
      return { liked: false };
    } else {
      await ctx.db.insert('likes', { userId, messageId: args.messageId });
      await ctx.db.patch(args.messageId, { likeCount: (message.likeCount || 0) + 1 });
      return { liked: true };
    }
  },
});

export const getFavoriteThreads = query({
  args: { 
    userId: v.optional(v.id('users')),
    paginationOpts: paginationOptsValidator 
  },
  handler: async (ctx, args) => {
    const currentUserId = await getCurrentUserId(ctx);
    const targetUserId = args.userId || currentUserId;
    
    if (!targetUserId) return { page: [], isDone: true, continueCursor: "" };

    if (targetUserId !== currentUserId) {
       return { page: [], isDone: true, continueCursor: "" };
    }

    const favorites = await ctx.db.query('likes')
      .withIndex('by_user_message', (q) => q.eq('userId', targetUserId))
      .order('desc')
      .paginate(args.paginationOpts);

    const threads = await Promise.all(
      favorites.page.map(async (fav) => {
        const thread = await ctx.db.get(fav.messageId);
        if (!thread) return null;
        
        const creator = await getMessageCreator(ctx, thread.userId);
        const mediaUrls = await getMediaUrls(ctx, thread.mediaFiles);
        let isReposted = false;

        if (currentUserId) {
          const repost = await ctx.db.query('retweets')
            .withIndex('by_user_message', (q) => q.eq('userId', currentUserId).eq('messageId', thread._id))
            .unique();
          isReposted = !!repost;
        }

        return { ...thread, mediaFiles: mediaUrls, creator, isLiked: true, isReposted };
      })
    );
    return { ...favorites, page: threads.filter((t) => t !== null), isDone: favorites.isDone ?? false };
  },
});

export const getThreadById = query({
  args: { messageId: v.id('messages') },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) return null;
    const creator = await getMessageCreator(ctx, message.userId);
    const mediaUrls = await getMediaUrls(ctx, message.mediaFiles);
    const currentUserId = await getCurrentUserId(ctx);

    let isLiked = false;
    let isReposted = false;
    let isServerAdmin = false;
    let amIAdmin = false;

    if (currentUserId) {
      const like = await ctx.db.query('likes')
        .withIndex('by_user_message', (q) => q.eq('userId', currentUserId).eq('messageId', args.messageId))
        .unique();
      isLiked = !!like;

      const repost = await ctx.db.query('retweets')
        .withIndex('by_user_message', (q) => q.eq('userId', currentUserId).eq('messageId', args.messageId))
        .unique();
      isReposted = !!repost;
    }

    if (message.serverId) {
       const server = await ctx.db.get(message.serverId);
       if (server?.adminIds) {
           if (server.adminIds.includes(message.userId)) isServerAdmin = true;
           if (currentUserId && server.adminIds.includes(currentUserId)) amIAdmin = true;
       }
    }

    return { ...message, mediaFiles: mediaUrls, creator, isLiked, isReposted, isServerAdmin, amIAdmin };
  },
});

export const getThreadComments = query({
  args: { messageId: v.id('messages') },
  handler: async (ctx, args) => {
    const currentUserId = await getCurrentUserId(ctx);
    const comments = await ctx.db.query('messages')
      .withIndex('by_threadId', q => q.eq('threadId', args.messageId))
      .order('desc')
      .collect();

    return await Promise.all(
      comments.map(async (comment) => {
        const creator = await getMessageCreator(ctx, comment.userId);
        const mediaUrls = await getMediaUrls(ctx, comment.mediaFiles);
        let isLiked = false;
        let isReposted = false;
        let isServerAdmin = false;
        let amIAdmin = false;

        if (currentUserId) {
           const like = await ctx.db.query('likes')
            .withIndex('by_user_message', (q) => q.eq('userId', currentUserId).eq('messageId', comment._id))
            .unique();
           isLiked = !!like;

           const repost = await ctx.db.query('retweets')
            .withIndex('by_user_message', (q) => q.eq('userId', currentUserId).eq('messageId', comment._id))
            .unique();
           isReposted = !!repost;
        }

        if (comment.serverId) {
           const server = await ctx.db.get(comment.serverId);
           if (server?.adminIds) {
               if (server.adminIds.includes(comment.userId)) isServerAdmin = true;
               if (currentUserId && server.adminIds.includes(currentUserId)) amIAdmin = true;
           }
        }

        return { ...comment, mediaFiles: mediaUrls, creator, isLiked, isReposted, isServerAdmin, amIAdmin };
      })
    );
  },
});

export const generateUploadUrl = mutation(async (ctx) => {
  const userId = await getCurrentUserId(ctx);
  if (!userId) throw new Error("Unauthorized");
  return await ctx.storage.generateUploadUrl();
});

export const getChannelAttachments = query({
  args: { channelId: v.id("channels") },
  handler: async (ctx, args) => {
    const messages = await ctx.db.query("messages")
      .withIndex("by_channel", q => q.eq("channelId", args.channelId))
      .order("desc")
      .collect();

    const mediaIds: string[] = [];
    const linkList: { url: string; title: string; date: number }[] = [];
    for (const msg of messages) {
      if (msg.threadId) continue;
      if (msg.mediaFiles?.length) mediaIds.push(...msg.mediaFiles);
      if (msg.websiteUrl) {
        linkList.push({
          url: msg.websiteUrl,
          title: msg.content.length > 50 ? msg.content.substring(0, 50) + "..." : msg.content,
          date: msg._creationTime,
        });
      }
    }
    const mediaList = await getMediaUrls(ctx, mediaIds);
    return { mediaList, linkList };
  },
});

export const getLikers = query({
  args: { messageId: v.id("messages") },
  handler: async (ctx, args) => {
    const likes = await ctx.db.query("likes")
      .filter((q) => q.eq(q.field("messageId"), args.messageId))
      .collect();

    const likers = await Promise.all(likes.map(async (like) => {
      const user = await ctx.db.get(like.userId);
      if (!user) return null;

      if (user.imageUrl && !isHttpUrl(user.imageUrl)) {
        user.imageUrl = await ctx.storage.getUrl(user.imageUrl as Id<"_storage">) ?? user.imageUrl;
      }
      return user;
    }));
    return likers.filter((u) => u !== null);
  },
});

export const toggleChannelSubscription = mutation({
  args: { channelId: v.id('channels') },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);
    if (!userId) return;
    const existing = await ctx.db.query('channel_subscriptions')
      .withIndex('by_user_channel', q => q.eq('userId', userId).eq('channelId', args.channelId))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, { isSubscribed: !existing.isSubscribed });
    } else {
      const channel = await ctx.db.get(args.channelId);
      const targetId = channel?.serverId || channel?.universityId;
      let serverState = false;
      if (targetId) {
         const sSub = await ctx.db.query('channel_subscriptions')
            .withIndex('by_user_server', q => q.eq('userId', userId).eq('serverId', targetId as any))
            .unique();
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
    action: v.union(v.literal("on"), v.literal("off"))
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);
    if (!userId) return;
    const targetId = args.serverId || args.universityId;
    if (!targetId) return;
    const isSubbing = args.action === "on";

    const existingServerSub = await ctx.db.query('channel_subscriptions')
      .withIndex('by_user_server', q => q.eq('userId', userId).eq('serverId', targetId as any))
      .unique();

    if (existingServerSub) {
      await ctx.db.patch(existingServerSub._id, { isSubscribed: isSubbing });
    } else {
      await ctx.db.insert('channel_subscriptions', { userId, serverId: targetId as any, isSubscribed: isSubbing });
    }

    const allChannels = await ctx.db.query('channels').collect();
    const serverChannels = allChannels.filter(c =>
      ((args.serverId && c.serverId === args.serverId) || (args.universityId && c.universityId === args.universityId)) && c.type !== 'category'
    );
    const channelIds = serverChannels.map(c => c._id);
    const userSubs = await ctx.db.query('channel_subscriptions')
      .withIndex('by_user_channel', q => q.eq('userId', userId))
      .collect();

    for (const channelId of channelIds) {
      const existingSub = userSubs.find(s => s.channelId === channelId);
      if (existingSub) await ctx.db.patch(existingSub._id, { isSubscribed: isSubbing });
      else await ctx.db.insert('channel_subscriptions', { userId, channelId, isSubscribed: isSubbing });
    }
  }
});

export const getSubscriptionStatus = query({
  args: { channelId: v.optional(v.id('channels')), serverId: v.optional(v.id('servers')), universityId: v.optional(v.id('universities')) },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);
    if (!userId) return { channelSubbed: false, serverSubbed: false };
    const targetId = args.serverId || args.universityId;
    let serverSubbed = false;
    if (targetId) {
      const sSub = await ctx.db.query('channel_subscriptions')
        .withIndex('by_user_server', q => q.eq('userId', userId).eq('serverId', targetId as any))
        .unique();
      if (sSub?.isSubscribed) serverSubbed = true;
    }
    let channelSubbed = serverSubbed;
    if (args.channelId) {
      const cSub = await ctx.db.query('channel_subscriptions')
        .withIndex('by_user_channel', q => q.eq('userId', userId).eq('channelId', args.channelId))
        .unique();
      if (cSub !== null) channelSubbed = cSub.isSubscribed;
    }
    return { channelSubbed, serverSubbed };
  }
});

export const getServerChannelsWithSubStatus = query({
  args: { serverId: v.optional(v.id('servers')), universityId: v.optional(v.id('universities')) },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);
    if (!userId) return [];
    const targetId = args.serverId || args.universityId;
    let serverSubbed = false;
    if (targetId) {
      const serverSub = await ctx.db.query('channel_subscriptions')
        .withIndex('by_user_server', q => q.eq('userId', userId).eq('serverId', targetId as any))
        .unique();
      serverSubbed = serverSub?.isSubscribed ?? false;
    }
    const allChannels = await ctx.db.query('channels').collect();
    const channels = allChannels.filter(c =>
      ((args.serverId && c.serverId === args.serverId) || (args.universityId && c.universityId === args.universityId)) && c.type !== 'category'
    );
    const userSubs = await ctx.db.query('channel_subscriptions')
      .withIndex('by_user_channel', q => q.eq('userId', userId))
      .collect();

    return channels.map(ch => {
      const cSub = userSubs.find(s => s.channelId === ch._id);
      return { _id: ch._id, name: ch.name, isSubscribed: cSub ? cSub.isSubscribed : serverSubbed };
    });
  }
});

export const getNotifications = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db.query("users")
      .withIndex("byClerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) return [];

    const notifs = await ctx.db.query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(50); // Chỉ lấy 50 thông báo gần nhất cho nhẹ

    return Promise.all(
      notifs.map(async (n) => {
        const sender = n.senderId ? await ctx.db.get(n.senderId) : null;

        let channelName = "";
        let workspaceName = "";

        // Tự động tìm tên Kênh và Tên Máy chủ / Đại học
        if (n.channelId) {
          const channel = await ctx.db.get(n.channelId);
          if (channel) {
            channelName = channel.name;
            if (channel.serverId) {
              const server = await ctx.db.get(channel.serverId);
              if (server) workspaceName = server.name;
            } else if (channel.universityId) {
              const uni = await ctx.db.get(channel.universityId);
              // @ts-ignore
              if (uni) workspaceName = uni.name || uni.slug.toUpperCase();
            }
          }
        }

        return { ...n, sender, channelName, workspaceName };
      })
    );
  },
});

export const getUnreadNotificationsCount = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return 0;

    const user = await ctx.db.query("users")
      .withIndex("byClerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) return 0;

    const unread = await ctx.db.query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("isRead"), false))
      .collect();

    return unread.length;
  },
});

export const markNotificationRead = mutation({
  args: { notificationId: v.id('notifications') },
  handler: async (ctx, args) => await ctx.db.patch(args.notificationId, { isRead: true })
});

export const createInternalNotification = internalMutation({
  args: { receiverId: v.id('users'), type: v.string(), senderId: v.id('users') },
  handler: async (ctx, args) => {
     await ctx.db.insert('notifications', { userId: args.receiverId, senderId: args.senderId, type: args.type, isRead: false });
  }
});

export const searchMessages = query({
  args: {
    search: v.string(),
    channelId: v.optional(v.id("channels")),
    serverId: v.optional(v.id("servers"))
  },
  handler: async (ctx, args) => {
    let messages: Doc<"messages">[] = [];
    const currentUserId = await getCurrentUserId(ctx);

    if (args.channelId) {
      messages = await ctx.db.query("messages")
        .withIndex("by_channel", q => q.eq("channelId", args.channelId))
        .collect();
    } else if (args.serverId) {
      const channels = await ctx.db.query("channels")
        .withIndex("by_server", q => q.eq("serverId", args.serverId))
        .collect();
      const channelIds = channels.map(c => c._id);

      const allMessages = await ctx.db.query("messages").collect();
      messages = allMessages.filter(m => channelIds.includes(m.channelId as Id<"channels">));
    }

    const matchedMessages = messages.filter(m =>
      m.threadId === undefined &&
      m.content && m.content.toLowerCase().includes(args.search.toLowerCase())
    );

    return Promise.all(matchedMessages.map(async (thread) => {
      const creator = await getMessageCreator(ctx, thread.userId);
      const mediaUrls = await getMediaUrls(ctx, thread.mediaFiles);

      let isLiked = false;
      let isReposted = false;
      let isServerAdmin = false;
      let amIAdmin = false;

      if (currentUserId) {
        const like = await ctx.db.query('likes')
          .withIndex('by_user_message', (q) => q.eq('userId', currentUserId).eq('messageId', thread._id))
          .unique();
        isLiked = !!like;

        const repost = await ctx.db.query('retweets')
          .withIndex('by_user_message', (q) => q.eq('userId', currentUserId).eq('messageId', thread._id))
          .unique();
        isReposted = !!repost;
      }

      if (thread.serverId) {
         const server = await ctx.db.get(thread.serverId);
         if (server?.adminIds) {
             if (server.adminIds.includes(thread.userId)) isServerAdmin = true;
             if (currentUserId && server.adminIds.includes(currentUserId)) amIAdmin = true;
         }
      }

      return { ...thread, mediaFiles: mediaUrls, creator, isLiked, isReposted, isServerAdmin, amIAdmin };
    }));
  }
});

export const toggleRepost = mutation({
  args: { messageId: v.id('messages') },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);
    if (!userId) throw new Error("Unauthorized");
    
    const existingRepost = await ctx.db.query('retweets')
      .withIndex('by_user_message', (q) => q.eq('userId', userId).eq('messageId', args.messageId))
      .unique();
      
    const message = await ctx.db.get(args.messageId);
    if (!message) throw new Error("Message not found");

    if (existingRepost) {
      await ctx.db.delete(existingRepost._id);
      await ctx.db.patch(args.messageId, { retweetCount: Math.max(0, (message.retweetCount || 0) - 1) });
      return { reposted: false };
    } else {
      await ctx.db.insert('retweets', { userId, messageId: args.messageId });
      await ctx.db.patch(args.messageId, { retweetCount: (message.retweetCount || 0) + 1 });
      return { reposted: true };
    }
  },
});

export const getUserReposts = query({
  args: { 
    userId: v.id('users'),
    paginationOpts: paginationOptsValidator 
  },
  handler: async (ctx, args) => {
    const currentUserId = await getCurrentUserId(ctx);
    const reposts = await ctx.db.query('retweets')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .order('desc')
      .paginate(args.paginationOpts);

    if (!reposts) return { page: [], isDone: true, continueCursor: "" };

    const threads = await Promise.all(
      reposts.page.map(async (repost) => {
        const thread = await ctx.db.get(repost.messageId);
        if (!thread) return null;
        
        const creator = await getMessageCreator(ctx, thread.userId);
        const mediaUrls = await getMediaUrls(ctx, thread.mediaFiles);
        let isLiked = false;
        let isServerAdmin = false;
        let amIAdmin = false;

        if (currentUserId) {
          const like = await ctx.db.query('likes')
            .withIndex('by_user_message', (q) => q.eq('userId', currentUserId).eq('messageId', thread._id))
            .unique();
          isLiked = !!like;
        }

        if (thread.serverId) {
           const server = await ctx.db.get(thread.serverId);
           if (server?.adminIds) {
               if (server.adminIds.includes(thread.userId)) isServerAdmin = true;
               if (currentUserId && server.adminIds.includes(currentUserId)) amIAdmin = true;
           }
        }

        return { ...thread, mediaFiles: mediaUrls, creator, isLiked, isServerAdmin, amIAdmin, isReposted: true };
      })
    );
    
    return { ...reposts, page: threads.filter((t) => t !== null), isDone: reposts.isDone ?? false };
  },
});

export const getShareSuggestions = query({
  args: { searchQuery: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);
    if (!userId) return [];

    // NẾU CÓ TỪ KHÓA TÌM KIẾM -> Tìm toàn bộ người dùng (kể cả người lạ)
    if (args.searchQuery && args.searchQuery.trim().length > 0) {
       const users = await ctx.db.query("users")
         .withSearchIndex("searchUsers", q => q.search("username", args.searchQuery as string))
         .take(20);
       return users.filter(u => u._id !== userId);
    }

    // NẾU KHÔNG TÌM KIẾM -> Lọc theo thứ tự: Bạn bè (Mutual) > Đang theo dõi > Người theo dõi
    const follows = await ctx.db.query("follows").collect();
    const myFollowings = follows.filter(f => f.followerId === userId).map(f => f.followingId);
    const myFollowers = follows.filter(f => f.followingId === userId).map(f => f.followerId);

    const mutuals = myFollowings.filter(id => myFollowers.includes(id));
    const justFollowing = myFollowings.filter(id => !mutuals.includes(id));
    const justFollowers = myFollowers.filter(id => !mutuals.includes(id));

    // Gom lại theo thứ tự ưu tiên và loại bỏ trùng lặp
    const orderedIds = [...new Set([...mutuals, ...justFollowing, ...justFollowers])];
    
    const suggestedUsers = [];
    for (const id of orderedIds.slice(0, 20)) { // Lấy top 20 gợi ý
       const user = await ctx.db.get(id);
       if (user) suggestedUsers.push(user);
    }
    return suggestedUsers;
  }
});

// 2. Hàm Gửi Tin nhắn (Chứa Link bài viết)
export const sendShareMessage = mutation({
  args: { conversationId: v.id("conversations"), content: v.string() },
  handler: async (ctx, args) => {
     const userId = await getCurrentUserId(ctx);
     if (!userId) throw new Error("Unauthorized");
     
     // 💡 TƯƠNG LAI: Chỗ này bạn có thể check xem người kia có chặn tin nhắn từ người lạ không
     // Ví dụ: if (targetUser.blockStrangers && !isFriend) throw new Error("Bị chặn");

     // Lưu tin nhắn vào DB
     await ctx.db.insert("direct_messages", {
        conversationId: args.conversationId,
        senderId: userId,
        content: args.content,
        status: "sent"
     });
     
     // Cập nhật lại phòng chat để nó nhảy lên đầu danh sách
     // 👇 ĐỔI SANG MÃ HỆ THỐNG
     await ctx.db.patch(args.conversationId, {
        updatedAt: Date.now(),
        lastMessageText: "SYS_SHARED_POST"
     });
  }
});

export const incrementShareCount = mutation({
  args: { messageId: v.id("messages") },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) return;
    
    const currentShareCount = message.shareCount || 0;
    await ctx.db.patch(args.messageId, {
      shareCount: currentShareCount + 1,
    });
  },
});

export const deleteNotification = mutation({
  args: { notificationId: v.id('notifications') },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.notificationId);
  }
});

export const deleteAllNotifications = mutation({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return;

    const user = await ctx.db.query("users")
      .withIndex("byClerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) return;

    // Tìm tất cả thông báo của user này và xóa sạch
    const notifs = await ctx.db.query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    for (const n of notifs) {
      await ctx.db.delete(n._id);
    }
  }
});