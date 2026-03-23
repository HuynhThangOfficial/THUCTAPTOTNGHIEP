// convex/engagement_bot.ts
import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { GoogleGenerativeAI } from "@google/generative-ai";

// ==========================================
// 1. TÌM BÀI VIẾT CẦN TƯƠNG TÁC
// ==========================================
export const getEngagementTargets = internalQuery({
  args: {},
  handler: async (ctx) => {
    const recentPostsRaw = await ctx.db.query("messages")
      .filter(q => q.eq(q.field("threadId"), undefined))
      .order("desc")
      .take(50);

    if (recentPostsRaw.length === 0) return null;

    const targets = [];
    
    for (const post of recentPostsRaw) {
      // TUYỆT ĐỐI KHÔNG TƯƠNG TÁC TRONG KÊNH ĐẠI SẢNH
      if (post.channelId) {
        const channel = await ctx.db.get(post.channelId);
        if (channel && channel.name === "đại-sảnh") continue;
      }

      // Logic độ Viral của bác (Giữ nguyên vì rất hay)
      const luckScore = post._id.charCodeAt(post._id.length - 1) % 100;
      const isViral = luckScore < 2; 
      const isHot = luckScore >= 2 && luckScore < 10; 
      
      const maxLikes = isViral ? 50 : (isHot ? 20 : 10);
      const maxComments = isViral ? 20 : (isHot ? 8 : 3);

      const currentLikes = post.likeCount || 0;
      const currentComments = post.commentCount || 0;

      const shouldLike = currentLikes < maxLikes && Math.random() < 0.7; 
      const shouldComment = currentComments < maxComments && Math.random() < 0.4;

      if (shouldLike || shouldComment) {
        let replyTo = undefined;
        let replyToContent = undefined;

        // 50% cơ hội Reply vào comment cũ để tạo Drama cãi vã
        if (shouldComment && currentComments > 0 && Math.random() < 0.5) {
          const existingComments = await ctx.db.query("messages")
            .withIndex("by_threadId", q => q.eq("threadId", post._id))
            .collect();
            
          if (existingComments.length > 0) {
            const randCmt = existingComments[Math.floor(Math.random() * existingComments.length)];
            replyTo = randCmt._id;
            replyToContent = randCmt.content;
          }
        }

        const allUsers = await ctx.db.query("users").collect();
        // Lọc Bot: Bỏ qua bot news và KHÔNG tự comment vào bài của chính mình
        const botUsers = allUsers.filter(u => 
          u.clerkId.startsWith("bot_") && 
          !u.clerkId.includes("news") && 
          u._id !== post.userId
        );
        const randomBot = botUsers.length > 0 ? botUsers[Math.floor(Math.random() * botUsers.length)] : null;

        targets.push({
          post,
          shouldLike,
          likesToAdd: Math.floor(Math.random() * (isViral ? 5 : (isHot ? 3 : 1))) + 1,
          shouldComment,
          replyTo,
          replyToContent,
          botUser: randomBot
        });
      }

      if (targets.length >= 3) break; 
    }
    return targets;
  }
});

// ==========================================
// 2. LƯU TƯƠNG TÁC XUỐNG DATABASE
// ==========================================
export const applyEngagement = internalMutation({
  args: {
    postId: v.id("messages"),
    likesToAdd: v.number(),
    commentData: v.optional(v.object({
      userId: v.id("users"),
      content: v.string(),
      threadId: v.id("messages"), 
      parentId: v.id("messages"), 
      channelId: v.optional(v.id("channels")),
      universityId: v.optional(v.id("universities")),
      serverId: v.optional(v.id("servers"))
    }))
  },
  handler: async (ctx, args) => {
    const post = await ctx.db.get(args.postId);
    if (!post) return;

    let actualAddedLikes = 0;
    if (args.likesToAdd > 0) {
      const allUsers = await ctx.db.query("users").collect();
      const botUsers = allUsers.filter(u => u.clerkId.startsWith("bot_"));

      const availableBots = [];
      for (const bot of botUsers) {
        const hasLiked = await ctx.db.query("likes")
          .withIndex("by_user_message", q => q.eq("userId", bot._id).eq("messageId", args.postId))
          .unique();
        if (!hasLiked) availableBots.push(bot);
      }

      const shuffledBots = availableBots.sort(() => 0.5 - Math.random());
      const botsToLike = shuffledBots.slice(0, args.likesToAdd);

      for (const bot of botsToLike) {
        await ctx.db.insert("likes", { userId: bot._id, messageId: args.postId });
        actualAddedLikes++;
      }

      if (actualAddedLikes > 0) {
        await ctx.db.patch(args.postId, { likeCount: (post.likeCount || 0) + actualAddedLikes });
      }
    }

    if (args.commentData) {
      await ctx.db.insert("messages", {
        userId: args.commentData.userId,
        content: args.commentData.content,
        threadId: args.commentData.threadId, 
        parentId: args.commentData.parentId, 
        channelId: args.commentData.channelId,
        universityId: args.commentData.universityId,
        serverId: args.commentData.serverId,
        likeCount: 0, 
        commentCount: 0,
        retweetCount: 0,
        allowComments: true,
        isAnonymous: false 
      });
      await ctx.db.patch(args.postId, { commentCount: (post.commentCount || 0) + 1 });
    }
  }
});

// ==========================================
// 3. AI PHÂN TÍCH & VIẾT BÌNH LUẬN "MẤT DẠY"
// ==========================================
export const runAutoEngagement = internalAction({
  args: {},
  handler: async (ctx): Promise<string> => {
    // THUẬT TOÁN "LƯỜI BIẾNG": 20% cơ hội Bot chỉ lướt xem chứ không thèm tương tác
    if (Math.random() < 0.20) {
      return "SYS_SKIP: Bot lướt qua bài nhưng lười không thèm comment/like.";
    }

    const targets: any = await ctx.runQuery((internal as any).engagement_bot.getEngagementTargets);
    if (!targets || targets.length === 0) return "SYS_INFO: Không có bài nào cần tương tác nhịp này.";

    const apiKey = process.env.GEMINI_API_KEY;
    const genAI = new GoogleGenerativeAI(apiKey!);
    // Dùng bản Lite 3.1 cho tiết kiệm và siêu tốc độ
    const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite-preview" });

    // TÍNH TOÁN GIỜ THEO UTC+7 
    const currentHour = new Date(new Date().getTime() + 7 * 3600 * 1000).getUTCHours();
    let timeContext = "";
    if (currentHour >= 5 && currentHour < 11) timeContext = "Sáng: vừa ngủ dậy, ngáo ngơ, hay cọc.";
    else if (currentHour >= 11 && currentHour < 14) timeContext = "Trưa: đói bụng, buồn ngủ, lười gõ phím.";
    else if (currentHour >= 14 && currentHour < 18) timeContext = "Chiều: đuối, rủ đi chơi, lười học.";
    else if (currentHour >= 18 && currentHour < 23) timeContext = "Tối: rảnh rỗi, thích hóng drama, dễ cãi lộn.";
    else timeContext = "Khuya: deep deep, overthinking, dễ đồng cảm hoặc gắt gỏng bất thường.";

    for (const target of targets) {
      let finalComment = undefined;

      if (target.shouldComment && target.botUser) {
        
        // Bơm bối cảnh vào Prompt
        let prompt = `Bạn đang lướt mạng xã hội sinh viên. Bối cảnh: ${timeContext}\n`;
        
        if (target.replyToContent) {
          prompt += `Trong bài viết: "${target.post.content}". Có 1 đứa bình luận: "${target.replyToContent}".\n`;
          prompt += `Nhiệm vụ: Viết 1 câu trả lời (reply) lại bình luận kia. Có thể cãi lại, đồng tình, hoặc chửi xéo nhẹ nhàng.`;
        } else {
          prompt += `Nhiệm vụ: Viết bình luận dạo cho bài viết sau: "${target.post.content}".\n`;
          prompt += `Cách xử lý: Tùy nội dung mà hùa theo bóc phốt, thả "ib", than vãn cùng, hoặc chỉ cmt 1-2 chữ chê bai.`;
        }

        // QUY TẮC VÀNG CHỐNG "MÙI AI"
        prompt += `
          QUY TẮC BẮT BUỘC:
          1. TUYỆT ĐỐI KHÔNG xưng tên, không tự giới thiệu. Đi thẳng vào cmt.
          2. Cực kỳ ngắn. 80% là dưới 10 từ. Có thể chỉ 1-2 từ (VD: ừ, ngon, khùng, ib, hóng, =))).
          3. Dùng teencode Gen Z (vcl, khum, sml, tr, vãi, ủa).
          4. Không viết hoa đầu câu, cố tình sai chính tả nhẹ. KHÔNG dùng ngoặc kép hay in đậm.
          5. Tính cách: Cục súc, lầy lội, hóng hớt.
          Chỉ trả về nội dung bình luận:
        `;

        try {
          const response = await model.generateContent(prompt);
          finalComment = response.response.text().trim();
          
          // Dọn rác AI hay thêm vào
          finalComment = finalComment.replace(/\*\*/g, "").replace(/#/g, "").replace(/^"|"$/g, "");
        } catch (e) {
          console.error("Gemini Error:", e);
        }
      }

      await ctx.runMutation((internal as any).engagement_bot.applyEngagement, {
        postId: target.post._id,
        likesToAdd: target.shouldLike ? target.likesToAdd : 0,
        commentData: finalComment ? {
          userId: target.botUser._id,
          content: finalComment,
          threadId: target.post._id, 
          parentId: target.replyTo || target.post._id, 
          channelId: target.post.channelId,
          universityId: target.post.universityId,
          serverId: target.post.serverId
        } : undefined
      });
    }

    return `SYS_SUCCESS | Đã thả tương tác cho ${targets.length} bài.`;
  }
});