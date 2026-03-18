import { useState } from 'react';
import { SignedIn, SignedOut } from '@clerk/clerk-react';
import { AuthProvider } from './contexts/AuthContext';

import LoginPage from './components/LoginPage';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import DashboardContent from './components/DashboardContent';
import ChannelsContent from './components/ChannelsContent';
import UsersContent from './components/UsersContent';
import ContentContent from './components/ContentContent';
import ReportsContent from './components/ReportsContent';
import AnalyticsContent from './components/AnalyticsContent';
import PermissionsContent from './components/PermissionsContent';
import NotificationsContent from './components/NotificationsContent';

function App() {
  const [activeItem, setActiveItem] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const titles: Record<string, string> = {
    dashboard: 'Tổng quan',
    channels: 'Kênh & Máy chủ',
    users: 'Quản lý người dùng',
    content: 'Quản lý nội dung',
    reports: 'Báo cáo & Kiểm duyệt',
    analytics: 'Thống kê & Phân tích',
    permissions: 'Nhật ký hoạt động',
    notifications: 'Gửi thông báo',
  };

  return (
    <AuthProvider>
      {/* NẾU CHƯA ĐĂNG NHẬP: Trình duyệt sẽ chỉ render duy nhất trang Login này */}
      <SignedOut>
        <LoginPage />
      </SignedOut>

      {/* NẾU ĐÃ ĐĂNG NHẬP THÀNH CÔNG: Clerk sẽ mở khóa toàn bộ Dashboard bên trong */}
      <SignedIn>
        <div className="min-h-screen bg-gray-50">
          <Sidebar 
            activeItem={activeItem} 
            setActiveItem={setActiveItem}
            isOpen={sidebarOpen}
            setIsOpen={setSidebarOpen}
          />
          
          <div className="lg:ml-64 min-h-screen flex flex-col">
            <Header 
              title={titles[activeItem] || 'Dashboard'} 
              activeItem={activeItem}
              onOpenSidebar={() => setSidebarOpen(true)}
            />
            
            <main className="flex-1 p-4 lg:p-6">
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                {activeItem === 'dashboard' && <DashboardContent />}
                {activeItem === 'channels' && <ChannelsContent />}
                {activeItem === 'users' && <UsersContent />}
                {activeItem === 'content' && <ContentContent />}
                {activeItem === 'reports' && <ReportsContent />}
                {activeItem === 'analytics' && <AnalyticsContent />}
                {activeItem === 'permissions' && <PermissionsContent />}
                {activeItem === 'notifications' && <NotificationsContent />}
              </div>
            </main>
          </div>
        </div>
      </SignedIn>
    </AuthProvider>
  );
}

export default App;