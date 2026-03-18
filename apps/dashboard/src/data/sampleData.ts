export const sampleUsers = [
  { id: 1, name: 'Nguyễn Văn A', email: 'nguyenvana@email.com', role: 'Admin', status: 'active', joinedDate: '2024-01-15', lastActive: '2 phút trước' },
  { id: 2, name: 'Trần Thị B', email: 'tranthib@email.com', role: 'Editor', status: 'active', joinedDate: '2024-02-20', lastActive: '15 phút trước' },
  { id: 3, name: 'Lê Văn C', email: 'levanc@email.com', role: 'Moderator', status: 'inactive', joinedDate: '2024-01-10', lastActive: '3 ngày trước' },
  { id: 4, name: 'Phạm Thị D', email: 'phamthid@email.com', role: 'User', status: 'active', joinedDate: '2024-03-01', lastActive: '1 giờ trước' },
  { id: 5, name: 'Hoàng Văn E', email: 'hoangvane@email.com', role: 'User', status: 'pending', joinedDate: '2024-03-10', lastActive: 'Chưa hoạt động' },
];

export const sampleContent = [
  { id: 1, title: 'Hướng dẫn sử dụng Discord', type: 'Article', author: 'Nguyễn Văn A', status: 'published', views: 15420, date: '2024-03-15' },
  { id: 2, title: 'Cập nhật tính năng mới tháng 3', type: 'News', author: 'Trần Thị B', status: 'draft', views: 0, date: '2024-03-18' },
  { id: 3, title: 'Chính sách bảo mật', type: 'Policy', author: 'Lê Văn C', status: 'pending', views: 8920, date: '2024-03-10' },
  { id: 4, title: 'FAQ - Các câu hỏi thường gặp', type: 'Article', author: 'Phạm Thị D', status: 'published', views: 23100, date: '2024-02-28' },
];

export const sampleReports = [
  { id: 1, type: 'Spam', reportedBy: 'User_1234', target: 'User_5678', reason: 'Quảng cáo trái phép', status: 'pending', date: '2024-03-18' },
  { id: 2, type: 'Harassment', reportedBy: 'User_9999', target: 'User_4321', reason: 'Lăng mạ người khác', status: 'investigating', date: '2024-03-17' },
  { id: 3, type: 'Fake Account', reportedBy: 'User_1111', target: 'User_2222', reason: 'Mạo danh người nổi tiếng', status: 'resolved', date: '2024-03-16' },
];

export interface NotificationItem {
  id: number;
  title: string;
  message: string;
  time: string;
  unread: boolean;
}

export const sampleNotifications: NotificationItem[] = [
  { id: 1, title: 'Báo cáo mới', message: 'Có 3 báo cáo chờ xử lý', time: '5 phút trước', unread: true },
  { id: 2, title: 'Người dùng mới', message: '15 người dùng đăng ký mới', time: '1 giờ trước', unread: true },
  { id: 3, title: 'Server overload', message: 'Server SG-01 vượt ngưỡng 90%', time: '2 giờ trước', unread: false },
];
