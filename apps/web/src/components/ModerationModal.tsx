"use client";

import React from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { Id } from '../../../../convex/_generated/dataModel';
import { useTranslation } from 'react-i18next';

interface Props {
  serverId: string;
  onClose: () => void;
}

export default function ModerationModal({ serverId, onClose }: Props) {
  const { t } = useTranslation();

  // Gọi API lấy danh sách báo cáo giống Mobile
  const reports = useQuery(api.messages.getServerReports, { serverId: serverId as Id<'servers'> });
  const resolveReport = useMutation(api.messages.resolveReport);

  const handleAction = async (reportIds: Id<'reports'>[], action: 'delete' | 'dismiss') => {
    const isDelete = action === 'delete';
    if (window.confirm(`${t('common.confirm')} ${isDelete ? t('report.action_delete') : t('report.action_dismiss')}?`)) {
      try {
        await resolveReport({ reportIds, action });
      } catch (error: any) {
        alert(t('common.error') + ": " + error.message);
      }
    }
  };

  const renderReason = (reasonStr: string) => {
    const keys = ['reason_spam', 'reason_harassment', 'reason_inappropriate', 'reason_wrong_channel', 'reason_minors', 'reason_adult'];
    if (keys.includes(reasonStr)) return t(`report.${reasonStr}`);
    return reasonStr;
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in" onClick={onClose}>
      <div
        className="bg-[#f2f3f5] w-full max-w-2xl max-h-[85vh] rounded-2xl flex flex-col shadow-2xl animate-in zoom-in-95 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-white border-b border-gray-200 shrink-0">
          <h2 className="text-lg font-extrabold text-slate-800">{t('report.moderation_title')}</h2>
          <button onClick={onClose} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-full transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Nội dung báo cáo */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {reports === undefined ? (
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center text-gray-500 py-20 italic">
              {t('report.moderation_empty')}
            </div>
          ) : (
            reports.map((item: any) => (
              <div key={item._id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">

                {/* Phần 1: Người báo cáo */}
                <div className="flex items-start gap-3 mb-4 bg-red-50 p-3 rounded-lg border border-red-100">
                  <div className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded shrink-0 mt-0.5">
                    {item.reportCount} {t('report.title')}
                  </div>
                  <div className="flex-1 space-y-1">
                    {item.reporters.map((rep: any, idx: number) => (
                      <div key={idx} className="text-[13px] text-gray-800">
                        <span className="font-bold">• {rep?.first_name || rep?.username || t('settings.default_user')}</span>: {renderReason(rep.reason)}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Phần 2: Nội dung bài viết */}
                <div className="bg-[#f8f9fa] p-3 rounded-lg border border-gray-200 mb-4">
                  {!item.message ? (
                    <div className="text-center py-4 opacity-60">
                      <div className="text-gray-500 italic text-sm">{t('chat.post_not_exist')}</div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-200">
                        <img src={item.author?.imageUrl || "https://ui-avatars.com/api/?name=U"} className="w-6 h-6 rounded-full object-cover" alt="avatar" />
                        <div className="flex-1 text-sm font-bold text-gray-900 truncate">
                          {item.message.isAnonymous ? t('thread.anonymous_member') : (item.author?.first_name || item.author?.username || t('settings.default_user'))}
                        </div>
                        {item.channel && (
                          <div className="text-xs text-blue-600 font-semibold shrink-0">
                            #{item.channel.name}
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-gray-800 line-clamp-3 whitespace-pre-wrap">{item.message.content || t('chat.post_not_exist')}</p>
                      {item.message.mediaFiles && item.message.mediaFiles.length > 0 && (
                        <div className="text-xs text-gray-500 mt-2 font-medium">
                          {item.message.mediaFiles.length} {t('chat.image_bracket')}
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Phần 3: Hành động */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAction(item.reportIds, 'dismiss')}
                    className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-sm rounded-lg transition-colors"
                  >
                    {t('report.action_dismiss')}
                  </button>
                  <button
                    onClick={() => handleAction(item.reportIds, 'delete')}
                    className="flex-1 py-2 bg-red-500 hover:bg-red-600 text-white font-bold text-sm rounded-lg transition-colors"
                  >
                    {t('report.action_delete')}
                  </button>
                </div>

              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}