import { useState } from 'react';
import { MessageSquare, ThumbsUp, Search, Trash2, Loader2, Eye, X, AlertTriangle, FileText, MessageCircle, Repeat2, Share2, Server } from 'lucide-react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@convex/_generated/api';
import { Id } from '@convex/_generated/dataModel';

type Message = any;

const ContentContent = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const messages = useQuery(api.admin.adminGetMessages, { 
    search: searchTerm.trim() !== '' ? searchTerm : undefined 
  });
  const deleteMessage = useMutation(api.admin.adminDeleteMessage);

  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<Id<"messages"> | null>(null);

  const filteredMessages = messages?.filter(msg => {
    const isComment = msg.threadId !== undefined;
    if (typeFilter === 'post') return !isComment;
    if (typeFilter === 'comment') return isComment;
    return true;
  });

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('vi-VN', {
      hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric'
    });
  };

  const handleView = (msg: Message) => {
    setSelectedMessage(msg);
    setIsViewModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!messageToDelete) return;
    try {
      await deleteMessage({ messageId: messageToDelete });
      setIsDeleteModalOpen(false);
      setMessageToDelete(null);
    } catch (error) {
      alert("Có lỗi xảy ra khi xóa!");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm nội dung bài viết..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>
          <select 
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          >
            <option value="all">Tất cả bài viết</option>
            <option value="post">Bài đăng gốc</option>
            <option value="comment">Bình luận</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredMessages === undefined ? (
          <div className="col-span-1 md:col-span-2 py-12 text-center text-gray-500">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-emerald-500" />
            Đang tải dữ liệu...
          </div>
        ) : filteredMessages.length === 0 ? (
          <div className="col-span-1 md:col-span-2 py-12 text-center text-gray-500 bg-white rounded-2xl border border-gray-100">
            Không tìm thấy bài viết nào.
          </div>
        ) : (
          filteredMessages.map((msg) => {
            const isComment = msg.threadId !== undefined;
            return (
              <div key={msg._id} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-lg hover:border-emerald-100 transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3 w-full">
                      <div className={`w-12 h-12 shrink-0 rounded-xl flex items-center justify-center ${isComment ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                        {isComment ? <MessageCircle className="w-6 h-6" /> : <FileText className="w-6 h-6" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-800 truncate" title={msg.content}>
                          {msg.content || '(Có chứa hình ảnh)'}
                        </h3>
                        
                        {/* HIỂN THỊ NGỮ CẢNH: Máy chủ hoặc Bài gốc */}
                        {isComment ? (
                          <div className="flex items-center gap-1 text-sm text-purple-600 mt-1 truncate" title={msg.parentContent || undefined}>
                            <span className="font-medium shrink-0">↳ Trả lời cho:</span> 
                            <span className="truncate">{msg.parentContent}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-sm text-gray-500 mt-1 truncate">
                            <Server className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{msg.workspaceName}</span>
                            <span className="shrink-0">• Kênh: {msg.channelName}</span>
                            {msg.isAnonymous && <span className="shrink-0 text-orange-500 font-medium">(Ẩn danh)</span>}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* CÁC CHỈ SỐ THỐNG KÊ (Likes, Comments, Reposts, Shares) */}
                  <div className="flex items-center gap-4 text-sm text-gray-500 mb-4 flex-wrap bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                    <span className="flex items-center gap-1.5 font-medium text-blue-600" title="Lượt thích">
                      <ThumbsUp className="w-4 h-4" /> {msg.likeCount || 0}
                    </span>
                    {!isComment && (
                      <span className="flex items-center gap-1.5 font-medium text-emerald-600" title="Bình luận">
                        <MessageSquare className="w-4 h-4" /> {msg.commentCount || 0}
                      </span>
                    )}
                    <span className="flex items-center gap-1.5 font-medium text-purple-600" title="Lượt đăng lại">
                      <Repeat2 className="w-4 h-4" /> {msg.retweetCount || 0}
                    </span>
                    <span className="flex items-center gap-1.5 font-medium text-orange-600" title="Lượt chia sẻ">
                      <Share2 className="w-4 h-4" /> {msg.shareCount || 0}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <span className="font-medium text-gray-600">{msg.authorName}</span>
                    <span>•</span>
                    <span>{formatDate(msg._creationTime)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-4 border-t border-gray-100 mt-4">
                  <button onClick={() => handleView(msg)} className="flex-1 flex items-center justify-center gap-2 py-2 text-sm text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors font-medium">
                    <Eye className="w-4 h-4" /> Xem chi tiết
                  </button>
                  <button onClick={() => { setMessageToDelete(msg._id); setIsDeleteModalOpen(true); }} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Xóa bài viết">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* POPUP XEM CHI TIẾT */}
      {isViewModalOpen && selectedMessage && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 shrink-0">
              <h3 className="text-xl font-semibold text-gray-800">Chi tiết nội dung</h3>
              <button onClick={() => setIsViewModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <span className="text-sm text-gray-500 block">Người đăng:</span>
                  <p className="font-medium text-gray-900">{selectedMessage.authorName} {selectedMessage.isAnonymous && <span className="text-orange-500">(Ẩn danh)</span>}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500 block">Thời gian:</span>
                  <p className="font-medium text-gray-900">{formatDate(selectedMessage._creationTime)}</p>
                </div>
              </div>

              {selectedMessage.threadId ? (
                <div className="mb-6 p-4 bg-purple-50 rounded-xl border border-purple-100">
                  <span className="text-sm font-semibold text-purple-700 block mb-1">↳ Trả lời cho bài viết:</span>
                  <p className="text-purple-900 line-clamp-2">{selectedMessage.parentContent}</p>
                </div>
              ) : (
                <div className="mb-6 p-4 bg-blue-50 rounded-xl border border-blue-100">
                  <span className="text-sm font-semibold text-blue-700 block mb-1">Vị trí đăng:</span>
                  <p className="text-blue-900 font-medium">{selectedMessage.workspaceName} <span className="mx-2">›</span> Kênh {selectedMessage.channelName}</p>
                </div>
              )}
              
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                <span className="text-sm font-semibold text-gray-700 block mb-2">Nội dung text:</span>
                <p className="text-gray-800 whitespace-pre-wrap">{selectedMessage.content}</p>
              </div>

              {/* Bảng thống kê chi tiết trong Popup */}
              <div className="grid grid-cols-4 gap-4 mt-6">
                 <div className="text-center p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <ThumbsUp className="w-5 h-5 mx-auto text-blue-500 mb-1" />
                    <span className="block font-bold text-gray-800">{selectedMessage.likeCount || 0}</span>
                    <span className="text-xs text-gray-500">Thích</span>
                 </div>
                 <div className="text-center p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <MessageSquare className="w-5 h-5 mx-auto text-emerald-500 mb-1" />
                    <span className="block font-bold text-gray-800">{selectedMessage.commentCount || 0}</span>
                    <span className="text-xs text-gray-500">Bình luận</span>
                 </div>
                 <div className="text-center p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <Repeat2 className="w-5 h-5 mx-auto text-purple-500 mb-1" />
                    <span className="block font-bold text-gray-800">{selectedMessage.retweetCount || 0}</span>
                    <span className="text-xs text-gray-500">Đăng lại</span>
                 </div>
                 <div className="text-center p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <Share2 className="w-5 h-5 mx-auto text-orange-500 mb-1" />
                    <span className="block font-bold text-gray-800">{selectedMessage.shareCount || 0}</span>
                    <span className="text-xs text-gray-500">Chia sẻ</span>
                 </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 bg-gray-50 shrink-0 text-right">
              <button onClick={() => setIsViewModalOpen(false)} className="px-6 py-2 bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300 transition-colors">
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POPUP XÓA */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Xóa bài viết này?</h3>
            <p className="text-gray-500 mb-6">Hành động này sẽ xóa vĩnh viễn nội dung khỏi hệ thống. Bạn không thể hoàn tác.</p>
            <div className="flex items-center justify-center gap-3">
              <button onClick={() => setIsDeleteModalOpen(false)} className="flex-1 px-4 py-2 text-gray-600 font-medium bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">Hủy</button>
              <button onClick={confirmDelete} className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg transition-colors">Xóa bài</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContentContent;