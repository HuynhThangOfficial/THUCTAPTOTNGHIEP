import { AlertTriangle, CheckCircle, Info, Loader2, ShieldAlert, UserCog, Mail } from 'lucide-react';
import { useQuery } from 'convex/react';
import { api } from '@convex/_generated/api';

const PermissionsContent = () => {
  // Lấy dữ liệu từ Backend
  const logs = useQuery(api.admin.adminGetAuditLogs);
  const adminUsers = useQuery(api.admin.adminGetAdminUsers);

  const formatTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `Vừa xong`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} phút trước`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} giờ trước`;
    const days = Math.floor(hours / 24);
    return `${days} ngày trước`;
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* CỘT TRÁI (1/3): DANH SÁCH BAN QUẢN TRỊ */}
        <div className="lg:col-span-1 bg-white rounded-2xl p-6 shadow-sm border border-gray-100 h-fit">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <UserCog className="w-5 h-5 text-purple-500" />
              Ban quản trị hệ thống
            </h3>
            <span className="bg-purple-100 text-purple-700 text-xs font-bold px-2.5 py-1 rounded-full">
              {adminUsers?.length || 0}
            </span>
          </div>

          <div className="space-y-3">
            {adminUsers === undefined ? (
              <div className="py-8 text-center text-gray-500">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-purple-500" />
              </div>
            ) : adminUsers.length === 0 ? (
              <div className="py-6 text-center text-gray-500 text-sm bg-gray-50 rounded-xl border border-dashed border-gray-200">
                Chưa có ai được cấp quyền Admin.
              </div>
            ) : (
              adminUsers.map((admin) => (
                <div key={admin._id} className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center gap-3">
                  {admin.imageUrl ? (
                    <img src={admin.imageUrl} alt={admin.username} className="w-10 h-10 rounded-full object-cover border border-gray-200 shrink-0" />
                  ) : (
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full flex items-center justify-center font-bold text-white shrink-0">
                      {admin.username?.charAt(0).toUpperCase() || 'A'}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-800 text-sm truncate">
                      {admin.first_name ? `${admin.first_name} ${admin.last_name || ''}` : admin.username}
                    </p>
                    <p className="text-[11px] text-gray-500 truncate flex items-center gap-1 mt-0.5">
                      <Mail className="w-3 h-3" /> {admin.email}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* CỘT PHẢI (2/3): NHẬT KÝ HOẠT ĐỘNG QUẢN TRỊ */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-gray-100 h-fit max-h-[800px] flex flex-col">
          <h3 className="text-lg font-semibold text-gray-800 mb-6 flex items-center gap-2 shrink-0">
            <ShieldAlert className="w-5 h-5 text-orange-500" />
            Nhật ký hoạt động Quản trị
          </h3>
          
          <div className="space-y-3 overflow-y-auto pr-2 custom-scrollbar">
            {logs === undefined ? (
              <div className="py-12 text-center text-gray-500">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-emerald-500" />
                Đang tải dữ liệu nhật ký...
              </div>
            ) : logs.length === 0 ? (
              <div className="py-16 flex flex-col items-center justify-center text-gray-500 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                <ShieldAlert className="w-12 h-12 text-gray-300 mb-3" />
                <p className="font-medium text-gray-600">Nhật ký hệ thống đang trống</p>
                <span className="text-sm text-gray-400 mt-1">Các thao tác của Admin sẽ được tự động ghi lại tại đây.</span>
              </div>
            ) : (
              logs.map((log) => (
                <div key={log._id} className="flex items-start gap-4 p-4 hover:bg-gray-50 rounded-xl transition-colors border border-gray-100 hover:border-emerald-100">
                  <div
                    className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center shadow-sm ${
                      log.type === 'danger'
                        ? 'bg-red-100 text-red-600'
                        : log.type === 'warning'
                        ? 'bg-orange-100 text-orange-600'
                        : log.type === 'success'
                        ? 'bg-emerald-100 text-emerald-600'
                        : 'bg-blue-100 text-blue-600'
                    }`}
                  >
                    {log.type === 'danger' ? (
                      <AlertTriangle className="w-5 h-5" />
                    ) : log.type === 'success' ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : log.type === 'warning' ? (
                      <AlertTriangle className="w-5 h-5" />
                    ) : (
                      <Info className="w-5 h-5" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                      <p className="text-sm font-semibold text-gray-800">{log.action}</p>
                      <span className="text-[11px] font-medium text-gray-400 whitespace-nowrap bg-gray-100 px-2 py-0.5 rounded-full w-fit">
                        {formatTimeAgo(log._creationTime)}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-1.5 mt-1.5 text-xs text-gray-600">
                      <span className="font-medium text-gray-800 bg-white border border-gray-200 px-1.5 py-0.5 rounded shadow-sm">{log.adminName}</span>
                      <span>đã tác động lên</span>
                      <span className="truncate bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-100">{log.target}</span>
                    </div>
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

export default PermissionsContent;