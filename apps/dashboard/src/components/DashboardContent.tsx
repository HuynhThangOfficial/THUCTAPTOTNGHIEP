"use client";

import { useQuery } from "convex/react";
// Đảm bảo đường dẫn import api chính xác với cấu trúc dự án của bạn
import { api } from "../../../../convex/_generated/api";

import {
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
  Hash,
  Plus,
  Shield,
  TrendingDown,
  TrendingUp,
  Trash2,
  Users,
} from 'lucide-react';

const DashboardContent = () => {
  // GỌI DỮ LIỆU TỪ CONVEX SỬ DỤNG HÀM TỪ FILE admin.ts
  // Truyền timeRange: 7 (7 ngày) làm ví dụ để lấy phân tích
  const analyticsData = useQuery(api.admin.adminGetAnalytics, { timeRange: 7 });

  // HIỆU ỨNG LOADING (SKELETON) TRONG LÚC CHỜ DỮ LIỆU
  if (analyticsData === undefined) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 h-32">
              <div className="w-12 h-12 bg-gray-200 rounded-xl mb-4" />
              <div className="w-24 h-6 bg-gray-200 rounded-md mb-2" />
              <div className="w-16 h-4 bg-gray-200 rounded-md" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 h-96" />
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 h-96" />
        </div>
      </div>
    );
  }

  // SAU KHI CÓ DỮ LIỆU: Ráp các con số từ Backend vào Cấu hình UI của Frontend
  const stats = [
    { 
      title: 'Tổng người dùng', 
      value: analyticsData.totalUsers.toLocaleString(), 
      change: `+${analyticsData.newUsers}`, 
      trend: 'up', 
      icon: Users, 
      color: 'emerald' 
    },
    { 
      title: 'Tổng Máy chủ/Trường', 
      value: analyticsData.totalWorkspaces.toLocaleString(), 
      change: `+${analyticsData.newWorkspaces}`, 
      trend: 'up', 
      icon: Hash, 
      color: 'blue' 
    },
    { 
      title: 'Tổng bài đăng gốc', 
      value: analyticsData.totalPosts.toLocaleString(), 
      change: `+${analyticsData.newPosts}`, 
      trend: 'up', 
      icon: FileText, 
      color: 'purple' 
    },
    { 
      title: 'Tỷ lệ giữ chân', 
      value: `${analyticsData.retentionRate}%`, 
      change: '---', 
      trend: 'up', 
      icon: Shield, 
      color: 'orange' 
    },
  ];

  const chartData = analyticsData.hourlyActivity.map((value: number, index: number) => ({
      name: `${index}h`,
      content: value,
      users: Math.round(value * 0.8)
  }));
  
  // Rút gọn chart data
  const condensedChartData = chartData.filter((_: any, i: number) => i % 3 === 0);

  // Hoạt động gần đây (Tạm thời giữ dữ liệu tĩnh, hoặc bạn có thể gọi thêm api.admin.adminGetAuditLogs nếu muốn)
  const recentActivities = [
    { id: 1, user: 'Hệ thống', action: 'đang hiển thị', target: 'Dữ liệu thời gian thực', time: 'Vừa xong', type: 'create' },
    { id: 2, user: 'Admin', action: 'phân tích', target: 'Tỷ lệ giữ chân', time: 'Vừa xong', type: 'approve' },
  ];

  // Map loại hành động từ DB sang Icon và Màu sắc tương ứng
  const activityUIConfig: Record<string, { icon: any; color: string }> = {
    create: { icon: Plus, color: 'emerald' },
    approve: { icon: CheckCircle, color: 'blue' },
    warn: { icon: AlertTriangle, color: 'orange' },
    delete: { icon: Trash2, color: 'red' },
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          const colorClasses: Record<string, string> = {
            emerald: 'bg-emerald-100 text-emerald-600',
            blue: 'bg-blue-100 text-blue-600',
            purple: 'bg-purple-100 text-purple-600',
            orange: 'bg-orange-100 text-orange-600',
          };
          return (
            <div
              key={index}
              className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-lg hover:border-emerald-100 transition-all duration-300"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colorClasses[stat.color]}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div className={`flex items-center gap-1 text-sm font-medium ${stat.trend === 'up' ? 'text-emerald-600' : 'text-red-500'}`}>
                  {stat.trend === 'up' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  {stat.change}
                </div>
              </div>
              <h3 className="text-2xl lg:text-3xl font-bold text-gray-800">{stat.value}</h3>
              <p className="text-gray-500 text-sm mt-1">{stat.title}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Hoạt động đăng bài theo giờ</h3>
          <div className="h-64 flex items-end justify-around gap-2">
            {condensedChartData.map((data: any, index: number) => (
              <div key={index} className="flex flex-col items-center gap-2 flex-1">
                <div className="w-full flex flex-col items-center gap-1">
                  <div
                    className="w-full max-w-8 bg-gradient-to-t from-emerald-500 to-emerald-300 rounded-t-lg transition-all duration-500 hover:from-emerald-600 hover:to-emerald-400"
                    style={{ height: `${data.users}%` }}
                  />
                  <div
                    className="w-full max-w-8 bg-gradient-to-t from-green-400 to-green-200 rounded-t-lg transition-all duration-500 hover:from-green-500 hover:to-green-300"
                    style={{ height: `${data.content}%` }}
                  />
                </div>
                <span className="text-xs text-gray-500">{data.name}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-emerald-500 rounded-full" />
              <span className="text-sm text-gray-600">Lượt truy cập (ước tính)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-400 rounded-full" />
              <span className="text-sm text-gray-600">Bài đăng gốc</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Hoạt động gần đây</h3>
          <div className="space-y-4">
            {recentActivities.map((activity: any) => {
              const ui = activityUIConfig[activity.type] || activityUIConfig['create'];
              const Icon = ui.icon;
              const colorClasses: Record<string, string> = {
                emerald: 'bg-emerald-100 text-emerald-600',
                blue: 'bg-blue-100 text-blue-600',
                orange: 'bg-orange-100 text-orange-600',
                red: 'bg-red-100 text-red-600',
              };
              
              return (
                <div key={activity.id} className="flex items-start gap-4 p-3 hover:bg-gray-50 rounded-xl transition-colors">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${colorClasses[ui.color]}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800">
                      <span className="font-semibold">{activity.user}</span>{' '}
                      <span className="text-gray-500">{activity.action}</span>{' '}
                      <span className="font-medium text-emerald-600">{activity.target}</span>
                    </p>
                    <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {activity.time}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardContent;