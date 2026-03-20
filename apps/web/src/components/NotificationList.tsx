"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { MessageSquare, Bell, Heart, UserPlus, Check } from "lucide-react";
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
      {notifications.map((notif: any) => (
        <div 
          key={notif._id} 
          className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors relative
            ${notif.isRead ? 'hover:bg-gray-100' : 'bg-emerald-50 hover:bg-emerald-100'}`}
          onClick={() => !notif.isRead && markRead({ notificationId: notif._id })}
        >
          <img src={notif.sender?.imageUrl || "https://via.placeholder.com/40"} alt="Avt" className="w-9 h-9 rounded-full object-cover shrink-0" />
          <div className="flex-1 min-w-0 space-y-0.5">
            <p className="text-[13px] text-gray-800">
              <span className="font-bold text-gray-900">{notif.sender?.first_name}</span> 
              {notif.type === 'post' ? ' đã đăng một bài mới' : notif.type === 'follow' ? ' đã bắt đầu theo dõi bạn' : ' đã nhắn tin cho bạn'}
            </p>
            <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
              {notif.type === 'message' ? <MessageSquare className="w-3 h-3" /> : <Bell className="w-3 h-3" />}
              
              {/* SỬ DỤNG DATE-FNS TẠI ĐÂY */}
              <span className="first-letter:uppercase">
                {formatDistanceToNow(new Date(notif._creationTime), { addSuffix: true, locale: vi })}
              </span>
              
            </div>
          </div>
          {!notif.isRead && <span className="absolute top-3 right-3 w-2 h-2 bg-emerald-500 rounded-full"></span>}
        </div>
      ))}
    </div>
  );
}