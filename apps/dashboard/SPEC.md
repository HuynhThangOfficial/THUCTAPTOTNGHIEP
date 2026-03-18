# Admin Dashboard - SPEC.md

## 1. Concept & Vision

Một dashboard quản trị hiện đại, chuyên nghiệp với màu xanh lá làm chủ đạo tượng trưng cho sự phát triển bền vững và an toàn. Giao diện được thiết kế tối giản nhưng tinh tế, mang lại trải nghiệm quản lý hiệu quả cho người dùng với các biểu đồ thống kê trực quan và navigation dễ sử dụng.

## 2. Design Language

### Aesthetic Direction
- Phong cách: Modern SaaS Dashboard với Glassmorphism nhẹ
- Cảm giác: Chuyên nghiệp, đáng tin cậy, thân thiện

### Color Palette
- Primary: `#10B981` (Emerald Green)
- Primary Dark: `#059669`
- Primary Light: `#34D399`
- Secondary: `#064E3B` (Dark Green)
- Accent: `#6EE7B7` (Light Emerald)
- Background: `#F0FDF4` (Mint White)
- Sidebar: `#064E3B` (Dark Green)
- Card Background: `#FFFFFF`
- Text Primary: `#1F2937`
- Text Secondary: `#6B7280`
- Border: `#E5E7EB`
- Error: `#EF4444`
- Warning: `#F59E0B`
- Success: `#10B981`

### Typography
- Font Family: 'Inter', sans-serif (Google Fonts)
- Headings: Bold, tracking tight
- Body: Regular, 16px base

### Spatial System
- Base unit: 4px
- Spacing scale: 4, 8, 12, 16, 24, 32, 48, 64px
- Border radius: 8px (cards), 12px (modals), 24px (buttons pill)

### Motion Philosophy
- Transitions: 200-300ms ease-out
- Hover effects: Scale nhẹ (1.02) + shadow tăng
- Page transitions: Fade in 300ms
- Sidebar: Slide in/out 300ms

## 3. Layout & Structure

### Login Page
- Centered card với form đăng nhập
- Logo và brand name phía trên
- Input fields với icons
- Remember me checkbox
- Submit button primary
- Forgot password link

### Main Dashboard Layout
- Fixed Sidebar bên trái (260px width)
- Top Header với search, notifications, user profile
- Main Content area với padding 24px
- Cards layout với grid system

### Sidebar Structure
- Logo/Brand ở trên
- Navigation items với icons
- Active state với background highlight
- User info ở dưới cùng
- Logout button

## 4. Features & Interactions

### Authentication
- Email validation
- Password minimum 6 characters
- Show/hide password toggle
- Login button loading state
- Error messages inline
- Redirect to dashboard on success

### Sidebar Navigation
- Hover: Background lighten, slight indent
- Active: Left border accent, background highlight
- Tooltip on collapsed state
- Smooth scroll to sections

### Dashboard Cards
- Hover: Elevate with shadow
- Click: Navigate to detail page
- Loading skeleton state

### Statistics
- Animated counter on load
- Percentage change indicators
- Mini sparkline charts

## 5. Component Inventory

### LoginForm
- States: default, loading, error, success
- Inputs: email, password
- Remember me checkbox
- Submit button

### Sidebar
- Logo component
- NavItem components (9 items)
- UserProfile component
- LogoutButton

### Header
- SearchBar
- NotificationBell
- UserAvatar dropdown

### StatCard
- Icon, title, value, change indicator
- States: default, loading

### DataTable
- Headers, rows, pagination
- Row hover state
- Action buttons (view, edit, delete)

### Modal
- Overlay backdrop
- Close button
- Header, body, footer

## 6. Technical Approach

- Framework: React + TypeScript + Vite
- Styling: Tailwind CSS
- Icons: Lucide React
- Charts: Recharts
- State: React useState/useContext
- Routing: Simple state-based navigation (no react-router for simplicity)
