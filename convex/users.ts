import { v } from 'convex/values';
import { internalMutation, mutation, query, QueryCtx } from './_generated/server';
import { Id } from './_generated/dataModel';
import { internal } from './_generated/api';
import { isHttpUrl } from './utils'; // 👇 IMPORT HÀM BEST PRACTICE VÀO ĐÂY

// --- 1. CÁC HÀM LẤY THÔNG TIN USER ---

export const getUserByClerkId = query({
  args: { clerkId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query('users')
      .filter((q) => q.eq(q.field('clerkId'), args.clerkId))
      .unique();

    if (!user?.imageUrl || isHttpUrl(user.imageUrl)) {
      return user;
    }
    const url = await ctx.storage.getUrl(user.imageUrl as Id<'_storage'>);
    return { ...user, imageUrl: url };
  },
});

export const getUserById = query({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    
    if (!user?.imageUrl || isHttpUrl(user.imageUrl)) {
      return user;
    }
    const url = await ctx.storage.getUrl(user.imageUrl as Id<'_storage'>);
    return { ...user, imageUrl: url };
  },
});

// --- 2. CÁC HÀM TẠO & CẬP NHẬT USER ---

export const createUser = internalMutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    first_name: v.optional(v.string()),
    last_name: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    username: v.union(v.string(), v.null()),
    bio: v.optional(v.string()),
    websiteUrl: v.optional(v.string()),
    followersCount: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await ctx.db.insert('users', {
      ...args,
      username: args.username || `${args.first_name}${args.last_name}`,
    });
    return userId;
  },
});

// 1. HÀM DÀNH CHO CLIENT (Giữ nguyên của bạn để không lỗi Edit Profile)
export const updateUser = mutation({
  args: {
    _id: v.id('users'),
    first_name: v.optional(v.string()),
    username: v.optional(v.string()),
    bio: v.optional(v.string()),
    websiteUrl: v.optional(v.string()),
    linkTitle: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    pushToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await getCurrentUserOrThrow(ctx); // Check quyền người dùng
    const { _id, ...rest } = args;
    return await ctx.db.patch(_id, rest);
  },
});

// 2. HÀM MỚI DÀNH RIÊNG CHO WEBHOOK (Để đồng bộ dữ liệu ngầm từ Clerk)
export const updateUserFromClerk = internalMutation({
  args: {
    clerkId: v.string(),
    first_name: v.optional(v.string()),
    last_name: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    username: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Webhook chỉ có clerkId, nên phải tìm user theo clerkId
    const user = await ctx.db
      .query("users")
      .withIndex("byClerkId", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (!user) {
      console.error("Không tìm thấy user để update:", args.clerkId);
      return;
    }

    // Cập nhật thông tin mới nhất từ Clerk vào Database
    await ctx.db.patch(user._id, {
      first_name: args.first_name,
      last_name: args.last_name,
      imageUrl: args.imageUrl,
      username: args.username,
    });
  },
});

export const updateLastSeen = mutation({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return;

    const user = await ctx.db
      .query("users")
      .withIndex("byClerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (user) {
      await ctx.db.patch(user._id, { lastSeen: Date.now() });
    }
  },
});

export const updateActiveStatus = mutation({
  args: { isEnabled: v.boolean() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("UNAUTHORIZED");

    const user = await ctx.db
      .query("users")
      .withIndex("byClerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) throw new Error("USER_NOT_FOUND");

    await ctx.db.patch(user._id, { 
      showActiveStatus: args.isEnabled 
    });
  },
});

export const generateUploadUrl = mutation(async (ctx) => {
  await getCurrentUserOrThrow(ctx);
  return await ctx.storage.generateUploadUrl();
});

export const updateImage = mutation({
  args: { storageId: v.id('_storage'), _id: v.id('users') },
  handler: async (ctx, args) => {
    const imageUrl = await ctx.storage.getUrl(args.storageId);
    if (!imageUrl) throw new Error("STORAGE_ERROR");
    await ctx.db.patch(args._id, { imageUrl: imageUrl });
  },
});

// --- 3. CÁC HÀM TÌM KIẾM & IDENTITY ---

export const searchUsers = query({
  args: { search: v.string() },
  handler: async (ctx, args) => {
    const users = await ctx.db
      .query('users')
      .withSearchIndex('searchUsers', (q) => q.search('username', args.search))
      .collect();

    const usersWithImage = await Promise.all(
      users.map(async (user) => {
        if (!user?.imageUrl || isHttpUrl(user.imageUrl)) {
          return user;
        }
        const url = await ctx.storage.getUrl(user.imageUrl as Id<'_storage'>);
        user.imageUrl = url!;
        return user;
      })
    );
    return usersWithImage;
  },
});

export const current = query({
  args: {},
  handler: async (ctx) => {
    return await getCurrentUser(ctx);
  },
});

export const deleteFromClerk = internalMutation({
  args: { clerkUserId: v.string() },
  async handler(ctx, { clerkUserId }) {
    const user = await userByExternalId(ctx, clerkUserId);
    if (user !== null) {
      await ctx.db.delete(user._id);
    } else {
      console.warn(`Can't delete user, there is none for Clerk user ID: ${clerkUserId}`);
    }
  },
});

// --- 4. HELPERS ---

export async function getCurrentUserOrThrow(ctx: QueryCtx) {
  const userRecord = await getCurrentUser(ctx);
  if (!userRecord) throw new Error("USER_NOT_FOUND");
  return userRecord;
}

export async function getCurrentUser(ctx: QueryCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (identity === null) {
    return null;
  }
  return await userByExternalId(ctx, identity.subject);
}

async function userByExternalId(ctx: QueryCtx, externalId: string) {
  return await ctx.db
    .query('users')
    .withIndex('byClerkId', (q) => q.eq('clerkId', externalId))
    .unique();
}

// --- 5. HỆ THỐNG FOLLOW & STATS ---

export const followUser = mutation({
  args: { targetUserId: v.id('users') },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUserOrThrow(ctx);

    if (currentUser._id === args.targetUserId) {
      throw new Error("CANNOT_FOLLOW_SELF");
    }

    const existingFollow = await ctx.db
      .query('follows')
      .withIndex('by_both', (q) =>
        q.eq('followerId', currentUser._id).eq('followingId', args.targetUserId)
      )
      .unique();

    if (!existingFollow) {
      await ctx.db.insert('follows', {
        followerId: currentUser._id,
        followingId: args.targetUserId,
      });
      const targetUser = await ctx.db.get(args.targetUserId);
      if (targetUser) {
        await ctx.db.patch(args.targetUserId, {
          followersCount: (targetUser.followersCount || 0) + 1,
        });
      }

      await ctx.runMutation(internal.messages.createInternalNotification, {
         receiverId: args.targetUserId,
         type: 'follow',
         senderId: currentUser._id
      });
    }
  },
});

export const unfollowUser = mutation({
  args: { targetUserId: v.id('users') },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUserOrThrow(ctx);

    const existingFollow = await ctx.db
      .query('follows')
      .withIndex('by_both', (q) =>
        q.eq('followerId', currentUser._id).eq('followingId', args.targetUserId)
      )
      .unique();

    if (existingFollow) {
      await ctx.db.delete(existingFollow._id);
      const targetUser = await ctx.db.get(args.targetUserId);
      if (targetUser) {
        await ctx.db.patch(args.targetUserId, {
          followersCount: Math.max(0, (targetUser.followersCount || 0) - 1),
        });
      }
    }
  },
});

export const isFollowing = query({
  args: { targetUserId: v.id('users') },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUser(ctx);
    if (!currentUser) return false;

    const follow = await ctx.db
      .query('follows')
      .withIndex('by_both', (q) =>
        q.eq('followerId', currentUser._id).eq('followingId', args.targetUserId)
      )
      .unique();

    return !!follow;
  },
});

export const getFollowers = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const follows = await ctx.db
      .query("follows")
      .withIndex("by_following", (q) => q.eq("followingId", args.userId))
      .collect();

    const users = await Promise.all(
      follows.map(async (f) => {
        const user = await ctx.db.get(f.followerId);
        if (!user) return null;
        
        if (user.imageUrl && !isHttpUrl(user.imageUrl)) {
            user.imageUrl = await ctx.storage.getUrl(user.imageUrl as Id<"_storage">) ?? user.imageUrl;
        }
        return user;
      })
    );
    return users.filter((u) => u !== null);
  },
});

export const getFollowing = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const follows = await ctx.db
      .query("follows")
      .withIndex("by_follower", (q) => q.eq("followerId", args.userId))
      .collect();

    const users = await Promise.all(
      follows.map(async (f) => {
        const user = await ctx.db.get(f.followingId);
        if (!user) return null;
        
        if (user.imageUrl && !isHttpUrl(user.imageUrl)) {
            user.imageUrl = await ctx.storage.getUrl(user.imageUrl as Id<"_storage">) ?? user.imageUrl;
        }
        return user;
      })
    );
    return users.filter((u) => u !== null);
  },
});

export const getPostCount = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const posts = await ctx.db
      .query("messages")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => 
        q.and(
          // 1. Không đếm bình luận
          q.eq(q.field("threadId"), undefined), 
          // 2. CHẶN ĐỨNG BÀI ẨN DANH: Chỉ đếm bài có isAnonymous = false hoặc không có trường này
          q.or(
             q.eq(q.field("isAnonymous"), false),
             q.eq(q.field("isAnonymous"), undefined)
          )
        )
      )
      .collect();

    return posts.length;
  },
});

export const checkRelationship = query({
  args: { targetUserId: v.id("users") },
  handler: async (ctx, args) => {
    const currentUserId = await getCurrentUser(ctx);
    if (!currentUserId) return { isFollowing: false, isFollowedBy: false };

    const followTx = await ctx.db
      .query("follows")
      .withIndex("by_both", (q) =>
        q.eq("followerId", currentUserId._id).eq("followingId", args.targetUserId)
      )
      .unique();

    const followedByTx = await ctx.db
      .query("follows")
      .withIndex("by_both", (q) =>
        q.eq("followerId", args.targetUserId).eq("followingId", currentUserId._id)
      )
      .unique();

    return {
      isFollowing: !!followTx,
      isFollowedBy: !!followedByTx
    };
  },
});

export const getFriends = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const following = await ctx.db
      .query("follows")
      .withIndex("by_follower", (q) => q.eq("followerId", args.userId))
      .collect();

    const friendPromises = following.map(async (f) => {
      const isFollowBack = await ctx.db
        .query("follows")
        .withIndex("by_both", (q) =>
          q.eq("followerId", f.followingId).eq("followingId", args.userId)
        )
        .unique();

      if (!isFollowBack) return null;

      const user = await ctx.db.get(f.followingId);
      if (!user) return null;

      if (user.imageUrl && !isHttpUrl(user.imageUrl)) {
         user.imageUrl = await ctx.storage.getUrl(user.imageUrl as Id<"_storage">) ?? user.imageUrl;
      }
      return user;
    });

    const results = await Promise.all(friendPromises);
    return results.filter((u) => u !== null);
  },
});

export const getUsers = query({
  args: { search: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (args.search) {
      return await ctx.db
        .query("users")
        .withSearchIndex("searchUsers", (q) =>
          q.search("username", args.search!)
        )
        .take(20);
    }

    return await ctx.db
      .query("users")
      .order("desc")
      .take(10);
  },
});

// --- 6. HÀM DỌN DẸP TOÀN BỘ DỮ LIỆU KHI XÓA TÀI KHOẢN ---
export const deleteUserDataFull = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrThrow(ctx);

    // 1. Dọn dẹp Bài viết & Bình luận (Tận dụng index by_user)
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    for (const msg of messages) {
      await ctx.db.delete(msg._id);
    }

    // 2. Dọn dẹp danh sách Đang theo dõi
    const following = await ctx.db
      .query("follows")
      .withIndex("by_follower", (q) => q.eq("followerId", user._id))
      .collect();
    for (const f of following) {
      await ctx.db.delete(f._id);
    }

    // 3. Dọn dẹp danh sách Người theo dõi
    const followers = await ctx.db
      .query("follows")
      .withIndex("by_following", (q) => q.eq("followingId", user._id))
      .collect();
    for (const f of followers) {
      await ctx.db.delete(f._id);
    }

    // 4. Dọn dẹp Lượt thích (Likes)
    try {
      const likes = await ctx.db
        .query("likes" as any) 
        .filter((q: any) => q.eq(q.field("userId"), user._id))
        .collect();
      for (const like of likes) {
        await ctx.db.delete(like._id);
      }
    } catch (error) {
      console.log("Skip deleting likes due to schema configuration.");
    }

    // 5. Cuối cùng: Xóa sạch thông tin của chính user này
    await ctx.db.delete(user._id);

    return { success: true };
  },
});

export const updateLanguage = mutation({
  args: { 
    userId: v.id("users"), 
    language: v.string() // 'vi', 'en', hoặc 'zh'
  },
  handler: async (ctx, args) => {
    // Lưu thẳng vào bảng users
    await ctx.db.patch(args.userId, { 
      language: args.language 
    });
  },
});

export const updateOnlineStatus = mutation({
  args: { isOnline: v.boolean() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return;

    const user = await ctx.db
      .query("users")
      .withIndex("byClerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) return;

    // Cập nhật isOnline và lastSeen (thời gian hoạt động cuối)
    await ctx.db.patch(user._id, {
      isOnline: args.isOnline,
      lastSeen: Date.now(),
    });
  },
});