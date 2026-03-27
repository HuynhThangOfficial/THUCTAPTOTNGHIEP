"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { MessageSquare, Bell, UserPlus, ShieldAlert } from "lucide-react";
// Import thư viện chuẩn
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";

export default function NotificationList() {
  const notifications = useQuery(api.messages.getNotifications);
  const markRead = useMutation(api.messages.markNotificationRead);

  if (notifications === undefined) {
    return <div className="p-4 text-center text-gray-400 text-sm">Đang tải thông báo...</div>;
  }

  if (notifications === null || notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 p-6">
        <Bell className="w-12 h-12 mb-3 opacity-20" />
        <p className="text-[14px] font-semibold">Hết sạch thông báo!</p>
        <p className="text-[12px]">Khi có gì mới, nó sẽ hiện ở đây.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto hidden-scrollbar space-y-1 p-2">
      {notifications.map((notif: any) => {
        // 👇 XỬ LÝ ĐA DẠNG CÁC LOẠI THÔNG BÁO TẠI ĐÂY 👇
        const isSystem = notif.type === 'system';
        
        // 1. Xử lý Tên người gửi
        const senderName = isSystem 
            ? "Hệ thống AI" 
            : (notif.sender?.first_name || notif.sender?.username || "Ai đó");

        // 2. Xử lý Avatar (Hệ thống màu đỏ, User màu bình thường)
        const avatarUrl = isSystem 
            ? "https://ui-avatars.com/api/?name=AI&background=ef4444&color=fff" 
            : (notif.sender?.imageUrl || "https://ui-avatars.com/api/?name=U&background=e5e7eb&color=9ca3af");

        // 3. Xử lý Nội dung thông báo
        // 3. Xử lý Nội dung thông báo
        let actionText = "";
        let IconComponent = Bell;

        if (isSystem) {
           actionText = notif.content;
           IconComponent = ShieldAlert;
        } else if (notif.type === 'mention') {
           actionText = notif.content || ' đã nhắc đến bạn trong một bình luận';
           IconComponent = MessageSquare;
        } else if (notif.type === 'post') {
           actionText = ' đã đăng một bài mới';
        } else if (notif.type === 'follow') {
           actionText = ' đã bắt đầu theo dõi bạn';
           IconComponent = UserPlus;
        } else {
           actionText = ' đã nhắn tin cho bạn';
           IconComponent = MessageSquare;
        }

        return (
          <div 
            key={notif._id} 
            className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors relative
              ${notif.isRead ? 'hover:bg-gray-100' : (isSystem ? 'bg-red-50 hover:bg-red-100' : 'bg-emerald-50 hover:bg-emerald-100')}`}
            onClick={() => !notif.isRead && markRead({ notificationId: notif._id })}
          >
            <img loading="lazy" src={avatarUrl} alt="Avt" className="w-9 h-9 rounded-full object-cover shrink-0" />
            <div className="flex-1 min-w-0 space-y-0.5">
              
              <p className={`text-[13px] ${isSystem ? 'text-red-800' : 'text-gray-800'}`}>
                <span className="font-bold">{senderName}</span> 
                {isSystem ? `: ${actionText}` : actionText}
              </p>

              <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                <IconComponent className="w-3 h-3" />
                <span className="first-letter:uppercase">
                  {formatDistanceToNow(new Date(notif._creationTime), { addSuffix: true, locale: vi })}
                </span>
              </div>
            </div>
            {!notif.isRead && (
                <span className={`absolute top-3 right-3 w-2 h-2 rounded-full ${isSystem ? 'bg-red-500' : 'bg-emerald-500'}`}></span>
            )}
          </div>
        );
      })}
    </div>
  );
}