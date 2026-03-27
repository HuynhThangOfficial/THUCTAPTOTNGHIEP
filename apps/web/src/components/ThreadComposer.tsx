"use client";

import { useState, useRef, useEffect } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { useApp } from '../context/AppContext';
import { useUser } from '@clerk/nextjs';
import { useTranslation } from 'react-i18next';
// 👇 IMPORT THƯ VIỆN NÉN ẢNH 👇
import imageCompression from 'browser-image-compression';
import { Id } from '../../../../convex/_generated/dataModel';

// 👇 CUSTOM HOOK DEBOUNCE 👇
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

export default function ThreadComposer() {
  const { t } = useTranslation();
  const { showComposeModal, setShowComposeModal, activeChannelId, activeServerId, activeUniversityId, setShowAuthModal } = useApp() as any;
  const { user, isLoaded } = useUser();
  const isLoggedIn = isLoaded && user;

  const [content, setContent] = useState('');
  
  // 👇 DEBOUNCE (Nghỉ tay 800ms mới gọi AI) 👇
  const debouncedContent = useDebounce(content, 800);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [allowComments, setAllowComments] = useState(true);
  
  // 👇 STATE CÔNG TẮC BẬT TẮT AI 👇
  const [enableAI, setEnableAI] = useState(true);

  const [selectedChannelId, setSelectedChannelId] = useState<Id<'channels'> | null>(activeChannelId);
  const [showChannelPicker, setShowChannelPicker] = useState(false);

  const channelsData = useQuery(api.university.getChannels, {
    universityId: activeUniversityId || undefined,
    serverId: activeServerId || undefined,
  });

  const channels = channelsData?.channels || [];

  // 👇 GỌI API AI KÈM "VAN KHÓA" (SKIP) 👇
  const suggestedChannels = useQuery(
    api.ai_recommendation.suggestChannels,
    enableAI && debouncedContent.trim().length >= 10
      ? {
          content: debouncedContent,
          universityId: activeUniversityId || undefined,
          serverId: activeServerId || undefined,
        }
      : "skip"
  );

  // Đã sửa các lỗi type `any` ở đây
  const postableChannels = channels.filter((c: any) => c.name !== 'đại-sảnh' && !c.parentId === false && c.type !== 'category' || c.name !== 'đại-sảnh');

  const selectedChannelObj = channels.find((c: any) => c._id === selectedChannelId);
  const isAnonymous = selectedChannelObj?.isAnonymous || false;
  const selectedChannelName = selectedChannelObj?.name || t('composer.select_channel', { defaultValue: 'Chọn kênh...' });

  const generateUploadUrl = useMutation(api.messages.generateUploadUrl);
  const addThread = useMutation(api.messages.addThread);

  useEffect(() => {
    if (showComposeModal) {
      setSelectedChannelId(activeChannelId);
    }
  }, [showComposeModal, activeChannelId]);

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

    if (!selectedChannelId || selectedChannelName === 'đại-sảnh') {
      alert(t('composer.cannot_post_in_lobby'));
      return;
    }

    if (!content.trim() && selectedImages.length === 0) return;

    setIsSubmitting(true);
    try {
      const mediaFileIds: string[] = [];
      
      if (selectedImages.length > 0) {
        const options = {
          maxSizeMB: 0.5, 
          maxWidthOrHeight: 1280, 
          useWebWorker: true, 
        };

        for (const file of selectedImages) {
          try {
            const compressedFile = await imageCompression(file, options);
            const postUrl = await generateUploadUrl();
            const result = await fetch(postUrl, { 
              method: "POST", 
              headers: { "Content-Type": compressedFile.type }, 
              body: compressedFile 
            });
            const { storageId } = await result.json();
            mediaFileIds.push(storageId);
          } catch (compressError) {
            console.error("Lỗi khi nén ảnh:", compressError);
            const postUrl = await generateUploadUrl();
            const result = await fetch(postUrl, { method: "POST", headers: { "Content-Type": file.type }, body: file });
            const { storageId } = await result.json();
            mediaFileIds.push(storageId);
          }
        }
      }

      await addThread({
        content: content.trim(),
        mediaFiles: mediaFileIds.length > 0 ? mediaFileIds : undefined,
        channelId: selectedChannelId,
        serverId: activeServerId || undefined,
        universityId: activeUniversityId || undefined,
        allowComments: allowComments,
      });
      closeAndReset();
    } catch (error) {
      console.error(t('common.error'), error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayAvatar = isAnonymous ? "https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y" : (user?.imageUrl || "https://ui-avatars.com/api/?name=Guest&background=E5E7EB&color=9CA3AF");
  const displayName = isAnonymous ? t('thread.anonymous_member') : (user?.fullName || user?.username || t('settings.default_user'));

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={closeAndReset}
    >
      <div
        className="bg-white rounded-[16px] shadow-2xl w-full max-w-[620px] overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => { e.stopPropagation(); setShowChannelPicker(false); }}
      >

        <div className="h-14 flex items-center justify-between px-5 border-b border-gray-100 relative">
          <button type="button" onClick={closeAndReset} className="text-gray-900 font-medium text-sm hover:opacity-70">{t('common.cancel')}</button>
          <div className="flex items-center gap-2 pointer-events-none">
             <span className="font-bold text-lg text-slate-800 tracking-tight">{t('composer.new_post_title')}</span>
          </div>
          <button
            type="submit"
            form="modal-composer-form"
            disabled={(!content.trim() && selectedImages.length === 0) || isSubmitting || !isLoggedIn || !selectedChannelId || selectedChannelName === 'đại-sảnh'}
            className="px-5 py-1.5 bg-gray-900 hover:bg-black text-white font-semibold rounded-full text-sm transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {isSubmitting ? t('chat.loading') : t('composer.post')}
          </button>
        </div>

        <div className="p-5 max-h-[80vh] overflow-y-auto hidden-scrollbar relative">
            <form id="modal-composer-form" onSubmit={handleSubmit} className="space-y-4">

              <div className="flex items-center mb-4 relative" onClick={(e) => e.stopPropagation()}>
                <span className="text-sm text-gray-500 mr-2">{t('composer.posting_in')}</span>
                <button
                  type="button"
                  onClick={() => setShowChannelPicker(!showChannelPicker)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-semibold transition-colors ${selectedChannelName === 'đại-sảnh' ? 'border-red-300 bg-red-50 text-red-600' : 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100'}`}
                >
                  <span>#{selectedChannelName}</span>
                  <svg className={`w-4 h-4 transition-transform ${showChannelPicker ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </button>

                {showChannelPicker && (
                  <div className="absolute top-10 left-[80px] w-56 bg-white border border-gray-100 shadow-xl rounded-xl overflow-hidden z-50 max-h-48 overflow-y-auto custom-scrollbar">
                    {postableChannels.map((channel: any) => (
                      <button
                        key={channel._id}
                        type="button"
                        onClick={() => { setSelectedChannelId(channel._id); setShowChannelPicker(false); }}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-green-50 transition-colors flex items-center justify-between"
                      >
                        <span className="text-gray-800 font-medium">#{channel.name}</span>
                        {channel.isAnonymous && <span className="text-xs" title={t('thread.anonymous_channel')}>🎭</span>}
                      </button>
                    ))}
                    {postableChannels.length === 0 && (
                      <div className="px-4 py-3 text-sm text-gray-400 italic">{t('composer.no_channels_found')}</div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <div className="flex flex-col items-center shrink-0">
                  <img loading="lazy" src={displayAvatar} alt="Avatar" className="w-10 h-10 rounded-full object-cover shrink-0 border border-gray-100 z-10" />
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
                    placeholder={isLoggedIn ? t('composer.whats_on_your_mind') : t('login.login_button')}
                    className="w-full bg-transparent resize-none outline-none text-[15px] text-gray-800 placeholder-gray-400 min-h-[60px]"
                    rows={content.split('\n').length > 1 ? Math.min(content.split('\n').length, 12) : 1}
                    autoFocus
                  />

                  {/* 👇 GIAO DIỆN TIA CHỚP AI GỢI Ý CÓ "CÔNG TẮC" 👇 */}
                  {suggestedChannels && suggestedChannels.length > 0 && enableAI && (
                     <div className="mt-2 mb-1 p-3 bg-indigo-50/60 border border-indigo-100 rounded-xl">
                        <p className="text-[13px] font-bold text-indigo-600 mb-2 flex items-center gap-1.5">
                           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                           AI Gợi ý nơi đăng:
                        </p>
                        <div className="flex flex-wrap gap-2">
                           {suggestedChannels.map((ch: any) => (
                              <button
                                 key={ch.channelId}
                                 type="button"
                                 onClick={() => setSelectedChannelId(ch.channelId)}
                                 className={`px-3 py-1.5 text-[13px] font-medium border rounded-lg transition-colors flex items-center gap-1 ${selectedChannelId === ch.channelId ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-white text-gray-700 hover:bg-indigo-50 border-gray-200 shadow-sm'}`}
                              >
                                 #{ch.name} 
                                 <span className={`text-[10px] px-1.5 rounded-full ${selectedChannelId === ch.channelId ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
                                    {Math.round(ch.score * 100)}%
                                 </span>
                              </button>
                           ))}
                        </div>
                     </div>
                  )}

                  {previewUrls.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3 pb-3">
                      {previewUrls.map((url, idx) => (
                        <div key={idx} className="relative w-28 h-28 rounded-xl overflow-hidden border border-gray-200 group">
                          <img loading="lazy" src={url} alt="preview" className="w-full h-full object-cover" />
                          <button type="button" onClick={() => removeImage(idx)} className="absolute top-1.5 right-1.5 bg-black/60 text-white rounded-full w-5 h-5 flex items-center justify-center hover:bg-black transition-colors">✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-4 pl-[52px] pt-2 border-t border-gray-50 mt-2">
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

                {/* 👇 GIAO DIỆN CÔNG TẮC BẬT TẮT AI 👇 */}
                <div className="flex items-center justify-between bg-indigo-50/50 px-3 py-2.5 rounded-xl border border-indigo-100">
                  <div className="flex items-center gap-2 text-indigo-700">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    <span className="text-sm font-medium">{enableAI ? "AI đang hỗ trợ gợi ý kênh" : "Đã tắt AI gợi ý"}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEnableAI(!enableAI)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${enableAI ? 'bg-indigo-600' : 'bg-gray-300'}`}
                  >
                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${enableAI ? 'translate-x-4' : 'translate-x-1'}`} />
                  </button>
                </div>

                {/* CÔNG TẮC BÌNH LUẬN (CŨ) */}
                <div className="flex items-center justify-between bg-gray-50 px-3 py-2.5 rounded-xl border border-gray-100">
                  <div className="flex items-center gap-2 text-gray-600">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                    <span className="text-sm font-medium">{allowComments ? t('composer.allow_comments') : t('composer.comments_disabled')}</span>
                  </div>
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