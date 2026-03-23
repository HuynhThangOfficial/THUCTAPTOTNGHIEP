// convex/ai_bot.ts
import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { GoogleGenerativeAI } from "@google/generative-ai";

// ==========================================
// 1. LẤY KÊNH & QUYẾT ĐỊNH VẬN MỆNH CỦA BOT
// ==========================================
export const getVAAContext = internalQuery({
  args: {}, 
  handler: async (ctx) => {
    const vaa = await ctx.db.query("universities").filter(q => q.eq(q.field("slug"), "vaa")).first();
    if (!vaa) return null;

    const channels = await ctx.db.query("channels")
      .withIndex("by_university", q => q.eq("universityId", vaa._id))
      .filter(q => q.and(
         q.eq(q.field("type"), "channel"),
         q.neq(q.field("name"), "đại-sảnh") 
      ))
      .collect();

    if (channels.length === 0) return null;
    const randomChannel = channels[Math.floor(Math.random() * channels.length)];

    const allUsers = await ctx.db.query("users").collect();
    const botUsers = allUsers.filter(u => u.clerkId.startsWith("bot_") && !u.clerkId.includes("news"));

    let randomBot = null;
    let reuseRate = 0.15; // 85% ưu tiên đẻ nick mới

    if (botUsers.length > 0 && Math.random() < reuseRate) {
      const weightedBots = [];
      for (const b of botUsers) {
        const luckScore = b._id.charCodeAt(b._id.length - 1) % 10;
        let weight = 1; 
        if (luckScore < 2) weight = 8; // Spammer: Đăng nhiều
        if (luckScore >= 8) weight = 0; // Ghost: Im luôn

        for (let i = 0; i < weight; i++) {
          weightedBots.push(b);
        }
      }
      if (weightedBots.length > 0) {
        randomBot = weightedBots[Math.floor(Math.random() * weightedBots.length)];
      }
    }

    return { channelId: randomChannel._id, channelName: randomChannel.name, uniId: vaa._id, botUser: randomBot };
  }
});

// ==========================================
// 2. LƯU BÀI ĐĂNG (KHÔNG AVATAR MẶC ĐỊNH)
// ==========================================
export const saveAiPost = internalMutation({
  args: { 
    userId: v.optional(v.id("users")), 
    botName: v.string(), 
    botMajor: v.string(), 
    content: v.string(), 
    channelId: v.id("channels"), 
    universityId: v.id("universities"),
    channelName: v.string()
  },
  handler: async (ctx, args) => {
    let authorId = args.userId;

    if (!authorId) {
      const clerkId = `bot_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      const safeUsername = "user_" + Math.random().toString(36).substring(2, 8);
      
      authorId = await ctx.db.insert("users", {
        clerkId: clerkId,
        email: `${safeUsername}@vaa.edu.vn`,
        first_name: args.botName,
        username: safeUsername,
        bio: args.botMajor, 
        followersCount: 0, 
      });
    }

    const isAnon = args.channelName === "confession";

    await ctx.db.insert("messages", {
      userId: authorId, 
      channelId: args.channelId,
      universityId: args.universityId,
      content: args.content,
      likeCount: 0,    
      commentCount: 0, 
      retweetCount: 0,
      allowComments: true,
      isAnonymous: isAnon, 
    });
  }
});

// ==========================================
// 3. AI TỰ ĐẺ RA NHÂN CÁCH BẰNG JSON
// ==========================================
export const generateRoleplayPost = internalAction({
  args: {}, 
  handler: async (ctx): Promise<string> => { 
    if (Math.random() < 0.25) {
      return "SYS_SKIP: Bot đang ngủ hoặc lười.";
    }

    const target: any = await ctx.runQuery((internal as any).ai_bot.getVAAContext);
    if (!target) return "SYS_ERR: Không tìm thấy kênh!";

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("SYS_ERR: Thiếu GEMINI_API_KEY");

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
      model: "gemini-3.1-flash-lite-preview",
      generationConfig: { responseMimeType: "application/json" }
    });

    const currentHour = (new Date().getUTCHours() + 7) % 24;
    let timeContext = `Bây giờ là ${currentHour}h. `;
    if (currentHour >= 5 && currentHour < 11) timeContext += "Sáng: kẹt xe, buồn ngủ, đói.";
    else if (currentHour >= 11 && currentHour < 14) timeContext += "Trưa: nắng gắt, mệt mỏi, tìm đồ ăn.";
    else if (currentHour >= 14 && currentHour < 18) timeContext += "Chiều: chán nản, đuối sức, rủ rê đi chơi.";
    else if (currentHour >= 18 && currentHour < 23) timeContext += "Tối: chơi game, lướt top top, deadline sml.";
    else timeContext += "Khuya: overthinking, deep, chửi thề, đói đêm, mất ngủ.";

    const cName = target.channelName.toLowerCase();
    
    // 👇 FIX: ÉP BUỘC AI PHẢI BIẾT ĐANG Ở KÊNH NÀO 👇
    let channelContext = `Bạn đang đăng bài vào kênh: #${target.channelName}. `;

    if (cName === "confession") {
      channelContext += `Nhiệm vụ: Viết Confession ẨN DANH VAA. Bóc phốt, cắm sừng, suy tình. Cực kỳ lầy lội hoặc toxic.`;
    } else if (cName === "đồ-thất-lạc" || cName === "tìm-đồ") {
      channelContext += `Nhiệm vụ: Tìm đồ hoặc nhặt được đồ (thẻ SV, chìa khóa).`;
    } else if (["mua-bán", "phòng-trọ", "việc-làm"].includes(cName)) {
      channelContext += `Nhiệm vụ: Đăng tin mua bán, nhượng phòng hoặc tìm việc. BẮT BUỘC chèn 1 số điện thoại giả (09xxx), email, Zalo hoặc địa chỉ phòng trọ vào cuối bài.`;
    } else if (cName.includes("tài-liệu")) {
      channelContext += `Nhiệm vụ: Xin đề cương, pass giáo trình cũ, hoặc hỏi mượn tài liệu học.`;
    } else if (cName.includes("hỏi-đáp")) {
      channelContext += `Nhiệm vụ: Hỏi thủ tục hành chính trường VAA, đăng ký tín chỉ, hoặc hỏi rớt môn.`;
    } else if (cName.includes("sự-kiện") || cName.includes("tổng-hợp")) {
      channelContext += `Nhiệm vụ: Rủ đi hội thao sân trường, sự kiện âm nhạc, hoặc chê sự kiện chán.`;
    } else if (cName.includes("k1") || cName.includes("k2")) {
      channelContext += `Nhiệm vụ: Giao lưu nội bộ khóa ${target.channelName.toUpperCase()}, hỏi lịch học, than vãn môn học chung của khóa mình.`;
    } else if (cName.includes("khoa")) {
      channelContext += `Nhiệm vụ: Thảo luận chuyên ngành ${target.channelName.replace(/-/g, " ")}, than vãn đồ án, tiểu luận chuyên ngành.`;
    } else if (cName.includes("clb")) {
      channelContext += `Nhiệm vụ: Rủ rê sinh hoạt câu lạc bộ, than vãn chạy sự kiện cho CLB.`;
    } else {
      channelContext += `Nhiệm vụ: Viết một status xàm xí, than thở bốc đồng phù hợp với tính chất của kênh này.`;
    }

    const isNewUser = !target.botUser;
    
    const prompt = `
      Bạn là sinh viên Học viện Hàng Không (VAA).
      ${isNewUser ? "Hãy TỰ NGHĨ RA một cái tên (Tên thật viết thiếu dấu, genz suy tình, bựa...) và tiểu sử cực ngắn." : `Tên bạn là "${target.botUser.first_name}", tiểu sử: "${target.botUser.bio}".`}
      
      Chủ đề: ${channelContext}
      Thời gian: ${timeContext}
      
      Văn phong: Gen Z, teencode, viết tắt, không dùng hashtag, không dùng ngoặc kép, sai chính tả nhẹ. ĐI THẲNG VÀO VẤN ĐỀ, KHÔNG CHÀO HỎI. Cực kỳ tự nhiên giống người thật lướt Facebook.

      TRẢ VỀ ĐÚNG ĐỊNH DẠNG JSON DUY NHẤT NHƯ SAU:
      {
        ${isNewUser ? '"name": "Tên bạn tự nghĩ",\n"bio": "Tiểu sử dưới 5 từ",\n' : ''}"content": "Nội dung bài viết cực ngắn và chất"
      }
    `;

    try {
      const response = await model.generateContent(prompt);
      const rawText = response.response.text().trim();
      
      const parsed = JSON.parse(rawText);

      const botName = isNewUser ? (parsed.name || "Kẻ Ẩn Danh") : target.botUser.first_name;
      const botMajor = isNewUser ? (parsed.bio || "") : target.botUser.bio;
      let content = parsed.content || rawText;

      content = content.replace(/\*\*/g, "").replace(/#/g, "");

      await ctx.runMutation((internal as any).ai_bot.saveAiPost, {
        userId: target.botUser?._id, 
        botName,
        botMajor,
        content,
        channelId: target.channelId,
        universityId: target.uniId,
        channelName: target.channelName
      });

      return `SYS_SUCCESS | ${botName} đã đăng bài chuẩn xác vào #${target.channelName}`;
    } catch (error: any) {
      console.error("Lỗi AI hoặc JSON:", error);
      return `SYS_ERR: ${error.message}`;
    }
  }
});