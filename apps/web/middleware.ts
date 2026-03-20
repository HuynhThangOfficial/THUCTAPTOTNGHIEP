import { clerkMiddleware } from "@clerk/nextjs/server";

// Cấu hình cơ bản nhất: Cho phép tất cả các trang đều là Public
export default clerkMiddleware();

export const config = {
  matcher: [
    // Bỏ qua các file tĩnh (ảnh, css, js) và các file hệ thống của Next.js
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Luôn luôn chạy middleware cho các API routes
    '/(api|trpc)(.*)',
  ],
};