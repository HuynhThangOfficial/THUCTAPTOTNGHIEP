// convex/crons.ts
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// ==========================================
// 1. LỊCH ĐĂNG BÀI (AI BOT)
// ==========================================
// ☀️ Ban ngày: Ép xuống 6 phút/lần. (Kết hợp 25% tỷ lệ lười -> trung bình 1 tiếng sẽ có khoảng 6-7 bài mới).
crons.cron(
  "Post_BanNgay",
  "*/6 0-16 * * *", 
  (internal as any).ai_bot.generateRoleplayPost
);

// 🌙 Cú đêm: 23 phút/lần. Khuya rồi nhưng lâu lâu vẫn có đứa trồi lên đăng confession xàm xí.
crons.cron(
  "Post_BanDem",
  "*/21 17-23 * * *", 
  (internal as any).ai_bot.generateRoleplayPost
);


// ==========================================
// 2. LỊCH BÌNH LUẬN DẠO (ENGAGEMENT BOT)
// ==========================================
// ☀️ Ban ngày: 4 phút quét 1 lần! Tốc độ bàn thờ để sinh viên đăng bài xong là thấy có tương tác nổ Noti liên tục.
crons.cron(
  "Cmt_BanNgay",
  "*/4 0-16 * * *", 
  (internal as any).engagement_bot.runAutoEngagement
);

// 🌙 Ban đêm: 13 phút quét 1 lần. Đêm khuya vẫn có cú đêm đi hóng hớt cmt dạo.
crons.cron(
  "Cmt_BanDem",
  "*/13 17-23 * * *", 
  (internal as any).engagement_bot.runAutoEngagement
);

// ==========================================
// 3. LỊCH HÓNG BIẾN (FIRECRAWL NEWS)
// ==========================================
// Cứ 120 phút (2 tiếng) đi cào báo 1 lần. 
// 1 ngày xài 12 lượt Firecrawl. Bác có 1000 lượt thì xài liên tục gần 3 tháng mới hết! Đủ qua mùa bảo vệ đồ án!
crons.interval(
  "Scrape_News_TuoiTre",
  { minutes: 6000 },
  (internal as any).firecrawl_bot.scrapeCommunityNews
);

export default crons;