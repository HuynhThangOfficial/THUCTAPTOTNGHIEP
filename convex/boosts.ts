import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// 1. Hàm Mua Đá (Sau này tích hợp VNPay/Momo vào đây)
export const buyStones = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("UNAUTHORIZED");

    const user = await ctx.db.query("users").withIndex("byClerkId", (q) => q.eq("clerkId", identity.subject)).unique();
    if (!user) throw new Error("USER_NOT_FOUND");

    await ctx.db.patch(user._id, { stones: (user.stones || 0) + 1 });
    return { success: true };
  }
});

// 2. Hàm Quyên góp Đá cho Server
export const boostServer = mutation({
  args: { serverId: v.id("servers") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("UNAUTHORIZED");

    const user = await ctx.db.query("users").withIndex("byClerkId", (q) => q.eq("clerkId", identity.subject)).unique();
    const server = await ctx.db.get(args.serverId);
    if (!user || !server) throw new Error("INVALID_DATA");

    if (!user.stones || user.stones <= 0) {
      // 👇 TRẢ VỀ MÃ LỖI THAY VÌ TIẾNG VIỆT
      throw new Error("NOT_ENOUGH_STONES");
    }

    // Trừ ví User, Cộng kho Server
    await ctx.db.patch(user._id, { stones: user.stones - 1 });
    await ctx.db.patch(server._id, { totalStones: (server.totalStones || 0) + 1 });

    // Lưu lịch sử để vinh danh
    await ctx.db.insert("server_boosts", {
      serverId: server._id,
      userId: user._id,
      amount: 1,
      boostedAt: Date.now(),
    });

    return { success: true };
  }
});

export const getTopBoosters = query({
  args: { serverId: v.optional(v.id("servers")) },
  handler: async (ctx, args) => {
    if (!args.serverId) return [];

    const boosts = await ctx.db
      .query("server_boosts")
      .withIndex("by_server", (q) => q.eq("serverId", args.serverId!))
      .collect();

    const userTotals = new Map<Id<"users">, number>();
    for (const boost of boosts) {
      const userIdStr = boost.userId; // Giữ nguyên kiểu Id<"users">
      userTotals.set(userIdStr, (userTotals.get(userIdStr) || 0) + boost.amount);
    }

    const sortedUsers = Array.from(userTotals.entries()).sort((a, b) => b[1] - a[1]);

    const topBoosters = [];
    for (const [userId, totalStones] of sortedUsers.slice(0, 3)) {
      // Ép kiểu chính xác là Id<"users"> để lấy đúng dữ liệu
      const user = await ctx.db.get(userId);      
      if (user && "username" in user) {
        topBoosters.push({
          _id: user._id,
          first_name: user.first_name || user.username, // Bây giờ sẽ hết báo lỗi đỏ ở đây
          imageUrl: user.imageUrl || "", 
          totalStones,
        });
      }
    }

    return topBoosters;
  }
});