import React, { useState } from 'react';
import { CheckCircle, Eye, Trash2, XCircle, X, Heart, MessageCircle, Repeat, Send, ImageIcon, ShieldAlert } from 'lucide-react';
import { useQuery, useMutation } from 'convex/react';
// 👇 Nhớ kiểm tra đường dẫn import này cho khớp với dự án Web của bạn
import { api } from '../../../../convex/_generated/api';

// 👇 HÀM DỊCH MÃ LÝ DO SANG TIẾNG VIỆT (Cố định cho Admin) 👇
const translateReason = (reasonStr: string) => {
  const reasonMap: Record<string, string> = {
    'reason_spam': 'Spam hoặc quảng cáo',
    'reason_harassment': 'Quấy rối hoặc bắt nạt',
    'reason_inappropriate': 'Nội dung không phù hợp',
    'reason_wrong_channel': 'Đăng không đúng kênh hoặc máy chủ',
    'reason_minors': 'Vấn đề liên quan đến người dưới 18 tuổi',
    'reason_adult': 'Nội dung người lớn',
    'reason_other': 'Lý do khác'
  };
  return reasonMap[reasonStr] || reasonStr; // Nếu gõ lý do tùy chỉnh thì hiện nguyên văn
};

// 👇 HÀM DỊCH MỤC TIÊU BÁO CÁO MÁY CHỦ SANG TIẾNG VIỆT 👇
const translateTargets = (targets: string[]) => {
  const map: Record<string, string> = {
    'target_avatar': 'Ảnh đại diện máy chủ',
    'target_name': 'Tên máy chủ',
    'target_channels': 'Tên các kênh',
    'target_purpose': 'Mục đích hoạt động'
  };
  if (!targets || targets.length === 0) return 'Không rõ';
  return targets.map(t => map[t] || t).join(', ');
};

const ReportsContent = () => {
  const reports = useQuery(api.admin.adminGetReports);
  const resolveReport = useMutation(api.messages.resolveReport);

  const [selectedReport, setSelectedReport] = useState<any>(null);

  if (reports === undefined) {
    return <div className="p-10 text-center text-gray-500 font-medium animate-pulse">Đang tải dữ liệu kiểm duyệt...</div>;
  }

  const pendingCount = reports.filter((r: any) => r.status === 'pending').length;
  const resolvedCount = reports.filter((r: any) => r.status === 'resolved').length;
  const dismissedCount = reports.filter((r: any) => r.status === 'dismissed').length;

  const handleAction = async (report: any, action: 'delete' | 'dismiss') => {
    const isServer = report.type === 'server';
    const confirmMsg = action === 'delete'
      ? (isServer ? 'Đánh dấu báo cáo máy chủ này là ĐÃ XỬ LÝ (Admin tự quyết định hình phạt)?' : 'Bạn có chắc chắn muốn XÓA bài viết vi phạm này?')
      : 'Bạn muốn BỎ QUA báo cáo này (Không vi phạm)?';

    if (window.confirm(confirmMsg)) {
      await resolveReport({ reportIds: report.reportIds, action });
      if (selectedReport && selectedReport._id === report._id) {
         setSelectedReport(null);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* KHỐI THỐNG KÊ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Chờ xử lý', count: pendingCount, color: 'orange' },
          { label: 'Đã xử lý / Xóa bài', count: resolvedCount, color: 'emerald' },
          { label: 'Đã bỏ qua', count: dismissedCount, color: 'blue' },
        ].map((stat, index) => {
          const colorClasses: Record<string, { wrapper: string; label: string; value: string }> = {
            orange: { wrapper: 'bg-orange-50 border-orange-200', label: 'text-orange-600', value: 'text-orange-700' },
            blue: { wrapper: 'bg-blue-50 border-blue-200', label: 'text-blue-600', value: 'text-blue-700' },
            emerald: { wrapper: 'bg-emerald-50 border-emerald-200', label: 'text-emerald-600', value: 'text-emerald-700' },
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

      {/* BẢNG DỮ LIỆU */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600 w-2/5">Nội dung bị báo cáo</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600 w-1/4">Người báo cáo & Lý do</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-600">Chi tiết</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-600">Trạng thái</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-600">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {reports.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">Chưa có báo cáo nào trong hệ thống.</td>
                </tr>
              ) : (
                reports.map((report: any) => (
                  <tr key={report._id} className="hover:bg-gray-50 transition-colors">

                    {/* CỘT 1: GIAO DIỆN BÀI ĐĂNG HOẶC MÁY CHỦ */}
                    <td className="px-6 py-4 align-top">
                      <div className="border border-gray-200 rounded-xl p-4 bg-white shadow-sm hover:shadow-md transition-shadow min-w-[300px]">

                        {report.type === 'server' ? (
                           <div className="flex flex-col py-2 px-3 bg-indigo-50 border border-indigo-100 rounded-lg">
                             <div className="flex items-center gap-2 mb-2">
                                <ShieldAlert className="w-5 h-5 text-indigo-600" />
                                <span className="font-bold text-indigo-900 text-[15px]">{report.server?.name || report.targetName || 'Máy chủ'}</span>
                             </div>
                             <span className="text-xs text-indigo-700 font-medium">Mục bị khiếu nại:</span>
                             <span className="text-sm font-bold text-indigo-800 mt-0.5">{translateTargets(report.targets)}</span>
                           </div>
                        ) : !report.message ? (
                          <div className="flex flex-col items-center justify-center py-6 text-gray-400">
                            <Trash2 className="w-8 h-8 mb-2 opacity-50" />
                            <span className="font-medium text-sm text-gray-500">Bài đăng này đã bị tác giả tự xóa.</span>
                            <span className="text-xs mt-1">Hệ thống vẫn giữ lại báo cáo để Admin xác nhận.</span>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-3 mb-3">
                              <img
                                src={report.author?.imageUrl || 'https://via.placeholder.com/40'}
                                className="w-10 h-10 rounded-full bg-gray-100 object-cover border border-gray-200"
                                alt="avatar"
                              />
                              <div className="flex flex-col">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-gray-900 text-sm">
                                    {report.message?.isAnonymous ? 'Thành viên ẩn danh' : (report.author?.first_name || 'User')}
                                  </span>
                                  {!report.message?.isAnonymous && (
                                    <span className="text-gray-500 text-xs">@{report.author?.username}</span>
                                  )}
                                </div>
                                <div className="text-[13px] text-gray-500 mt-0.5">
                                  Đăng tại: <span className="font-medium text-gray-700">{report.targetType} {report.targetName}</span>
                                  {report.channel && <span className="text-blue-500 font-semibold ml-1">#{report.channel.name}</span>}
                                </div>
                              </div>
                            </div>

                            <div className="h-px bg-gray-100 w-full mb-3"></div>

                            <div className="text-sm text-gray-800 whitespace-pre-wrap line-clamp-3">
                              {report.message?.content || <span className="italic text-gray-400">Không có nội dung chữ...</span>}
                            </div>

                            {report.message?.mediaFiles && report.message.mediaFiles.length > 0 && (
                              <div className="mt-3 flex items-center gap-1.5 text-xs text-blue-600 bg-blue-50 px-2.5 py-1.5 rounded-lg w-fit font-medium border border-blue-100">
                                <ImageIcon className="w-3.5 h-3.5"/> Có {report.message.mediaFiles.length} hình ảnh
                              </div>
                            )}

                            <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-50 text-gray-400 text-xs">
                              <div className="flex items-center gap-4">
                                <span className="flex items-center gap-1.5" title="Lượt thích"><Heart className="w-3.5 h-3.5"/> {report.message?.likeCount || 0}</span>
                                <span className="flex items-center gap-1.5" title="Bình luận"><MessageCircle className="w-3.5 h-3.5"/> {report.message?.commentCount || 0}</span>
                                <span className="flex items-center gap-1.5" title="Đăng lại"><Repeat className="w-3.5 h-3.5"/> {report.message?.retweetCount || 0}</span>
                                <span className="flex items-center gap-1.5" title="Chia sẻ"><Send className="w-3.5 h-3.5"/> {report.message?.shareCount || 0}</span>
                              </div>
                              <span>
                                {new Date(report.message?._creationTime || report.createdAt).toLocaleDateString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    </td>

                    {/* CỘT 2: DANH SÁCH NGƯỜI BÁO CÁO */}
                    <td className="px-6 py-4 align-top">
                      <div className="flex flex-col gap-2">
                        <span className="inline-flex items-center justify-center px-2.5 py-1 bg-red-100 text-red-700 font-bold text-xs rounded-md w-max border border-red-200">
                          {report.reportCount} lượt báo cáo
                        </span>
                        <div className="flex flex-col max-h-40 overflow-y-auto pr-2 space-y-2 mt-1">
                          {report.reporters?.map((rep: any, idx: number) => (
                            <div key={idx} className="text-[13px] leading-tight border-l-2 border-red-200 pl-2">
                              <span className="font-semibold text-gray-800">{rep?.first_name || 'User'}</span>
                              <span className="text-gray-400 ml-1">@{rep?.username}</span>
                              <div className="text-red-600 mt-1">{translateReason(rep?.reason)}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </td>

                    {/* CỘT 3: XEM CHI TIẾT */}
                    <td className="px-6 py-4 text-center align-top">
                      <button
                        type="button"
                        onClick={() => setSelectedReport(report)}
                        className="inline-flex items-center mt-2 justify-center p-2.5 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-blue-200"
                        title="Xem toàn bộ nội dung"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                    </td>

                    {/* CỘT 4: TRẠNG THÁI */}
                    <td className="px-6 py-4 text-center align-top">
                      <div className="mt-4">
                        <span className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap border ${
                            report.status === 'pending' ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                            : report.status === 'dismissed' ? 'bg-gray-50 text-gray-600 border-gray-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}>
                          {report.status === 'pending' ? 'Chờ xử lý' : report.status === 'dismissed' ? 'Đã bỏ qua' : 'Đã giải quyết'}
                        </span>
                      </div>
                    </td>

                    {/* CỘT 5: HÀNH ĐỘNG */}
                    <td className="px-6 py-4 align-top">
                      <div className="mt-2">
                        {report.status === 'pending' ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleAction(report, 'dismiss')}
                              title="Bỏ qua (Không vi phạm)"
                              className="p-2 hover:bg-gray-200 rounded-lg transition-colors text-gray-600">
                              <XCircle className="w-5 h-5" />
                            </button>

                            {report.type === 'server' ? (
                              <button
                                type="button"
                                onClick={() => handleAction(report, 'delete')}
                                title="Đánh dấu đã xử lý (Ghi nhận vi phạm)"
                                className="p-2 hover:bg-emerald-100 rounded-lg transition-colors text-emerald-600">
                                <CheckCircle className="w-5 h-5" />
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleAction(report, 'delete')}
                                title="Xóa bài viết vi phạm"
                                className="p-2 hover:bg-red-100 rounded-lg transition-colors text-red-600">
                                <Trash2 className="w-5 h-5" />
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center justify-end mr-2">
                             <CheckCircle className="w-6 h-6 text-emerald-500" title="Đã xử lý xong" />
                          </div>
                        )}
                      </div>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL XEM CHI TIẾT */}
      {selectedReport && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedReport(null)}></div>

          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden relative z-10 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-gray-50">
              <h3 className="font-bold text-lg text-gray-800">Chi tiết báo cáo</h3>
              <button type="button" onClick={() => setSelectedReport(null)} className="text-gray-400 hover:text-red-500 transition-colors p-1 bg-white rounded-md shadow-sm border border-gray-200">
                <X className="w-5 h-5"/>
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto hidden-scrollbar">

              <div className="bg-red-50 border border-red-100 rounded-xl p-4">
                <p className="text-xs font-bold text-red-800 uppercase tracking-wider mb-3">
                  Danh sách báo cáo ({selectedReport.reportCount})
                </p>
                <div className="space-y-3 max-h-40 overflow-y-auto pr-2 hidden-scrollbar">
                  {selectedReport.reporters?.map((rep: any, idx: number) => (
                    <div key={idx} className="flex flex-col gap-1 text-sm border-b border-red-100/50 pb-3 last:border-0 last:pb-0">
                      <div className="flex gap-2 items-start">
                        <span className="font-bold text-gray-800 shrink-0">
                          • {rep?.first_name || 'User'} <span className="text-gray-500 font-normal">(@{rep?.username})</span>:
                        </span>
                        <span className="text-red-600 font-medium">{translateReason(rep?.reason)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border border-gray-200 rounded-xl p-4 shadow-sm bg-white">

                {selectedReport.type === 'server' ? (
                   <div className="flex flex-col items-center justify-center py-6 text-indigo-900 bg-indigo-50 rounded-xl border border-indigo-100">
                     <ShieldAlert className="w-12 h-12 mb-3 text-indigo-500" />
                     <span className="font-bold text-lg text-indigo-800">{selectedReport.server?.name || selectedReport.targetName || 'Máy chủ'}</span>
                     <span className="text-sm font-medium mt-2 text-indigo-600 bg-white px-3 py-1.5 rounded-lg shadow-sm border border-indigo-100">
                       Mục bị báo cáo: {translateTargets(selectedReport.targets)}
                     </span>
                   </div>
                ) : !selectedReport.message ? (
                  <div className="flex flex-col items-center justify-center py-6 text-gray-400">
                    <Trash2 className="w-10 h-10 mb-3 opacity-50 text-red-400" />
                    <span className="font-semibold text-gray-600">Nội dung bài viết không còn tồn tại hoặc đã bị xóa.</span>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3 mb-3 pb-3 border-b border-gray-100">
                      <img
                        src={selectedReport.author?.imageUrl || 'https://via.placeholder.com/40'}
                        className="w-10 h-10 rounded-full bg-gray-100 border border-gray-200 object-cover"
                        alt="avatar"
                      />
                      <div>
                        <p className="font-bold text-sm text-gray-900">
                          {selectedReport.message?.isAnonymous ? 'Thành viên ẩn danh' : (
                            <>{selectedReport.author?.first_name || 'User'} <span className="font-normal text-gray-500">@{selectedReport.author?.username}</span></>
                          )}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Đăng tại: <span className="font-medium text-gray-700">{selectedReport.targetType} {selectedReport.targetName}</span>
                          {selectedReport.channel && <span className="text-blue-600 font-medium"> #{selectedReport.channel.name}</span>}
                        </p>
                      </div>
                    </div>

                    <p className="text-gray-800 text-[15px] whitespace-pre-wrap leading-relaxed">
                      {selectedReport.message.content}
                    </p>
                    {selectedReport.message.mediaFiles?.length > 0 && (
                      <div className="mt-4 grid grid-cols-2 gap-2">
                        {selectedReport.message.mediaFiles.map((img: string, i: number) => (
                           <a key={i} href={img} target="_blank" rel="noreferrer" className="block w-full aspect-square bg-gray-100 rounded-lg overflow-hidden border border-gray-200 hover:opacity-90 transition-opacity">
                             <img loading="lazy"src={img} alt="Đính kèm" className="w-full h-full object-cover" />
                           </a>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportsContent;