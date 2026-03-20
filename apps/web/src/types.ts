// src/types.ts
// Các kiểu dữ liệu từ nay sẽ được lấy trực tiếp từ Convex:
// Ví dụ: import { Doc, Id } from "../../convex/_generated/dataModel";

export interface AppContextType {
  activeUniversityId: string | null;
  setActiveUniversityId: (id: string | null) => void;
  
  activeServerId: string | null;
  setActiveServerId: (id: string | null) => void;
  
  activeChannelId: string | null;
  setActiveChannelId: (id: string | null) => void;
  
  activeChannelName: string | null;
  setActiveChannelName: (name: string | null) => void;
}