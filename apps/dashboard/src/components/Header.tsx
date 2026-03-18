import { useState } from 'react';
import { Bell, ChevronDown, Menu, Search, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { sampleNotifications } from '../data/sampleData';

interface HeaderProps {
  title: string;
  activeItem: string;
  onOpenSidebar: () => void;
}

const Header = ({ title, activeItem, onOpenSidebar }: HeaderProps) => {
  const { user, logout } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  
  // State quản lý Modal Đăng xuất
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  
  const unreadCount = sampleNotifications.filter(n => n.unread).length;

  return (
    <>
      <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={() => onOpenSidebar()}
            className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Menu className="w-6 h-6 text-gray-600" />
          </button>
          <div>
            <h1 className="text-xl lg:text-2xl font-bold text-gray-800">{title}</h1>
            <p className="text-sm text-gray-500 hidden sm:block">
              {activeItem === 'dashboard' && 'Xem tổng quan hệ thống của bạn'}
              {activeItem === 'channels' && 'Quản lý cộng đồng và máy chủ'}
              {activeItem === 'users' && 'Quản lý người dùng hệ thống'}
              {activeItem === 'content' && 'Quản lý nội dung và bài viết'}
              {activeItem === 'reports' && 'Xem và xử lý báo cáo'}
              {activeItem === 'analytics' && 'Phân tích dữ liệu chi tiết'}
              {activeItem === 'permissions' && 'Nhật ký an ninh và bảo mật'}
              {activeItem === 'settings' && 'Cấu hình hệ thống'}
              {activeItem === 'notifications' && 'Gửi thông báo đến người dùng'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 lg:gap-4">
          {/* Thanh tìm kiếm */}
          <div className="hidden md:flex items-center gap-2 bg-gray-50 hover:bg-gray-100 rounded-xl px-4 py-2 transition-colors cursor-pointer border border-transparent hover:border-gray-200">
            <Search className="w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm kiếm..."
              className="bg-transparent outline-none w-48 text-sm"
            />
            <kbd className="hidden lg:inline-flex items-center px-2 py-1 bg-gray-200 text-gray-500 text-xs rounded font-medium">⌘K</kbd>
          </div>

          {/* Nút Thông báo */}
          <div className="relative">
            <button
              onClick={() => {
                setShowNotifications(!showNotifications);
                setShowUserMenu(false); // Đóng menu user nếu đang mở
              }}
              className="p-2 lg:p-3 hover:bg-gray-100 rounded-xl transition-colors relative"
            >
              <Bell className="w-5 h-5 lg:w-6 lg:h-6 text-gray-600" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center border-2 border-white">
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50">
                <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                  <h3 className="font-semibold text-gray-800">Thông báo mới</h3>
                  <span className="text-xs text-emerald-600 font-medium cursor-pointer hover:underline">Đánh dấu đã đọc</span>
                </div>
                <div className="max-h-80 overflow-y-auto custom-scrollbar">
                  {sampleNotifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={`p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer ${
                        notif.unread ? 'bg-emerald-50/30' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-2 h-2 mt-2 rounded-full shrink-0 ${notif.unread ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                        <div className="flex-1">
                          <p className={`text-sm ${notif.unread ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>{notif.title}</p>
                          <p className="text-gray-500 text-sm mt-1 line-clamp-2">{notif.message}</p>
                          <p className="text-gray-400 text-xs mt-2">{notif.time}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-3 bg-gray-50 text-center border-t border-gray-100">
                  <button className="text-emerald-600 font-medium text-sm hover:text-emerald-700">
                    Xem tất cả thông báo
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Nút User Menu */}
          <div className="relative">
            <button
              onClick={() => {
                setShowUserMenu(!showUserMenu);
                setShowNotifications(false); // Đóng menu thông báo nếu đang mở
              }}
              className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <div className="w-8 h-8 lg:w-10 lg:h-10 bg-gradient-to-br from-emerald-400 to-green-500 rounded-full flex items-center justify-center font-bold text-white shadow-md">
                {user?.name?.charAt(0).toUpperCase() || 'A'}
              </div>
              <ChevronDown className={`w-4 h-4 text-gray-500 hidden lg:block transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50">
                <div className="p-5 border-b border-gray-100 bg-gray-50 flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-green-500 rounded-full flex items-center justify-center font-bold text-white shadow-md text-lg shrink-0">
                    {user?.name?.charAt(0).toUpperCase() || 'A'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 truncate">{user?.name || 'Admin User'}</p>
                    <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                  </div>
                </div>
                
                <div className="p-2">
                  <button className="w-full px-4 py-2 text-left hover:bg-gray-50 rounded-xl transition-colors text-gray-700 font-medium text-sm">
                    Hồ sơ cá nhân
                  </button>
                  <button className="w-full px-4 py-2 text-left hover:bg-gray-50 rounded-xl transition-colors text-gray-700 font-medium text-sm">
                    Cài đặt tài khoản
                  </button>
                  <button className="w-full px-4 py-2 text-left hover:bg-gray-50 rounded-xl transition-colors text-gray-700 font-medium text-sm mb-1">
                    Trợ giúp & Hỗ trợ
                  </button>
                  
                  <div className="h-px bg-gray-100 my-1 mx-2"></div>
                  
                  {/* NÚT ĐĂNG XUẤT */}
                  <button 
                    onClick={() => {
                      setShowUserMenu(false);
                      setIsLogoutModalOpen(true);
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 mt-1 text-left hover:bg-red-50 text-red-600 rounded-xl transition-colors font-medium text-sm"
                  >
                    <LogOut className="w-4 h-4" /> Đăng xuất
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* POPUP XÁC NHẬN ĐĂNG XUẤT */}
      {isLogoutModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center animate-in fade-in zoom-in duration-200">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-100">
              <LogOut className="w-8 h-8 text-red-500 ml-1" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Đăng xuất hệ thống?</h3>
            <p className="text-gray-500 mb-6 text-sm">Bạn có chắc chắn muốn đăng xuất khỏi phiên quản trị này không?</p>
            <div className="flex items-center justify-center gap-3">
              <button 
                onClick={() => setIsLogoutModalOpen(false)} 
                className="flex-1 px-4 py-2.5 text-gray-600 font-medium bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
              >
                Hủy bỏ
              </button>
              <button 
                onClick={() => {
                  setIsLogoutModalOpen(false);
                  logout();
                }} 
                className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white font-medium rounded-xl transition-colors shadow-lg shadow-red-200"
              >
                Đăng xuất
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Header;