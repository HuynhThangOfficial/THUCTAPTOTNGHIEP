import { v } from 'convex/values';
import { query, mutation } from './_generated/server';

export const getList = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query('categories').collect();

    // 1. Trường Đại Học (VAA)
    const servers = all.filter((c) => c.type === 'university').sort((a,b) => a.sortOrder - b.sortOrder);

    // 2. Nhóm kênh (VD: CỘNG ĐỒNG, KHOÁ) - Type là 'category'
    const groups = all.filter((c) => c.type === 'category').sort((a,b) => a.sortOrder - b.sortOrder);

    // 3. Các kênh chat thực sự (VD: phòng-trọ, k17)
    const channels = all.filter((c) => c.type === 'channel').sort((a,b) => a.sortOrder - b.sortOrder);

    return { servers, groups, channels };
  },
});

export const seedData = mutation({
  args: {},
  handler: async (ctx) => {
    // Xóa dữ liệu cũ để tránh trùng lặp
    const all = await ctx.db.query('categories').collect();
    for (const item of all) await ctx.db.delete(item._id);

    // 1. Tạo Trường Đại Học: Học viện Hàng không
    const vaaId = await ctx.db.insert('categories', {
      name: 'Học viện Hàng không',
      slug: 'vaa',
      type: 'university',
      icon: 'local:login',
      sortOrder: 1,
    });

    // 2. Tạo kênh lẻ ở ngoài (Đại sảnh)
    await ctx.db.insert('categories', { name: 'đại-sảnh', slug: 'dai-sanh', type: 'channel', parentId: vaaId, icon: 'pound', sortOrder: 0 });

    // 3. Tạo Nhóm: CỘNG ĐỒNG
    const congDongId = await ctx.db.insert('categories', {
      name: 'CỘNG ĐỒNG',
      slug: 'cong-dong',
      type: 'category', // Đây là Mục Cha
      parentId: vaaId,
      sortOrder: 1,
    });

    // Các kênh con của CỘNG ĐỒNG
    const communityChannels = [
      'làm-quen-kết-nối', 'phòng-trọ', 'chia-sẻ-tài-liệu', 'mua-bán',
      'đồ-thất-lạc', 'kí-túc-xá', 'tổng-hợp-sự-kiện', 'đăng-ký-học-phần',
      'review-giảng-viên', 'việc-làm', 'quân-sự'
    ];

    for (let i = 0; i < communityChannels.length; i++) {
      await ctx.db.insert('categories', {
        name: communityChannels[i],
        slug: communityChannels[i],
        type: 'channel',
        parentId: congDongId, // Con của CỘNG ĐỒNG
        icon: 'pound',
        sortOrder: i,
      });
    }

    // 4. Tạo Nhóm: KHOÁ
    const khoaId = await ctx.db.insert('categories', {
      name: 'KHOÁ',
      slug: 'khoa',
      type: 'category', // Đây là Mục Cha
      parentId: vaaId,
      sortOrder: 2,
    });

    // Các kênh con của KHOÁ
    const khoaChannels = ['k17', 'k18', 'k19'];
    for (let i = 0; i < khoaChannels.length; i++) {
      await ctx.db.insert('categories', {
        name: khoaChannels[i],
        slug: khoaChannels[i],
        type: 'channel',
        parentId: khoaId, // Con của KHOÁ
        icon: 'pound',
        sortOrder: i,
      });
    }

    return "Đã tạo dữ liệu VAA theo yêu cầu!";
  },
});