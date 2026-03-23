// convex/ai_bot.ts
import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { GoogleGenerativeAI } from "@google/generative-ai";

// ============================================================================
// [PHẦN 1] ĐỊNH NGHĨA KIỂU DỮ LIỆU (TYPES & INTERFACES) CHO BÁO CÁO HOÀNH TRÁNG
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
// [PHẦN 3] MODULE LƯU TRỮ VÀ SINH USER ẢO VÀO DATABASE
// ============================================================================
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

    // Tự động sinh User Ảo nếu chưa có
    if (!authorId) {
      const clerkId = `bot_${Date.now()}_${Math.floor(Math.random() * 999999)}`;
      const safeUsername = "vaa_" + Math.random().toString(36).substring(2, 10);
      
      authorId = await ctx.db.insert("users", {
        clerkId: clerkId,
        email: `${safeUsername}@vaa.edu.vn`,
        first_name: args.botName,
        username: safeUsername,
        bio: args.botMajor, 
        followersCount: Math.floor(Math.random() * 300), 
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
    
    // Giả lập thói quen sinh hoạt: Giờ ngủ (2h - 5h sáng) bot ít hoạt động
    if (currentHour >= 2 && currentHour <= 5) {
        if (Math.random() < 0.8) return "SYS_SKIP: Nửa đêm, bot đi ngủ.";
    } else {
        // Giờ bình thường, thỉnh thoảng lười
        if (Math.random() < 0.15) return "SYS_SKIP: Bot đang bận học trên lớp.";
    }

    // Thời gian trễ ngẫu nhiên từ 15 phút đến 6 tiếng
    const delayMs = Math.floor(Math.random() * (21600000 - 900000) + 900000);
    await ctx.scheduler.runAfter(delayMs, internal.ai_bot.generateRoleplayPost);
    return `SYS_QUEUED: Lên lịch bài đăng tiếp theo sau ${Math.round(delayMs / 60000)} phút.`;
  }
});

// ============================================================================
// [PHẦN 5] BỘ NÃO AI TRUNG TÂM - XỬ LÝ ĐA LUỒNG & TẠO KỊCH BẢN CHI TIẾT
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
      generationConfig: { responseMimeType: "application/json", temperature: 0.95 } // Sáng tạo tối đa
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
    // 5.2. BÁCH KHOA TOÀN THƯ VAA (DỮ LIỆU ĐỘC QUYỀN VÀ CỰC KỲ CHI TIẾT)
    // ------------------------------------------------------------------------
    const knowledgeBase: VaaKnowledgeBase = {
        departments: {
            "công-nghệ-thông-tin": "Khoa CNTT: Tòa G lầu 5, CS2. Môn học ám ảnh: C++, CTDL&GT, Đồ án chuyên ngành. Sinh viên hay code thâu đêm, ôm laptop ngồi CircleK.",
            "khai-thác-hàng-không": "Khoa KTHK: D13, CS1. Đặc sản: Tiếng Anh hàng không ICAO khoai vô cùng. Đào tạo ATC (Không lưu). Ngành ngầu nhưng áp lực cao.",
            "quản-trị-kinh-doanh": "Khoa QTKD: G206, CS2. Đặc sản: Đông sinh viên nhất, trùm làm slide Canva, thuyết trình liên tục, chạy sự kiện quanh năm.",
            "ngoại-ngữ": "Khoa Ngoại ngữ: G112, CS2. Đặc sản: Chạy deadline dịch thuật, thi Speaking liên tọi. Sinh viên nổi tiếng ăn mặc có gu, sang chảnh.",
            "cơ-bản": "Khoa Cơ bản: Quản lý môn đại cương. 'Trùm cuối' của sinh viên năm 1,2: Triết Mác-Lênin, Tư tưởng HCM, Vật lý, Thể dục (Chạy bền rớt như rạ).",
            "kinh-tế-hàng-không": "Khoa Kinh tế HK: Logistics, Chuỗi cung ứng. Hay phải làm báo cáo, đi thực tế doanh nghiệp.",
            "điện-điện-tử": "Khoa Điện - Điện tử: G405, CS2. Mùi nhựa thông, mạch in. Sinh viên nam áp đảo, hay chế tạo robot, thi đua kỹ thuật."
        },
        locations: {
            "cs1": "Cơ sở 1 (104 Nguyễn Văn Trỗi, Phú Nhuận): Trụ sở chính, nơi có phòng Đào tạo (thầy Lưu), sảnh lớn hay tổ chức sự kiện Đoàn Hội, hội trại.",
            "cs2": "Cơ sở 2 (18A/1 Cộng Hòa, Tân Bình): Nơi học chính. Nổi tiếng với tòa G cao chót vót, thang máy kẹt cứng lúc đổi ca, lết bộ lầu 5 lầu 6 là chuyện thường ở huyện. Bãi xe hầm chật, hay phải gửi ngoài giá 10k.",
            "thư-viện": "Thư viện số VAA: tailieuso.vaa.edu.vn, nơi tải giáo trình, nhưng nhiều khi đăng nhập bị lỗi."
        },
        foodAndLife: {
            "ăn-uống": "Quanh CS2 hẻm 18A: Cơm tấm bãi rác (ăn ngon nhưng tên lạ), hủ tiếu Nam Vang, xiên bẩn. Cứu tinh chạy deadline: Circle K, FamilyMart, Highlands Cộng Hòa. Quanh CS1: Bún bò, bánh tráng trộn Nguyễn Văn Trỗi.",
            "kẹt-xe": "Đặc sản kẹt xe: Vòng xoay Lăng Cha Cả, đường Cộng Hòa giờ tan tầm. Đi học mà như đi thỉnh kinh."
        },
        clubsAndEvents: {
            "clb": "CLB Văn nghệ (VAM), CLB Truyền thông (VAC), Đội CTXH, Hội Sinh viên. Rất năng nổ hoạt động, hay sinh hoạt tối ở sảnh.",
            "sự-kiện": "Chào tân sinh viên, Hội xuân VAA, Nét đẹp Hàng không. Đi lấy điểm rèn luyện là chính."
        },
        loreAndJokes: [
            "Đăng ký tín chỉ VAA: Cuộc chiến sinh tồn, web sập xoay vòng vòng, F5 gãy tay mới vào được.",
            "Phòng Đào tạo (A303): Nơi giải quyết mọi nỗi lo lắng nhưng lúc nào cũng đông sinh viên đứng chờ.",
            "Môn Thể dục: Môn phụ nhưng rớt nhiều hơn môn chính, nhất là chạy bền và võ thuật."
        ]
    };

    const cName = target.channelName.toLowerCase();
    let specificContext = "";
    
    // Thuật toán quét và trích xuất thông tin phù hợp từ thư viện
    for (const [key, val] of Object.entries(knowledgeBase.departments)) {
        if (cName.includes(key)) specificContext += `\n- Ngữ cảnh khoa: ${val}`;
    }
    for (const [key, val] of Object.entries(knowledgeBase.locations)) {
        if (cName.includes(key)) specificContext += `\n- Địa điểm liên quan: ${val}`;
    }
    
    // Bơm kiến thức đời sống ngẫu nhiên nếu thiếu ngữ cảnh
    if (!specificContext) {
        specificContext += `\n- Đời sống VAA: ${knowledgeBase.foodAndLife["ăn-uống"]}`;
        specificContext += `\n- Đặc sản VAA: ${knowledgeBase.loreAndJokes[Math.floor(Math.random() * knowledgeBase.loreAndJokes.length)]}`;
    }

    // ------------------------------------------------------------------------
    // 5.3. HỆ THỐNG PERSONA (TÍNH CÁCH AI)
    // ------------------------------------------------------------------------
    const personas: BotPersona[] = [
        { type: "Chiến thần chạy deadline", tone: "Than thở, mệt mỏi, vội vã", vocabulary: "deadline, trầm cảm, cứu, còng lưng, gánh team", behavior: "Hay đăng bài đêm khuya, tìm đồng đội, chê bai bọn không làm bài." },
        { type: "Thương gia Tân Bình", tone: "Mời chào, thân thiện, sòng phẳng", vocabulary: "pass, slot, nhượng, inb, giá hssv", behavior: "Chuyên đăng bán đồ cũ, nhượng trọ, pass vé sự kiện." },
        { type: "Học bá (Con nhà người ta)", tone: "Hỏi hang nghiêm túc, tập trung học hành", vocabulary: "tín chỉ, thực tập, đề cương, GPA, tài liệu", behavior: "Chỉ quan tâm học, hỏi giấy tờ thủ tục, xin review giáo viên." },
        { type: "Gen Z mỏ hỗn", tone: "Hài hước, châm biếm, toxic nhẹ", vocabulary: "xu cà na, chê, khóc thét, cảm lạnh", behavior: "Thích cà khịa việc kẹt thang máy, web tín chỉ sập, trường kẹt xe." }
    ];
    const currentPersona = personas[Math.floor(Math.random() * personas.length)];

    // ------------------------------------------------------------------------
    // 5.4. KHO CHỦ ĐỀ CHUYÊN BIỆT (PHÂN LOẠI THEO KÊNH)
    // ------------------------------------------------------------------------
    let channelRules = `Kênh hiện tại: #${target.channelName}. `;
    let availableTopics: string[] = [];

    if (cName === "confession") {
      channelRules += `LOẠI KÊNH: Ẩn danh, bóc phốt, kể lể tình cảm, xả stress.`;
      availableTopics = [
        "Kể khổ chuyện lỡ cưa cẩm bạn cùng khóa giờ chia tay đi học chạm mặt ngượng ngùng.",
        "Bóc phốt ý thức chen lấn thang máy ở CS2, xếp hàng mua đồ ăn căntin.",
        "Trầm cảm vì áp lực đồng trang lứa khi thấy bạn bè đi thực tập sân bay xịn.",
        "Tỏ tình ẩn danh một bạn nữ/nam hay ngồi học ở CircleK Cộng Hòa.",
        "Thất vọng tột cùng vì làm bài tập nhóm môn chuyên ngành mà gánh hết team.",
        "Chê trách mấy bạn hút thuốc lá trong nhà vệ sinh CS1 làm hôi rình."
      ];
    } 
    else if (cName === "đồ-thất-lạc" || cName === "tìm-đồ") {
      channelRules += `LOẠI KÊNH: Tìm đồ mất, thông báo nhặt được của rơi.`;
      availableTopics = [
        "Tìm bóp tiền/thẻ sinh viên rớt ở bãi giữ xe hầm CS2 hoặc nhà vệ sinh.",
        "Nhặt được chìa khóa xe máy/móc khóa ở phòng học tòa G lầu 5, đã nộp CTSV.",
        "Để quên áo khoác/bình nước giữ nhiệt ở hội trường CS1, ai thấy cho xin lại.",
        "Tìm tai nghe Airpods đánh rơi ở quán cafe hẻm 18A Cộng Hòa trưa nay."
      ];
    } 
    else if (["mua-bán", "phòng-trọ", "việc-làm"].includes(cName)) {
      channelRules += `LOẠI KÊNH: Rao vặt. BẮT BUỘC có SĐT liên hệ giả (09x, 03x).`;
      availableTopics = [
        "Pass lại 2 bộ đồng phục thể dục VAA size L, mới mặc 1 kỳ giá hạt dẻ.",
        "Pass sách giáo trình Mác-Lênin, Xác suất thống kê, Vật lý giá rẻ như cho.",
        "Tìm bạn nữ/nam ở ghép phòng trọ đường Hoàng Hoa Thám, tiện đi bộ ra CS2.",
        "Nhượng lại phòng trọ full nội thất khu vực Phú Nhuận gần CS1 cho ai cần.",
        "Tuyển nhân viên part-time quán cafe gần trường, xoay ca linh động theo lịch học."
      ];
    } 
    else if (cName.includes("tài-liệu") || cName.includes("học-tập")) {
      channelRules += `LOẠI KÊNH: Xin tài liệu, hỏi kinh nghiệm học tập. ĐƯỢC PHÉP NHẮC TÊN GIẢNG VIÊN VÀ MÔN HỌC.`;
      availableTopics = [
        "Xin file đề cương, ngân hàng câu hỏi ôn thi giữa kỳ môn chuyên ngành.",
        "Hỏi thăm phong cách ra đề, độ khó khi chấm điểm của giảng viên trong khoa.",
        "Tuyển thành viên làm tiểu luận/đồ án nhóm, cam kết chạy deadline, không tàng hình.",
        "Hỏi thủ tục nộp chứng chỉ tiếng Anh (TOEIC), tin học đầu ra chuẩn VAA.",
        "Xin kinh nghiệm để qua môn Thể dục (Chạy bền/Võ) mà không bị thở oxy."
      ];
    }
    else {
      // Các kênh tổng hợp (K1, K2, Đại sảnh...)
      channelRules += `LOẠI KÊNH: Thảo luận tự do sinh viên VAA.`;
      availableTopics = [
        "Pass slot tham gia hội trại/sự kiện Đoàn Hội lấy điểm rèn luyện do bận đột xuất.",
        "Hỏi về quy định đăng ký học vượt, cải thiện điểm tín chỉ.",
        "Khóc thét vì lịch học xếp dở: sáng CS1 Nguyễn Văn Trỗi, chiều lết sang CS2 Cộng Hòa.",
        "Than thở web đăng ký tín chỉ lag xoay đều, F5 nát chuột không vào được.",
        "Rủ rê lập team đi ăn bún đậu mắm tôm, xiên bẩn gần trường xả stress sau thi.",
        "Than mệt mỏi rã rời sau khi lết bộ lên lầu 5 tòa G CS2 do thang máy quá tải.",
        "Review một quán cafe chạy deadline wifi mạnh, yên tĩnh quanh khu Tân Bình."
      ];
    }

    const pickedTopic = availableTopics[Math.floor(Math.random() * availableTopics.length)];
    const isNewUser = !target.botUser;
    
    // ------------------------------------------------------------------------
    // 5.5. PROMPT KẾT HỢP ĐA YẾU TỐ CHO GEMINI
    // ------------------------------------------------------------------------
    const prompt = `
      Bạn là sinh viên Học viện Hàng Không Việt Nam (VAA).
      ${isNewUser ? "Hãy TỰ NGHĨ RA một cái tên Facebook GenZ thật tự nhiên (vd: Diễm Phương, Tuấn Kiệt, Thảo Nhi...) và tiểu sử sinh viên gọn gàng." : `Tên bạn là "${target.botUser.first_name}", tiểu sử: "${target.botUser.bio}".`}
      
      NGỮ CẢNH HỆ THỐNG:
      ${channelRules}
      ${specificContext}
      
      THIẾT LẬP NHÂN VẬT & TÂM TRẠNG NÀY:
      - Tính cách: ${currentPersona.type}
      - Giọng điệu: ${currentPersona.tone}
      - Từ vựng hay dùng: ${currentPersona.vocabulary}
      - ${timeContext}
      
      NHIỆM VỤ CHÍNH: Viết MỘT status Facebook sinh viên về chủ đề:
      => [ ${pickedTopic} ]
      
      ĐIỀU KHOẢN RÀNG BUỘC (QUAN TRỌNG NHẤT):
      1. KIỂM SOÁT TÊN RIÊNG CỰC NGHIÊM: 
         - CHỈ ĐƯỢC PHÉP dùng tên giảng viên/thầy cô/phòng ban nếu chủ đề rơi vào "Học tập", "Review", "Xin tài liệu".
         - NẾU chủ đề là Mua bán, Pass đồ, Pass trọ, Pass slot sự kiện, Rớt đồ, Tìm đồ: TUYỆT ĐỐI CẤM bịa tên giảng viên hay Phòng Đào Tạo vào bài. Chỉ tập trung vào giao dịch của sinh viên.
      2. NGÔN NGỮ MẠNG XÃ HỘI THỰC TẾ: 
         - Cộc lốc, ngắn gọn, đi thẳng vấn đề. Không chào hỏi ("Chào mọi người", "Hello các bạn").
         - Viết tắt, teencode nhẹ (vd: dc, ko, hong, rùi, chời, mng, pass, slot).
         - Không dùng hashtag (#) hay ngoặc kép (""). Không viết hoa đầu câu chuẩn mực.

      TRẢ VỀ DUY NHẤT MỘT KHỐI JSON HỢP LỆ (KHÔNG KÈM TEXT HAY MARKDOWN):
      {
        ${isNewUser ? '"name": "Tên tự nghĩ",\n"bio": "Bio ngắn",\n' : ''}"content": "Nội dung status tự nhiên nhất"
      }
    `;

    try {
      const response = await model.generateContent(prompt);
      const rawText = response.response.text().trim();
      
      // Xử lý chuỗi JSON an toàn, đề phòng AI sinh ra định dạng markdown
      const cleanJsonStr = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJsonStr);

      const botName = isNewUser ? (parsed.name || "Kẻ Ẩn Danh") : target.botUser.first_name;
      const botMajor = isNewUser ? (parsed.bio || "") : target.botUser.bio;
      let content = parsed.content || rawText;
      content = content.replace(/\*\*/g, "").replace(/#/g, ""); 

      // Gọi mutation lưu tin nhắn vào db
      await ctx.runMutation((internal as any).ai_bot.saveAiPost, {
        userId: target.botUser?._id, 
        botName, botMajor, content,
        channelId: target.channelId, universityId: target.uniId, channelName: target.channelName
      });

      return `SYS_SUCCESS | Kịch bản [${currentPersona.type}] | ${botName} đăng: "${pickedTopic.substring(0, 30)}..."`;
    } catch (error: any) {
      console.error("Lỗi tạo bài đăng AI:", error);
      return `SYS_ERR: ${error.message}`;
    }
  }
});