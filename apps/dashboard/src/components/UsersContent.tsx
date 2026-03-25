import { useState } from 'react';
import { Edit, Eye, Plus, Search, Trash2, Loader2, X, AlertTriangle } from 'lucide-react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@convex/_generated/api';
import { Id } from '@convex/_generated/dataModel';

type User = any;

const UsersContent = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  const users = useQuery(api.admin.getUsers, { 
    search: searchTerm.trim() !== '' ? searchTerm : undefined 
  });

  const createUser = useMutation(api.admin.adminCreateUser);
  const updateUser = useMutation(api.admin.adminUpdateUser);
  const deleteUser = useMutation(api.admin.adminDeleteUser);

  // States quản lý Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAddMode, setIsAddMode] = useState(false); 
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({ email: '', first_name: '', last_name: '', username: '', role: 'user' });

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<Id<"users"> | null>(null);

  // Lọc user
  const filteredUsers = users?.filter(user => {
    const userRole = user.role || 'user';
    if (roleFilter === 'admin') return userRole === 'admin';
    if (roleFilter === 'user') return userRole !== 'admin';
    return true;
  });

  const formatJoinDate = (timestamp?: number) => {
    if (!timestamp) return 'Không xác định';
    return new Date(timestamp).toLocaleString('vi-VN', {
      hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric'
    });
  };

  // NÚT THÊM
  const handleOpenAdd = () => {
    setFormData({ email: '', first_name: '', last_name: '', username: '', role: 'user' });
    setIsAddMode(true);
    setIsEditMode(true); 
    setIsModalOpen(true);
  };

  // NÚT XEM
  const handleView = (user: User) => {
    setSelectedUser(user);
    setFormData({ ...user, role: user.role || 'user' });
    setIsAddMode(false);
    setIsEditMode(false);
    setIsModalOpen(true);
  };

  // NÚT SỬA
  const handleEdit = (user: User) => {
    setSelectedUser(user);
    setFormData({
      email: user.email || '',
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      username: user.username || '',
      role: user.role || 'user',
    });
    setIsAddMode(false);
    setIsEditMode(true);
    setIsModalOpen(true);
  };

  // LƯU DỮ LIỆU (THÊM HOẶC SỬA)
  const handleSave = async () => {
    try {
      if (isAddMode) {
        if (!formData.email || !formData.username) {
          alert("Email và Tên đăng nhập không được để trống!");
          return;
        }
        await createUser(formData);
      } else if (selectedUser) {
        await updateUser({
          userId: selectedUser._id,
          first_name: formData.first_name,
          last_name: formData.last_name,
          username: formData.username,
          role: formData.role,
        });
      }
      setIsModalOpen(false);
    } catch (error) {
      alert("Có lỗi xảy ra!");
    }
  };

  // XÓA
  const confirmDelete = async () => {
    if (!userToDelete) return;
    try {
      await deleteUser({ userId: userToDelete });
      setIsDeleteModalOpen(false);
      setUserToDelete(null);
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
              placeholder="Tìm kiếm người dùng..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>
          <select 
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          >
            <option value="all">Tất cả vai trò</option>
            <option value="admin">Admin</option>
            <option value="user">User</option>
          </select>
        </div>
        <button 
          onClick={handleOpenAdd}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-green-600 text-white font-medium rounded-xl hover:from-emerald-600 hover:to-green-700 transition-all shadow-lg shadow-emerald-200"
        >
          <Plus className="w-5 h-5" />
          Thêm người dùng
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Người dùng</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Vai trò</th>
                {/* 👇 ĐÃ SỬA: Tiêu đề cột 👇 */}
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Ngày tham gia</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-600">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredUsers === undefined ? (
                <tr><td colSpan={4} className="px-6 py-12 text-center text-gray-500"><Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-emerald-500" />Đang tải dữ liệu...</td></tr>
              ) : filteredUsers.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-12 text-center text-gray-500">Không tìm thấy người dùng nào.</td></tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {user.imageUrl ? (
                          <img loading="lazy" src={user.imageUrl} alt={user.username} className="w-10 h-10 rounded-full object-cover border border-gray-200" />
                        ) : (
                          <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-green-500 rounded-full flex items-center justify-center font-bold text-white">
                            {user.username ? user.username.charAt(0).toUpperCase() : 'U'}
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-gray-800">
                            {user.first_name ? `${user.first_name} ${user.last_name || ''}` : user.username}
                          </p>
                          <p className="text-sm text-gray-500">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'}`}>
                        {user.role === 'admin' ? 'Admin' : 'Thành viên'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {/* 👇 ĐÃ SỬA: Truyền _creationTime vào 👇 */}
                      {formatJoinDate(user._creationTime)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => handleView(user)} className="p-2 hover:bg-emerald-50 rounded-lg transition-colors text-emerald-600"><Eye className="w-5 h-5" /></button>
                        <button onClick={() => handleEdit(user)} className="p-2 hover:bg-blue-50 rounded-lg transition-colors text-blue-600"><Edit className="w-5 h-5" /></button>
                        <button onClick={() => { setUserToDelete(user._id); setIsDeleteModalOpen(true); }} className="p-2 hover:bg-red-50 rounded-lg transition-colors text-red-600"><Trash2 className="w-5 h-5" /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* POPUP XEM / SỬA / THÊM */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-xl font-semibold text-gray-800">
                {isAddMode ? 'Thêm người dùng mới' : (isEditMode ? 'Chỉnh sửa người dùng' : 'Chi tiết người dùng')}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email {isAddMode && <span className="text-red-500">*</span>}</label>
                <input 
                  type="email" 
                  disabled={!isAddMode} 
                  value={formData.email} 
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className={`w-full px-4 py-2 border rounded-lg ${!isAddMode ? 'bg-gray-50 border-gray-200 text-gray-500 cursor-not-allowed' : 'bg-white border-gray-300 focus:ring-2 focus:ring-emerald-500 outline-none'}`} 
                  placeholder="ví dụ: user@gmail.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vai trò hệ thống</label>
                <select 
                  disabled={!isEditMode}
                  value={formData.role}
                  onChange={(e) => setFormData({...formData, role: e.target.value})}
                  className={`w-full px-4 py-2 border rounded-lg ${!isEditMode ? 'bg-gray-50 border-gray-200 text-gray-600 cursor-not-allowed' : 'bg-white border-gray-300 focus:ring-2 focus:ring-emerald-500 outline-none'}`}
                >
                  <option value="user">Thành viên</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tên đăng nhập {isAddMode && <span className="text-red-500">*</span>}</label>
                <input 
                  type="text" 
                  disabled={!isEditMode}
                  value={formData.username}
                  onChange={(e) => setFormData({...formData, username: e.target.value})}
                  className={`w-full px-4 py-2 border rounded-lg ${!isEditMode ? 'bg-gray-50 border-gray-200 text-gray-600 cursor-not-allowed' : 'bg-white border-gray-300 focus:ring-2 focus:ring-emerald-500 outline-none'}`} 
                  placeholder="ví dụ: thangkho"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Họ</label>
                  <input type="text" disabled={!isEditMode} value={formData.first_name} onChange={(e) => setFormData({...formData, first_name: e.target.value})} className={`w-full px-4 py-2 border rounded-lg ${!isEditMode ? 'bg-gray-50 border-gray-200 text-gray-600 cursor-not-allowed' : 'bg-white border-gray-300 focus:ring-2 focus:ring-emerald-500 outline-none'}`} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tên</label>
                  <input type="text" disabled={!isEditMode} value={formData.last_name} onChange={(e) => setFormData({...formData, last_name: e.target.value})} className={`w-full px-4 py-2 border rounded-lg ${!isEditMode ? 'bg-gray-50 border-gray-200 text-gray-600 cursor-not-allowed' : 'bg-white border-gray-300 focus:ring-2 focus:ring-emerald-500 outline-none'}`} />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100 bg-gray-50">
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-200 rounded-lg transition-colors">Đóng</button>
              {isEditMode && (
                <button onClick={handleSave} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg transition-colors">
                  {isAddMode ? 'Tạo mới' : 'Lưu thay đổi'}
                </button>
              )}
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
            <h3 className="text-xl font-bold text-gray-800 mb-2">Xác nhận xóa?</h3>
            <p className="text-gray-500 mb-6">Bạn có chắc chắn muốn xóa người dùng này không? Hành động này không thể hoàn tác.</p>
            <div className="flex items-center justify-center gap-3">
              <button onClick={() => setIsDeleteModalOpen(false)} className="flex-1 px-4 py-2 text-gray-600 font-medium bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">Hủy bỏ</button>
              <button onClick={confirmDelete} className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg transition-colors">Xóa ngay</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default UsersContent;