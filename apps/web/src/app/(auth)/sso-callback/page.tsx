// Xóa dòng "use client" ở đây
import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";

export default function SSOCallbackPage() {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-[#f2f3f5]">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full"></div>
        <p className="text-gray-600 font-medium text-lg">Đang xác thực...</p>
      </div>
      <AuthenticateWithRedirectCallback />
    </div>
  );
}