import { internalAction, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

export const checkMessageContent = internalAction({
  args: { messageId: v.id("messages"), content: v.string(), userId: v.id("users") },
  handler: async (ctx, args) => {
    try {
      const hfToken = process.env.HF_TOKEN;
      if (!hfToken) return;

      // DÙNG MODEL PUBLIC NÀY ĐỂ ĐẢM BẢO SERVER LUÔN CHẠY FREE 24/7
      const AI_API_URL = "https://router.huggingface.co/hf-inference/models/wonrax/phobert-base-vietnamese-sentiment"; 
      
      const response = await fetch(AI_API_URL, {
        method: "POST",
        headers: { 
          "Authorization": `Bearer ${hfToken}`,
          "Content-Type": "application/json" 
        },
        body: JSON.stringify({ inputs: args.content })
      });

      if (!response.ok) return;

      const result = await response.json();
      if (result && result[0]) {
         const predictions = Array.isArray(result[0]) ? result[0] : result;
         const topPrediction = predictions.sort((a: any, b: any) => b.score - a.score)[0];

         // Nếu AI phát hiện tiêu cực (NEG) với độ chắc chắn > 60%
         if (topPrediction.label === 'NEG' && topPrediction.score > 0.6) {
            await ctx.runMutation(internal.ai_moderation.deleteToxicMessage, {
              messageId: args.messageId,
              userId: args.userId,
              reason: "Ngôn từ Tiêu cực/Xúc phạm (AI Detected)"
            });
         }
      }
    } catch (error) {
      console.error("Lỗi AI:", error);
    }
  }
});

export const deleteToxicMessage = internalMutation({
  args: { messageId: v.id("messages"), userId: v.id("users"), reason: v.string() },
  handler: async (ctx, args) => {
    const msg = await ctx.db.get(args.messageId);
    if (msg) {
        if (msg.threadId) {
            const parentThread = await ctx.db.get(msg.threadId);
            if (parentThread) {
                await ctx.db.patch(parentThread._id, {
                    commentCount: Math.max(0, (parentThread.commentCount || 1) - 1)
                });
            }
        }
        await ctx.db.delete(args.messageId);
    }
    await ctx.db.insert("notifications", {
      userId: args.userId,
      type: "system",
      content: `Bài viết của bạn bị gỡ do: ${args.reason}`,
      isRead: false
    });
  }
});
// ==========================================
// 3. ACTION: KIỂM DUYỆT HÌNH ẢNH (COMPUTER VISION)
// ==========================================
export const checkImageContent = internalAction({
  args: { 
    messageId: v.id("messages"), 
    storageId: v.id("_storage"), 
    userId: v.id("users") 
  },
  handler: async (ctx, args) => {
    try {
      const hfToken = process.env.HF_TOKEN;
      if (!hfToken) return;

      // Mô hình CNN chuyên phát hiện ảnh nhạy cảm (NSFW: Nudity, Violence...)
      const VISION_MODEL_URL = "https://router.huggingface.co/hf-inference/models/Falconsai/nsfw_image_detection";

      // 1. Lấy file ảnh dạng nhị phân từ Storage của Convex
      const imageBlob = await ctx.storage.get(args.storageId);
      if (!imageBlob) return;
      const imageBuffer = await imageBlob.arrayBuffer();

      // 2. Gửi ảnh sang Hugging Face API để phân tích
      const response = await fetch(VISION_MODEL_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${hfToken}`,
          "Content-Type": imageBlob.type,
        },
        body: imageBuffer,
      });

      if (!response.ok) {
        console.error("Lỗi Vision AI:", await response.text());
        return;
      }

      const result = await response.json();
      
      // Kết quả trả về thường là mảng các nhãn: [{ label: "nsfw", score: 0.95 }, { label: "normal", score: 0.05 }]
      if (Array.isArray(result) && result.length > 0) {
        const topPrediction = result.sort((a: any, b: any) => b.score - a.score)[0];

        console.log(`AI Vision: Ảnh ${args.storageId} - Phân loại: ${topPrediction.label} (${Math.round(topPrediction.score * 100)}%)`);

        // Nếu phát hiện nhạy cảm (NSFW) với độ tin cậy > 70%
        if (topPrediction.label === "nsfw" && topPrediction.score > 0.7) {
          await ctx.runMutation(internal.ai_moderation.deleteToxicMessage, {
            messageId: args.messageId,
            userId: args.userId,
            reason: "Hình ảnh nhạy cảm / Không phù hợp tiêu chuẩn cộng đồng (Vision AI Detected)"
          });
        }
      }
    } catch (error) {
      console.error("Lỗi xử lý Computer Vision:", error);
    }
  }
});