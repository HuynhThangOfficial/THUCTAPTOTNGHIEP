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
    let reuseRate = 0.15; 

    if (botUsers.length > 0 && Math.random() < reuseRate) {
      const weightedBots = [];
      for (const b of botUsers) {
        const luckScore = b._id.charCodeAt(b._id.length - 1) % 10;
        let weight = 1; 
        if (luckScore < 2) weight = 8; 
        if (luckScore >= 8) weight = 0; 

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
// 3. QUEUE SYSTEM (ĐÁNH LỪA CRON)
// ==========================================
export const scheduleRoleplayPost = internalMutation({
  args: {},
  handler: async (ctx) => {
    if (Math.random() < 0.25) return "SYS_SKIP: Bot lười.";
    const delayMs = Math.floor(Math.random() * (900000 - 30000) + 30000);
    await ctx.scheduler.runAfter(delayMs, internal.ai_bot.generateRoleplayPost);
    return `SYS_QUEUED: Đợi ${Math.round(delayMs / 60000)} phút.`;
  }
});

// ==========================================
// 4. WORKER THỰC THI CHÍNH VỚI DỮ LIỆU KHỦNG
// ==========================================
export const generateRoleplayPost = internalAction({
  args: {}, 
  handler: async (ctx): Promise<string> => { 
    const target: any = await ctx.runQuery((internal as any).ai_bot.getVAAContext);
    if (!target) return "SYS_ERR: Không tìm thấy kênh!";

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("SYS_ERR: Thiếu GEMINI_API_KEY");

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
      model: "gemini-3.1-flash-lite-preview", // Dư sức nhai hết đống text này
      generationConfig: { responseMimeType: "application/json" }
    });

    const currentHour = (new Date().getUTCHours() + 7) % 24;
    let timeContext = `Bây giờ là ${currentHour}h. Bối cảnh: `;
    if (currentHour >= 5 && currentHour < 11) timeContext += "Buổi sáng.";
    else if (currentHour >= 11 && currentHour < 14) timeContext += "Buổi trưa.";
    else if (currentHour >= 14 && currentHour < 18) timeContext += "Buổi chiều.";
    else if (currentHour >= 18 && currentHour < 23) timeContext += "Buổi tối.";
    else timeContext += "Đêm khuya.";

    // 👇 SIÊU BÁCH KHOA TOÀN THƯ VAA (RAW DATA TỪ WEBSITE) 👇
    const VAA_MEGA_KNOWLEDGE: Record<string, string> = {
      "công-nghệ-thông-tin": `
        THÔNG TIN KHOA CÔNG NGHỆ THÔNG TIN:
        - Thành lập: 01/07/2021 (từ Khoa Cơ bản và Điện - Điện tử).
        - Địa chỉ: G506, 18A/1 Cộng Hòa.
        - Nhân sự: 5 Tiến sỹ, 2 NCS Tiến sỹ, hơn 18 Thạc sỹ.
        - 4 bộ môn: Công nghệ phần mềm (BM CNPM - TS. Nguyễn Lương Anh Tuấn làm Trưởng BM kiêm Phụ trách Khoa), Trí tuệ nhân tạo vạn vật AIoT (TS. Tô Bá Lâm), Khoa học dữ liệu (TS. Trần Nguyên Bảo), Toán.
        - Chuyên ngành: Công nghệ phần mềm và Trí tuệ nhân tạo, Trí tuệ nhân tạo và Internet vạn vật (AIoT), Trí tuệ nhân tạo và Dữ liệu lớn (Big Data).
        - Học phần ám ảnh: Lập trình, Blockchain, Cloud Computing, Phân tích dữ liệu lớn.
      `,
      "khai-thác-hàng-không": `
        THÔNG TIN KHOA KHAI THÁC HÀNG KHÔNG:
        - Lịch sử: Tiền thân là Khoa Không lưu (2007), sáp nhập Khoa Cảng HK đổi tên vào 07/2021.
        - Địa chỉ: D13, 104 Nguyễn Văn Trỗi. ĐT: (028) 3997 0593.
        - Logo: Chữ "A" (đài kiểm soát) và "O" (radar).
        - Nhân sự: 2 TS, 2 NCS, 7 ThS, 4 KS.
        - 4 bộ môn: Kiểm soát HĐB (ThS. Hồ Thị Vũ Hiền - Phó khoa), Khai thác tổ chức HĐB (ThS. Nguyễn Quý Đôn), Dịch vụ bổ trợ điều hành bay (ThS. Nguyễn Thanh Hảo), Thông tin liên lạc, dẫn đường, giám sát (TS. Phan Thanh Minh - Trưởng Khoa).
        - Chuyên ngành: Quản lý HĐB (7840102), QL HĐB Tiếng Anh (7840102E), QL và Khai thác bay (7840102Q), Hệ thống kỹ thuật QL bay (7840102K). Đào tạo Kiểm soát viên không lưu (ATC).
      `,
      "du-lịch-và-dịch-vụ": `
        THÔNG TIN KHOA DU LỊCH VÀ DỊCH VỤ HÀNG KHÔNG:
        - Địa chỉ: A208, 104 Nguyễn Văn Trỗi. SĐT: 0911.9595.05.
        - Ngành: QUẢN TRỊ DỊCH VỤ DU LỊCH VÀ LỮ HÀNH.
        - Bộ môn/Chuyên ngành: Hướng dẫn và Điều hành CTDL, Quản trị Lữ hành, Quản trị Khách sạn Nhà hàng, Quản trị DVTM Hàng không.
        - Đặc điểm: 100% ra trường có việc làm, hay đi thực tế, chú trọng kỹ năng lãnh đạo, phục vụ khách hàng.
      `,
      "cơ-bản": `
        THÔNG TIN KHOA CƠ BẢN:
        - Thành lập: Cuối 2007. Địa chỉ: G114, 18A/1 Cộng Hòa. ĐT: 02838 110 284.
        - Nhân sự: 10 GV cơ hữu, 1 trợ giảng.
        - Ban lãnh đạo: ThS. Phan Thành Trung (Trưởng Khoa), NCS. ThS. Nguyễn Thị Hằng (Phó Khoa).
        - 6 bộ môn: 
          + Khoa học Mác - Lênin (NCS. ThS. Nguyễn Xuân Thể)
          + Tư tưởng HCM và Lịch sử ĐCSVN (ThS. Huỳnh Quốc Thịnh, NCS. ThS. Trần Thị Huyền)
          + Pháp luật (ThS. Lê Thị Khánh Hòa, Trợ giảng CH. Lê Nhật Minh Châu)
          + Thể thao tổng hợp (ThS. Võ Minh Vương, TS. Lê Thị Hoài Phương)
          + Võ thuật (ThS. Lê Hữu Toàn)
          + Quốc phòng - An ninh (ThS. Nguyễn Viên Giác).
        - Đặc điểm: Quản lý các môn đại cương cực khoai, nhiều lý thuyết, tỷ lệ rớt cao.
      `,
      "ngoại-ngữ": `
        THÔNG TIN KHOA NGOẠI NGỮ:
        - Địa chỉ: G112 và G103, 18A/1 Cộng Hòa.
        - Nhân sự: 4 TS, 3 NCS, hơn 20 ThS. Ban lãnh đạo: ThS. Nguyễn Ngọc Minh Thư (Phụ trách Khoa, BM Tiếng Anh Tổng quát).
        - 7 bộ môn: Tiếng Anh Hàng không (ThS. Nguyễn Hạnh Minh), Tiếng Anh Du lịch - Thương mại (TS. Hoàng Thị Thu Trang), Năng lực giao tiếp (TS. Trần Lê Tâm Linh), Ngữ học và Văn chương (TS. Nguyễn Thị Nguyệt Ánh), TA Tổng quát, Ngôn ngữ Hàn, Ngôn ngữ Trung.
        - Đặc điểm: Yêu cầu ngoại ngữ khắt khe, học biên phiên dịch, giao tiếp chuẩn hàng không.
      `,
      "quản-trị-kinh-doanh": `
        THÔNG TIN KHOA QUẢN TRỊ KINH DOANH (QTKD – VAA):
        - Thành lập: 2021 (Tiền thân Khoa Vận tải Hàng Không 2007-2020).
        - Địa chỉ: G206, 18A/1 Cộng Hòa.
        - Nhân sự: 41 giảng viên (14 TS, 25 ThS, 2 Cử nhân). Lãnh đạo: TS. Nguyễn Thị Cẩm Lệ (Trưởng Khoa), TS. Bùi Nhất Vương (Phó Khoa).
        - 7 bộ môn: Tài chính Kế toán, Marketing, Quản trị Điều hành, Quản trị Hàng không, An ninh Hàng không, Quản trị nguồn nhân lực, Kinh doanh.
        - Chuyên ngành: Quản trị Vận tải HK, Quản trị Cảng HK, Quản trị An ninh HK, Quản trị Kinh doanh Quốc tế, Quản trị KD tổng hợp, Quản trị nguồn nhân lực, Quản trị HK Tiếng Anh, Kinh doanh số (2025), Digital Marketing (2025).
        - Quy mô: Hơn 2452 sinh viên chính quy.
      `,
      "kinh-tế-hàng-không": `
        THÔNG TIN KHOA KINH TẾ HÀNG KHÔNG:
        - Thành lập: 2021. Địa chỉ: G301, 18A/1 Cộng Hòa.
        - Nhân sự: 5 Tiến sĩ, 5 NCS, hơn 15 Thạc sĩ.
        - Ban lãnh đạo: PGS.TS. Cổ Tấn Anh Vũ (Trưởng Khoa), TS. Nguyễn Thu Hằng (Phó Khoa).
        - 4 Chuyên ngành & Trưởng BM: Kinh tế Hàng không (ThS. Phạm Hữu Hà), Logistics & Quản lý chuỗi cung ứng (TS. Hà Minh Hiếu), Logistics & Vận tải đa phương thức (ThS. Nguyễn Quỳnh Phương), Thương mại quốc tế (ThS. Trần Thị Thu Hiền, Kinh doanh quốc tế). Thêm BM Kinh tế Quản lý (TS. Dương Quỳnh Nga).
        - Giảng viên khác: TS. Hideki Oshima, TS. Adam Woak, TS. Phùng Tuấn Thành, TS. Lê Hồ Phong Linh, ThS. Đồng Thị Thu Hoài, Phan Nguyễn Anh Quân, v.v...
      `,
      "điện-điện-tử": `
        THÔNG TIN KHOA ĐIỆN - ĐIỆN TỬ:
        - Thành lập: 1979 (Tiền thân: Điện Tử Viễn Thông Hàng Không). Địa chỉ: G405, 18A/1 Cộng Hòa.
        - Nhân sự: 16 GV (1 PGS.TS, 4 TS, 11 ThS). PGS.TS Nguyễn Hữu Khương (Chủ tịch HĐ KH&ĐT).
        - Lãnh đạo: TS. Phạm Công Thành (Trưởng Khoa).
        - 2 Ngành chính: 
          1. CNKT Điện tử Viễn thông (Điện tử Viễn thông và AI, Điện tử Ứng dụng AI và IoT).
          2. CNKT Điều khiển & Tự động hóa (UAV và Robotics, Điện tự động cảng hàng không).
        - Các Trưởng BM: TS Trần Quốc Khải (Tự động hóa CN), ThS Triệu Văn Trung (TĐH quá trình), ThS Phương Hữu Công (Đo lường ĐK), ThS Cao Thị Xuân Thùy (TB Điện tử HK), TS Lâm Minh Long (ĐTVT), ThS Nguyễn Quỳnh Anh (TB Thu phát).
      `,
      "kỹ-thuật-hàng-không": `
        THÔNG TIN KHOA KỸ THUẬT HÀNG KHÔNG (KTHK):
        - Thành lập: 01/08/2012. Địa chỉ: G01, 18A/1 Cộng Hòa. ĐT: 028 3811 3073.
        - Nhân sự: 14 GV cơ hữu (1 PGS, 6 TS, 3 ThS, 4 KS).
        - 4 Bộ môn: Khí động và Lực đẩy (TS. Nguyễn Văn Lục), Điện tử tàu bay (ThS. Võ Phi Sơn), Kết cấu và Vật liệu hàng không (TS. Lưu Văn Thuần - Phụ trách Khoa), Quản lý bảo dưỡng tàu bay (TS. Nguyễn Mạnh Hùng). GV Cao cấp: PGS.TS Phan Văn Quân.
        - Đào tạo: Định hướng VAECO, Vietjet, Bamboo, SAM. Ngành KTHK (Việt/Anh), Quản lý bảo dưỡng tàu bay, UAV.
      `,
      "xây-dựng": `
        THÔNG TIN KHOA XÂY DỰNG:
        - Thành lập: 24/03/2022. Email: kxd_hvhk@vaa.edu.vn. SĐT: (028) 38 110 284.
        - Nhân sự: 15 GV (8 PGS, TS học từ Pháp, Hàn, Nga, Bỉ).
        - 6 Bộ môn & Trưởng BM: Khảo sát và kiểm định CT (ThS. Ngô Văn Tình), Vật liệu và kết cấu (TS. Trần Đăng Khải), Thiết kế công trình (ThS. Bùi Nam Phương), Công nghệ xây dựng (TS. Trần Đình Cương), Quy hoạch và phát triển cảng HK (TS. Nguyễn Phi Long), Quản lý và khai thác công trình (TS. Mai Thị Hằng).
        - Chuyên ngành: Xây dựng & phát triển cảng HK, Quản lý & khai thác cảng HK.
      `,
      "phòng-ban": `
        THÔNG TIN CÁC PHÒNG BAN:
        - Phòng Đào tạo: TS. Trần Thiện Lưu (Trưởng phòng). Lên kế hoạch, TKB, in phôi bằng, giải quyết hủy/đăng ký tín chỉ, xét tốt nghiệp. (A303, CS1).
        - Phòng Kế hoạch - Tài chính: Đóng học phí, thu chi, tài chính.
        - Phòng Tuyển sinh và CTSV: Xét học bổng, điểm rèn luyện. SĐT CTSV: (028) 3842 2199.
      `,
      "cơ-sở": `
        - Trụ sở chính: 104 Nguyễn Văn Trỗi, Phường 8, Phú Nhuận.
        - Cơ sở 2: 18A/1 Cộng Hòa, Tân Bình. (Cơ sở học chính).
        - Cơ sở 3: 243 Nguyễn Tất Thành, Cam Ranh, Khánh Hòa.
        - Thư viện số: tailieuso.vaa.edu.vn / opac.vaa.edu.vn
      `
    };

    const cName = target.channelName.toLowerCase();
    
    // Thuật toán quét và lấy dữ liệu phù hợp với kênh
    let specificKnowledge = "";
    for (const [key, info] of Object.entries(VAA_MEGA_KNOWLEDGE)) {
      if (cName.includes(key)) {
        specificKnowledge = `THÔNG TIN THỰC TẾ CHI TIẾT VỀ KÊNH NÀY CỦA BẠN (DÙNG ĐỂ CHÉM GIÓ): \n${info}`;
        break;
      }
    }

    // Luôn nhồi kiến thức Cơ sở và Phòng ban (Phòng Đào tạo) để tụi nó có cái mà chửi
    specificKnowledge += `\nKIẾN THỨC CHUNG TRƯỜNG: \n${VAA_MEGA_KNOWLEDGE["cơ-sở"]}`;
    specificKnowledge += `\nKIẾN THỨC PHÒNG BAN: \n${VAA_MEGA_KNOWLEDGE["phòng-ban"]}`;

    let forcePhoneNumber = "";
    if (["mua-bán", "phòng-trọ", "việc-làm"].includes(cName)) {
      const prefixes = ["098", "097", "034", "035", "090", "093", "079", "091", "094", "088"];
      const randomPrefix = prefixes[Math.floor(Math.random() * prefixes.length)];
      const randomSuffix = Math.floor(1000000 + Math.random() * 9000000).toString();
      forcePhoneNumber = `BẮT BUỘC chèn SĐT liên lạc giả này ở cuối: ${randomPrefix}${randomSuffix}.`;
    }

    let channelContext = `Bạn đang đăng bài vào kênh: #${target.channelName}. `;
    if (cName === "confession") channelContext += `Viết Confession ẨN DANH VAA bóc phốt, cắm sừng, học tập, toxic.`;
    else if (cName === "đồ-thất-lạc" || cName === "tìm-đồ") channelContext += `Tìm đồ rớt ở trường (nêu rõ rớt ở phòng nào, cơ sở nào).`;
    else if (["mua-bán", "phòng-trọ", "việc-làm"].includes(cName)) channelContext += `Đăng tin mua bán/nhượng phòng quanh Tân Bình (18A/1 Cộng Hòa) hoặc Phú Nhuận. ${forcePhoneNumber}`;
    else if (cName.includes("tài-liệu")) channelContext += `Xin đề cương, xin pass môn, pass giáo trình các môn.`;
    else if (cName.includes("sự-kiện") || cName.includes("tổng-hợp")) channelContext += `Rủ đi sự kiện, hội thao Đoàn - Hội.`;
    else if (cName.includes("k1") || cName.includes("k2")) channelContext += `Thảo luận khóa ${target.channelName.toUpperCase()} (Hỏi lịch học, than vãn).`;
    else channelContext += `Viết một status tự do, sáng tạo.`;

    const randomTopics = [
      "than thở môn học quá khó", "nói xấu/khen một thầy cô cụ thể trong khoa (chọn 1 tên có trong dữ liệu)", 
      "réo tên trưởng khoa hoặc trưởng bộ môn", "đá đểu Phòng Đào tạo (thầy Lưu) vì lỗi web",
      "hỏi xin tài liệu ôn thi môn chuyên ngành", "than vãn lịch học xếp quá dở (sáng CS1, chiều CS2)",
      "stress vì đồ án", "đăng ký tín chỉ web sập", "khóc ròng vì rớt môn đại cương (Mác-Lênin, Thể dục...)"
    ];
    const pickedTopic = randomTopics[Math.floor(Math.random() * randomTopics.length)];

    const isNewUser = !target.botUser;
    
    const prompt = `
      Bạn là sinh viên Học viện Hàng Không (VAA).
      ${isNewUser ? "Hãy TỰ NGHĨ RA một cái tên Gen Z (vd: Đạt Giao Cơm, Tuấn Tú, Bé Dâu...) và tiểu sử cực ngắn." : `Tên bạn là "${target.botUser.first_name}", tiểu sử: "${target.botUser.bio}".`}
      
      Kênh hiện tại: ${channelContext}
      
      ===================================
      DỮ LIỆU ĐỘC QUYỀN CỦA VAA (RẤT QUAN TRỌNG):
      ${specificKnowledge} 
      ===================================
      
      Chủ đề gợi ý: ${pickedTopic}
      Thời gian: ${timeContext}
      
      QUY TẮC BẮT BUỘC (TUYỆT ĐỐI TUÂN THỦ):
      1. SỬ DỤNG CHÍNH XÁC dữ liệu ở trên. Lôi ít nhất 1 Tên Giảng Viên, Tên Phòng Ban, Số Phòng, hoặc Tên Môn Học cụ thể vào câu chuyện để chứng minh bạn là sinh viên thật! 
      2. Cách dùng tên: Nhắc tự nhiên kiểu "Ai có đề cương môn của thầy X không?", "Thầy Y dạy khó vãi", "Vừa leo lên phòng Gxxx mệt xỉu".
      3. KHÔNG lạm dụng "kẹt xe, đói bụng".
      4. Văn phong: Sinh viên Gen Z, teencode, viết tắt, sai chính tả nhẹ. Cộc lốc, than thở. KHÔNG dùng hashtag, KHÔNG ngoặc kép. KHÔNG chào hỏi (ví dụ không dùng "Chào mọi người").

      TRẢ VỀ ĐÚNG JSON DƯỚI DẠNG NÀY:
      {
        ${isNewUser ? '"name": "Tên tự nghĩ",\n"bio": "Bio ngắn dưới 5 chữ",\n' : ''}"content": "Nội dung status tự nhiên nhất"
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
        botName, botMajor, content,
        channelId: target.channelId, universityId: target.uniId, channelName: target.channelName
      });

      return `SYS_SUCCESS | ${botName} đã đăng bài thành công`;
    } catch (error: any) {
      return `SYS_ERR: ${error.message}`;
    }
  }
});