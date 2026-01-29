import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

// Lấy tất cả trường
export const getUniversities = query({
  handler: async (ctx) => {
    return await ctx.db.query('universities').order('asc').collect();
  },
});

// Lấy danh sách kênh của một trường
export const getChannels = query({
  args: { universityId: v.optional(v.id('universities')) },
  handler: async (ctx, args) => {
    // Nếu không có ID trường, trả về mảng rỗng ngay lập tức
    if (!args.universityId) return { groups: [], channels: [] };

    const all = await ctx.db
      .query('channels')
      // Thêm ! để fix lỗi TS: args.universityId!
      .withIndex('by_university', (q) => q.eq('universityId', args.universityId!))
      .collect();

    const groups = all.filter((c) => c.type === 'category').sort((a, b) => a.sortOrder - b.sortOrder);
    const channels = all.filter((c) => c.type === 'channel').sort((a, b) => a.sortOrder - b.sortOrder);

    return { groups, channels };
  },
});

// Hàm tạo dữ liệu mẫu và migrate
export const seedAndMigrate = mutation({
  handler: async (ctx) => {
    let vaa = await ctx.db.query('universities').filter(q => q.eq(q.field('slug'), 'vaa')).first();
    if (!vaa) {
      const vaaId = await ctx.db.insert('universities', {
        name: 'Học viện Hàng không',
        slug: 'vaa',
        icon: 'local:login',
        sortOrder: 1,
      });
      vaa = await ctx.db.get(vaaId);
    }

    // Tạo kênh đại sảnh
    let generalChannel = await ctx.db.query('channels')
        .withIndex('by_university', q => q.eq('universityId', vaa!._id))
        .filter(q => q.eq(q.field('name'), 'đại-sảnh'))
        .first();

    if (!generalChannel) {
        const generalId = await ctx.db.insert('channels', {
            name: 'đại-sảnh',
            type: 'channel',
            universityId: vaa!._id,
            sortOrder: 0
        });
        generalChannel = await ctx.db.get(generalId);
    }

    // Tạo nhóm CỘNG ĐỒNG
    let congDong = await ctx.db.query('channels').withIndex('by_university', q=>q.eq('universityId', vaa!._id)).filter(q=>q.eq(q.field('name'), 'CỘNG ĐỒNG')).first();
    if(!congDong) {
        const cdId = await ctx.db.insert('channels', { name: 'CỘNG ĐỒNG', type: 'category', universityId: vaa!._id, sortOrder: 1 });
        congDong = await ctx.db.get(cdId);
        const subs = ['làm-quen-kết-nối', 'phòng-trọ', 'mua-bán', 'đồ-thất-lạc'];
        for(let i=0; i<subs.length; i++) await ctx.db.insert('channels', { name: subs[i], type: 'channel', universityId: vaa!._id, parentId: congDong!._id, sortOrder: i });
    }

    // Tạo nhóm KHOÁ
    let khoa = await ctx.db.query('channels').withIndex('by_university', q=>q.eq('universityId', vaa!._id)).filter(q=>q.eq(q.field('name'), 'KHOÁ')).first();
    if(!khoa) {
        const kId = await ctx.db.insert('channels', { name: 'KHOÁ', type: 'category', universityId: vaa!._id, sortOrder: 2 });
        khoa = await ctx.db.get(kId);
        const subs = ['k17', 'k18', 'k19'];
        for(let i=0; i<subs.length; i++) await ctx.db.insert('channels', { name: subs[i], type: 'channel', universityId: vaa!._id, parentId: khoa!._id, sortOrder: i });
    }

    // DI CƯ (MIGRATE)
    const allMessages = await ctx.db.query('messages').collect();
    let count = 0;
    for (const msg of allMessages) {
        if (!msg.channelId) {
            await ctx.db.patch(msg._id, { channelId: generalChannel!._id });
            count++;
        }
    }

    return `Xong! Đã chuyển ${count} bài viết cũ vào Đại sảnh VAA.`;
  },
});