import { BarChart3, Bell, FileText, LayoutDashboard, Lock, Server, Shield, Users, X } from 'lucide-react';

// IMPORT CHUẨN: Vite sẽ quản lý file này, tự thêm hash để tránh lỗi cache trình duyệt
import logoImg from '../assets/konket-logo-white.png';

interface SidebarProps {
  activeItem: string;
  setActiveItem: (item: string) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const Sidebar = ({ activeItem, setActiveItem, isOpen, setIsOpen }: SidebarProps) => {

  const menuItems = [
    { id: 'dashboard', label: 'Tổng quan', icon: LayoutDashboard },
    { id: 'channels', label: 'Kênh & Máy chủ', icon: Server },
    { id: 'users', label: 'Quản lý người dùng', icon: Users },
    { id: 'content', label: 'Quản lý nội dung', icon: FileText },
    { id: 'reports', label: 'Báo cáo & Kiểm duyệt', icon: Shield },
    { id: 'analytics', label: 'Thống kê & Phân tích', icon: BarChart3 },
    { id: 'permissions', label: 'Nhật ký hoạt động', icon: Lock },
    { id: 'notifications', label: 'Gửi thông báo', icon: Bell },
  ];

  return (
    <>
      {/* Overlay cho mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Main Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-gradient-to-b from-green-900 to-green-950 text-white z-50 transform transition-transform duration-300 flex flex-col lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* HEADER: PHẦN LOGO CĂN GIỮA */}
        <div className="h-24 flex flex-col items-center justify-center px-4 border-b border-green-800/50 shrink-0 relative">
          {/* Nút X cho mobile - cho nằm tuyệt đối ở góc để không lệch Logo */}
          <button
            onClick={() => setIsOpen(false)}
            className="lg:hidden absolute top-4 right-4 p-2 hover:bg-green-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-green-300" />
          </button>

          {/* Căn giữa ảnh và chữ */}
          <div className="flex flex-col items-center gap-2">
            <img 
              src={logoImg} 
              alt="KonKet Logo" 
              className="h-15 w-auto object-contain drop-shadow-xl"
            />
          </div>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 overflow-y-auto py-6 px-3 custom-scrollbar">
          <ul className="space-y-1.5">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeItem === item.id;
              return (
                <li key={item.id}>
                  <button
                    onClick={() => {
                      setActiveItem(item.id);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-300 group ${
                      isActive
                        ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-900/50'
                        : 'hover:bg-white/10 text-green-100/70 hover:text-white'
                    }`}
                  >
                    <Icon className={`w-5 h-5 transition-colors ${isActive ? 'text-white' : 'text-emerald-500/60 group-hover:text-emerald-400'}`} />
                    <span className={`font-semibold tracking-wide ${isActive ? 'opacity-100' : 'opacity-80 group-hover:opacity-100'}`}>
                      {item.label}
                    </span>
                    {isActive && (
                      <div className="ml-auto w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Chân sidebar - Có thể để version hoặc bản quyền nhỏ */}
        <div className="p-4 text-center">
            <p className="text-[10px] text-green-700 font-medium tracking-widest uppercase opacity-50">
                Newyas
            </p>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;