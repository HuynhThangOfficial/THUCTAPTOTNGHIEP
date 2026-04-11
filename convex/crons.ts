// convex/crons.ts
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// ==========================================
// 1. LỊCH ĐĂNG BÀI (AI ROLEPLAY)
// ==========================================
// ☀️ Ban ngày (0h-16h UTC): Chạy vào phút thứ 15 và 55 của mỗi giờ (Cách nhau khoảng 40 phút)
crons.cron(
  "Post_BanNgay",
  "15,55 0-16 * * *", 
  (internal as any).ai_bot.scheduleRoleplayPost
);

// 🌙 Cú đêm (17h-23h UTC): Chỉ chạy 1 lần vào phút thứ 10 của các giờ chẵn (Cách nhau 2 tiếng)
crons.cron(
  "Post_BanDem",
  "10 18,20,22 * * *", 
  (internal as any).ai_bot.scheduleRoleplayPost
);

// ==========================================
// 2. LỊCH BÌNH LUẬN DẠO (ENGAGEMENT BOT)
// ==========================================
// ☀️ Ban ngày: Quét vào phút thứ 05 và 35 của mỗi giờ (Tuyệt đối lệch pha với lúc đăng bài)
crons.cron(
  "Cmt_BanNgay",
  "5,35 0-16 * * *", 
  (internal as any).engagement_bot.runAutoEngagement
);

// 🌙 Ban đêm: Quét 1 lần vào phút thứ 40 của các giờ lẻ 
crons.cron(
  "Cmt_BanDem",
  "40 17,19,21,23 * * *", 
  (internal as any).engagement_bot.runAutoEngagement
);

// ==========================================
// 3. LỊCH HÓNG BIẾN (FIRECRAWL NEWS)
// ==========================================
// Lệnh interval của Convex tính bằng phút, nên dùng 120 (2 tiếng) là hợp lệ.
crons.interval(
  "Scrape_News_TuoiTre",
  { minutes: 10000 }, 
  (internal as any).firecrawl_bot.scrapeCommunityNews
);

export default crons;