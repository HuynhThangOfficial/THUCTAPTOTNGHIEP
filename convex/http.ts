import { httpRouter } from 'convex/server';
import { httpAction } from './_generated/server';
import { internal } from './_generated/api';

const http = httpRouter();

const handleClerkWebhook = httpAction(async (ctx, request) => {
  const payload = await request.json();
  const { data, type } = payload;

  switch (type) {
    case 'user.created':
      const safeUsername = data.username || data.first_name || data.email_addresses?.[0]?.email_address?.split('@')[0] || "nguoidung";
      await ctx.runMutation(internal.users.createUser, {
        clerkId: data.id,
        // Chuyển null thành undefined để khớp với v.optional trong schema
        first_name: data.first_name ?? undefined,
        last_name: data.last_name ?? undefined,
        // Đảm bảo không lỗi nếu mảng email trống
        email: data.email_addresses?.[0]?.email_address ?? "",
        imageUrl: data.image_url ?? undefined,
        // Schema của bạn cho phép v.null() ở username nên giữ nguyên hoặc ?? null
        username: safeUsername,
        followersCount: 0,
      });
      break;

    case 'user.deleted':
      // Bạn nên thêm logic xóa user ở đây nếu cần
      // await ctx.runMutation(internal.users.deleteUser, { clerkId: data.id });
      break;

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
