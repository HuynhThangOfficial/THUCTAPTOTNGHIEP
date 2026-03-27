// convex/engagement_bot.ts
import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const getEngagementTargets = internalQuery({
  args: {},
  handler: async (ctx) => {
    const recentPostsRaw = await ctx.db.query("messages")
      .filter(q => q.eq(q.field("threadId"), undefined))
      .order("desc")
      .take(40);

    if (recentPostsRaw.length === 0) return null;

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
        let replyTo = undefined;
        let replyToContent = undefined;
        let replyToAuthor = undefined;
        let replyToUsername = undefined; 

        // 60% CƠ HỘI BAY VÀO REPLY COMMENT CỦA ĐỨA KHÁC
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
              replyToUsername = cmtAuthor?.username; 
            }
          }
        }

        const allUsers = await ctx.db.query("users").collect();
        const botUsers = allUsers.filter(u => u.clerkId.startsWith("bot_") && !u.clerkId.includes("news") && u._id !== post.userId);
        const randomBot = botUsers.length > 0 ? botUsers[Math.floor(Math.random() * botUsers.length)] : null;

        targets.push({
          post,
          channelName,
          shouldLike,
          likesToAdd: Math.floor(Math.random() * (isViral ? 4 : (isHot ? 2 : 1))) + 1,
          shouldComment,
          replyTo,
          replyToContent,
          replyToAuthor,
          replyToUsername, 
          botUser: randomBot
        });
      }
      if (targets.length >= 4) break; 
    }
    return targets;
  }
});

export const applyEngagement = internalMutation({
  args: {
    postId: v.id("messages"),
    likesToAdd: v.number(),
    commentData: v.optional(v.object({
      userId: v.id("users"),
      content: v.string(),
      threadId: v.id("messages"),
      parentId: v.id("messages"), // ID thực sự của bài hoặc bình luận nó đang reply
      channelId: v.optional(v.id("channels")),
      universityId: v.optional(v.id("universities")),
      serverId: v.optional(v.id("servers"))
    }))
  },
  handler: async (ctx, args) => {
    const post = await ctx.db.get(args.postId);
    if (!post) return;

    // Xử lý Like
    let actualAddedLikes = 0;
    if (args.likesToAdd > 0) {
      const allUsers = await ctx.db.query("users").collect();
      const botUsers = allUsers.filter(u => u.clerkId.startsWith("bot_"));
      const availableBots = [];
      for (const bot of botUsers) {
        const hasLiked = await ctx.db.query("likes").withIndex("by_user_message", q => q.eq("userId", bot._id).eq("messageId", args.postId)).unique();
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

    // Xử lý Comment/Reply
    if (args.commentData) {
      // 👇 TRẢ VỀ ĐÚNG PARENT_ID ĐỂ TẠO CẤU TRÚC LỒNG NHAU (NESTED REPLY) 👇
      const msgId = await ctx.db.insert("messages", {
        userId: args.commentData.userId,
        content: args.commentData.content,
        threadId: args.commentData.threadId, 
        parentId: args.commentData.parentId, // Bắt đúng ID của bình luận bị Reply
        channelId: args.commentData.channelId,
        universityId: args.commentData.universityId,
        serverId: args.commentData.serverId,
        likeCount: 0, commentCount: 0, retweetCount: 0, allowComments: true, isAnonymous: false 
      });
      
      // Tăng số comment của bài viết gốc
      await ctx.db.patch(args.postId, { commentCount: (post.commentCount || 0) + 1 });

      // 👇 NẾU ĐÂY LÀ REPLY CỦA MỘT COMMENT -> TĂNG COMMENT COUNT CHO CÁI COMMENT ĐÓ LUÔN 👇
      if (args.commentData.parentId !== args.commentData.threadId) {
        const parentCmt = await ctx.db.get(args.commentData.parentId);
        if (parentCmt) {
          await ctx.db.patch(args.commentData.parentId, { commentCount: (parentCmt.commentCount || 0) + 1 });
        }
      }

      // Quét @username gửi thông báo
      const mentions = args.commentData.content.match(/@([a-zA-Z0-9_.]+)/g);
      if (mentions && mentions.length > 0) {
        const usernames = mentions.map(m => m.slice(1));
        for (const un of usernames) {
          const taggedUser = await ctx.db.query("users").filter(q => q.eq(q.field("username"), un)).first();
          if (taggedUser && taggedUser._id !== args.commentData.userId) {
            await ctx.db.insert('notifications', {
              userId: taggedUser._id,
              senderId: args.commentData.userId,
              type: 'mention',
              channelId: args.commentData.channelId,
              messageId: msgId,
              isRead: false,
              content: "đã phản hồi bình luận của bạn", 
            });
          }
        }
      }
    }
  }
});

export const runAutoEngagement = internalAction({
  args: {},
  handler: async (ctx): Promise<string> => {
    if (Math.random() < 0.20) return "SYS_SKIP: Bot lướt qua nhưng lười cmt.";

    const targets: any = await ctx.runQuery((internal as any).engagement_bot.getEngagementTargets);
    if (!targets || targets.length === 0) return "SYS_INFO: Không có bài cần tương tác.";

    const apiKey = process.env.GEMINI_API_KEY;
    const genAI = new GoogleGenerativeAI(apiKey!);
    const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite-preview", generationConfig: { temperature: 1.0 } });

    for (const target of targets) {
      let finalComment = undefined;

      if (target.shouldComment && target.botUser) {
        let prompt = `Bạn đang lướt mạng xã hội. Kênh: #${target.channelName}. \n`;

        if (target.replyToContent) {
          prompt += `Trong bài: "${target.post.content}".\n`;
          prompt += `MỘT NGƯỜI VỪA BÌNH LUẬN: "${target.replyToContent}".\n`;
          prompt += `Nhiệm vụ: Viết 1 câu cộc lốc (1-10 chữ) để phản bác, hùa theo hoặc cười cợt bình luận đó.`;
        } else {
          prompt += `BÀI VIẾT: "${target.post.content}".\n`;
          prompt += `Nhiệm vụ: Viết 1 bình luận dạo (1-10 chữ) phản ứng lại bài viết này. Dùng teencode, cộc lốc. Không xưng tên.`;
        }

        try {
          const response = await model.generateContent(prompt);
          finalComment = response.response.text().trim().replace(/\*\*/g, "").replace(/#/g, "").replace(/^"|"$/g, "");
          
          if (target.replyToUsername) {
             finalComment = `@${target.replyToUsername} ${finalComment}`;
          }
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
          parentId: target.replyTo || target.post._id, // Truyền đúng ID để làm Reply
          channelId: target.post.channelId,
          universityId: target.post.universityId,
          serverId: target.post.serverId
        } : undefined
      });
    }

    return `SYS_SUCCESS | Đã thả tương tác cho ${targets.length} bài.`;
  }
});