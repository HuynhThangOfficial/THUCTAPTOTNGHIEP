import { mutation, query } from './_generated/server';
import { v, ConvexError } from 'convex/values';
import { Doc, Id } from './_generated/dataModel';

// =====================================================
// Lấy tất cả trường (GIỮ NGUYÊN)
// =====================================================
export const getUniversities = query({
  handler: async (ctx) => {
    return await ctx.db.query('universities').order('asc').collect();
  },
});

// =====================================================
// getChannels hỗ trợ cả university và server (GIỮ NGUYÊN)
// =====================================================
export const getChannels = query({
  args: {
    universityId: v.optional(v.id('universities')),
    serverId: v.optional(v.id('servers')),
  },
  handler: async (ctx, args) => {
    if (!args.universityId && !args.serverId) {
      return { groups: [], channels: [] };
    }

    let all: any[] = [];

    if (args.universityId) {
      all = await ctx.db
        .query('channels')
        .withIndex('by_university', (q) =>
          q.eq('universityId', args.universityId!)
        )
        .collect();
    } else if (args.serverId) {
      all = await ctx.db
        .query('channels')
        .withIndex('by_server', (q) => q.eq('serverId', args.serverId!))
        .collect();
    }

    const groups = all
      .filter((c) => c.type === 'category')
      .sort((a, b) => a.sortOrder - b.sortOrder);

    const channels = all
      .filter((c) => c.type === 'channel')
      .sort((a, b) => a.sortOrder - b.sortOrder);

    return { groups, channels };
  },
});

export const seedAndMigrate = mutation({
  handler: async (ctx) => {
    
    // --- HÀM HỖ TRỢ TẠO DANH MỤC VÀ KÊNH (Đã nâng cấp để hỗ trợ isAnonymous) ---
    const ensureCategoryWithChannels = async (
      workspaceId: Id<'universities'>,
      catName: string,
      catOrder: number,
      subChannels: { name: string; isAnonymous?: boolean }[]
    ) => {
      let category = await ctx.db
        .query('channels')
        .withIndex('by_university', (q) => q.eq('universityId', workspaceId))
        .filter((q) => q.eq(q.field('name'), catName))
        .filter((q) => q.eq(q.field('type'), 'category'))
        .first();

      let catId: Id<'channels'>;

      if (!category) {
        catId = await ctx.db.insert('channels', {
          name: catName,
          type: 'category',
          universityId: workspaceId,
          sortOrder: catOrder,
        });
      } else {
        catId = category._id;
      }

      for (let i = 0; i < subChannels.length; i++) {
        const subData = subChannels[i];

        const existing = await ctx.db
          .query('channels')
          .withIndex('by_university', (q) => q.eq('universityId', workspaceId))
          .filter((q) => q.eq(q.field('name'), subData.name))
          .filter((q) => q.eq(q.field('parentId'), catId))
          .first();

        if (!existing) {
          await ctx.db.insert('channels', {
            name: subData.name,
            type: 'channel',
            universityId: workspaceId,
            parentId: catId,
            sortOrder: i,
            isAnonymous: subData.isAnonymous || false, // Gắn cờ ẩn danh nếu có
          });
        }
      }
    };

    // =========================================================
    // 1. MÁY CHỦ: HỌC VIỆN HÀNG KHÔNG (VAA)
    // =========================================================
    let vaa = await ctx.db
      .query('universities')
      .filter((q) => q.eq(q.field('slug'), 'vaa'))
      .first();

    if (!vaa) {
      const vaaId = await ctx.db.insert('universities', {
        name: 'Học viện Hàng không',
        slug: 'vaa',
        icon: 'local:login',
        sortOrder: 1,
      });
      vaa = await ctx.db.get(vaaId);
    }

    const uniId = vaa!._id;

    let generalChannelVAA = await ctx.db
      .query('channels')
      .withIndex('by_university', (q) => q.eq('universityId', uniId))
      .filter((q) => q.eq(q.field('name'), 'đại-sảnh'))
      .first();

    if (!generalChannelVAA) {
      await ctx.db.insert('channels', { name: 'đại-sảnh', type: 'channel', universityId: uniId, sortOrder: 0 });
    }

    await ensureCategoryWithChannels(uniId, 'CỘNG ĐỒNG', 1, [
      'làm-quen-kết-nối', 'phòng-trọ', 'chia-sẻ-tài-liệu', 'mua-bán', 'đồ-thất-lạc', 'kí-túc-xá', 'tổng-hợp-sự-kiện', 'đăng-ký-học-phần', 'review-giảng-viên', 'việc-làm', 'quân-sự',
    ].map(name => ({ name })));
    await ensureCategoryWithChannels(uniId, 'KHOÁ', 2, ['k17', 'k18', 'k19', 'k20'].map(name => ({ name })));
    await ensureCategoryWithChannels(uniId, 'KHOA', 3, [
      'khoa-công-nghệ-thông-tin', 'khoa-kinh-tế-hàng-không', 'khoa-cơ-bản', 'khoa-quản-trị-kinh-doanh', 'khoa-xây-dựng', 'khoa-khai-khác-hàng-không', 'khoa-kỹ-thuật-hàng-không', 'khoa-điện-điện-tử', 'khoa-du-lịch-và-dịch-vụ-hàng-không', 'khoa-ngoại-ngữ',
    ].map(name => ({ name })));
    await ensureCategoryWithChannels(uniId, 'CLB', 4, ['clb-bóng-chuyền', 'clb-tổ-chức-sự-kiện', 'clb-khoa-học-trẻ'].map(name => ({ name })));
    await ensureCategoryWithChannels(uniId, 'CƠ SỞ', 5, ['cơ-sở-1', 'cơ-sở-2'].map(name => ({ name })));


    // =========================================================
    // 2. MÁY CHỦ: CỘNG ĐỒNG (MỚI THÊM)
    // =========================================================
    let congdong = await ctx.db
      .query('universities')
      .filter((q) => q.eq(q.field('slug'), 'cong-dong'))
      .first();

    if (!congdong) {
      const cdId = await ctx.db.insert('universities', {
        name: 'Cộng Đồng',
        slug: 'cong-dong',
        icon: 'local:community',
        sortOrder: 2,
      });
      congdong = await ctx.db.get(cdId);
    }

    const cdId = congdong!._id;

    let generalChannelCD = await ctx.db
      .query('channels')
      .withIndex('by_university', (q) => q.eq('universityId', cdId))
      .filter((q) => q.eq(q.field('name'), 'đại-sảnh'))
      .first();

    if (!generalChannelCD) {
      await ctx.db.insert('channels', { name: 'đại-sảnh', type: 'channel', universityId: cdId, sortOrder: 0 });
    }

    // TẦNG 1: THẢO LUẬN CHUNG
    await ensureCategoryWithChannels(cdId, 'THẢO LUẬN CHUNG', 1, [
      { name: 'tin-tức' },
      { name: 'confession', isAnonymous: true },
      { name: 'tình-yêu' },
      { name: 'trò-chuyện' },
    ]);

    // TẦNG 2: GIẢI TRÍ & SỞ THÍCH
    await ensureCategoryWithChannels(cdId, 'GIẢI TRÍ & SỞ THÍCH', 2, [
      { name: 'phim-ảnh' },
      { name: 'âm-nhạc' },
      { name: 'trò-chơi' },
      { name: 'thể-thao' },
      { name: 'thú-cưng' },
      { name: 'nghệ-thuật' },
    ]);

    // TẦNG 3: ĐỜI SỐNG
    await ensureCategoryWithChannels(cdId, 'ĐỜI SỐNG', 3, [
      { name: 'ẩm-thực' },
      { name: 'du-lịch' },
      { name: 'thời-trang' },
      { name: 'sức-khỏe' },
    ]);

    // TẦNG 4: KIẾN THỨC & SỰ NGHIỆP
    await ensureCategoryWithChannels(cdId, 'KIẾN THỨC & SỰ NGHIỆP', 4, [
      { name: 'công-nghệ' },
      { name: 'tài-chính' },
      { name: 'ngoại-ngữ' },
      { name: 'việc-làm' },
      { name: 'sách' },
    ]);

    // TẦNG 5: TIỆN ÍCH
    await ensureCategoryWithChannels(cdId, 'TIỆN ÍCH', 5, [
      { name: 'mua-bán' },
      { name: 'hỏi-đáp' },
    ]);

    // Dọn dẹp tin nhắn mồ côi (không thuộc kênh nào) đưa về đại sảnh của VAA
    const allMessages = await ctx.db.query('messages').collect();
    for (const msg of allMessages) {
      if (!msg.channelId && generalChannelVAA) {
        await ctx.db.patch(msg._id, { channelId: generalChannelVAA._id });
      }
    }

    return 'SYS_MIGRATION_SUCCESS';
  },
});

// =====================================================
// getChannelDetails (GIỮ NGUYÊN)
// =====================================================
export const getChannelDetails = query({
  args: { channelId: v.id("channels") },
  handler: async (ctx, args) => {
    const channel = await ctx.db.get(args.channelId);
    if (!channel) return null;

    let workspaceName = "Unknown Workspace";
    let workspaceSlug = "UNK";

    if (channel.universityId) {
      const university = await ctx.db.get(channel.universityId);
      workspaceName = university?.name || "Unknown University";
      workspaceSlug = university?.slug || "UNK";
    }
    else if (channel.serverId) {
      const server = await ctx.db.get(channel.serverId);
      workspaceName = server?.name || "Unknown Server";
      workspaceSlug = server?.slug || "UNK";
    }

    return {
      ...channel,
      universityName: workspaceName,
      universitySlug: workspaceSlug,
    };
  },
});

// =====================================================
// SERVER FUNCTIONS
// =====================================================

export const getMyServers = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query('users')
      .withIndex('byClerkId', (q) =>
        q.eq('clerkId', identity.subject)
      )
      .unique();

    if (!user) return [];

    const allServers = await ctx.db.query('servers').collect();

    return allServers.filter(
      (s) =>
        s.creatorId === user._id ||
        s.memberIds.includes(user._id)
    );
  },
});

// Lấy chi tiết Server để check tồn tại ở Frontend
export const getServerDetails = query({
  args: { serverId: v.id("servers") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.serverId);
  },
});

// Lấy danh sách thành viên để kiểm tra trạng thái Add
export const getServerMembers = query({
  args: { serverId: v.optional(v.id("servers")) },
  handler: async (ctx, args) => {
    if (!args.serverId) return [];

    const server = await ctx.db.get(args.serverId);
    if (!server) return [];

    const members = await Promise.all(
      (server.memberIds || []).map(async (id) => {
        const user = await ctx.db.get(id);
        if (!user) return null;

        let finalImageUrl = user.imageUrl;
        if (finalImageUrl && !finalImageUrl.startsWith("http")) {
          // Nếu imageUrl không bắt đầu bằng http (nghĩa là nó là Storage ID)
          finalImageUrl = await ctx.storage.getUrl(finalImageUrl as Id<"_storage">) || finalImageUrl;
        }

        // Trả về thông tin user kèm theo cờ phân quyền
        return {
          ...user,
          imageUrl: finalImageUrl,
          isAdmin: server.adminIds?.includes(user._id) || false,
          isCreator: server.creatorId === user._id,
        };
      })
    );

    return members.filter((m) => m !== null);
  },
});

export const createServer = mutation({
  args: {
    name: v.string(),
    template: v.string(),
    iconStorageId: v.optional(v.id("_storage"))
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('UNAUTHORIZED');

    const user = await ctx.db
      .query('users')
      .withIndex('byClerkId', (q) =>
        q.eq('clerkId', identity.subject)
      )
      .unique();

    if (!user) throw new Error('USER_NOT_FOUND');

  const memberships = await ctx.db
      .query("server_members")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    if (memberships.length >= 50) {
      return { success: false, message: "SERVER_LIMIT_REACHED" };
    }

    let finalIcon = `https://ui-avatars.com/api/?name=${args.name.charAt(0)}&background=random&color=fff`;
    if (args.iconStorageId) {
      const url = await ctx.storage.getUrl(args.iconStorageId);
      if (url) finalIcon = url;
    }

    const newServerId = await ctx.db.insert('servers', {
      name: args.name,
      slug: args.name.toLowerCase().replace(/ /g, '-'),
      icon: finalIcon,
      creatorId: user._id,
      memberIds: [user._id],
      adminIds: [user._id],
    });

    let categoryName = 'KÊNH VĂN BẢN';
    let defaultChannels = ['chung'];

    if (args.template === 'Gaming') {
      categoryName = 'KÊNH CHƠI GAME';
      defaultChannels = ['sảnh-chờ', 'tìm-tổ-đội', 'thảo-luận-game'];
    } else if (args.template === 'Nhóm Học Tập') {
      categoryName = 'HỌC TẬP';
      defaultChannels = ['thảo-luận-chung', 'tài-liệu', 'giải-đáp'];
    } else if (args.template === 'Bạn bè') {
      categoryName = 'GÓC TÁM CHUYỆN';
      defaultChannels = ['chém-gió', 'kế-hoạch-đi-chơi'];
    }

    await ctx.db.insert('channels', {
      name: 'đại-sảnh',
      type: 'channel',
      serverId: newServerId,
      sortOrder: 0,
    });

    const catId = await ctx.db.insert('channels', {
      name: categoryName,
      type: 'category',
      serverId: newServerId,
      sortOrder: 1,
    });

    for (let i = 0; i < defaultChannels.length; i++) {
      await ctx.db.insert('channels', {
        name: defaultChannels[i],
        type: 'channel',
        serverId: newServerId,
        parentId: catId,
        sortOrder: i,
      });
    }

    return { success: true, serverId: newServerId };
  },
});

export const updateServer = mutation({
  args: {
    serverId: v.id('servers'),
    name: v.optional(v.string()),
    iconStorageId: v.optional(v.id('_storage')),
  },
  handler: async (ctx, args) => {
    const server = await ctx.db.get(args.serverId);
    if (!server) throw new Error('SERVER_NOT_FOUND');

    const updates: any = {};

    if (args.name) {
      updates.name = args.name;
      updates.slug = args.name.toLowerCase().replace(/ /g, '-');
    }

    if (args.iconStorageId) {
      updates.icon = await ctx.storage.getUrl(
        args.iconStorageId
      );
    }

    await ctx.db.patch(args.serverId, updates);
  },
});

export const addFriendToServer = mutation({
  args: {
    serverId: v.id('servers'),
    friendId: v.id('users'),
  },
  handler: async (ctx, args) => {
    const server = await ctx.db.get(args.serverId);
    if (!server) throw new Error('SERVER_ERROR');

    // 1. Kiểm tra giới hạn 50 server (Kiểm tra bằng bảng server_members mới)
    const memberships = await ctx.db
      .query("server_members")
      .withIndex("by_user", (q) => q.eq("userId", args.friendId))
      .collect();

    if (memberships.length >= 50) {
      throw new Error("SERVER_LIMIT_REACHED");
    }

    // 2. Kiểm tra xem người này đã có trong server_members chưa
    const existingMember = await ctx.db
      .query("server_members")
      .withIndex("by_server_user", (q) =>
        q.eq("serverId", args.serverId).eq("userId", args.friendId)
      )
      .unique();

    // 3. Nếu chưa có thì THÊM VÀO BẢNG server_members
    if (!existingMember) {
      await ctx.db.insert("server_members", {
        serverId: args.serverId,
        userId: args.friendId,
        role: "member", // Mặc định người được mời vào là member thường
        joinedAt: Date.now(),
      });

      if (server.memberIds !== undefined) {
         const members = [...server.memberIds];
         if (!members.includes(args.friendId)) {
           members.push(args.friendId);
           await ctx.db.patch(args.serverId, { memberIds: members });
         }
      }
    }
  },
});

export const deleteServer = mutation({
  args: { serverId: v.id('servers') },
  handler: async (ctx, args) => {
    // 1. Xóa tất cả các kênh và tin nhắn
    const channels = await ctx.db
      .query('channels')
      .withIndex('by_server', (q) => q.eq('serverId', args.serverId))
      .collect();

    for (const channel of channels) {
      const messages = await ctx.db
        .query('messages')
        .withIndex('by_channel', (q) => q.eq('channelId', channel._id))
        .collect();
      for (const msg of messages) {
        await ctx.db.delete(msg._id);
      }
      const channelSubs = await ctx.db.query('channel_subscriptions')
        .withIndex('by_channel', q => q.eq('channelId', channel._id))
        .collect();
      for (const cs of channelSubs) await ctx.db.delete(cs._id);
      await ctx.db.delete(channel._id);
    }

    // 2. Xóa subscription của server (chuông máy chủ)
    const serverSubs = await ctx.db.query('channel_subscriptions')
      .filter(q => q.eq(q.field('serverId'), args.serverId))
      .collect();
    for (const sub of serverSubs) {
      await ctx.db.delete(sub._id);
    }

    const serverMembers = await ctx.db
      .query("server_members")
      .withIndex("by_server", (q) => q.eq("serverId", args.serverId))
      .collect();
    for (const member of serverMembers) {
      await ctx.db.delete(member._id);
    }

    // Cuối cùng mới xóa server
    await ctx.db.delete(args.serverId);

    return { success: true };
  },
});

export const createChannel = mutation({
  args: {
    serverId: v.optional(v.id('servers')),       // Cho phép trống nếu tạo trong University
    universityId: v.optional(v.id('universities')), // Hỗ trợ thêm ID Trường học
    name: v.string(),
    type: v.string(),
    parentId: v.optional(v.id('channels')),
    isAnonymous: v.optional(v.boolean())
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("UNAUTHORIZED");
    const user = await ctx.db.query("users").withIndex("byClerkId", (q) => q.eq("clerkId", identity.subject)).unique();
    if (!user) throw new Error("USER_NOT_FOUND");

    // LẤY ID CỦA KHÔNG GIAN HIỆN TẠI (Server hoặc University)
    const targetId = args.serverId || args.universityId;
    if (!targetId) throw new Error("MISSING_WORKSPACE_ID");

    // KIỂM TRA QUYỀN TRUY CẬP (Nếu là Server thì phải là Owner mới được tạo)
    if (args.serverId) {
      const server = await ctx.db.get(args.serverId);
      if (!server || server.creatorId !== user._id) {
        throw new Error("ONLY_OWNER_CAN_CREATE_CHANNEL");
      }
    } 
    // (Bổ sung thêm: Nếu có logic check Admin của University thì viết ở đây)
    // else if (args.universityId) { ... }

    // TÌM CÁC KÊNH ĐANG TỒN TẠI TRONG KHÔNG GIAN NÀY
    let existing: any[] = [];
    if (args.serverId) {
      existing = await ctx.db.query('channels')
        .withIndex('by_server', q => q.eq('serverId', args.serverId as Id<"servers">))
        .collect();
    } else if (args.universityId) {
      existing = await ctx.db.query('channels')
        .withIndex('by_university', q => q.eq('universityId', args.universityId as Id<"universities">))
        .collect();
    }

    // TÍNH TOÁN THỨ TỰ SẮP XẾP (SORT ORDER)
    let newOrder = 0;
    if (args.type === 'category') {
        const categories = existing.filter(c => c.type === 'category');
        newOrder = categories.length > 0 ? Math.max(...categories.map(c => c.sortOrder)) + 1 : 1;
    } else {
        const siblings = existing.filter(c => c.parentId === args.parentId && c.type === 'channel');
        newOrder = siblings.length > 0 ? Math.max(...siblings.map(c => c.sortOrder)) + 1 : 0;
    }

    // CHUẨN HÓA TÊN (Kênh thì in thường có gạch nối, Danh mục thì in hoa)
    const formattedName = args.type === 'channel'
      ? args.name.toLowerCase().replace(/ /g, '-')
      : args.name.toUpperCase();

    // INSERT VÀO DATABASE
    const newChannelId = await ctx.db.insert('channels', {
      name: formattedName,
      type: args.type,
      serverId: args.serverId,
      universityId: args.universityId, // Lưu id trường học (nếu có)
      parentId: args.parentId,
      sortOrder: newOrder,
      isAnonymous: args.isAnonymous || false
    });

    return newChannelId;
  }
});

export const deleteChannel = mutation({
  args: { channelId: v.id('channels') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("UNAUTHORIZED");

    const user = await ctx.db.query("users").withIndex("byClerkId", (q) => q.eq("clerkId", identity.subject)).unique();
    if (!user) throw new Error("USER_NOT_FOUND");

    const channel = await ctx.db.get(args.channelId);
    if (!channel) throw new Error("CHANNEL_NOT_FOUND");

    if (!channel.serverId) {
      throw new Error("CANNOT_DELETE_SYSTEM_CHANNEL");
    }

    if (channel.name === 'đại-sảnh') {
      throw new Error("CANNOT_DELETE_GENERAL_CHANNEL");
    }

    const server = await ctx.db.get(channel.serverId);
    if (!server || server.creatorId !== user._id) {
      throw new Error("ONLY_OWNER_CAN_DELETE_CHANNEL");
    }

    if (channel.type === 'category') {
      const childChannels = await ctx.db.query('channels')
        .withIndex('by_server', q => q.eq('serverId', channel.serverId))
        .collect();

      for (const child of childChannels) {
        if (child.parentId === args.channelId) {
          const messages = await ctx.db.query('messages').withIndex('by_channel', q => q.eq('channelId', child._id)).collect();
          for (const msg of messages) await ctx.db.delete(msg._id);
          await ctx.db.delete(child._id);
        }
      }
    }
    else {
      const messages = await ctx.db.query('messages').withIndex('by_channel', q => q.eq('channelId', args.channelId)).collect();
      for (const msg of messages) await ctx.db.delete(msg._id);
    }

    await ctx.db.delete(args.channelId);
  }
});

export const getAllPostableWorkspaces = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { universities: [], servers: [] };

    const user = await ctx.db
      .query('users')
      .withIndex('byClerkId', (q) => q.eq('clerkId', identity.subject))
      .unique();

    if (!user) return { universities: [], servers: [] };

    const universities = await ctx.db.query('universities').collect();

    const allServers = await ctx.db.query('servers').collect();
    const myServers = allServers.filter(
      (s) => s.creatorId === user._id || s.memberIds.includes(user._id)
    );

    return {
      universities,
      servers: myServers,
    };
  },
});

export const removeMember = mutation({
  args: { serverId: v.id("servers"), targetUserId: v.id("users") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("UNAUTHORIZED");

    const user = await ctx.db.query("users").withIndex("byClerkId", (q) => q.eq("clerkId", identity.subject)).unique();
    const server = await ctx.db.get(args.serverId);

    if (!server || !user) throw new Error("INVALID_DATA");
    if (!server.adminIds || !server.adminIds.includes(user._id)) throw new Error("ONLY_ADMIN_ALLOWED");
    if (args.targetUserId === server.creatorId) throw new Error("CANNOT_REMOVE_OWNER");

    // 1. Xóa khỏi mảng memberIds và adminIds
    const newMembers = server.memberIds.filter(id => id !== args.targetUserId);
    const newAdmins = (server.adminIds || []).filter(id => id !== args.targetUserId);
    await ctx.db.patch(args.serverId, { memberIds: newMembers, adminIds: newAdmins });

    // 2. Xóa khỏi bảng server_members
    const memberRecord = await ctx.db.query("server_members")
      .withIndex("by_server_user", q => q.eq("serverId", args.serverId).eq("userId", args.targetUserId))
      .unique();
    if (memberRecord) await ctx.db.delete(memberRecord._id);

    // 3. Xóa subscription (chuông thông báo) của user bị đuổi
    const userSubs = await ctx.db.query('channel_subscriptions')
      .filter(q =>
        q.and(
          q.eq(q.field('userId'), args.targetUserId),
          q.eq(q.field('serverId'), args.serverId)
        )
      )
      .collect();
    for (const sub of userSubs) await ctx.db.delete(sub._id);
    
    return { success: true };
  }
});

export const leaveServer = mutation({
  args: { serverId: v.id('servers') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("UNAUTHORIZED");

    const user = await ctx.db.query("users").withIndex("byClerkId", (q) => q.eq("clerkId", identity.subject)).unique();
    const server = await ctx.db.get(args.serverId);

    if (!server || !user) throw new Error("INVALID_DATA");

    // Chủ server không được tự thoát
    if (server.creatorId === user._id) {
      throw new Error("OWNER_CANNOT_LEAVE");
    }

    // 1. Xóa khỏi mảng memberIds (và adminIds nếu có)
    const newMembers = server.memberIds.filter(id => id !== user._id);
    const newAdmins = (server.adminIds || []).filter(id => id !== user._id);
    await ctx.db.patch(args.serverId, { memberIds: newMembers, adminIds: newAdmins });

    // 2. Xóa khỏi bảng server_members
    const memberRecord = await ctx.db.query("server_members")
      .withIndex("by_server_user", q => q.eq("serverId", args.serverId).eq("userId", user._id))
      .unique();
    if (memberRecord) await ctx.db.delete(memberRecord._id);

    // 3. Xóa mọi thông báo (subscriptions) của người này trong server
    const userSubs = await ctx.db.query('channel_subscriptions')
      .filter(q =>
        q.and(
          q.eq(q.field('userId'), user._id),
          q.eq(q.field('serverId'), args.serverId)
        )
      )
      .collect();
    for (const sub of userSubs) await ctx.db.delete(sub._id);

    return { success: true };
  }
});

export const searchServers = query({
  args: { search: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const user = identity ? await ctx.db.query("users").withIndex("byClerkId", (q) => q.eq("clerkId", identity.subject)).unique() : null;

    const allServers = await ctx.db.query("servers").collect();

    const matchedServers = allServers.filter(server =>
      server.name.toLowerCase().includes(args.search.toLowerCase())
    );

    return Promise.all(matchedServers.map(async (server) => {
        let iconUrl = (server as any).iconStorageId
            ? await ctx.storage.getUrl((server as any).iconStorageId as Id<"_storage">)
            : null;

        const isJoined = user ? server.memberIds?.includes(user._id) : false;

        return { ...server, icon: iconUrl || server.icon, isJoined };
    }));
  }
});

export const joinServer = mutation({
  args: { serverId: v.id("servers") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("UNAUTHORIZED");

    const user = await ctx.db.query("users").withIndex("byClerkId", (q) => q.eq("clerkId", identity.subject)).unique();
    if (!user) throw new Error("USER_NOT_FOUND");

    const server = await ctx.db.get(args.serverId);
    if (!server) throw new Error("SERVER_NOT_FOUND");

    // 1. Kiểm tra giới hạn 50 server
    const memberships = await ctx.db.query("server_members")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    if (memberships.length >= 50) {
      throw new Error("SERVER_LIMIT_REACHED");
    }

    // 2. Kiểm tra xem đã tham gia chưa
    const existingMember = await ctx.db.query("server_members")
      .withIndex("by_server_user", (q) => q.eq("serverId", args.serverId).eq("userId", user._id))
      .unique();

    // 3. Nếu chưa tham gia thì tự động thêm vào
    if (!existingMember) {
      await ctx.db.insert("server_members", {
        serverId: args.serverId,
        userId: user._id,
        role: "member",
        joinedAt: Date.now(),
      });

      if (server.memberIds !== undefined) {
         const members = [...server.memberIds];
         if (!members.includes(user._id)) {
           members.push(user._id);
           await ctx.db.patch(args.serverId, { memberIds: members });
         }
      }
    }
    return { success: true };
  }
});

// Lấy danh sách ID các kênh đang bị ẩn của user trong 1 server
export const getHiddenChannelIds = query({
  args: { serverId: v.optional(v.id("servers")) },
  handler: async (ctx, args) => {
    if (!args.serverId) return [];
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const user = await ctx.db.query("users").withIndex("byClerkId", q => q.eq("clerkId", identity.subject)).unique();
    if (!user) return [];

    const subs = await ctx.db.query("channel_subscriptions")
      .withIndex("by_user_server", q => q.eq("userId", user._id).eq("serverId", args.serverId))
      .collect();

    // Chỉ lấy ra ID của các kênh có isHidden = true
    return subs.filter(s => s.isHidden && s.channelId).map(s => s.channelId);
  }
});

// Gạt công tắc (Toggle) trạng thái ẩn/hiện
export const toggleChannelVisibility = mutation({
  args: { channelId: v.id("channels"), serverId: v.id("servers") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("UNAUTHORIZED");
    const user = await ctx.db.query("users").withIndex("byClerkId", q => q.eq("clerkId", identity.subject)).unique();
    if (!user) return;

    const existing = await ctx.db.query("channel_subscriptions")
      .withIndex("by_user_channel", q => q.eq("userId", user._id).eq("channelId", args.channelId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { isHidden: !existing.isHidden });
    } else {
      await ctx.db.insert("channel_subscriptions", {
        userId: user._id,
        channelId: args.channelId,
        serverId: args.serverId,
        isSubscribed: true,
        isHidden: true // Mới tạo thì cho ẩn luôn vì user vừa gạt tắt
      });
    }
  }
});