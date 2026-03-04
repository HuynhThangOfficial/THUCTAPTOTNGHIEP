import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

// --- GHI CHÚ (NOTES) ---
export const getAllNotes = query({
  args: { viewerId: v.optional(v.id("users")) }, // Cần biết ai đang xem để lọc bạn bè
  handler: async (ctx, args) => {
    const now = Date.now();
    const notes = await ctx.db.query("notes").collect();

    // 1. Lọc bỏ note hết hạn
    const validNotes = notes.filter((n) => n.expiresAt > now);

    const result = [];
    // 2. Lọc quyền riêng tư
    for (const note of validNotes) {
      const isMyNote = args.viewerId === note.userId;
      const isPublic = !note.privacy || note.privacy === 'Công khai';

      if (isMyNote || isPublic) {
        result.push(note);
      } else if (note.privacy === 'Bạn bè' && args.viewerId) {
        // Kiểm tra xem viewer có follow người viết note không (trong bảng follows)
        const isFollowing = await ctx.db
          .query("follows")
          .withIndex("by_both", (q) =>
            q.eq("followerId", args.viewerId as Id<"users">).eq("followingId", note.userId)
          )
          .first();
        
        if (isFollowing) {
          result.push(note);
        }
      }
    }

    // 3. Lấy thông tin User
    return Promise.all(
      result.map(async (note) => {
        const user = await ctx.db.get(note.userId);
        return { ...note, user };
      })
    );
  },
});

export const upsertNote = mutation({
  args: { 
    userId: v.id("users"), 
    content: v.string(), 
    durationHours: v.optional(v.number()),
    privacy: v.optional(v.string()) // Thêm quyền riêng tư
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("notes")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    const hours = args.durationHours ?? 24;
    const expiresAt = Date.now() + hours * 60 * 60 * 1000;
    const privacy = args.privacy ?? 'Công khai';

    if (existing) {
      await ctx.db.patch(existing._id, { content: args.content, expiresAt, privacy });
    } else {
      await ctx.db.insert("notes", {
        userId: args.userId,
        content: args.content,
        expiresAt,
        privacy,
      });
    }
  },
});

export const deleteNote = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("notes")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
    if (existing) {
      await ctx.db.delete(existing._id);
    }
  },
});

// --- STORY ---
export const getAllStories = query({
  handler: async (ctx) => {
    const now = Date.now();
    const stories = await ctx.db.query("stories").collect();
    const validStories = stories.filter((s) => s.expiresAt > now);

    return Promise.all(
      validStories.map(async (story) => {
        const user = await ctx.db.get(story.userId);
        return { ...story, user };
      })
    );
  },
});

export const createStory = mutation({
  args: { userId: v.id("users"), mediaUrl: v.string(), mediaType: v.string() },
  handler: async (ctx, args) => {
    const expiresAt = Date.now() + TWENTY_FOUR_HOURS;
    await ctx.db.insert("stories", {
      userId: args.userId,
      mediaUrl: args.mediaUrl,
      mediaType: args.mediaType,
      expiresAt,
    });
  },
});