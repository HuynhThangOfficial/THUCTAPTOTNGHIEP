// convex/firecrawl_db.ts
import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

export const getCommunityScrapeTarget = internalQuery({
  args: {},
  handler: async (ctx) => {
    const allChannels = await ctx.db.query("channels")
      .filter(q => q.neq(q.field("serverId"), undefined))
      .collect();

    const textChannels = allChannels.filter(c => c.type !== "category" && c.name !== "đại-sảnh");
    if (textChannels.length === 0) return null;

    const randomChannel = textChannels[Math.floor(Math.random() * textChannels.length)];

    // Chỉ lấy Bot để đăng tin
    const users = await ctx.db.query("users").collect();
    const botUsers = users.filter(u => u.clerkId.startsWith("bot_"));
    const randomUser = botUsers.length > 0 ? botUsers[Math.floor(Math.random() * botUsers.length)] : null;

    return {
      channelId: randomChannel._id,
      channelName: randomChannel.name,
      serverId: randomChannel.serverId!,
      userId: randomUser?._id 
    };
  }
});

export const saveScrapedPost = internalMutation({
  args: {
    userId: v.optional(v.id("users")),
    channelId: v.id("channels"),
    serverId: v.id("servers"),
    content: v.string(),
    websiteUrl: v.optional(v.string()), 
  },
  handler: async (ctx, args) => {
    let authorId = args.userId;

    if (!authorId) {
      const clerkId = `bot_news_${Date.now()}`;
      authorId = await ctx.db.insert("users", {
        clerkId: clerkId,
        email: `${clerkId}@news.com`,
        first_name: "Điểm Tin",
        username: clerkId,
        followersCount: 0,
        imageUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${clerkId}`,
      });
    }

    await ctx.db.insert("messages", {
      userId: authorId,
      channelId: args.channelId,
      serverId: args.serverId,
      content: args.content,
      websiteUrl: args.websiteUrl,
      likeCount: 0,    // ĐẢM BẢO 0 LIKE
      commentCount: 0, // ĐẢM BẢO 0 COMMENT
      retweetCount: 0,
      allowComments: true,
      isAnonymous: false
    });
  }
});