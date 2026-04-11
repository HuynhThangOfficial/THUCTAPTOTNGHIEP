"use node";
// convex/firecrawl_bot.ts
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import FirecrawlApp from "@mendable/firecrawl-js";

export const scrapeCommunityNews = internalAction({
  args: {},
  handler: async (ctx): Promise<string> => {
    // 👇 TRẠM GÁC: Đặt lên dòng ĐẦU TIÊN. Chặn ngay từ cửa, không cho quét Database.
    const apiKey = process.env.FIRECRAWL_API_KEY;
    if (!apiKey) return "SYS_SKIP: Môi trường Dev không có API Key, bot Firecrawl đi ngủ.";

    // Các bước gọi DB và xử lý bên dưới mới được phép chạy
    const target: any = await ctx.runQuery((internal as any).firecrawl_db.getCommunityScrapeTarget);
    if (!target) return "SYS_ERR: Không tìm thấy kênh Cộng đồng nào hợp lệ!";

    const app = new FirecrawlApp({ apiKey });
    const cName = target.channelName.toLowerCase();

    // Quay lại với Tuổi Trẻ cho nó nhiều tin hóng hớt bác nhé!
    let targetUrl = "https://tuoitre.vn/tin-moi-nhat.htm"; 
    
    if (cName.includes("thể-thao")) targetUrl = "https://tuoitre.vn/the-thao.htm";
    else if (cName.includes("công-nghệ")) targetUrl = "https://tuoitre.vn/khoa-hoc.htm";
    else if (cName.includes("phim-ảnh") || cName.includes("âm-nhạc")) targetUrl = "https://tuoitre.vn/giai-tri.htm";
    else if (cName.includes("du-lịch")) targetUrl = "https://tuoitre.vn/du-lich.htm";
    else if (cName.includes("tài-chính")) targetUrl = "https://tuoitre.vn/kinh-doanh.htm";
    else if (cName.includes("sức-khỏe")) targetUrl = "https://tuoitre.vn/suc-khoe.htm";
    else if (cName.includes("giáo-đục") || cName.includes("sách")) targetUrl = "https://tuoitre.vn/giao-duc.htm";

    try {
      const scrapeResult: any = await app.scrape(targetUrl, {
        formats: [
          {
            type: 'json', 
            prompt: `Lấy 1 tin tức mới nhất. Viết lại thành 1 status Gen Z cực ngắn (dưới 30 từ), giọng hóng hớt. KHÔNG URL, KHÔNG tiêu đề báo.`,
            schema: {
              type: "object",
              properties: { content: { type: "string" } },
              required: ["content"]
            }
          }
        ]
      });

      // Kiểm tra dữ liệu an toàn
      const postContent = scrapeResult.json?.content || (scrapeResult.data && scrapeResult.data[0]?.content);
      
      if (!postContent) {
        return `SYS_ERR: Firecrawl không nôn ra data. Log: ${JSON.stringify(scrapeResult)}`;
      }

      await ctx.runMutation((internal as any).firecrawl_db.saveScrapedPost, {
        userId: target.userId,
        channelId: target.channelId,
        serverId: target.serverId,
        content: postContent,
        websiteUrl: undefined, 
      });

      return `SYS_SUCCESS | Bot hóng biến Tuổi Trẻ thành công và đã đăng bài!`;

    } catch (error: any) {
      return `SYS_ERR: Lỗi ngoại lệ Firecrawl: ${error.message}`;
    }
  }
});