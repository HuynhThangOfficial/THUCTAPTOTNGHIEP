import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [react(), tailwindcss(), viteSingleFile()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@convex": path.resolve(__dirname, "../../convex"),
    },
    dedupe: ["react", "react-dom"],
  },
  server: {
    port: 5173,
    // 👇 THÊM ĐOẠN NÀY ĐỂ VITE CHO PHÉP ĐỌC FILE TỪ THƯ MỤC GỐC MONOREPO
    fs: {
      allow: [
        path.resolve(__dirname, "../../"), // Cho phép truy cập toàn bộ thư mục tttn2
        path.resolve(__dirname, "."),      // Thư mục dashboard hiện tại
      ],
    },
  },
});