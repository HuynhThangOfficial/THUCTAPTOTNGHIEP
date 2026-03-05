import { v } from 'convex/values';
import { internalMutation, mutation, query, QueryCtx } from './_generated/server';
import { Id } from './_generated/dataModel';
import { internal } from './_generated/api'; // 👇 ĐÃ THÊM IMPORT

// --- 1. CÁC HÀM LẤY THÔNG TIN USER ---

export const getUserByClerkId = query({
  args: { clerkId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query('users')
      .filter((q) => q.eq(q.field('clerkId'), args.clerkId))
      .unique();

    if (!user?.imageUrl || user.imageUrl.startsWith('http')) {
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
    if (!user?.imageUrl || user.imageUrl.startsWith('http')) {
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

export const updateUser = mutation({
  args: {
    _id: v.id('users'),
    bio: v.optional(v.string()),
    websiteUrl: v.optional(v.string()),
    linkTitle: v.optional(v.string()),
    profilePicture: v.optional(v.string()),
    pushToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await getCurrentUserOrThrow(ctx);
    const { _id, ...rest } = args;
    return await ctx.db.patch(_id, rest);
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

export const generateUploadUrl = mutation(async (ctx) => {
  await getCurrentUserOrThrow(ctx);
  return await ctx.storage.generateUploadUrl();
});

// 👇 ĐÂY LÀ HÀM ĐÃ ĐƯỢC FIX LỖI AVATAR 👇
export const updateImage = mutation({
  args: { storageId: v.id('_storage'), _id: v.id('users') },
  handler: async (ctx, args) => {
    // 1. Biến cái mã ID thành link web thật
    const imageUrl = await ctx.storage.getUrl(args.storageId);
    
    if (!imageUrl) {
      throw new Error("Không thể lấy đường dẫn ảnh từ server.");
    }

    // 2. Lưu link web đó vào database thay vì lưu mã ID
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
        if (!user?.imageUrl || user.imageUrl.startsWith('http')) {
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
  if (!userRecord) throw new Error("Can't get current user");
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
      throw new Error("Bạn không thể tự theo dõi chính mình!");
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

      // 👇 GỬI THÔNG BÁO KHI CÓ NGƯỜI FOLLOW 👇
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
        if (user.imageUrl && !user.imageUrl.startsWith("http")) {
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
        if (user.imageUrl && !user.imageUrl.startsWith("http")) {
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
      .filter((q) => q.eq(q.field("userId"), args.userId))
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

      if (user.imageUrl && !user.imageUrl.startsWith("http")) {
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