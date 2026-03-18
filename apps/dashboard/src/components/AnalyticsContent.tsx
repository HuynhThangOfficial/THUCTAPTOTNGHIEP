import { useState } from 'react';
// Đã gỡ bỏ ArrowUpRight cho khỏi báo lỗi
import { TrendingUp, Users, Server, FileText, Activity, Loader2, CalendarClock, Download } from 'lucide-react';
import { useQuery } from 'convex/react';
import { api } from '@convex/_generated/api';

const AnalyticsContent = () => {
  const [timeRange, setTimeRange] = useState(1); 
  const stats = useQuery(api.admin.adminGetAnalytics, { timeRange });

  if (stats === undefined) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-emerald-600">
        <Loader2 className="w-10 h-10 animate-spin mb-4" />
        <p className="font-medium">Đang tổng hợp dữ liệu thời gian thực...</p>
      </div>
    );
  }

  // CẬP NHẬT: Thêm mốc 6 tháng và 12 tháng
  const getTimeLabel = () => {
    if (timeRange === 1) return '24 giờ qua';
    if (timeRange === 7) return '7 ngày qua';
    if (timeRange === 30) return '30 ngày qua';
    if (timeRange === 180) return '6 tháng qua';
    return '1 năm qua';
  };

  const handleExportCSV = () => {
    if (!stats) return;

    const csvRows = [
      ['BÁO CÁO THỐNG KÊ KONKET', `Bộ lọc: ${getTimeLabel()}`],
      [''],
      ['CHỈ SỐ', 'GIÁ TRỊ TỔNG', 'TĂNG TRƯỞNG TRONG KỲ'],
      ['Tổng người dùng', stats.totalUsers, `+${stats.newUsers}`],
      ['Tổng bài đăng gốc', stats.totalPosts, `+${stats.newPosts}`],
      ['Máy chủ & Trường', stats.totalWorkspaces, `+${stats.newWorkspaces}`],
      [''],
      ['CHI TIẾT NGƯỜI DÙNG', 'SỐ LƯỢNG', 'TỶ LỆ (%)'],
      ['Ban quản trị (Admin)', stats.roles.admin, `${stats.totalUsers > 0 ? Math.round((stats.roles.admin / stats.totalUsers) * 100) : 0}%`],
      ['Thành viên (User)', stats.roles.user, `${stats.totalUsers > 0 ? Math.round((stats.roles.user / stats.totalUsers) * 100) : 0}%`],
      ['Tỷ lệ quay lại (Retention)', `${stats.retentionRate}%`, '']
    ];

    const csvContent = "\uFEFF" + csvRows.map(row => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `KonKet_BaoCao_${getTimeLabel().replace(/ /g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          <Activity className="w-5 h-5 text-emerald-500" /> Báo cáo tổng quan
        </h2>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button 
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-700 font-medium rounded-xl transition-colors border border-emerald-200"
          >
            <Download className="w-4 h-4" /> 
            <span className="hidden sm:inline">Xuất báo cáo</span>
          </button>

          <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-xl border border-gray-200 flex-1 sm:flex-none">
            <CalendarClock className="w-4 h-4 text-gray-500 ml-2" />
            <select 
              value={timeRange}
              onChange={(e) => setTimeRange(Number(e.target.value))}
              className="bg-transparent border-none text-sm font-medium text-gray-700 focus:ring-0 cursor-pointer outline-none pr-2 w-full"
            >
              <option value={1}>24 giờ qua</option>
              <option value={7}>7 ngày qua</option>
              <option value={30}>30 ngày qua</option>
              {/* CẬP NHẬT: Thêm options mới */}
              <option value={180}>6 tháng qua</option>
              <option value={365}>1 năm qua</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-500" /> Tổng người dùng
            </p>
          </div>
          <div className="flex items-end justify-between mt-4">
            <p className="text-3xl font-bold text-gray-800">{stats.totalUsers.toLocaleString()}</p>
            <span className="text-emerald-600 text-[13px] font-medium flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded-lg">
              <TrendingUp className="w-3 h-3" /> +{stats.newUsers}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-500" /> Tổng bài đăng gốc
            </p>
          </div>
          <div className="flex items-end justify-between mt-4">
            <p className="text-3xl font-bold text-gray-800">{stats.totalPosts.toLocaleString()}</p>
            <span className="text-blue-600 text-[13px] font-medium flex items-center gap-1 bg-blue-50 px-2 py-1 rounded-lg">
              <TrendingUp className="w-3 h-3" /> +{stats.newPosts}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <Server className="w-4 h-4 text-purple-500" /> Máy chủ & Trường
            </p>
          </div>
          <div className="flex items-end justify-between mt-4">
            <p className="text-3xl font-bold text-gray-800">{stats.totalWorkspaces.toLocaleString()}</p>
            <span className="text-purple-600 text-[13px] font-medium flex items-center gap-1 bg-purple-50 px-2 py-1 rounded-lg">
              <TrendingUp className="w-3 h-3" /> +{stats.newWorkspaces}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-800 mb-6">Phân bố hệ thống</h3>
            <div className="space-y-5">
              {[
                { role: 'Ban quản trị (Admin)', count: stats.roles.admin, percent: stats.totalUsers > 0 ? Math.round((stats.roles.admin / stats.totalUsers) * 100) : 0, color: 'bg-purple-500' },
                { role: 'Thành viên MXH (User)', count: stats.roles.user, percent: stats.totalUsers > 0 ? Math.round((stats.roles.user / stats.totalUsers) * 100) : 0, color: 'bg-emerald-500' },
              ].map((item, index) => (
                <div key={index}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">{item.role}</span>
                    <span className="text-sm text-gray-500 font-medium">{item.count} người ({item.percent}%)</span>
                  </div>
                  <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${item.color} rounded-full transition-all duration-1000 ease-out`}
                      style={{ width: `${item.percent}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-1">Tỷ lệ giữ chân</h3>
              <p className="text-sm text-gray-500">Người dùng cũ quay lại trong <strong className="text-emerald-600">{getTimeLabel()}</strong></p>
            </div>
            <div className="w-24 h-24 rounded-full border-8 border-emerald-100 flex items-center justify-center relative">
               <svg className="absolute inset-0 w-full h-full -rotate-90">
                 <circle cx="40" cy="40" r="36" fill="none" stroke="currentColor" strokeWidth="8" className="text-emerald-500" strokeDasharray="226" strokeDashoffset={226 - (226 * stats.retentionRate) / 100} style={{ transition: 'stroke-dashoffset 1s ease-out', transform: 'translate(8px, 8px)' }} />
               </svg>
               <span className="text-xl font-bold text-gray-800">{stats.retentionRate}%</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 h-full flex flex-col">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800">Mật độ đăng bài theo khung giờ</h3>
            <p className="text-sm text-gray-500">Trong thời gian: {getTimeLabel()}</p>
          </div>
          
          <div className="flex-1 flex items-end justify-between gap-1 sm:gap-2 mt-auto min-h-[250px] pb-2 border-b border-gray-100">
            {stats.hourlyActivity.map((heightPercent, index) => (
              <div key={index} className="flex-1 flex flex-col items-center gap-2 group relative">
                <div className="absolute -top-8 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                  {index}:00 - {heightPercent}%
                </div>
                
                <div
                  className="w-full bg-gradient-to-t from-emerald-500 to-emerald-300 rounded-t-md transition-all duration-700 ease-out group-hover:from-emerald-600 group-hover:to-emerald-400"
                  style={{ height: `${Math.max(heightPercent, 2)}%` }} 
                />
                
                <span className="text-[10px] sm:text-xs text-gray-400 font-medium">
                  {index % 3 === 0 ? `${index}h` : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsContent;