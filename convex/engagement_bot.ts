// convex/engagement_bot.ts
import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const getEngagementTargets = internalQuery({
  args: {},
  handler: async (ctx) => {
    // 1. TỐI ƯU: Chỉ lấy 20 bài mới nhất (thay vì 40) để giảm tải
    const recentPostsRaw = await ctx.db.query("messages")
      .filter(q => q.eq(q.field("threadId"), undefined))
      .order("desc")
      .take(20);

    if (recentPostsRaw.length === 0) return null;

// 2. TỐI ƯU CỰC MẠNH (ĐÃ DÙNG INDEX): Chỉ lấy đúng những User có cờ isBot = true
    const allBots = await ctx.db
      .query("users")
      .withIndex("by_bot_status", (q) => q.eq("isBot", true))
      .collect();
    
    // Vẫn giữ lại bộ lọc bỏ qua các bot đọc báo (news)
    const botUsers = allBots.filter(u => u.clerkId && !u.clerkId.includes("news"));

    const targets = [];
    
    for (const post of recentPostsRaw) {
      let channelName = "đại-sảnh";
      if (post.channelId) {
        const channel = await ctx.db.get(post.channelId);
        if (channel) {
          channelName = channel.name;
          if (channel.name === "đại-sảnh") continue;
        }
      }

      const luckScore = post._id.charCodeAt(post._id.length - 1) % 100;
      const isViral = luckScore < 5; 
      const isHot = luckScore >= 5 && luckScore < 20; 
      
      const maxLikes = isViral ? 40 : (isHot ? 15 : 5);
      const maxComments = isViral ? 15 : (isHot ? 6 : 2);

      const currentLikes = post.likeCount || 0;
      const currentComments = post.commentCount || 0;

      const shouldLike = currentLikes < maxLikes && Math.random() < 0.7; 
      const shouldComment = currentComments < maxComments && Math.random() < 0.5;

      if (shouldLike || shouldComment) {
        // 3. LOẠI BỎ TÍNH NĂNG REPLY: Không gọi DB để lấy comment cũ nữa
        const availableBotsForPost = botUsers.filter(u => u._id !== post.userId);
        const randomBot = availableBotsForPost.length > 0 ? availableBotsForPost[Math.floor(Math.random() * availableBotsForPost.length)] : null;
        
        // Trích xuất ID của các bot để truyền sang applyEngagement (Tránh gọi lại DB)
        const botIdPool = availableBotsForPost.map(b => b._id);

        targets.push({
          post,
          channelName,
          shouldLike,
          likesToAdd: Math.floor(Math.random() * (isViral ? 4 : (isHot ? 2 : 1))) + 1,
          shouldComment,
          botUser: randomBot,
          botIdPool // Chuyền mảng ID bot sang Mutation
        });
      }
      
      // Chỉ xử lý tối đa 3 bài mỗi lần Cron chạy để tiết kiệm Token Gemini
      if (targets.length >= 3) break; 
    }
    return targets;
  }
});

export const applyEngagement = internalMutation({
  args: {
    postId: v.id("messages"),
    likesToAdd: v.number(),
    botIdPool: v.array(v.id("users")), // Nhận danh sách Bot ID từ Query
    commentData: v.optional(v.object({
      userId: v.id("users"),
      content: v.string(),
      threadId: v.id("messages"),
      channelId: v.optional(v.id("channels")),
      universityId: v.optional(v.id("universities")),
      serverId: v.optional(v.id("servers"))
    }))
  },
  handler: async (ctx, args) => {
    const post = await ctx.db.get(args.postId);
    if (!post) return;

    // Xử lý Like (Đã tối ưu không cần fetch toàn bộ User)
    let actualAddedLikes = 0;
    if (args.likesToAdd > 0 && args.botIdPool.length > 0) {
      const shuffledBotIds = args.botIdPool.sort(() => 0.5 - Math.random());
      const botsToCheck = shuffledBotIds.slice(0, args.likesToAdd * 2); // Chỉ check số lượng vừa đủ

      for (const botId of botsToCheck) {
        if (actualAddedLikes >= args.likesToAdd) break;

        const hasLiked = await ctx.db.query("likes")
          .withIndex("by_user_message", q => q.eq("userId", botId).eq("messageId", args.postId))
          .unique();
        
        if (!hasLiked) {
          await ctx.db.insert("likes", { userId: botId, messageId: args.postId });
          actualAddedLikes++;
        }
      }
      
      if (actualAddedLikes > 0) {
        await ctx.db.patch(args.postId, { likeCount: (post.likeCount || 0) + actualAddedLikes });
      }
    }

    // Xử lý Comment (Chỉ bình luận gốc, không reply lồng nhau)
    if (args.commentData) {
      await ctx.db.insert("messages", {
        userId: args.commentData.userId,
        content: args.commentData.content,
        threadId: args.commentData.threadId, 
        parentId: args.commentData.threadId, // Luôn là top-level, không reply
        channelId: args.commentData.channelId,
        universityId: args.commentData.universityId,
        serverId: args.commentData.serverId,
        likeCount: 0, commentCount: 0, retweetCount: 0, allowComments: true, isAnonymous: false 
      });
      
      // Tăng số comment của bài viết gốc
      await ctx.db.patch(args.postId, { commentCount: (post.commentCount || 0) + 1 });
      
      // Đã xóa phần quét Regex @username gây tốn băng thông
    }
  }
});

export const runAutoEngagement = internalAction({
  args: {},
  handler: async (ctx): Promise<string> => {
    // 👇 TRẠM GÁC 1: Chặn chạy ngầm ở Dev
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return "SYS_SKIP: Môi trường Dev không có API Key, ngưng comment dạo.";

    // Trạm gác 2: Xác suất lười biếng (chỉ chạy ở Prod)
    if (Math.random() < 0.20) return "SYS_SKIP: Bot lướt qua nhưng lười cmt.";

    const targets: any = await ctx.runQuery((internal as any).engagement_bot.getEngagementTargets);
    if (!targets || targets.length === 0) return "SYS_INFO: Không có bài cần tương tác.";

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite-preview", generationConfig: { temperature: 1.0 } });

    for (const target of targets) {
      let finalComment = undefined;

      if (target.shouldComment && target.botUser) {
        // Tối ưu Prompt: Ép AI không được dùng Tag hay Hashtag
        const prompt = `Bạn đang lướt mạng xã hội. Kênh: #${target.channelName}. \n
        BÀI VIẾT: "${target.post.content}".\n
        Nhiệm vụ: Viết 1 bình luận dạo (1-10 chữ) phản ứng lại bài viết này. Dùng teencode, cộc lốc. Tuyệt đối KHÔNG xưng tên, KHÔNG dùng hashtag, KHÔNG tag @ ai cả.`;

        try {
          const response = await model.generateContent(prompt);
          finalComment = response.response.text().trim().replace(/[*#"]/g, "");
        } catch (e) {
          console.error("Gemini Error:", e);
        }
      }

      await ctx.runMutation((internal as any).engagement_bot.applyEngagement, {
        postId: target.post._id,
        likesToAdd: target.shouldLike ? target.likesToAdd : 0,
        botIdPool: target.botIdPool, // Truyền Pool ID bots
        commentData: finalComment ? {
          userId: target.botUser._id,
          content: finalComment,
          threadId: target.post._id, 
          channelId: target.post.channelId,
          universityId: target.post.universityId,
          serverId: target.post.serverId
        } : undefined
      });
    }

    return `SYS_SUCCESS | Đã thả tương tác cho ${targets.length} bài.`;
  }
});