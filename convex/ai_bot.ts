// convex/ai_bot.ts
import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { GoogleGenerativeAI } from "@google/generative-ai";

// ============================================================================
// [PHẦN 1] ĐỊNH NGHĨA KIỂU DỮ LIỆU (TYPES & INTERFACES)
// ============================================================================
interface VaaKnowledgeBase {
  departments: Record<string, string>;
  locations: Record<string, string>;
  foodAndLife: Record<string, string>;
  clubsAndEvents: Record<string, string>;
  loreAndJokes: string[];
}

interface BotPersona {
  type: string;
  tone: string;
  vocabulary: string;
  behavior: string;
}

// ============================================================================
// [PHẦN 2] LẤY NGỮ CẢNH KÊNH & KHỞI TẠO DANH TÍNH BOT (CÓ QUẢN LÝ TỈ LỆ)
// ============================================================================
export const getVAAContext = internalQuery({
  args: {}, 
  handler: async (ctx) => {
    const vaa = await ctx.db.query("universities").filter(q => q.eq(q.field("slug"), "vaa")).first();
    if (!vaa) return null;

    // Lọc các kênh hợp lệ, bỏ qua kênh hệ thống
    const channels = await ctx.db.query("channels")
      .withIndex("by_university", q => q.eq("universityId", vaa._id))
      .filter(q => q.and(
         q.eq(q.field("type"), "channel"),
         q.neq(q.field("name"), "đại-sảnh") 
      ))
      .collect();

    if (channels.length === 0) return null;
    const randomChannel = channels[Math.floor(Math.random() * channels.length)];

    // Lấy danh sách bot để tái sử dụng, tạo cảm giác cộng đồng có người thật
    const allUsers = await ctx.db.query("users").collect();
    const botUsers = allUsers.filter(u => u.clerkId.startsWith("bot_") && !u.clerkId.includes("news"));

    let randomBot = null;
    let reuseRate = 0.35; // 35% xác suất bot cũ quay lại chat tiếp

    if (botUsers.length > 0 && Math.random() < reuseRate) {
      const weightedBots = [];
      for (const b of botUsers) {
        // Thuật toán tính độ "chăm chỉ" của bot dựa trên ID
        const luckScore = b._id.charCodeAt(b._id.length - 1) % 10;
        let weight = luckScore < 3 ? 5 : (luckScore >= 8 ? 1 : 2); 
        for (let i = 0; i < weight; i++) weightedBots.push(b);
      }
      if (weightedBots.length > 0) {
        randomBot = weightedBots[Math.floor(Math.random() * weightedBots.length)];
      }
    }

    return { 
      channelId: randomChannel._id, 
      channelName: randomChannel.name, 
      uniId: vaa._id, 
      botUser: randomBot 
    };
  }
});

// ============================================================================
// [PHẦN 3] MODULE LƯU TRỮ VÀ SINH USER ẢO VÀO DATABASE (CHÂN THỰC 100%)
// ============================================================================
export const saveAiPost = internalMutation({
  args: { 
    userId: v.optional(v.id("users")), 
    botName: v.string(), 
    content: v.string(), 
    channelId: v.id("channels"), 
    universityId: v.id("universities"),
    channelName: v.string()
  },
  handler: async (ctx, args) => {
    let authorId = args.userId;

    // Tự động sinh User Ảo nếu chưa có (Tên thật, Không Follow Ảo, Không Bio)
    if (!authorId) {
      const clerkId = `bot_${Date.now()}_${Math.floor(Math.random() * 999999)}`;
      const safeUsername = "u_" + Math.random().toString(36).substring(2, 12); // Không dùng chữ vaa_ nữa
      
      authorId = await ctx.db.insert("users", {
        clerkId: clerkId,
        email: `${safeUsername}@bot.local`,
        first_name: args.botName,
        username: safeUsername,
        followersCount: 0, // Đã bỏ follow ảo
      });
    }

    const isAnon = args.channelName.toLowerCase() === "confession";

    // Insert tin nhắn vào cơ sở dữ liệu
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

// ============================================================================
// [PHẦN 4] HỆ THỐNG LẬP LỊCH THÔNG MINH (SMART QUEUE SYSTEM)
// ============================================================================
export const scheduleRoleplayPost = internalMutation({
  args: {},
  handler: async (ctx) => {
    const currentHour = (new Date().getUTCHours() + 7) % 24;
    
    if (currentHour >= 2 && currentHour <= 5) {
        if (Math.random() < 0.8) return "SYS_SKIP: Nửa đêm, bot đi ngủ.";
    } else {
        if (Math.random() < 0.15) return "SYS_SKIP: Bot đang bận học trên lớp.";
    }

    const delayMs = Math.floor(Math.random() * (21600000 - 900000) + 900000);
    await ctx.scheduler.runAfter(delayMs, internal.ai_bot.generateRoleplayPost);
    return `SYS_QUEUED: Lên lịch bài đăng tiếp theo sau ${Math.round(delayMs / 60000)} phút.`;
  }
});

// ============================================================================
// [PHẦN 5] BỘ NÃO AI TRUNG TÂM - CỞI TRÓI SÁNG TẠO VÔ CỰC
// ============================================================================
export const generateRoleplayPost = internalAction({
  args: {}, 
  handler: async (ctx): Promise<string> => { 
    const target: any = await ctx.runQuery((internal as any).ai_bot.getVAAContext);
    if (!target) return "SYS_ERR: Không tìm thấy kênh chỉ định!";

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("SYS_ERR: Missing GEMINI_API_KEY environment variable.");

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
      model: "gemini-3.1-flash-lite-preview", 
      generationConfig: { responseMimeType: "application/json", temperature: 1.0 } // Đẩy nhiệt độ max để tăng độ sáng tạo
    });

    // ------------------------------------------------------------------------
    // 5.1. PHÂN TÍCH THỜI GIAN THỰC ĐỂ TẠO CẢM XÚC
    // ------------------------------------------------------------------------
    const currentHour = (new Date().getUTCHours() + 7) % 24;
    let timeContext = `Thời gian thực tế: ${currentHour}h. `;
    
    switch (true) {
        case (currentHour >= 5 && currentHour < 8):
            timeContext += "Cảm xúc: Vội vã, sợ trễ giờ, chờ xe bus 152/104 mòn mỏi, mua vội ổ bánh mì, ngái ngủ."; break;
        case (currentHour >= 8 && currentHour < 11):
            timeContext += "Cảm xúc: Đang ráng nghe giảng, chán nản chờ ra chơi, rủ bạn xíu đi ăn."; break;
        case (currentHour >= 11 && currentHour < 13):
            timeContext += "Cảm xúc: Đói lả, chen lấn thang máy đi ăn trưa, than thở kẹt thang máy CS2."; break;
        case (currentHour >= 13 && currentHour < 17):
            timeContext += "Cảm xúc: Căng da bụng chùng da mắt, học ca chiều cực hình, ngóng giờ về."; break;
        case (currentHour >= 17 && currentHour < 20):
            timeContext += "Cảm xúc: Tan học kẹt xe ở Lăng Cha Cả, lết xác đi làm thêm, hoặc đi quẩy CLB."; break;
        case (currentHour >= 20 && currentHour < 24):
            timeContext += "Cảm xúc: Ăn tối xong, ngồi lướt mạng, chạy deadline nước rút, than thở tiểu luận."; break;
        default:
            timeContext += "Cảm xúc: Đêm khuya thanh vắng, overthinking, suy tư tình yêu, cày game hoặc code lỗi."; break;
    }

    // ------------------------------------------------------------------------
    // 5.2. BÁCH KHOA TOÀN THƯ VAA
    // ------------------------------------------------------------------------
    const knowledgeBase: VaaKnowledgeBase = {
        departments: {
            "công-nghệ-thông-tin": "Khoa CNTT: Tòa G lầu 5, CS2. Môn học ám ảnh: C++, CTDL&GT, Đồ án chuyên ngành.",
            "khai-thác-hàng-không": "Khoa KTHK: D13, CS1. Đào tạo Kiểm soát viên không lưu (ATC). Ngành ngầu nhưng áp lực cao.",
            "quản-trị-kinh-doanh": "Khoa QTKD: G206, CS2. Đặc sản: Trùm làm slide Canva, thuyết trình liên tục, chạy sự kiện quanh năm.",
            "ngoại-ngữ": "Khoa Ngoại ngữ: G112, CS2. Đặc sản: Chạy deadline dịch thuật, thi Speaking liên tọi.",
            "cơ-bản": "Khoa Cơ bản: Trùm các môn đại cương (Mác-Lênin, Vật lý, Thể dục). Chạy bền rớt như rạ.",
            "kinh-tế-hàng-không": "Khoa Kinh tế HK: Logistics, Chuỗi cung ứng. Hay đi thực tế doanh nghiệp.",
            "điện-điện-tử": "Khoa Điện - Điện tử: G405, CS2. Mùi nhựa thông, mạch in. Sinh viên nam áp đảo."
        },
        locations: {
            "cs1": "Cơ sở 1 (104 Nguyễn Văn Trỗi, Phú Nhuận): Trụ sở chính, phòng Đào tạo (thầy Lưu), sảnh lớn.",
            "cs2": "Cơ sở 2 (18A/1 Cộng Hòa, Tân Bình): Nơi học chính. Tòa G cao, thang máy kẹt cứng, hầm để xe chật."
        },
        foodAndLife: {
            "ăn-uống": "Hẻm 18A: Cơm tấm bãi rác, hủ tiếu Nam Vang, Circle K, FamilyMart. Ngã tư Nguyễn Văn Trỗi: Bún bò, bánh tráng trộn.",
            "kẹt-xe": "Đặc sản: Vòng xoay Lăng Cha Cả, đường Cộng Hòa giờ tan tầm."
        },
        clubsAndEvents: {
            "clb": "CLB Văn nghệ (VAM), CLB Truyền thông (VAC), Đội CTXH.",
            "sự-kiện": "Hội xuân VAA, Nét đẹp Hàng không. Đi lấy điểm rèn luyện là chính."
        },
        loreAndJokes: [
            "Đăng ký tín chỉ VAA: Cuộc chiến sinh tồn, web sập xoay vòng vòng.",
            "Phòng Đào tạo (A303): Nơi giải quyết mọi nỗi lo lắng nhưng đông sinh viên đứng chờ.",
            "Môn Thể dục: Rớt nhiều hơn môn chính, nhất là võ thuật."
        ]
    };

    const cName = target.channelName.toLowerCase();
    let specificContext = "";
    
    for (const [key, val] of Object.entries(knowledgeBase.departments)) {
        if (cName.includes(key)) specificContext += `\n- Ngữ cảnh khoa: ${val}`;
    }
    for (const [key, val] of Object.entries(knowledgeBase.locations)) {
        if (cName.includes(key)) specificContext += `\n- Địa điểm liên quan: ${val}`;
    }
    
    if (!specificContext) {
        specificContext += `\n- Đời sống VAA: ${knowledgeBase.foodAndLife["ăn-uống"]}`;
        specificContext += `\n- Chuyện trường lớp: ${knowledgeBase.loreAndJokes[Math.floor(Math.random() * knowledgeBase.loreAndJokes.length)]}`;
    }

    // ------------------------------------------------------------------------
    // 5.3. HỆ THỐNG PERSONA (TÍNH CÁCH AI)
    // ------------------------------------------------------------------------
    const personas: BotPersona[] = [
        { type: "Chiến thần chạy deadline", tone: "Than thở, cáu gắt, vội vã", vocabulary: "deadline, trầm cảm, cứu, còng lưng, team như cc", behavior: "Gánh team, tìm đồng đội, chê bai bọn lười." },
        { type: "Thương gia Tân Bình", tone: "Nhanh gọn, sòng phẳng", vocabulary: "pass, nhượng, inb, giá hssv, rcm", behavior: "Chuyên mua bán đồ cũ, kiếm trọ, hỏi review chỗ ăn chơi." },
        { type: "Người hướng nội (Overthinking)", tone: "Tự kỷ, suy tư, buồn chán", vocabulary: "khóc thét, xu cà na, mệt, nản, ớn", behavior: "Hay than vãn chuyện kẹt xe, kẹt thang máy, học rớt môn." },
        { type: "Gen Z mỏ hỗn", tone: "Cà khịa, châm biếm, hài hước", vocabulary: "ảo, vcl, khum, cảm lạnh, hề hước, ủa", behavior: "Thích mỉa mai web trường, đùa giỡn, cmt dạo." }
    ];
    const currentPersona = personas[Math.floor(Math.random() * personas.length)];

    // ------------------------------------------------------------------------
    // 5.4. ĐỊNH NGHĨA LOẠI KÊNH (ĐỂ AI TỰ DO SÁNG TẠO NỘI DUNG)
    // ------------------------------------------------------------------------
    let channelRules = `BẠN ĐANG CHUẨN BỊ ĐĂNG BÀI VÀO KÊNH: #${target.channelName}. \n`;

    if (cName === "confession") {
      channelRules += `=> Đây là kênh ẨN DANH (Confession). Mọi người vào đây để: Bóc phốt, cắm sừng, tỏ tình, chửi xéo, kể khổ tâm sự thầm kín. Tình huống càng drama càng tốt.`;
    } 
    else if (cName === "đồ-thất-lạc" || cName === "tìm-đồ") {
      channelRules += `=> Đây là kênh TÌM ĐỒ THẤT LẠC. Mọi người vào đây để: Đăng bài làm rớt đồ (mất ví, rớt tai nghe...) hoặc nhặt được của rơi tìm người trả.`;
    } 
    else if (["mua-bán", "phòng-trọ", "việc-làm"].includes(cName)) {
      channelRules += `=> Đây là kênh RAO VẶT/MUA BÁN. Mọi người vào đây để: Thanh lý đồ, tìm người ở ghép, kiếm trọ, hoặc tìm việc làm thêm (phục vụ, gia sư...). Cần có SĐT liên hệ ảo (09x, 03x).`;
    } 
    else if (cName.includes("tài-liệu") || cName.includes("học-tập") || cName.includes("review")) {
      channelRules += `=> Đây là kênh HỌC TẬP. Mọi người vào đây để: Xin đề cương, hỏi bài, xin review tính cách/cách chấm điểm của giảng viên, tìm nhóm làm tiểu luận. (Được phép bịa tên một môn học hoặc nhắc tên thầy cô).`;
    }
    else {
      channelRules += `=> Đây là kênh THẢO LUẬN TỰ DO. Bạn có thể nói bất cứ thứ gì trên trời dưới biển: Kẹt xe, đói bụng, rủ đi nhậu, kẹt thang máy, than thở thời khóa biểu oái oăm...`;
    }

    const isNewUser = !target.botUser;
    
    // ------------------------------------------------------------------------
    // 5.5. PROMPT SIÊU SÁNG TẠO
    // ------------------------------------------------------------------------
    const prompt = `
      Bạn là sinh viên Học viện Hàng Không Việt Nam (VAA).
      ${isNewUser ? "Hãy tự nghĩ ra một tên hiển thị NGẪU NHIÊN trên mạng xã hội cho bạn. Có thể là tên thật (Nguyễn Nam, Thảo Vy), tên lóng (Boy Tân Bình, Pé Lùn), hoặc những tên tấu hài (Sợ rớt môn, Chúa tể deadline, Mỏ Hỗn). Không được trùng lặp." : `Tên bạn là "${target.botUser.first_name}".`}
      
      NGỮ CẢNH:
      ${channelRules}
      ${specificContext}
      
      THIẾT LẬP NHÂN VẬT & THỜI GIAN:
      - Cảm xúc hiện tại: ${timeContext}
      - Tính cách: ${currentPersona.type}
      - Giọng điệu: ${currentPersona.tone}
      - Từ vựng hay dùng: ${currentPersona.vocabulary}
      
      NHIỆM VỤ QUAN TRỌNG: 
      Dựa vào TÊN KÊNH và LOẠI KÊNH ở trên, hãy TỰ DO TƯỞNG TƯỢNG VÀ SÁNG TẠO ra một nội dung bài đăng hoàn toàn mới. HÃY THOÁT KHỎI KHUÔN MẪU. Nghĩ ra một tình huống đời thường bất kỳ cực kỳ cụ thể (Ví dụ thay vì nói chung chung "kẹt thang máy", hãy nói "Vừa lết bộ lên lầu 6 tòa G thở oxy thì thầy báo nghỉ..."). 
      
      ĐIỀU KHOẢN RÀNG BUỘC (TUÂN THỦ 100%):
      1. TÍNH CHÂN THỰC: Không bao giờ nói xin chào, không dùng hashtag (#), không dùng ngoặc kép (""). Cộc lốc, ngắn gọn. Dùng teencode (vcl, khum, hong, dc, ko, zị, cx). Viết hoa viết thường lộn xộn.
      2. TÊN RIÊNG: Chỉ nhắc tên môn học hoặc tên Thầy/Cô khi nội dung là Học Tập/Xin Tài Liệu/Review. Cấm bịa tên thầy cô vào các giao dịch mua bán, pass đồ.

      TRẢ VỀ DUY NHẤT MỘT KHỐI JSON HỢP LỆ (KHÔNG KÈM TEXT HAY MARKDOWN):
      {
        ${isNewUser ? '"name": "Tên tự nghĩ",\n' : ''}"content": "Nội dung status tự nhiên nhất"
      }
    `;

    try {
      const response = await model.generateContent(prompt);
      const rawText = response.response.text().trim();
      
      const cleanJsonStr = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJsonStr);

      const botName = isNewUser ? (parsed.name || "Kẻ Ẩn Danh") : target.botUser.first_name;
      let content = parsed.content || rawText;
      content = content.replace(/\*\*/g, "").replace(/#/g, ""); 

      // Gọi mutation lưu tin nhắn vào db (Đã bỏ Argument botMajor)
      await ctx.runMutation((internal as any).ai_bot.saveAiPost, {
        userId: target.botUser?._id, 
        botName, 
        content,
        channelId: target.channelId, 
        universityId: target.uniId, 
        channelName: target.channelName
      });

      return `SYS_SUCCESS | Kịch bản [${currentPersona.type}] | ${botName} đăng: "${content.substring(0, 30)}..."`;
    } catch (error: any) {
      console.error("Lỗi tạo bài đăng AI:", error);
      return `SYS_ERR: ${error.message}`;
    }
  }
});