// convex/university.ts
import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { Doc, Id } from './_generated/dataModel';

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
    if (!args.universityId) return { groups: [], channels: [] };

    const all = await ctx.db
      .query('channels')
      .withIndex('by_university', (q) => q.eq('universityId', args.universityId!))
      .collect();

    // Sắp xếp theo sortOrder
    const groups = all
      .filter((c) => c.type === 'category')
      .sort((a, b) => a.sortOrder - b.sortOrder);

    const channels = all
      .filter((c) => c.type === 'channel')
      .sort((a, b) => a.sortOrder - b.sortOrder);

    return { groups, channels };
  },
});

// Hàm tạo dữ liệu mẫu và migrate
export const seedAndMigrate = mutation({
  handler: async (ctx) => {
    // 1. Tạo hoặc lấy trường VAA
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
    const uniId = vaa!._id;

    // Helper function
    const ensureCategoryWithChannels = async (
      catName: string,
      catOrder: number,
      subChannels: string[]
    ) => {
      let category = await ctx.db.query('channels')
        .withIndex('by_university', q => q.eq('universityId', uniId))
        .filter(q => q.eq(q.field('name'), catName))
        .filter(q => q.eq(q.field('type'), 'category'))
        .first();

      let catId: Id<'channels'>;
      if (!category) {
        catId = await ctx.db.insert('channels', {
          name: catName,
          type: 'category',
          universityId: uniId,
          sortOrder: catOrder
        });
      } else {
        catId = category._id;
      }

      for (let i = 0; i < subChannels.length; i++) {
        const subName = subChannels[i];
        const existing = await ctx.db.query('channels')
          .withIndex('by_university', q => q.eq('universityId', uniId))
          .filter(q => q.eq(q.field('name'), subName))
          .filter(q => q.eq(q.field('parentId'), catId))
          .first();

        if (!existing) {
          await ctx.db.insert('channels', {
            name: subName,
            type: 'channel',
            universityId: uniId,
            parentId: catId,
            sortOrder: i
          });
        }
      }
    };

    // 2. Kênh Độc lập
    let generalChannel = await ctx.db.query('channels')
        .withIndex('by_university', q => q.eq('universityId', uniId))
        .filter(q => q.eq(q.field('name'), 'đại-sảnh'))
        .first();

    if (!generalChannel) {
        const generalId = await ctx.db.insert('channels', { name: 'đại-sảnh', type: 'channel', universityId: uniId, sortOrder: 0 });
        generalChannel = await ctx.db.get(generalId);
    }

    // 3. Cập nhật các nhóm (Đã bỏ Cơ sở 3)
    await ensureCategoryWithChannels('CỘNG ĐỒNG', 1, [
      'làm-quen-kết-nối', 'phòng-trọ', 'chia-sẻ-tài-liệu', 'mua-bán',
      'đồ-thất-lạc', 'kí-túc-xá', 'tổng-hợp-sự-kiện', 'đăng-ký-học-phần',
      'review-giảng-viên', 'việc-làm', 'quân-sự'
    ]);

    await ensureCategoryWithChannels('KHOÁ', 2, ['k17', 'k18', 'k19', 'k20']);

    await ensureCategoryWithChannels('KHOA', 3, [
      'khoa-công-nghệ-thông-tin', 'khoa-kinh-tế-hàng-không', 'khoa-cơ-bản',
      'khoa-quản-trị-kinh-doanh', 'khoa-xây-dựng', 'khoa-khai-khác-hàng-không',
      'khoa-kỹ-thuật-hàng-không', 'khoa-điện-điện-tử', 'khoa-du-lịch-và-dịch-vụ-hàng-không', 'khoa-ngoại-ngữ'
    ]);

    await ensureCategoryWithChannels('CLB', 4, ['clb-bóng-chuyền', 'clb-tổ-chức-sự-kiện', 'clb-khoa-học-trẻ']);

    // Chỉ có Cơ sở 1 và 2
    await ensureCategoryWithChannels('CƠ SỞ', 5, ['cơ-sở-1', 'cơ-sở-2']);

    // Migrate bài viết cũ
    const allMessages = await ctx.db.query('messages').collect();
    for (const msg of allMessages) {
        if (!msg.channelId) {
            await ctx.db.patch(msg._id, { channelId: generalChannel!._id });
        }
    }
    return "Hoàn tất";
  },
});