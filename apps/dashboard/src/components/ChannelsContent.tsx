import { useState } from 'react';
import { Search, Users, Hash, Trash2, Loader2, Diamond, ShieldCheck, AlertTriangle, Layers, Eye, FileText, X } from 'lucide-react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@convex/_generated/api';
import { Id } from '@convex/_generated/dataModel';

const ChannelsContent = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const workspaces = useQuery(api.admin.adminGetServersAndUniversities, {
    search: searchTerm.trim() !== '' ? searchTerm : undefined
  });
  const deleteServer = useMutation(api.admin.adminDeleteServer);

  // State cho Modal Xóa
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [serverToDelete, setServerToDelete] = useState<Id<"servers"> | null>(null);

  // State cho Modal Xem Chi tiết
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedWorkspace, setSelectedWorkspace] = useState<any>(null);

  const filteredWorkspaces = workspaces?.filter(w => {
    if (typeFilter === 'university') return w.type === 'university';
    if (typeFilter === 'server') return w.type === 'server';
    return true;
  });

  const confirmDelete = async () => {
    if (!serverToDelete) return;
    try {
      await deleteServer({ serverId: serverToDelete });
      setIsDeleteModalOpen(false);
      setServerToDelete(null);
    } catch (error) {
      alert("Có lỗi xảy ra khi xóa!");
    }
  };

  const handleViewDetails = (ws: any) => {
    setSelectedWorkspace(ws);
    setIsViewModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm kiếm máy chủ / trường..."
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
            <option value="all">Tất cả Cộng đồng</option>
            <option value="university">Trường Đại học</option>
            <option value="server">Máy chủ người dùng</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredWorkspaces === undefined ? (
          <div className="col-span-1 md:col-span-2 lg:col-span-3 py-12 text-center text-gray-500">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-emerald-500" />
            Đang tải dữ liệu hệ thống...
          </div>
        ) : filteredWorkspaces.length === 0 ? (
          <div className="col-span-1 md:col-span-2 lg:col-span-3 py-12 text-center text-gray-500 bg-white rounded-2xl border border-gray-100">
            Không tìm thấy cộng đồng nào.
          </div>
        ) : (
          filteredWorkspaces.map((ws) => (
            <div key={ws._id} className="bg-white flex flex-col justify-between rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-lg hover:border-emerald-100 transition-all relative overflow-hidden">
              
              <div className={`absolute top-0 right-0 px-3 py-1 text-xs font-bold text-white rounded-bl-xl ${ws.type === 'university' ? 'bg-blue-500' : 'bg-purple-500'}`}>
                {ws.type === 'university' ? 'HỆ THỐNG' : 'USER TẠO'}
              </div>

              <div>
                <div className="flex items-center gap-4 mb-5 mt-2">
                  {ws.type === 'university' && ws.icon.startsWith('local:') ? (
                    <div className="w-14 h-14 bg-gradient-to-br from-blue-400 to-blue-600 rounded-2xl flex items-center justify-center shadow-md shrink-0">
                      <ShieldCheck className="w-7 h-7 text-white" />
                    </div>
                  ) : (
                    <img loading="lazy"
                      src={ws.icon || `https://ui-avatars.com/api/?name=${ws.name.charAt(0)}`} 
                      alt={ws.name} 
                      className="w-14 h-14 rounded-2xl object-cover shadow-md shrink-0 border border-gray-100"
                    />
                  )}
                  
                  <div className="min-w-0">
                    <h3 className="font-bold text-gray-900 text-lg truncate" title={ws.name}>{ws.name}</h3>
                    <p className="text-sm text-gray-500 truncate">/{ws.slug}</p>
                  </div>
                </div>

                {/* THỐNG KÊ CHI TIẾT 4 Ô */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <div className="bg-gray-50 rounded-xl p-2 flex items-center gap-3 border border-gray-100">
                    <div className="p-2 bg-white rounded-lg shadow-sm text-emerald-500"><Users className="w-4 h-4" /></div>
                    <div>
                      <p className="text-[10px] text-gray-500 uppercase mb-0.5">Thành viên</p>
                      <p className="font-semibold text-gray-800 text-sm">{ws.memberCount}</p>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-2 flex items-center gap-3 border border-gray-100">
                    <div className="p-2 bg-white rounded-lg shadow-sm text-orange-500"><FileText className="w-4 h-4" /></div>
                    <div>
                      <p className="text-[10px] text-gray-500 uppercase mb-0.5">Bài gốc</p>
                      <p className="font-semibold text-gray-800 text-sm">{ws.postCount}</p>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-2 flex items-center gap-3 border border-gray-100">
                    <div className="p-2 bg-white rounded-lg shadow-sm text-purple-500"><Layers className="w-4 h-4" /></div>
                    <div>
                      <p className="text-[10px] text-gray-500 uppercase mb-0.5">Danh mục</p>
                      <p className="font-semibold text-gray-800 text-sm">{ws.categoryCount}</p>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-2 flex items-center gap-3 border border-gray-100">
                    <div className="p-2 bg-white rounded-lg shadow-sm text-blue-500"><Hash className="w-4 h-4" /></div>
                    <div>
                      <p className="text-[10px] text-gray-500 uppercase mb-0.5">Kênh chat</p>
                      <p className="font-semibold text-gray-800 text-sm">{ws.channelCount}</p>
                    </div>
                  </div>
                </div>

                {ws.type === 'server' && (
                  <div className="flex items-center justify-between text-sm bg-purple-50 p-3 rounded-xl border border-purple-100 mb-2">
                    <div className="flex items-center gap-2 text-purple-700">
                      <Diamond className="w-4 h-4" /> <span>Đá Donate:</span>
                    </div>
                    <span className="font-bold text-purple-800">{ws.totalStones || 0}</span>
                  </div>
                )}
              </div>

              {/* FOOTER: NÚT XEM CHI TIẾT & XÓA */}
              <div className="flex items-center justify-between mt-2 pt-4 border-t border-gray-100">
                <div className="text-xs text-gray-400 truncate flex-1">
                   {ws.type === 'server' ? `Tạo bởi: ${ws.creatorName}` : 'Quản lý bởi Admin'}
                </div>
                
                <div className="flex items-center gap-2">
                  <button onClick={() => handleViewDetails(ws)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors" title="Xem cấu trúc kênh">
                    <Eye className="w-5 h-5" />
                  </button>

                  {ws.type === 'server' && (
                    <button onClick={() => { setServerToDelete(ws._id as Id<"servers">); setIsDeleteModalOpen(true); }} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Xóa máy chủ">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>

            </div>
          ))
        )}
      </div>

      {/* POPUP XEM CHI TIẾT CẤU TRÚC KÊNH */}
      {isViewModalOpen && selectedWorkspace && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 shrink-0">
              <h3 className="text-xl font-semibold text-gray-800">Chi tiết Cộng đồng</h3>
              <button onClick={() => setIsViewModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <div className="flex items-center gap-4 mb-6 pb-4 border-b border-gray-100">
                {selectedWorkspace.type === 'university' && selectedWorkspace.icon.startsWith('local:') ? (
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-blue-600 rounded-2xl flex items-center justify-center shadow-md shrink-0">
                    <ShieldCheck className="w-8 h-8 text-white" />
                  </div>
                ) : (
                  <img loading="lazy"
                    src={selectedWorkspace.icon || `https://ui-avatars.com/api/?name=${selectedWorkspace.name.charAt(0)}`} 
                    alt={selectedWorkspace.name} 
                    className="w-16 h-16 rounded-2xl object-cover shadow-md shrink-0 border border-gray-100"
                  />
                )}
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">{selectedWorkspace.name}</h3>
                  <p className="text-sm text-gray-500">/{selectedWorkspace.slug}</p>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-500" /> Cấu trúc Kênh
                </h4>
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  {/* Các kênh không nằm trong danh mục nào (Đại sảnh) */}
                  {selectedWorkspace.channels?.filter((c: any) => !c.parentId).map((c: any) => (
                    <div key={c._id} className="flex items-center gap-2 text-gray-700 py-1.5 font-medium">
                      <Hash className="w-4 h-4 text-gray-400" /> {c.name} 
                      {c.isAnonymous && <span className="text-[10px] bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full ml-1">Ẩn danh</span>}
                    </div>
                  ))}

                  {/* Render từng danh mục và các kênh con bên trong */}
                  {selectedWorkspace.categories?.map((cat: any) => (
                    <div key={cat._id} className="mt-4">
                      <div className="font-bold text-[11px] text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <Layers className="w-3 h-3" /> {cat.name}
                      </div>
                      <div className="pl-4 border-l-2 border-gray-200 ml-1.5 space-y-1.5">
                        {selectedWorkspace.channels?.filter((c: any) => c.parentId === cat._id).map((c: any) => (
                          <div key={c._id} className="flex items-center gap-2 text-sm text-gray-700">
                            <Hash className="w-4 h-4 text-gray-400" /> {c.name}
                            {c.isAnonymous && <span className="text-[10px] bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full ml-1">Ẩn danh</span>}
                          </div>
                        ))}
                        {selectedWorkspace.channels?.filter((c: any) => c.parentId === cat._id).length === 0 && (
                          <span className="text-xs text-gray-400 italic">Chưa có kênh nào</span>
                        )}
                      </div>
                    </div>
                  ))}

                  {selectedWorkspace.categories?.length === 0 && selectedWorkspace.channels?.length === 0 && (
                    <div className="text-center text-sm text-gray-500 py-2">Máy chủ này chưa có kênh nào.</div>
                  )}
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
          {/* ... (Giữ nguyên Popup xóa) ... */}
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Xóa Máy chủ này?</h3>
            <p className="text-gray-500 mb-6 text-sm">Hành động này sẽ xóa vĩnh viễn máy chủ cùng toàn bộ kênh và tin nhắn bên trong. Không thể hoàn tác.</p>
            <div className="flex items-center justify-center gap-3">
              <button onClick={() => setIsDeleteModalOpen(false)} className="flex-1 px-4 py-2 text-gray-600 font-medium bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">Hủy</button>
              <button onClick={confirmDelete} className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg transition-colors">Đồng ý Xóa</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChannelsContent;