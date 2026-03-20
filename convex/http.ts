import { httpRouter } from 'convex/server';
import { httpAction } from './_generated/server';
import { internal } from './_generated/api';

const http = httpRouter();

const handleClerkWebhook = httpAction(async (ctx, request) => {
  const payload = await request.json();
  const { data, type } = payload;

  switch (type) {
    case 'user.created': {
      // Ưu tiên cắt phần trước dấu @ của email làm username
      const safeUsername = data.username || 
                           data.email_addresses?.[0]?.email_address?.split('@')[0] || 
                           data.first_name || 
                           "user";

      await ctx.runMutation(internal.users.createUser, {
        clerkId: data.id,
        first_name: data.first_name ?? undefined,
        last_name: data.last_name ?? undefined,
        email: data.email_addresses?.[0]?.email_address ?? "",
        imageUrl: data.image_url ?? undefined,
        username: safeUsername.toLowerCase(), // Lưu luôn thành chữ thường cho chuẩn
        followersCount: 0,
      });
      break;
    }

    case 'user.updated': {
      // ĐỒNG BỘ CẬP NHẬT KHI USER SỬA THÔNG TIN BÊN CLERK
      const safeUsername = data.username || 
                           data.email_addresses?.[0]?.email_address?.split('@')[0] || 
                           data.first_name || 
                           "user";

      // Cần gọi một mutation nội bộ để cập nhật (bạn cần đảm bảo có hàm này trong file convex/users.ts)
      await ctx.runMutation(internal.users.updateUserFromClerk, {
        clerkId: data.id,
        first_name: data.first_name ?? undefined,
        last_name: data.last_name ?? undefined,
        imageUrl: data.image_url ?? undefined,
        username: safeUsername.toLowerCase(),
      });
      break;
    }

    case 'user.deleted': {
      // Có thể kích hoạt khi Thắng muốn dọn dẹp data khi user xóa acc bên Clerk
      // await ctx.runMutation(internal.users.deleteUser, { clerkId: data.id });
      break;
    }

    default:
      console.log(`Unhandled webhook type: ${type}`);
      break;
  }

  return new Response(null, { status: 200 });
});

http.route({
  path: '/clerk-users-webhook',
  method: 'POST',
  handler: handleClerkWebhook,
});

export default http;