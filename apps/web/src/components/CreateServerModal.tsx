"use client";

import { useState, useRef, useEffect } from 'react'; // 👈 Thêm useEffect
import { createPortal } from 'react-dom'; // 👈 IMPORT CHIÊU PORTAL
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { useApp } from '../context/AppContext';
import { useTranslation } from 'react-i18next';
import imageCompression from 'browser-image-compression';

interface Props {
  onClose: () => void;
}

export default function CreateServerModal({ onClose }: Props) {
  const { t } = useTranslation();
  const { setActiveServerId, setActiveUniversityId, setActiveChannelId } = useApp() as any;

  // 👇 STATE CHỐNG LỖI NEXT.JS KHI DÙNG PORTAL 👇
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const currentUser = useQuery(api.users.current);
  const createServer = useMutation(api.university.createServer);
  const generateUploadUrl = useMutation(api.users.generateUploadUrl);

  const [name, setName] = useState('');
  const [template, setTemplate] = useState('Friends');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const TEMPLATES = [
    { id: 'Friends', label: t('templates.Friends'), icon: '💗' },
    { id: 'Gaming', label: t('templates.Gaming'), icon: '🎮' },
    { id: 'Study', label: t('templates.Study'), icon: '📚' },
    { id: 'School', label: t('templates.School'), icon: '🏫' },
    { id: 'Creators', label: t('templates.Creators'), icon: '🎨' },
    { id: 'Custom', label: t('server.create_custom'), icon: '🌍' }
  ];

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      let storageId = undefined;
      
      if (selectedImage) {
        const options = {
          maxSizeMB: 0.1, 
          maxWidthOrHeight: 512, 
          useWebWorker: true,
        };

        let finalFileToUpload = selectedImage;
        try {
          finalFileToUpload = await imageCompression(selectedImage, options);
        } catch (compressError) {
          console.error("Lỗi nén ảnh tạo Server:", compressError);
        }

        const postUrl = await generateUploadUrl();
        const result = await fetch(postUrl, {
          method: 'POST',
          headers: { 'Content-Type': finalFileToUpload.type },
          body: finalFileToUpload,
        });
        const { storageId: uploadedStorageId } = await result.json();
        storageId = uploadedStorageId;
      }

      const result = await createServer({
        name: name.trim(),
        template: template,
        iconStorageId: storageId,
      });

      if (result.success && result.serverId) {
        setActiveUniversityId('');
        setActiveChannelId('');
        setActiveServerId(result.serverId);
        onClose();
      } else {
        alert(t('common.error') + ": " + result.message);
      }
    } catch (error: any) {
      alert(t('common.error') + ": " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Đợi render xong client mới nhả Portal ra
  if (!mounted) return null;

  // 👇 GÓI TOÀN BỘ UI VÀO BIẾN ĐỂ BẮN PORTAL 👇
  const modalContent = (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl flex flex-col animate-in zoom-in-95 duration-200 overflow-hidden">
        <div className="text-center pt-8 px-6 pb-4">
          <h2 className="text-2xl font-extrabold text-slate-800 mb-2">{t('server.create_title')}</h2>
          <p className="text-slate-500 text-[15px]">{t('server.create_desc')}</p>
        </div>

        <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-5">
          <div className="flex flex-col items-center justify-center">
            <div onClick={() => !isSubmitting && fileInputRef.current?.click()} className={`relative w-20 h-20 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center transition-colors group overflow-hidden ${isSubmitting ? 'cursor-not-allowed opacity-70' : 'cursor-pointer hover:bg-gray-50'}`}>
              {imagePreview ? (
                <img loading="lazy" src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center text-gray-400 group-hover:text-[#5865F2]">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                </div>
              )}
            </div>
            <input type="file" ref={fileInputRef} onChange={handleImageSelect} accept="image/*" className="hidden" disabled={isSubmitting}/>
          </div>

          <div>
            <label className="block text-xs font-extrabold text-slate-500 uppercase mb-2">{t('server.server_name_label')}</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder={t('server.default_name', { name: currentUser?.first_name || currentUser?.username || t('common.me') })} className="w-full bg-[#f2f3f5] border border-transparent rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:border-[#5865F2] focus:bg-white transition-all font-medium" autoFocus disabled={isSubmitting}/>
          </div>

          <div>
            <label className="block text-xs font-extrabold text-slate-500 uppercase mb-2">{t('server.start_from_template')}</label>
            <select value={template} onChange={(e) => setTemplate(e.target.value)} className="w-full bg-[#f2f3f5] border border-transparent rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:border-[#5865F2] focus:bg-white transition-all text-sm font-medium" disabled={isSubmitting}>
              {TEMPLATES.map(tmp => <option key={tmp.id} value={tmp.id}>{tmp.icon} {tmp.label}</option>)}
            </select>
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-100">
            <button type="button" onClick={onClose} disabled={isSubmitting} className="flex-1 py-3 rounded-xl hover:underline text-slate-600 transition-colors text-sm font-bold disabled:opacity-50">{t('common.cancel')}</button>
            <button type="submit" disabled={!name.trim() || isSubmitting} className="flex-1 py-3 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] disabled:bg-indigo-300 text-white transition-colors text-sm font-bold shadow-sm">
              {isSubmitting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto"></div> : t('server.create_btn')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  // 👇 RA LỆNH BẮN PORTAL 👇
  return createPortal(modalContent, document.body);
}