import { query } from "./_generated/server";
import { v } from "convex/values";

// 1. TỪ ĐIỂN VỐN LIẾNG BAN ĐẦU (Dùng cho các kênh gốc của VAA khi chưa có dữ liệu)
const CHANNEL_KEYWORDS: Record<string, string> = {
    "mua-bán": "mua bán nhượng pass tiền giá rẻ thanh lý quần áo sách laptop điện thoại",
    "việc-làm": "việc làm part-time full-time tuyển dụng lương phỏng vấn cv sinh viên làm thêm",
    "confession": "tâm sự buồn vui crush chia tay áp lực khóc mệt mỏi gia đình bạn bè tình yêu",
    "đồ-thất-lạc": "rơi rớt mất nhặt được tìm bóp ví chìa khóa thẻ sinh viên balo",
    "chia-sẻ-tài-liệu": "đề cương tài liệu giáo trình pdf slide môn học thi giữa kỳ cuối kỳ xin đề",
    "phòng-trọ": "trọ ký túc xá ktx ở ghép tiền nhà điện nước phòng trống",
    "hỏi-đáp": "hỏi đáp thắc mắc làm sao hướng dẫn chỉ mình với",
};

// 2. TIỀN XỬ LÝ NGÔN NGỮ (NLP)
function tokenize(text: string): string[] {
    if (!text) return [];
    return text.toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") 
        .replace(/[^a-z0-9\s]/g, " ") 
        .split(/\s+/) 
        .filter(word => word.length > 1); 
}

export const suggestChannels = query({
    args: {
        content: v.string(),
        universityId: v.optional(v.id("universities")),
        serverId: v.optional(v.id("servers")),
    },
    handler: async (ctx, args) => {
        if (!args.content || args.content.trim().length < 10) return [];

        // A. Lấy danh sách kênh hiện có
        let channels = [];
        if (args.universityId) {
            channels = await ctx.db.query("channels")
                .withIndex("by_university", q => q.eq("universityId", args.universityId!))
                .filter(q => q.eq(q.field("type"), "channel"))
                .collect();
        } else if (args.serverId) {
            channels = await ctx.db.query("channels")
                .withIndex("by_server", q => q.eq("serverId", args.serverId!))
                .filter(q => q.eq(q.field("type"), "channel"))
                .collect();
        } else {
            return [];
        }

        channels = channels.filter(c => c.name !== "đại-sảnh");
        if (channels.length === 0) return [];

        const userTokens = tokenize(args.content);
        if (userTokens.length === 0) return [];

        // 👇 B. ĐIỂM ĂN TIỀN: TẠO DOCUMENT ĐỘNG TỪ LỊCH SỬ TIN NHẮN 👇
        const docs = await Promise.all(channels.map(async (c) => {
            // Quét 15 tin nhắn gần nhất trong kênh để phân tích ngữ cảnh
            const recentMsgs = await ctx.db.query("messages")
                .withIndex("by_channel", q => q.eq("channelId", c._id))
                .order("desc")
                .take(15);
            
            // Nối toàn bộ nội dung tin nhắn cũ lại thành 1 đoạn văn bản lớn
            const historicalContent = recentMsgs.map(m => m.content).join(" ");
            
            // Nối tên kênh + Mô tả kênh (có trong schema) + Lịch sử tin nhắn
            const baseText = `${c.name.replace(/-/g, " ")} ${c.description || ""} ${historicalContent}`;
            
            // Đắp thêm từ khóa cứng (nếu kênh đó trùng tên trong từ điển)
            const enrichedText = CHANNEL_KEYWORDS[c.name.toLowerCase()] || "";
            
            const tokens = tokenize(baseText + " " + enrichedText);
            return { channel: c, tokens };
        }));

        // C. THUẬT TOÁN TF-IDF ĐỘNG
        const uniqueUserTokens = Array.from(new Set(userTokens));
        const idf: Record<string, number> = {};
        const totalDocs = docs.length;

        uniqueUserTokens.forEach(token => {
            let docCount = 0;
            docs.forEach(d => {
                if (d.tokens.includes(token)) docCount++;
            });
            idf[token] = Math.log(totalDocs / (1 + docCount));
        });

        const userVector: number[] = [];
        uniqueUserTokens.forEach(token => {
            const tf = userTokens.filter(t => t === token).length / userTokens.length;
            userVector.push(tf * idf[token]);
        });

        // D. TÍNH COSINE SIMILARITY
        const results = docs.map(doc => {
            const docVector: number[] = [];
            uniqueUserTokens.forEach(token => {
                const tf = doc.tokens.filter(t => t === token).length / (doc.tokens.length || 1);
                docVector.push(tf * (idf[token] || 0));
            });

            let dotProduct = 0;
            let normUser = 0;
            let normDoc = 0;
            for (let i = 0; i < uniqueUserTokens.length; i++) {
                dotProduct += userVector[i] * docVector[i];
                normUser += userVector[i] * userVector[i];
                normDoc += docVector[i] * docVector[i];
            }

            let score = 0;
            if (normUser > 0 && normDoc > 0) {
                score = dotProduct / (Math.sqrt(normUser) * Math.sqrt(normDoc));
            }

            return { channelId: doc.channel._id, name: doc.channel.name, score };
        });

        // Lọc nhiễu và trả về top 3
        return results
            .filter(r => r.score > 0.02) // Hạ mức lọc xuống một chút để nhạy hơn với kênh mới
            .sort((a, b) => b.score - a.score)
            .slice(0, 3);
    }
});