"use client";

import { useState, useRef } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { Id } from '../../../../convex/_generated/dataModel';
import { useApp } from '../context/AppContext';

interface Props {
  onClose: () => void;
}

export default function CreateServerModal({ onClose }: Props) {
  const { setActiveServerId } = useApp();
  
  const currentUser = useQuery(api.users.current);
  const createServer = useMutation(api.university.createServer);
  const generateUploadUrl = useMutation(api.users.generateUploadUrl); // Lấy hàm generate URL

  const [name, setName] = useState('');
  const [template, setTemplate] = useState('Bạn bè');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !currentUser) return;

    setIsSubmitting(true);
    try {
      let uploadedStorageId: string | undefined = undefined;

      // 1. Upload hình ảnh (nếu có)
      if (selectedImage) {
        const postUrl = await generateUploadUrl();
        const result = await fetch(postUrl, {
          method: "POST",
          headers: { "Content-Type": selectedImage.type },
          body: selectedImage,
        });
        const { storageId } = await result.json();
        uploadedStorageId = storageId;
      }

      // 2. Tạo máy chủ
      const result = await createServer({
        name: name.trim(),
        template: template,
        iconStorageId: uploadedStorageId ? (uploadedStorageId as Id<"_storage">) : undefined,
      });

      if (result.success && result.serverId) {
        setActiveServerId(result.serverId); // Tự động chọn server mới tạo
        onClose();
      } else {
        alert(result.message || "Không thể tạo Server. Vui lòng kiểm tra lại giới hạn!");
      }
    } catch (error: any) {
      console.error("Lỗi tạo Server:", error);
      alert(error.message || "Có lỗi xảy ra!");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white border border-green-100 rounded-3xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        
        <div className="flex items-center justify-between px-6 py-5 border-b border-green-100 bg-gradient-to-r from-green-50 to-emerald-50">
          <h2 className="text-slate-800 font-bold text-xl">Tạo Máy Chủ Mới</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-white text-slate-500 transition-colors flex items-center justify-center">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Avatar Của Server */}
          <div className="flex flex-col items-center">
            <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageSelect} />
            <button 
              type="button" 
              onClick={() => fileInputRef.current?.click()}
              className="w-24 h-24 rounded-full border-2 border-dashed border-green-300 flex items-center justify-center bg-green-50 hover:bg-green-100 overflow-hidden relative group transition-colors"
            >
              {imagePreview ? (
                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl text-green-500">📸</span>
              )}
              <div className="absolute inset-0 bg-black/40 hidden group-hover:flex items-center justify-center text-white text-xs font-bold">
                Tải ảnh
              </div>
            </button>
            <p className="text-xs text-gray-500 mt-2">Ảnh đại diện máy chủ</p>
          </div>

          {/* Tên Server */}
          <div>
            <label className="text-slate-600 text-sm font-bold mb-2 block uppercase tracking-wider">
              Tên Máy Chủ
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: Hội anh em đam mê Code"
              className="w-full bg-[#f2f3f5] border border-transparent rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:border-green-400 focus:bg-white transition-all text-sm"
              required
            />
          </div>

          {/* Chọn Template */}
          <div>
            <label className="text-slate-600 text-sm font-bold mb-2 block uppercase tracking-wider">
              Mẫu Cộng Đồng
            </label>
            <select
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              className="w-full bg-[#f2f3f5] border border-transparent rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:border-green-400 focus:bg-white transition-all text-sm"
            >
              <option value="Bạn bè">💗 Dành cho bạn bè</option>
              <option value="Gaming">🎮 Câu lạc bộ Gaming</option>
              <option value="Nhóm Học Tập">📚 Nhóm Học Tập</option>
              <option value="Custom">🌍 Cộng đồng khác</option>
            </select>
            <p className="text-xs text-gray-500 mt-2">Mẫu này sẽ tạo sẵn các danh mục và kênh phù hợp.</p>
          </div>

          {/* Nút Hành Động */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-gray-200 text-slate-600 hover:bg-gray-50 transition-colors text-sm font-bold"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={!name.trim() || isSubmitting}
              className="flex-1 py-3 rounded-xl bg-green-600 hover:bg-green-500 disabled:bg-green-300 text-white font-bold transition-colors text-sm shadow-sm"
            >
              {isSubmitting ? "Đang tạo..." : "Tạo Máy Chủ"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}