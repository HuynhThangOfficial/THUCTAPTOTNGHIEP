import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// =========================================================
// 1. QUẢN LÝ NGƯỜI DÙNG (USERS)
// =========================================================

// Lấy danh sách user có kèm tìm kiếm
export const getUsers = query({
  args: { search: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (args.search) {
      return await ctx.db
        .query("users")
        .withSearchIndex("searchUsers", (q) => q.search("username", args.search!))
        .take(20);
    }
    return await ctx.db.query("users").order("desc").take(50);
  },
});

// Thêm người dùng mới (Manual)
export const adminCreateUser = mutation({
  args: {
    email: v.string(),
    username: v.string(),
    first_name: v.optional(v.string()),
    last_name: v.optional(v.string()),
    role: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const fakeClerkId = "manual_" + Date.now();
    await ctx.db.insert("users", {
      clerkId: fakeClerkId,
      email: args.email,
      username: args.username,
      first_name: args.first_name,
      last_name: args.last_name,
      role: args.role || 'user',
      followersCount: 0,
    });
  }
});

// Cập nhật thông tin và vai trò (Admin/User)
export const adminUpdateUser = mutation({
  args: {
    userId: v.id("users"),
    first_name: v.optional(v.string()),
    last_name: v.optional(v.string()),
    username: v.optional(v.string()),
    role: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId, ...updates } = args;
    await ctx.db.patch(userId, updates);
  }
});

// Xóa người dùng và dọn dẹp sạch sẽ dữ liệu liên quan
export const adminDeleteUser = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const { userId } = args;

    // Xóa tin nhắn, bài viết, lượt thích, follow... (Cascading Delete)
    // [Logic dựa trên schema.ts của Thăng]
    const messages = await ctx.db.query("messages").withIndex("by_user", q => q.eq("userId", userId)).collect();
    for (const m of messages) await ctx.db.delete(m._id);

    const likes = await ctx.db.query("likes").filter(q => q.eq(q.field("userId"), userId)).collect();
    for (const l of likes) await ctx.db.delete(l._id);

    const follows = await ctx.db.query("follows").filter(q => q.or(q.eq(q.field("followerId"), userId), q.eq(q.field("followingId"), userId))).collect();
    for (const f of follows) await ctx.db.delete(f._id);

    await ctx.db.delete(userId);
  }
});

// =========================================================
// 2. QUẢN LÝ NỘI DUNG (MESSAGES / POSTS)
// =========================================================

export const adminGetMessages = query({
  args: { search: v.optional(v.string()) },
  handler: async (ctx, args) => {
    let messages = await ctx.db.query("messages").order("desc").take(100);
    if (args.search) {
      const kw = args.search.toLowerCase();
      messages = messages.filter(m => m.content.toLowerCase().includes(kw));
    }

    return Promise.all(messages.map(async (m) => {
      // 1. Lấy tên người đăng
      const user = await ctx.db.get(m.userId);
      const channel = m.channelId ? await ctx.db.get(m.channelId) : null;
      
      // 2. Lấy tên Máy chủ hoặc Trường học
      let workspaceName = "Không thuộc máy chủ";
      if (m.serverId) {
         const server = await ctx.db.get(m.serverId);
         if (server) workspaceName = `Máy chủ: ${server.name}`;
      } else if (m.universityId) {
         const uni = await ctx.db.get(m.universityId);
         // @ts-ignore
         if (uni) workspaceName = `Trường: ${uni.name || uni.slug.toUpperCase()}`;
      } else if (channel?.serverId) {
         const server = await ctx.db.get(channel.serverId);
         if (server) workspaceName = `Máy chủ: ${server.name}`;
      } else if (channel?.universityId) {
         const uni = await ctx.db.get(channel.universityId);
         // @ts-ignore
         if (uni) workspaceName = `Trường: ${uni.name || uni.slug.toUpperCase()}`;
      }

      // 3. Nếu là bình luận -> Lấy nội dung bài viết gốc
      let parentContent = null;
      if (m.threadId) {
         const parentPost = await ctx.db.get(m.threadId);
         if (parentPost) {
            parentContent = parentPost.content || "(Bài viết gốc chỉ chứa ảnh/video)";
         } else {
            parentContent = "(Bài viết gốc đã bị xóa)";
         }
      }

      return { 
        ...m, 
        authorName: user?.username || "Người dùng ẩn",
        channelName: channel?.name || "Hệ thống",
        workspaceName,
        parentContent
      };
    }));
  }
});

export const adminDeleteMessage = mutation({
  args: { messageId: v.id("messages") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.messageId);
  }
});

// =========================================================
// 3. QUẢN LÝ MÁY CHỦ & KÊNH (SERVERS / UNIVERSITIES)
// =========================================================

export const adminGetServersAndUniversities = query({
  args: { search: v.optional(v.string()) },
  handler: async (ctx, args) => {
    let universities = await ctx.db.query("universities").order("asc").collect();
    let servers = await ctx.db.query("servers").order("desc").collect();

    if (args.search) {
      const kw = args.search.toLowerCase();
      universities = universities.filter(u => u.name.toLowerCase().includes(kw));
      servers = servers.filter(s => s.name.toLowerCase().includes(kw));
    }

    const combined = [];

    // Xử lý Universities
    for (const uni of universities) {
      const allChannels = await ctx.db.query("channels").withIndex("by_university", q => q.eq("universityId", uni._id)).collect();
      const categories = allChannels.filter(c => c.type === 'category').sort((a, b) => a.sortOrder - b.sortOrder);
      const channels = allChannels.filter(c => c.type !== 'category').sort((a, b) => a.sortOrder - b.sortOrder);

      // Đếm số bài đăng gốc (threadId = undefined)
      const allMessages = await ctx.db.query("messages").withIndex("by_university", q => q.eq("universityId", uni._id)).collect();
      const postCount = allMessages.filter(m => m.threadId === undefined).length;

      combined.push({
        _id: uni._id,
        name: uni.name,
        type: "university",
        slug: uni.slug,
        icon: uni.icon,
        memberCount: "Public",
        categoryCount: categories.length,
        channelCount: channels.length,
        postCount: postCount,
        categories: categories, // Trả về để hiện trong Modal
        channels: channels,     // Trả về để hiện trong Modal
        totalStones: 0
      });
    }

    // Xử lý Servers
    for (const srv of servers) {
      const allChannels = await ctx.db.query("channels").withIndex("by_server", q => q.eq("serverId", srv._id)).collect();
      const categories = allChannels.filter(c => c.type === 'category').sort((a, b) => a.sortOrder - b.sortOrder);
      const channels = allChannels.filter(c => c.type !== 'category').sort((a, b) => a.sortOrder - b.sortOrder);

      // Đếm số bài đăng gốc (threadId = undefined)
      const allMessages = await ctx.db.query("messages").withIndex("by_server", q => q.eq("serverId", srv._id)).collect();
      const postCount = allMessages.filter(m => m.threadId === undefined).length;

      const creator = await ctx.db.get(srv.creatorId);
      
      let iconUrl = srv.icon;
      if (iconUrl && !iconUrl.startsWith("http")) {
         const url = await ctx.storage.getUrl(iconUrl as Id<"_storage">);
         if (url) iconUrl = url;
      }

      combined.push({
        _id: srv._id,
        name: srv.name,
        type: "server",
        slug: srv.slug,
        icon: iconUrl,
        memberCount: srv.memberIds ? srv.memberIds.length : 0,
        categoryCount: categories.length,
        channelCount: channels.length,
        postCount: postCount,
        categories: categories, // Trả về để hiện trong Modal
        channels: channels,     // Trả về để hiện trong Modal
        totalStones: srv.totalStones || 0,
        creatorName: creator?.username || "Không rõ"
      });
    }

    return combined;
  }
});

// Admin xóa Máy chủ (Server)
export const adminDeleteServer = mutation({
  args: { serverId: v.id("servers") },
  handler: async (ctx, args) => {
    // Logic xóa server giống hệt hàm deleteServer trong university.ts
    const channels = await ctx.db.query('channels').withIndex('by_server', q => q.eq('serverId', args.serverId)).collect();
    for (const channel of channels) {
      const messages = await ctx.db.query('messages').withIndex('by_channel', q => q.eq('channelId', channel._id)).collect();
      for (const msg of messages) await ctx.db.delete(msg._id);
      
      const channelSubs = await ctx.db.query('channel_subscriptions').withIndex('by_channel', q => q.eq('channelId', channel._id)).collect();
      for (const cs of channelSubs) await ctx.db.delete(cs._id);
      
      await ctx.db.delete(channel._id);
    }

    const serverSubs = await ctx.db.query('channel_subscriptions').filter(q => q.eq(q.field('serverId'), args.serverId)).collect();
    for (const sub of serverSubs) await ctx.db.delete(sub._id);

    const serverMembers = await ctx.db.query("server_members").withIndex("by_server", q => q.eq("serverId", args.serverId)).collect();
    for (const member of serverMembers) await ctx.db.delete(member._id);

    await ctx.db.delete(args.serverId);
  }
});

// =========================================================
// 4. QUẢN LÝ THÔNG BÁO HỆ THỐNG (NOTIFICATIONS)
// =========================================================

export const adminGetBroadcasts = query({
  handler: async (ctx) => {
    // Lấy lịch sử gửi thông báo mới nhất
    return await ctx.db.query("admin_broadcasts").order("desc").take(50);
  }
});

export const adminSendBroadcast = mutation({
  args: { 
    title: v.string(), 
    message: v.string(), 
    target: v.string() 
  },
  handler: async (ctx, args) => {
    // 1. Lấy danh sách người dùng mục tiêu
    let targetUsers;
    if (args.target === 'all') {
      targetUsers = await ctx.db.query("users").collect();
    } else {
      targetUsers = await ctx.db.query("users")
        .filter(q => q.eq(q.field("role"), args.target))
        .collect();
    }

    if (targetUsers.length === 0) return 0;

    // 2. Định dạng nội dung thông báo
    const textContent = `📢 [${args.title}]\n${args.message}`;

    // 3. Rải thông báo cho từng người
    for (const user of targetUsers) {
      await ctx.db.insert("notifications", {
        userId: user._id,
        type: "system", // Loại thông báo hệ thống
        content: textContent,
        isRead: false,
      });
      // Ghi chú: Nếu app mobile đã cấu hình xong Expo Push Token, 
      // bạn có thể gọi internalAction sendPushNotification ở đây!
    }

    // 4. Lưu lại lịch sử gửi
    await ctx.db.insert("admin_broadcasts", {
      title: args.title,
      message: args.message,
      target: args.target,
      sentCount: targetUsers.length,
    });

    return targetUsers.length;
  }
});

// =========================================================
// 5. THỐNG KÊ PHÂN TÍCH (ANALYTICS)
// =========================================================

export const adminGetAnalytics = query({
  args: { timeRange: v.number() },
  handler: async (ctx, args) => {
    const now = Date.now();
    const cutoffTime = now - args.timeRange * 24 * 60 * 60 * 1000;

    // 1. NGƯỜI DÙNG
    const users = await ctx.db.query("users").collect();
    const totalUsers = users.length;
    const newUsers = users.filter(u => u._creationTime > cutoffTime).length;
    const adminCount = users.filter(u => u.role === 'admin').length;
    const userCount = totalUsers - adminCount;

    // 2. GIỮ CHÂN
    const calcRetention = () => {
        const eligibleUsers = users.filter(u => u._creationTime < cutoffTime);
        if (eligibleUsers.length === 0) return 0;
        const retained = eligibleUsers.filter(u => (u.lastSeen || 0) > cutoffTime).length;
        return Math.round((retained / eligibleUsers.length) * 100);
    };

    // 3. MÁY CHỦ & TRƯỜNG
    const servers = await ctx.db.query("servers").collect();
    const universities = await ctx.db.query("universities").collect();
    const totalWorkspaces = servers.length + universities.length;
    const newWorkspaces = servers.filter(s => s._creationTime > cutoffTime).length +
                          universities.filter(u => u._creationTime > cutoffTime).length;

    // 4. BÀI ĐĂNG GỐC
    const messages = await ctx.db.query("messages").collect();
    const originalPosts = messages.filter(m => m.threadId === undefined);
    const totalPosts = originalPosts.length;
    const newPosts = originalPosts.filter(m => m._creationTime > cutoffTime).length;

    // 5. HOẠT ĐỘNG THEO GIỜ (CHỈ LẤY BÀI ĐĂNG GỐC - Bỏ bình luận)
    const hourlyActivity = new Array(24).fill(0);
    originalPosts.filter(m => m._creationTime > cutoffTime).forEach(m => {
        const hour = new Date(m._creationTime).getHours();
        hourlyActivity[hour]++;
    });

    const maxActivity = Math.max(...hourlyActivity, 1);
    const normalizedHourly = hourlyActivity.map(count => Math.round((count / maxActivity) * 100));

    // ĐÃ BỎ avgTime
    return {
      totalUsers, newUsers,
      totalPosts, newPosts,
      totalWorkspaces, newWorkspaces,
      retentionRate: calcRetention(),
      roles: { admin: adminCount, user: userCount },
      hourlyActivity: normalizedHourly
    };
  }
});

// =========================================================
// 6. NHẬT KÝ BẢO MẬT & PHÂN QUYỀN (AUDIT LOGS)
// =========================================================

export const adminGetAuditLogs = query({
  handler: async (ctx) => {
    // Lấy 50 hành động gần nhất
    return await ctx.db.query("audit_logs").order("desc").take(50);
  }
});

export const adminGetAdminUsers = query({
  handler: async (ctx) => {
    return await ctx.db.query("users")
      .filter(q => q.eq(q.field("role"), "admin"))
      .order("desc")
      .collect();
  }
});