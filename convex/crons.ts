// convex/crons.ts
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// ☀️ Ban ngày: Cứ mỗi 7 phút, Cron sẽ đẩy 1 yêu cầu đăng bài vào Hàng chờ (Queue).
// Khi vào hàng chờ, nó sẽ bị delay ngẫu nhiên từ 30s đến 15 phút mới được hiện lên Web.
crons.cron(
  "Post_BanNgay",
  "*/9 0-16 * * *", 
  (internal as any).ai_bot.scheduleRoleplayPost // <--- SỬA THÀNH SCHEDULE
);

// 🌙 Cú đêm: Mỗi 23 phút mới đẩy 1 yêu cầu vào hàng chờ.
crons.cron(
  "Post_BanDem",
  "*/32 17-23 * * *", 
  (internal as any).ai_bot.scheduleRoleplayPost // <--- SỬA THÀNH SCHEDULE
);

// ==========================================
// 2. LỊCH BÌNH LUẬN DẠO (ENGAGEMENT BOT)
// ==========================================
// ☀️ Ban ngày: 4 phút quét 1 lần! Tốc độ bàn thờ để sinh viên đăng bài xong là thấy có tương tác nổ Noti liên tục.
crons.cron(
  "Cmt_BanNgay",
  "*/7 0-16 * * *", 
  (internal as any).engagement_bot.runAutoEngagement
);

// 🌙 Ban đêm: 13 phút quét 1 lần. Đêm khuya vẫn có cú đêm đi hóng hớt cmt dạo.
crons.cron(
  "Cmt_BanDem",
  "*/24 17-23 * * *", 
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