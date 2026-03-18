import { useState } from 'react';
import { Bell, Loader2, Send, CheckCircle2 } from 'lucide-react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@convex/_generated/api';

const NotificationsContent = () => {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [target, setTarget] = useState('all');
  const [isSending, setIsSending] = useState(false);

  // Móc API Convex
  const history = useQuery(api.admin.adminGetBroadcasts);
  const sendBroadcast = useMutation(api.admin.adminSendBroadcast);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('vi-VN', {
      hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric'
    });
  };

  const translateTarget = (val: string) => {
    switch(val) {
      case 'all': return 'Tất cả';
      case 'admin': return 'Quản trị viên';
      case 'user': return 'Thành viên';
      default: return val;
    }
  };

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      alert("Vui lòng nhập đầy đủ Tiêu đề và Nội dung!");
      return;
    }

    try {
      setIsSending(true);
      const sentCount = await sendBroadcast({
        title: title.trim(),
        message: message.trim(),
        target: target
      });
      
      alert(`🎉 Đã gửi thành công tới ${sentCount} người dùng!`);
      
      // Xóa trắng form sau khi gửi
      setTitle('');
      setMessage('');
      setTarget('all');
    } catch (error) {
      alert("Có lỗi xảy ra khi gửi thông báo!");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* CỘT TRÁI: FORM GỬI THÔNG BÁO */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-6 flex items-center gap-2">
            <Bell className="w-5 h-5 text-emerald-500" />
            Gửi thông báo hệ thống
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tiêu đề (Bắt buộc)</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="VD: Bảo trì hệ thống đêm nay..."
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Nội dung chi tiết</label>
              <textarea
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Nhập nội dung thông báo đầy đủ tại đây..."
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Gửi đến nhóm người dùng</label>
              <select
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                <option value="all">Tất cả mọi người</option>
                <option value="admin">Chỉ Ban quản trị (Admin)</option>
                <option value="user">Chỉ Thành viên thường (User)</option>
              </select>
            </div>
            
            <button 
              onClick={handleSend}
              disabled={isSending}
              className="flex items-center justify-center gap-2 px-6 py-3 mt-2 bg-gradient-to-r from-emerald-500 to-green-600 text-white font-medium rounded-xl hover:from-emerald-600 hover:to-green-700 transition-all shadow-lg shadow-emerald-200 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isSending ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Đang rải thông báo...</>
              ) : (
                <><Send className="w-5 h-5" /> Phát thanh ngay</>
              )}
            </button>
          </div>
        </div>

        {/* CỘT PHẢI: LỊCH SỬ GỬI */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 h-fit max-h-[600px] flex flex-col">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2 shrink-0">
            <CheckCircle2 className="w-5 h-5 text-blue-500" />
            Lịch sử đã gửi
          </h3>
          
          <div className="space-y-3 overflow-y-auto pr-2 custom-scrollbar">
            {history === undefined ? (
              <div className="py-8 text-center text-gray-500">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-500" />
                Đang tải...
              </div>
            ) : history.length === 0 ? (
              <div className="py-8 text-center text-gray-500 text-sm bg-gray-50 rounded-xl border border-dashed border-gray-200">
                Chưa gửi thông báo nào.
              </div>
            ) : (
              history.map((notif) => (
                <div key={notif._id} className="p-4 bg-gray-50 rounded-xl border border-gray-100 hover:border-emerald-200 hover:bg-emerald-50/30 transition-colors">
                  <p className="font-semibold text-gray-800 text-sm mb-1">{notif.title}</p>
                  <p className="text-xs text-gray-500 mb-2 line-clamp-2">{notif.message}</p>
                  
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200/60">
                    <p className="text-[11px] text-gray-500">{formatDate(notif._creationTime)}</p>
                    <p className="text-xs font-medium text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">
                      Đã gửi: {notif.sentCount} ({translateTarget(notif.target)})
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationsContent;