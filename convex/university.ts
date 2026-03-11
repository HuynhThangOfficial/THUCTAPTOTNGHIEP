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

// =====================================================
// seedAndMigrate (GIỮ NGUYÊN TOÀN BỘ LOGIC CŨ)
// =====================================================
export const seedAndMigrate = mutation({
  handler: async (ctx) => {
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

    const ensureCategoryWithChannels = async (
      catName: string,
      catOrder: number,
      subChannels: string[]
    ) => {
      let category = await ctx.db
        .query('channels')
        .withIndex('by_university', (q) =>
          q.eq('universityId', uniId)
        )
        .filter((q) => q.eq(q.field('name'), catName))
        .filter((q) => q.eq(q.field('type'), 'category'))
        .first();

      let catId: Id<'channels'>;

      if (!category) {
        catId = await ctx.db.insert('channels', {
          name: catName,
          type: 'category',
          universityId: uniId,
          sortOrder: catOrder,
        });
      } else {
        catId = category._id;
      }

      for (let i = 0; i < subChannels.length; i++) {
        const subName = subChannels[i];

        const existing = await ctx.db
          .query('channels')
          .withIndex('by_university', (q) =>
            q.eq('universityId', uniId)
          )
          .filter((q) => q.eq(q.field('name'), subName))
          .filter((q) => q.eq(q.field('parentId'), catId))
          .first();

        if (!existing) {
          await ctx.db.insert('channels', {
            name: subName,
            type: 'channel',
            universityId: uniId,
            parentId: catId,
            sortOrder: i,
          });
        }
      }
    };

    let generalChannel = await ctx.db
      .query('channels')
      .withIndex('by_university', (q) =>
        q.eq('universityId', uniId)
      )
      .filter((q) => q.eq(q.field('name'), 'đại-sảnh'))
      .first();

    if (!generalChannel) {
      const generalId = await ctx.db.insert('channels', {
        name: 'đại-sảnh',
        type: 'channel',
        universityId: uniId,
        sortOrder: 0,
      });
      generalChannel = await ctx.db.get(generalId);
    }

    await ensureCategoryWithChannels('CỘNG ĐỒNG', 1, [
      'làm-quen-kết-nối', 'phòng-trọ', 'chia-sẻ-tài-liệu', 'mua-bán', 'đồ-thất-lạc', 'kí-túc-xá', 'tổng-hợp-sự-kiện', 'đăng-ký-học-phần', 'review-giảng-viên', 'việc-làm', 'quân-sự',
    ]);
    await ensureCategoryWithChannels('KHOÁ', 2, ['k17', 'k18', 'k19', 'k20']);
    await ensureCategoryWithChannels('KHOA', 3, [
      'khoa-công-nghệ-thông-tin', 'khoa-kinh-tế-hàng-không', 'khoa-cơ-bản', 'khoa-quản-trị-kinh-doanh', 'khoa-xây-dựng', 'khoa-khai-khác-hàng-không', 'khoa-kỹ-thuật-hàng-không', 'khoa-điện-điện-tử', 'khoa-du-lịch-và-dịch-vụ-hàng-không', 'khoa-ngoại-ngữ',
    ]);
    await ensureCategoryWithChannels('CLB', 4, ['clb-bóng-chuyền', 'clb-tổ-chức-sự-kiện', 'clb-khoa-học-trẻ']);
    await ensureCategoryWithChannels('CƠ SỞ', 5, ['cơ-sở-1', 'cơ-sở-2']);

    const allMessages = await ctx.db.query('messages').collect();
    for (const msg of allMessages) {
      if (!msg.channelId) {
        await ctx.db.patch(msg._id, { channelId: generalChannel!._id });
      }
    }
    return 'Hoàn tất';
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
    if (!identity) throw new Error('Chưa đăng nhập');

    const user = await ctx.db
      .query('users')
      .withIndex('byClerkId', (q) =>
        q.eq('clerkId', identity.subject)
      )
      .unique();

    if (!user) throw new Error('Không tìm thấy user');

    const existing = await ctx.db
      .query('servers')
      .filter((q) => q.eq(q.field('creatorId'), user._id))
      .first();

    if (existing) {
      return {
        success: false,
        message: "Bạn đã tạo một máy chủ rồi! Mỗi người dùng chỉ được tạo tối đa 1 máy chủ."
      };
    }

    const allServers = await ctx.db.query('servers').collect();
    const myMembershipCount = allServers.filter(s => s.memberIds.includes(user._id)).length;
    if (myMembershipCount >= 100) {
      return { success: false, message: "Bạn đã đạt giới hạn tối đa 100 server." };
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
    if (!server) throw new Error('Không tìm thấy máy chủ');

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
    if (!server) throw new Error('Lỗi máy chủ');

    // 1. Kiểm tra giới hạn 100 server (Kiểm tra bằng bảng server_members mới)
    const memberships = await ctx.db
      .query("server_members")
      .withIndex("by_user", (q) => q.eq("userId", args.friendId))
      .collect();

    if (memberships.length >= 100) {
      throw new Error("Người dùng này đã tham gia tối đa 100 server.");
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
    // 1. Xóa tất cả các kênh và tin nhắn (giữ nguyên code cũ của bạn)
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
    serverId: v.id('servers'),
    name: v.string(),
    type: v.string(),
    parentId: v.optional(v.id('channels'))
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Chưa đăng nhập");
    const user = await ctx.db.query("users").withIndex("byClerkId", (q) => q.eq("clerkId", identity.subject)).unique();
    if (!user) throw new Error("Không tìm thấy user");

    const server = await ctx.db.get(args.serverId);
    if (!server || server.creatorId !== user._id) {
      throw new Error("Chỉ chủ máy chủ mới được quyền tạo kênh!");
    }

    const existing = await ctx.db.query('channels')
      .withIndex('by_server', q => q.eq('serverId', args.serverId))
      .collect();

    let newOrder = 0;
    if (args.type === 'category') {
        const categories = existing.filter(c => c.type === 'category');
        newOrder = categories.length > 0 ? Math.max(...categories.map(c => c.sortOrder)) + 1 : 1;
    } else {
        const siblings = existing.filter(c => c.parentId === args.parentId && c.type === 'channel');
        newOrder = siblings.length > 0 ? Math.max(...siblings.map(c => c.sortOrder)) + 1 : 0;
    }

    const formattedName = args.type === 'channel'
      ? args.name.toLowerCase().replace(/ /g, '-')
      : args.name.toUpperCase();

    const newChannelId = await ctx.db.insert('channels', {
      name: formattedName,
      type: args.type,
      serverId: args.serverId,
      parentId: args.parentId,
      sortOrder: newOrder
    });

    return newChannelId;
  }
});

export const deleteChannel = mutation({
  args: { channelId: v.id('channels') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Chưa đăng nhập");

    const user = await ctx.db.query("users").withIndex("byClerkId", (q) => q.eq("clerkId", identity.subject)).unique();
    if (!user) throw new Error("Không tìm thấy user");

    const channel = await ctx.db.get(args.channelId);
    if (!channel) throw new Error("Không tìm thấy kênh");

    if (!channel.serverId) {
      throw new Error("Không thể xóa kênh của trường hệ thống!");
    }

    if (channel.name === 'đại-sảnh') {
      throw new Error("Không thể xóa kênh đại sảnh mặc định!");
    }

    const server = await ctx.db.get(channel.serverId);
    if (!server || server.creatorId !== user._id) {
      throw new Error("Chỉ chủ máy chủ mới được quyền xóa kênh!");
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
    if (!identity) throw new Error("Chưa đăng nhập");

    const user = await ctx.db.query("users").withIndex("byClerkId", (q) => q.eq("clerkId", identity.subject)).unique();
    const server = await ctx.db.get(args.serverId);

    if (!server || !user) throw new Error("Dữ liệu không hợp lệ");
    if (!server.adminIds || !server.adminIds.includes(user._id)) throw new Error("Chỉ quản trị viên mới có quyền này");
    if (args.targetUserId === server.creatorId) throw new Error("Không thể xóa chủ server");

    const newMembers = server.memberIds.filter(id => id !== args.targetUserId);
    const newAdmins = (server.adminIds || []).filter(id => id !== args.targetUserId);

    await ctx.db.patch(args.serverId, { memberIds: newMembers, adminIds: newAdmins });

    // Xóa subscription của user bị đuổi
    const userSubs = await ctx.db.query('channel_subscriptions')
          .filter(q =>
            q.and(
              q.eq(q.field('userId'), args.targetUserId),
              q.eq(q.field('serverId'), args.serverId)
            )
          )
          .collect();
        for (const sub of userSubs) await ctx.db.delete(sub._id);
  }
});

export const leaveServer = mutation({
  args: { serverId: v.id('servers') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Chưa đăng nhập");

    const user = await ctx.db.query("users").withIndex("byClerkId", (q) => q.eq("clerkId", identity.subject)).unique();
    const server = await ctx.db.get(args.serverId);

    if (!server || !user) throw new Error("Dữ liệu không hợp lệ");

    // Chủ server không được tự thoát, chỉ được xóa server
    if (server.creatorId === user._id) {
      throw new Error("Bạn là chủ máy chủ nên không thể tự thoát. Hãy dùng chức năng Xóa máy chủ.");
    }

    // 1. Xóa khỏi mảng memberIds (và adminIds nếu có)
    const newMembers = server.memberIds.filter(id => id !== user._id);
    const newAdmins = (server.adminIds || []).filter(id => id !== user._id);
    await ctx.db.patch(args.serverId, { memberIds: newMembers, adminIds: newAdmins });

    // 2. Xóa khỏi bảng server_members (Nếu bạn đang dùng bảng này)
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