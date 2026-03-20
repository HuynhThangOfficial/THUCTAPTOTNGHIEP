"use client";

import { useState, useRef, useEffect } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { useApp } from '../context/AppContext';
import { useUser } from '@clerk/nextjs';

export default function ThreadComposer() {
  const { showComposeModal, setShowComposeModal, activeChannelId, activeServerId, activeUniversityId, setShowAuthModal } = useApp() as any;
  const { user, isLoaded } = useUser();
  const isLoggedIn = isLoaded && user;
  
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- STATE MỚI CHO TÍNH NĂNG CHỌN KÊNH & BÌNH LUẬN ---
  const [allowComments, setAllowComments] = useState(true);
  const [selectedChannelId, setSelectedChannelId] = useState(activeChannelId);
  const [showChannelPicker, setShowChannelPicker] = useState(false);

  // Lấy danh sách kênh trong Server/Trường học hiện tại
  const channelsData = useQuery(api.university.getChannels, {
    universityId: activeUniversityId || undefined,
    serverId: activeServerId || undefined,
  });
  const channels = channelsData?.channels || [];
  // Lọc bỏ category và đại-sảnh (không cho đăng trực tiếp vào đại-sảnh)
  const postableChannels = channels.filter(c => c.name !== 'đại-sảnh' && !c.parentId === false && c.type !== 'category' || c.name !== 'đại-sảnh');

  // Xác định kênh đang được chọn và xem nó có phải kênh Ẩn danh không
  const selectedChannelObj = channels.find(c => c._id === selectedChannelId);
  const isAnonymous = selectedChannelObj?.isAnonymous || false;
  const selectedChannelName = selectedChannelObj?.name || 'Chọn kênh...';

  const generateUploadUrl = useMutation(api.messages.generateUploadUrl);
  const addThread = useMutation(api.messages.addThread);

  // Reset dữ liệu mỗi khi mở Modal
  useEffect(() => {
    if (showComposeModal) {
      setSelectedChannelId(activeChannelId);
    }
  }, [showComposeModal, activeChannelId]);

  // Xử lý đóng modal bằng nút ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showComposeModal) setShowComposeModal(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showComposeModal, setShowComposeModal]);

  const closeAndReset = () => {
    setShowComposeModal(false);
    setContent('');
    setSelectedImages([]);
    setPreviewUrls([]);
    setShowChannelPicker(false);
  };

  if (!showComposeModal) return null;

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    setSelectedImages((prev) => [...prev, ...files]);
    const newPreviews = files.map((file) => URL.createObjectURL(file));
    setPreviewUrls((prev) => [...prev, ...newPreviews]);
  };

  const removeImage = (index: number) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
    setPreviewUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoggedIn) {
        setShowComposeModal(false);
        return setShowAuthModal(true);
    }
    
    // Validate: Bắt buộc chọn kênh hợp lệ
    if (!selectedChannelId || selectedChannelName === 'đại-sảnh') {
      alert("Vui lòng chọn một kênh cụ thể để đăng bài (Không thể đăng ở đại-sảnh).");
      return;
    }

    if (!content.trim() && selectedImages.length === 0) return;

    setIsSubmitting(true);
    try {
      const mediaFileIds: string[] = [];
      if (selectedImages.length > 0) {
        for (const file of selectedImages) {
          const postUrl = await generateUploadUrl();
          const result = await fetch(postUrl, { method: "POST", headers: { "Content-Type": file.type }, body: file });
          const { storageId } = await result.json();
          mediaFileIds.push(storageId);
        }
      }
      
      await addThread({
        content: content.trim(),
        mediaFiles: mediaFileIds.length > 0 ? mediaFileIds : undefined,
        channelId: selectedChannelId, // Dùng kênh user vừa chọn
        serverId: activeServerId || undefined,
        universityId: activeUniversityId || undefined,
        allowComments: allowComments, // Gửi trạng thái cho phép bình luận
      });
      closeAndReset();
    } catch (error) {
      console.error("Lỗi đăng bài:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Logic hiển thị Avatar và Tên (Đổi ẩn danh nếu cần)
  const displayAvatar = isAnonymous ? "https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y" : (user?.imageUrl || "https://ui-avatars.com/api/?name=Guest&background=E5E7EB&color=9CA3AF");
  const displayName = isAnonymous ? "Người dùng ẩn danh" : (user?.fullName || user?.username || "Người dùng");

  return (
    <div 
      className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={closeAndReset}
    >
      <div 
        className="bg-white rounded-[16px] shadow-2xl w-full max-w-[620px] overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => { e.stopPropagation(); setShowChannelPicker(false); }} // Đóng menu kênh khi click ra ngoài form
      >
        
        {/* Header Modal */}
        <div className="h-14 flex items-center justify-between px-5 border-b border-gray-100 relative">
          <button type="button" onClick={closeAndReset} className="text-gray-900 font-medium text-sm hover:opacity-70">Hủy</button>
          <div className="flex items-center gap-2 pointer-events-none">
             <span className="font-bold text-lg text-slate-800 tracking-tight">Thêm bài viết mới</span>
          </div>
          <button 
            type="submit" 
            form="modal-composer-form"
            disabled={(!content.trim() && selectedImages.length === 0) || isSubmitting || !isLoggedIn || !selectedChannelId || selectedChannelName === 'đại-sảnh'}
            className="px-5 py-1.5 bg-gray-900 hover:bg-black text-white font-semibold rounded-full text-sm transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Đang tải...' : 'Đăng'}
          </button>
        </div>

        {/* Nội dung chính */}
        <div className="p-5 max-h-[80vh] overflow-y-auto hidden-scrollbar relative">
            <form id="modal-composer-form" onSubmit={handleSubmit} className="space-y-4">
              
              {/* CHỌN KÊNH (Dropdown) */}
              <div className="flex items-center mb-4 relative" onClick={(e) => e.stopPropagation()}>
                <span className="text-sm text-gray-500 mr-2">Đăng trong:</span>
                <button
                  type="button"
                  onClick={() => setShowChannelPicker(!showChannelPicker)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-semibold transition-colors ${selectedChannelName === 'đại-sảnh' ? 'border-red-300 bg-red-50 text-red-600' : 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100'}`}
                >
                  <span>#{selectedChannelName}</span>
                  <svg className={`w-4 h-4 transition-transform ${showChannelPicker ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </button>

                {/* Dropdown Menu Kênh */}
                {showChannelPicker && (
                  <div className="absolute top-10 left-[80px] w-56 bg-white border border-gray-100 shadow-xl rounded-xl overflow-hidden z-50 max-h-48 overflow-y-auto custom-scrollbar">
                    {postableChannels.map(channel => (
                      <button
                        key={channel._id}
                        type="button"
                        onClick={() => { setSelectedChannelId(channel._id); setShowChannelPicker(false); }}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-green-50 transition-colors flex items-center justify-between"
                      >
                        <span className="text-gray-800 font-medium">#{channel.name}</span>
                        {channel.isAnonymous && <span className="text-xs" title="Kênh ẩn danh">🎭</span>}
                      </button>
                    ))}
                    {postableChannels.length === 0 && (
                      <div className="px-4 py-3 text-sm text-gray-400 italic">Không có kênh nào khả dụng.</div>
                    )}
                  </div>
                )}
              </div>

              {/* Form Nội dung */}
              <div className="flex gap-3">
                <div className="flex flex-col items-center shrink-0">
                  <img src={displayAvatar} alt="Avatar" className="w-10 h-10 rounded-full object-cover shrink-0 border border-gray-100 z-10" />
                  <div className="w-[2.5px] h-full min-h-[50px] bg-gray-200 mt-2 rounded-full"></div>
                </div>
                
                <div className="flex-1 flex flex-col pb-2 mt-0.5">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="font-bold text-[15px] text-gray-900">{displayName}</span>
                    {isAnonymous && <span className="text-xs">🎭</span>}
                  </div>

                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder={isLoggedIn ? "Có gì mới?" : "Đăng nhập để chia sẻ suy nghĩ của bạn..."}
                    className="w-full bg-transparent resize-none outline-none text-[15px] text-gray-800 placeholder-gray-400 min-h-[60px]"
                    rows={content.split('\n').length > 1 ? Math.min(content.split('\n').length, 12) : 1}
                    autoFocus
                  />

                  {previewUrls.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3 pb-3">
                      {previewUrls.map((url, idx) => (
                        <div key={idx} className="relative w-28 h-28 rounded-xl overflow-hidden border border-gray-200 group">
                          <img src={url} alt="preview" className="w-full h-full object-cover" />
                          <button type="button" onClick={() => removeImage(idx)} className="absolute top-1.5 right-1.5 bg-black/60 text-white rounded-full w-5 h-5 flex items-center justify-center hover:bg-black transition-colors">✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* THANH CÔNG CỤ & CÀI ĐẶT BÌNH LUẬN */}
              <div className="flex flex-col gap-4 pl-[52px] pt-2 border-t border-gray-50 mt-2">
                
                {/* Các Icon đính kèm */}
                <div className="flex gap-4 text-gray-400 items-center">
                    <input type="file" ref={fileInputRef} onChange={handleImageSelect} accept="image/*" multiple className="hidden" />
                    <button type="button" onClick={() => { if (!isLoggedIn) { setShowComposeModal(false); return setShowAuthModal(true); } fileInputRef.current?.click(); }} className="hover:text-gray-600 transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    </button>
                    <button type="button" className="hover:text-gray-600 transition-colors font-extrabold text-[10px] border-[1.5px] border-gray-300 rounded-[5px] px-1.5 h-[19px] flex items-center justify-center">GIF</button>
                    <button type="button" className="hover:text-gray-600 transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" /></svg>
                    </button>
                </div>

                {/* Công tắc Bật/Tắt Bình luận (Mô phỏng Switch) */}
                <div className="flex items-center justify-between bg-gray-50 px-3 py-2.5 rounded-xl border border-gray-100">
                  <div className="flex items-center gap-2 text-gray-600">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                    <span className="text-sm font-medium">{allowComments ? 'Cho phép bình luận' : 'Khóa bình luận'}</span>
                  </div>
                  
                  {/* Nút Toggle Switch CSS */}
                  <button 
                    type="button"
                    onClick={() => setAllowComments(!allowComments)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${allowComments ? 'bg-[#5865F2]' : 'bg-gray-300'}`}
                  >
                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${allowComments ? 'translate-x-4' : 'translate-x-1'}`} />
                  </button>
                </div>

              </div>

            </form>
        </div>
        
      </div>
    </div>
  );
}