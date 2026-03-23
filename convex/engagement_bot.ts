// convex/engagement_bot.ts
import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { GoogleGenerativeAI } from "@google/generative-ai";

// ==========================================
// 1. TÌM BÀI VIẾT & COMMENT CẦN TƯƠNG TÁC
// ==========================================
export const getEngagementTargets = internalQuery({
  args: {},
  handler: async (ctx) => {
    // Chỉ lấy bài gốc (threadId = undefined)
    const recentPostsRaw = await ctx.db.query("messages")
      .filter(q => q.eq(q.field("threadId"), undefined))
      .order("desc")
      .take(40);

    if (recentPostsRaw.length === 0) return null;

    const targets = [];
    
    for (const post of recentPostsRaw) {
      if (post.channelId) {
        const channel = await ctx.db.get(post.channelId);
        if (channel && channel.name === "đại-sảnh") continue;
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
        let replyTo = undefined;
        let replyToContent = undefined;
        let replyToAuthor = undefined;

        // 👇 60% CƠ HỘI NÓ SẼ BAY VÀO REPLY COMMENT CỦA ĐỨA KHÁC CHỨ KHÔNG CMT BÀI GỐC 👇
        if (shouldComment && currentComments > 0 && Math.random() < 0.6) {
          const existingComments = await ctx.db.query("messages")
            .withIndex("by_threadId", q => q.eq("threadId", post._id))
            .collect();
            
          if (existingComments.length > 0) {
            const randCmt = existingComments[Math.floor(Math.random() * existingComments.length)];
            replyTo = randCmt._id;
            replyToContent = randCmt.content;
            
            if (randCmt.userId) {
              const cmtAuthor = await ctx.db.get(randCmt.userId);
              replyToAuthor = cmtAuthor?.first_name || cmtAuthor?.username || "ai đó";
            }
          }
        }

        const allUsers = await ctx.db.query("users").collect();
        const botUsers = allUsers.filter(u => 
          u.clerkId.startsWith("bot_") && 
          !u.clerkId.includes("news") && 
          u._id !== post.userId // Không tự cmt bài mình
        );
        const randomBot = botUsers.length > 0 ? botUsers[Math.floor(Math.random() * botUsers.length)] : null;

        targets.push({
          post,
          shouldLike,
          likesToAdd: Math.floor(Math.random() * (isViral ? 4 : (isHot ? 2 : 1))) + 1,
          shouldComment,
          replyTo,
          replyToContent,
          replyToAuthor,
          botUser: randomBot
        });
      }

      if (targets.length >= 4) break; 
    }
    return targets;
  }
});

// ==========================================
// 2. LƯU TƯƠNG TÁC (DỮ LIỆU THẬT 100%)
// ==========================================
export const applyEngagement = internalMutation({
  args: {
    postId: v.id("messages"),
    likesToAdd: v.number(),
    commentData: v.optional(v.object({
      userId: v.id("users"),
      content: v.string(),
      threadId: v.id("messages"), // ID bài gốc
      parentId: v.id("messages"), // ID của comment nó đang reply (nếu có)
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
      
      // Nếu reply một comment, tăng commentCount của cái comment đó lên luôn
      if (args.commentData.parentId !== args.commentData.threadId) {
        const parentCmt = await ctx.db.get(args.commentData.parentId);
        if (parentCmt) {
          await ctx.db.patch(parentCmt._id, { commentCount: (parentCmt.commentCount || 0) + 1 });
        }
      }
    }
  }
});

// ==========================================
// 3. AI VIẾT CMT DẠO (CẤM NHẮC KẸT XE)
// ==========================================
export const runAutoEngagement = internalAction({
  args: {},
  handler: async (ctx): Promise<string> => {
    if (Math.random() < 0.20) {
      return "SYS_SKIP: Bot lướt qua nhưng lười cmt.";
    }

    const targets: any = await ctx.runQuery((internal as any).engagement_bot.getEngagementTargets);
    if (!targets || targets.length === 0) return "SYS_INFO: Không có bài cần tương tác.";

    const apiKey = process.env.GEMINI_API_KEY;
    const genAI = new GoogleGenerativeAI(apiKey!);
    const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite-preview" });

    const currentHour = (new Date().getUTCHours() + 7) % 24;
    let timeContext = "";
    if (currentHour >= 5 && currentHour < 11) timeContext = "Buổi sáng.";
    else if (currentHour >= 11 && currentHour < 14) timeContext = "Buổi trưa.";
    else if (currentHour >= 14 && currentHour < 18) timeContext = "Buổi chiều.";
    else if (currentHour >= 18 && currentHour < 23) timeContext = "Buổi tối.";
    else timeContext = "Đêm khuya.";

    for (const target of targets) {
      let finalComment = undefined;

      if (target.shouldComment && target.botUser) {
        
        let prompt = `Bạn đang lướt mạng xã hội trường VAA. Thời gian: ${timeContext}\n`;
        
        if (target.replyToContent) {
          // KỊCH BẢN 1: BÌNH LUẬN VÀO BÌNH LUẬN CỦA ĐỨA KHÁC (COMBAT / HÙA THEO)
          prompt += `Trong bài viết: "${target.post.content}".\n`;
          prompt += `Tên ${target.replyToAuthor} vừa bình luận: "${target.replyToContent}".\n`;
          prompt += `Nhiệm vụ: Viết 1 câu cộc lốc để TRẢ LỜI (REPLY) lại bình luận của ${target.replyToAuthor}. Có thể chửi xéo, đồng tình, hoặc cười cợt.`;
        } else {
          // KỊCH BẢN 2: BÌNH LUẬN THẲNG VÀO BÀI GỐC
          prompt += `Nhiệm vụ: Viết bình luận dạo cho bài viết này: "${target.post.content}".\n`;
          prompt += `Cách xử lý: Tùy bài mà thả "ib", than vãn cùng, cãi lại, hoặc thả 1-2 chữ chê bai.`;
        }

        prompt += `
          QUY TẮC BẮT BUỘC (VI PHẠM LÀ THẤT BẠI):
          1. TUYỆT ĐỐI KHÔNG xưng tên, không chào hỏi.
          2. TUYỆT ĐỐI KHÔNG nhắc đến "kẹt xe", "đói bụng", "buồn ngủ" trừ khi bài viết gốc đang nói về nó.
          3. Cực kỳ ngắn. Đa số chỉ 1-5 chữ (VD: ừ, ngon, khùng, ib đi, ảo vãi, hóng, =))), xin in4).
          4. Dùng teencode (vcl, khum, sml, tr, vãi, ủa, cx). Sai chính tả nhẹ. KHÔNG dùng ngoặc kép hay in đậm.
          
          Chỉ trả về nội dung bình luận, không nói thêm:
        `;

        try {
          const response = await model.generateContent(prompt);
          finalComment = response.response.text().trim();
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

    return `SYS_SUCCESS | Đã thả tương tác (like/cmt/reply) cho ${targets.length} bài.`;
  }
});