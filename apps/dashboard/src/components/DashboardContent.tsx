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
  const stats = [
    { title: 'Tổng người dùng', value: '12,847', change: '+12.5%', trend: 'up', icon: Users, color: 'emerald' },
    { title: 'Kênh đang hoạt động', value: '1,284', change: '+8.2%', trend: 'up', icon: Hash, color: 'blue' },
    { title: 'Nội dung hôm nay', value: '342', change: '+24.3%', trend: 'up', icon: FileText, color: 'purple' },
    { title: 'Báo cáo chờ xử lý', value: '23', change: '-5.1%', trend: 'down', icon: Shield, color: 'orange' },
  ];

  const chartData = [
    { name: 'T2', users: 400, content: 240 },
    { name: 'T3', users: 300, content: 139 },
    { name: 'T4', users: 200, content: 980 },
    { name: 'T5', users: 278, content: 390 },
    { name: 'T6', users: 189, content: 480 },
    { name: 'T7', users: 239, content: 380 },
    { name: 'CN', users: 349, content: 430 },
  ];

  return (
    <div className="space-y-6">
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
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Hoạt động người dùng</h3>
          <div className="h-64 flex items-end justify-around gap-2">
            {chartData.map((data, index) => (
              <div key={index} className="flex flex-col items-center gap-2 flex-1">
                <div className="w-full flex flex-col items-center gap-1">
                  <div
                    className="w-full max-w-8 bg-gradient-to-t from-emerald-500 to-emerald-300 rounded-t-lg transition-all duration-500 hover:from-emerald-600 hover:to-emerald-400"
                    style={{ height: `${data.users / 4}%` }}
                  />
                  <div
                    className="w-full max-w-8 bg-gradient-to-t from-green-400 to-green-200 rounded-t-lg transition-all duration-500 hover:from-green-500 hover:to-green-300"
                    style={{ height: `${data.content / 4}%` }}
                  />
                </div>
                <span className="text-xs text-gray-500">{data.name}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-emerald-500 rounded-full" />
              <span className="text-sm text-gray-600">Người dùng</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-400 rounded-full" />
              <span className="text-sm text-gray-600">Nội dung</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Hoạt động gần đây</h3>
          <div className="space-y-4">
            {[
              { user: 'Nguyễn Văn A', action: 'đã tạo kênh mới', target: 'Cộng đồng Gaming', time: '5 phút trước', icon: Plus, color: 'emerald' },
              { user: 'Trần Thị B', action: 'đã duyệt bài viết', target: 'Hướng dẫn Discord', time: '15 phút trước', icon: CheckCircle, color: 'blue' },
              { user: 'Lê Văn C', action: 'đã cảnh báo người dùng', target: 'User_1234', time: '1 giờ trước', icon: AlertTriangle, color: 'orange' },
              { user: 'Phạm Thị D', action: 'đã xóa nội dung', target: 'Bài viết spam', time: '2 giờ trước', icon: Trash2, color: 'red' },
            ].map((activity, index) => {
              const Icon = activity.icon;
              const colorClasses: Record<string, string> = {
                emerald: 'bg-emerald-100 text-emerald-600',
                blue: 'bg-blue-100 text-blue-600',
                orange: 'bg-orange-100 text-orange-600',
                red: 'bg-red-100 text-red-600',
              };
              return (
                <div key={index} className="flex items-start gap-4 p-3 hover:bg-gray-50 rounded-xl transition-colors">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${colorClasses[activity.color]}`}>
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
