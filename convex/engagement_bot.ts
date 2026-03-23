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

        // 👇 60% CƠ HỘI NÓ SẼ BAY VÀO REPLY COMMENT CỦA ĐỨA KHÁC 👇
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
          channelName,
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
// 3. AI VIẾT CMT DẠO VỚI DỮ LIỆU KHỦNG
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

    // 👇 SIÊU BÁCH KHOA TOÀN THƯ VAA 👇
    const VAA_MEGA_KNOWLEDGE: Record<string, string> = {
      "công-nghệ-thông-tin": `Khoa CNTT: Địa chỉ G506. Thầy: TS Nguyễn Lương Anh Tuấn, TS Tô Bá Lâm, TS Trần Nguyên Bảo. Học: CNPM, AIoT, Khoa học dữ liệu. Đặc thù: Sinh viên IT hay than thở code bug, rớt mạng, chạy deadline đồ án.`,
      "khai-thác-hàng-không": `Khoa Khai thác HK: Địa chỉ D13. Lãnh đạo: TS Phan Thanh Minh, ThS Hồ Thị Vũ Hiền, ThS Nguyễn Quý Đôn, ThS Nguyễn Thanh Hảo. Đào tạo Kiểm soát viên không lưu (ATC). Học cực áp lực, giỏi tiếng Anh.`,
      "du-lịch-và-dịch-vụ": `Khoa Du lịch & DVHK: Địa chỉ A208. Ngành: Quản trị DV Du lịch và Lữ hành, Nhà hàng Khách sạn. Đặc thù: Năng động, hay đi tour thực tế.`,
      "cơ-bản": `Khoa Cơ bản: Địa chỉ G114. Thầy cô "hung thần": NCS.ThS Nguyễn Xuân Thể (Mác-Lênin), ThS Huỳnh Quốc Thịnh (Tư tưởng HCM), ThS Lê Thị Khánh Hòa (Pháp luật), ThS Võ Minh Vương (Thể thao). Đặc thù: Rớt môn như sung rụng.`,
      "ngoại-ngữ": `Khoa Ngoại ngữ: G112, G103. Thầy cô: ThS Nguyễn Ngọc Minh Thư, TS Trần Lê Tâm Linh. Học Tiếng Anh HK, tiếng Trung, Hàn. Hay thi nói, thuyết trình.`,
      "quản-trị-kinh-doanh": `Khoa QTKD: Địa chỉ G206. Trưởng Khoa: TS Nguyễn Thị Cẩm Lệ. Đặc thù: Rất đông SV. Hay làm dự án Marketing, kế hoạch kinh doanh.`,
      "kinh-tế-hàng-không": `Khoa Kinh tế HK: Địa chỉ G301. Trưởng khoa: PGS.TS Cổ Tấn Anh Vũ. Chuyên ngành: Logistics & Quản lý chuỗi cung ứng, Thương mại quốc tế.`,
      "điện-điện-tử": `Khoa Điện - Điện tử: Địa chỉ G405. Trưởng Khoa: TS Phạm Công Thành. Học về mạch điện tử, robot, UAV.`,
      "kỹ-thuật-hàng-không": `Khoa KTHK: G01. Trưởng khoa: TS Lưu Văn Thuần, TS Nguyễn Văn Lục, ThS Võ Phi Sơn. Học cực khó, sửa máy bay, ác mộng môn Khí động lực học.`,
      "xây-dựng": `Khoa Xây dựng: Thầy Trần Đăng Khải, Bùi Nam Phương. Học thiết kế sân bay, đổ bê tông. Nam nhiều.`,
      "phòng-ban": `Phòng Đào tạo: Thầy Trần Thiện Lưu (Hay bị réo tên vì web đky môn sập). Thư viện số: tailieuso.vaa.edu.vn.`
    };

    const currentHour = (new Date().getUTCHours() + 7) % 24;
    let timeContext = "";
    if (currentHour >= 5 && currentHour < 11) timeContext = "Sáng.";
    else if (currentHour >= 11 && currentHour < 14) timeContext = "Trưa.";
    else if (currentHour >= 14 && currentHour < 18) timeContext = "Chiều.";
    else if (currentHour >= 18 && currentHour < 23) timeContext = "Tối.";
    else timeContext = "Đêm khuya.";

    for (const target of targets) {
      let finalComment = undefined;

      if (target.shouldComment && target.botUser) {
        
        let cName = target.channelName.toLowerCase();
        let specificKnowledge = "Kiến thức chung: Cơ sở học ở 18A/1 Cộng Hòa.";
        for (const [key, info] of Object.entries(VAA_MEGA_KNOWLEDGE)) {
          if (cName.includes(key)) {
            specificKnowledge = `THÔNG TIN NỘI BỘ (Hãy lồng ghép vào câu chửi/khen): ${info}`;
            break;
          }
        }

        let prompt = `Bạn đang lướt mạng xã hội trường VAA. Kênh hiện tại: #${target.channelName}. Thời gian: ${timeContext}\n`;
        prompt += `${specificKnowledge}\n\n`;

        if (target.replyToContent) {
          // KỊCH BẢN 1: BÌNH LUẬN VÀO BÌNH LUẬN CỦA ĐỨA KHÁC (COMBAT)
          prompt += `Trong bài: "${target.post.content}".\n`;
          prompt += `Tên ${target.replyToAuthor} vừa cmt: "${target.replyToContent}".\n`;
          prompt += `Nhiệm vụ: Viết 1 câu cộc lốc để REPLY lại ${target.replyToAuthor}. Có thể chửi xéo, đồng tình, cười cợt, hoặc lôi tên thầy cô/phòng ban ra để phản bác.`;
        } else {
          // KỊCH BẢN 2: BÌNH LUẬN THẲNG VÀO BÀI GỐC
          prompt += `Nhiệm vụ: Viết bình luận dạo cho bài viết này: "${target.post.content}".\n`;
          prompt += `Cách xử lý: Tùy bài mà "ib", cãi lại, hoặc thả 1 câu có nhắc đến tên Thầy cô/môn học/số phòng của khoa đó.`;
        }

        prompt += `
          QUY TẮC BẮT BUỘC (VI PHẠM LÀ THẤT BẠI):
          1. TUYỆT ĐỐI KHÔNG xưng tên, không chào hỏi.
          2. NẾU CÓ THỂ, lồng ghép tự nhiên tên Thầy/Cô (VD: thầy Thể, thầy Lưu) hoặc số phòng vào bình luận.
          3. TUYỆT ĐỐI KHÔNG nhắc "kẹt xe", "đói bụng" trừ khi bài gốc nói.
          4. Cực kỳ ngắn. Đa số chỉ 1-10 chữ (VD: rớt môn r, qua hỏi thầy Lưu kìa, phòng Gxxx nóng vãi, ảo =))).
          5. Dùng teencode (vcl, khum, sml, tr, vãi, ủa, cx). Sai chính tả nhẹ. KHÔNG dùng ngoặc kép hay in đậm.
          
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