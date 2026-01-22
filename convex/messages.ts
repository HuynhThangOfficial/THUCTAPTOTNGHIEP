import { v } from 'convex/values';
import { mutation, query, QueryCtx } from './_generated/server';
import { paginationOptsValidator } from 'convex/server';
import { Id } from './_generated/dataModel';
import { internal } from './_generated/api';

async function getCurrentUserId(ctx: QueryCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  const user = await ctx.db.query("users").withIndex("byClerkId", (q) => q.eq("clerkId", identity.subject)).unique();
  return user?._id;
}

// 1. UPDATE: Thêm channelId
export const addThread = mutation({
  args: {
    content: v.string(),
    mediaFiles: v.optional(v.array(v.string())),
    websiteUrl: v.optional(v.string()),
    threadId: v.optional(v.id('messages')),
    channelId: v.optional(v.id('channels')), // <--- THÊM
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    const messageId = await ctx.db.insert('messages', {
      userId,
      content: args.content,
      mediaFiles: args.mediaFiles,
      websiteUrl: args.websiteUrl,
      threadId: args.threadId,
      channelId: args.channelId, // <--- LƯU CHANNEL
      likeCount: 0,
      commentCount: 0,
      retweetCount: 0,
    });

    if (args.threadId) {
      const originalThread = await ctx.db.get(args.threadId);
      if (originalThread) {
        await ctx.db.patch(args.threadId, { commentCount: (originalThread.commentCount || 0) + 1 });
        if (originalThread.userId) {
          const author = await ctx.db.get(originalThread.userId);
          if (author?.pushToken) {
            await ctx.scheduler.runAfter(500, internal.push.sendPushNotification, {
              pushToken: author.pushToken,
              messageTitle: 'New comment',
              messageBody: args.content,
              threadId: args.threadId,
            });
          }
        }
      }
    }
    return messageId;
  },
});

// ... (Giữ nguyên deleteThread, updateThread, getEditHistory ...)
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

    // --- LOGIC MỚI: SO SÁNH NỘI DUNG ẢNH ---
    if (args.mediaFiles !== undefined) {
      const oldMedia = message.mediaFiles || [];
      const newMedia = args.mediaFiles;

      // Tìm số ảnh được thêm mới (Có trong Mới nhưng không có trong Cũ)
      const addedCount = newMedia.filter(id => !oldMedia.includes(id)).length;

      // Tìm số ảnh bị xóa đi (Có trong Cũ nhưng không có trong Mới)
      const removedCount = oldMedia.filter(id => !newMedia.includes(id)).length;

      if (addedCount > 0 && removedCount > 0 && addedCount === removedCount) {
        // Trường hợp thay thế: Xóa bao nhiêu, thêm bấy nhiêu (Ví dụ: Đổi 1 ảnh này thành 1 ảnh khác)
        changeLog = `(Đã thay đổi ${addedCount} ảnh)`;
      } else if (addedCount > 0 && removedCount === 0) {
        // Chỉ thêm
        changeLog = `(Đã thêm ${addedCount} ảnh)`;
      } else if (removedCount > 0 && addedCount === 0) {
        // Chỉ xóa
        changeLog = `(Đã xóa ${removedCount} ảnh)`;
      } else if (addedCount !== removedCount && (addedCount > 0 || removedCount > 0)) {
        // Trường hợp hỗn hợp (Ví dụ: Xóa 1 ảnh cũ, thêm 2 ảnh mới)
        changeLog = `(Đã cập nhật danh sách ảnh)`;
      }
    }
    // ---------------------------------------

    const isTextModified = args.content.trim() !== message.content.trim();

    // Chỉ lưu lịch sử nếu có thay đổi về Text hoặc Ảnh
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
    return await ctx.db.query('edit_history').withIndex('by_messageId', (q) => q.eq('messageId', args.messageId)).order('desc').collect();
  },
});

// 2. UPDATE: Thêm channelId và logic lọc
export const getThreads = query({
  args: {
      paginationOpts: paginationOptsValidator,
      userId: v.optional(v.id('users')),
      channelId: v.optional(v.id('channels')) // <--- THÊM
  },
  handler: async (ctx, args) => {
    const currentUserId = await getCurrentUserId(ctx);
    let threads;

    if (args.channelId) {
        // Lọc theo kênh
        threads = await ctx.db.query('messages')
            .withIndex('by_channel', q => q.eq('channelId', args.channelId))
            .order('desc').paginate(args.paginationOpts);
    } else if (args.userId) {
        // Lọc theo user
        threads = await ctx.db.query('messages')
            .filter((q) => q.eq(q.field('userId'), args.userId))
            .order('desc').paginate(args.paginationOpts);
    } else {
        // Trang chủ chung
        threads = await ctx.db.query('messages')
            .filter((q) => q.eq(q.field('threadId'), undefined))
            .order('desc').paginate(args.paginationOpts);
    }

    const threadsWithMedia = await Promise.all(
      threads.page.map(async (thread) => {
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
    return { ...threads, page: threadsWithMedia };
  },
});

// ... (Giữ nguyên likeThread, getFavoriteThreads, getThreadById, getThreadComments...)
export const likeThread = mutation({
  args: { messageId: v.id('messages') },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);
    if (!userId) throw new Error("Unauthorized");
    const existingLike = await ctx.db.query('likes').withIndex('by_user_message', (q) => q.eq('userId', userId).eq('messageId', args.messageId)).unique();
    const message = await ctx.db.get(args.messageId);
    if (!message) throw new Error("Message not found");
    if (existingLike) {
      await ctx.db.delete(existingLike._id);
      await ctx.db.patch(args.messageId, { likeCount: Math.max(0, (message.likeCount || 0) - 1) });
      return { liked: false };
    } else {
      await ctx.db.insert('likes', { userId: userId, messageId: args.messageId });
      await ctx.db.patch(args.messageId, { likeCount: (message.likeCount || 0) + 1 });
      return { liked: true };
    }
  },
});

export const getFavoriteThreads = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);
    if (!userId) return { page: [], isDone: true, continueCursor: "" };
    const favorites = await ctx.db.query('likes').withIndex('by_user_message', (q) => q.eq('userId', userId)).order('desc').paginate(args.paginationOpts);
    const threads = await Promise.all(
      favorites.page.map(async (fav) => {
        const thread = await ctx.db.get(fav.messageId);
        if (!thread) return null;
        const creator = await getMessageCreator(ctx, thread.userId);
        const mediaUrls = await getMediaUrls(ctx, thread.mediaFiles);
        return { ...thread, mediaFiles: mediaUrls, creator, isLiked: true };
      })
    );
    return { ...favorites, page: threads.filter((t) => t !== null) };
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
    if (currentUserId) {
      const like = await ctx.db.query('likes').withIndex('by_user_message', (q) => q.eq('userId', currentUserId).eq('messageId', args.messageId)).unique();
      isLiked = !!like;
    }
    return { ...message, mediaFiles: mediaUrls, creator, isLiked };
  },
});

export const getThreadComments = query({
  args: { messageId: v.id('messages') },
  handler: async (ctx, args) => {
    const currentUserId = await getCurrentUserId(ctx);
    const comments = await ctx.db.query('messages').withIndex('by_threadId', q => q.eq('threadId', args.messageId)).order('desc').collect();
    const commentsWithMedia = await Promise.all(
      comments.map(async (comment) => {
        const creator = await getMessageCreator(ctx, comment.userId);
        const mediaUrls = await getMediaUrls(ctx, comment.mediaFiles);
        let isLiked = false;
        if (currentUserId) {
           const like = await ctx.db.query('likes').withIndex('by_user_message', (q) => q.eq('userId', currentUserId).eq('messageId', comment._id)).unique();
          isLiked = !!like;
        }
        return { ...comment, mediaFiles: mediaUrls, creator, isLiked };
      })
    );
    return commentsWithMedia;
  },
});

const getMessageCreator = async (ctx: QueryCtx, userId: Id<'users'>) => {
  const user = await ctx.db.get(userId);
  if (!user?.imageUrl || user.imageUrl.startsWith('http')) return user;
  const url = await ctx.storage.getUrl(user.imageUrl as Id<'_storage'>);
  return { ...user, imageUrl: url };
};

const getMediaUrls = async (ctx: QueryCtx, mediaFiles: string[] | undefined) => {
  if (!mediaFiles || mediaFiles.length === 0) return [];
  const urlPromises = mediaFiles.map((file) => ctx.storage.getUrl(file as Id<'_storage'>));
  const results = await Promise.allSettled(urlPromises);
  return results.filter((result): result is PromiseFulfilledResult<string> => result.status === 'fulfilled').map((result) => result.value);
};

export const generateUploadUrl = mutation(async (ctx) => {
  const userId = await getCurrentUserId(ctx);
  if (!userId) throw new Error("Unauthorized");
  return await ctx.storage.generateUploadUrl();
});