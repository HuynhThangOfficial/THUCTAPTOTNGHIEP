import { CheckCircle, Eye } from 'lucide-react';
import { sampleReports } from '../data/sampleData';

const ReportsContent = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {[
        { label: 'Chờ xử lý', count: 12, color: 'orange' },
        { label: 'Đang điều tra', count: 5, color: 'blue' },
        { label: 'Đã giải quyết', count: 48, color: 'emerald' },
      ].map((stat, index) => {
        const colorClasses: Record<string, { wrapper: string; label: string; value: string }> = {
          orange: {
            wrapper: 'bg-orange-50 border-orange-200',
            label: 'text-orange-600',
            value: 'text-orange-700',
          },
          blue: {
            wrapper: 'bg-blue-50 border-blue-200',
            label: 'text-blue-600',
            value: 'text-blue-700',
          },
          emerald: {
            wrapper: 'bg-emerald-50 border-emerald-200',
            label: 'text-emerald-600',
            value: 'text-emerald-700',
          },
        };
        const classes = colorClasses[stat.color];
        return (
          <div key={index} className={`border rounded-2xl p-6 ${classes.wrapper}`}>
            <p className={`${classes.label} text-sm font-medium mb-1`}>{stat.label}</p>
            <p className={`text-3xl font-bold ${classes.value}`}>{stat.count}</p>
          </div>
        );
      })}
    </div>

    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Loại báo cáo</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Người báo cáo</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Mục tiêu</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Lý do</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Trạng thái</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Ngày</th>
              <th className="px-6 py-4 text-right text-sm font-semibold text-gray-600">Hành động</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sampleReports.map((report) => (
              <tr key={report.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                    {report.type}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-800">{report.reportedBy}</td>
                <td className="px-6 py-4 text-sm text-gray-800">{report.target}</td>
                <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">{report.reason}</td>
                <td className="px-6 py-4">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      report.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-700'
                        : report.status === 'investigating'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-emerald-100 text-emerald-700'
                    }`}
                  >
                    {report.status === 'pending' ? 'Chờ xử lý' : report.status === 'investigating' ? 'Đang điều tra' : 'Đã xử lý'}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">{report.date}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-end gap-2">
                    <button className="p-2 hover:bg-emerald-50 rounded-lg transition-colors text-emerald-600">
                      <Eye className="w-5 h-5" />
                    </button>
                    <button className="p-2 hover:bg-blue-50 rounded-lg transition-colors text-blue-600">
                      <CheckCircle className="w-5 h-5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </div>
);

export default ReportsContent;
