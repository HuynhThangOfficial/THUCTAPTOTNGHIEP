import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  // 👇 CỰC KỲ QUAN TRỌNG: Để Vercel hiểu bạn đang chạy ở thư mục con
  base: "/dashboard/", 
  
  plugins: [
    react(), 
    tailwindcss(), 
    // Nếu bạn muốn export ra 1 file duy nhất để dễ quản lý
    viteSingleFile()
  ],
  
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@convex": path.resolve(__dirname, "../../convex"),
    },
    dedupe: ["react", "react-dom"],
  },
  
  server: {
    port: 5173,
    fs: {
      allow: [
        path.resolve(__dirname, "../../"), // Cho phép truy cập toàn bộ thư mục tttn2
        path.resolve(__dirname, "."),      // Thư mục dashboard hiện tại
      ],
    },
  },

  // Thêm cái này để khi build nó không bị lỗi đường dẫn ảnh/font
  build: {
    assetsDir: "assets",
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, "index.html"),
      },
    },
  },
});