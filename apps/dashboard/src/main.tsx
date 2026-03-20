import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { ClerkProvider } from '@clerk/clerk-react';
import { ConvexProvider, ConvexReactClient } from 'convex/react';

// Cấu hình Convex & Clerk
const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);
const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!PUBLISHABLE_KEY) {
  throw new Error("Missing Publishable Key");
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ClerkProvider 
  publishableKey={PUBLISHABLE_KEY}
  // 🚨 Đổi thành false vì bây giờ nó đã chung một nhà (origin) với KonKet rồi
  isSatellite={false} 
  // 🚨 Bắt buộc phải có cái này nếu bạn dùng Custom Domain cho Clerk
  domain="newyas.com"
  signInUrl="https://konket.newyas.com"
>
      <ConvexProvider client={convex}>
        <App />
      </ConvexProvider>
    </ClerkProvider>
  </React.StrictMode>
);