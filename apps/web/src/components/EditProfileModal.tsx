"use client";

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom'; // 👈 1. THÊM MA THUẬT PORTAL
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { useUser } from '@clerk/nextjs';
import { useApp } from '../context/AppContext';
import { useTranslation } from 'react-i18next';
import imageCompression from 'browser-image-compression';

export default function EditProfileModal() {
  const { t } = useTranslation();
  
  // 👇 LƯU Ý QUAN TRỌNG: 2 biến này phải GHI ĐÚNG TÊN như trong file AppContext.tsx nhé bác! 👇
  const { showEditProfileModal, setShowEditProfileModal } = useApp() as any;
  
  const { user } = useUser();
  const profile = useQuery(api.users.current);

  const updateUser = useMutation(api.users.updateUser);
  const generateUploadUrl = useMutation(api.users.generateUploadUrl);
  const updateImage = useMutation(api.users.updateImage);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [bio, setBio] = useState('');
  const [link, setLink] = useState('');
  const [linkTitle, setLinkTitle] = useState('');

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // 👇 2. STATE CHỐNG LỖI NEXT.JS SSR 👇
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (profile) {
      setBio(profile.bio || '');
      setLink(profile.websiteUrl || '');
      setLinkTitle(profile.linkTitle || '');
      setAvatarPreview('');
      setAvatarFile(null);
    }
  }, [profile, showEditProfileModal]);

  useEffect(() => {
    if (!link) {
      setLinkTitle('');
    }
  }, [link]);

  // Nếu chưa mount xong, hoặc biến showEditProfileModal = false (hoặc undefined do sai tên) thì không render
  if (!mounted || !showEditProfileModal || !profile || !user) return null;

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleSave = async () => {
    if (isUpdating) return;
    setIsUpdating(true);

    try {
      await updateUser({
        _id: profile._id,
        bio,
        websiteUrl: link,
        linkTitle: linkTitle
      });

      if (avatarFile) {
        const options = {
          maxSizeMB: 0.1, 
          maxWidthOrHeight: 512, 
          useWebWorker: true,
        };

        let finalFileToUpload = avatarFile;
        try {
          finalFileToUpload = await imageCompression(avatarFile, options);
        } catch (compressError) {
          console.error("Lỗi khi nén Avatar:", compressError);
        }

        const postUrl = await generateUploadUrl();
        const result = await fetch(postUrl, {
          method: 'POST',
          headers: { 'Content-Type': finalFileToUpload.type },
          body: finalFileToUpload, 
        });
        const { storageId } = await result.json();
        
        await updateImage({ storageId, _id: profile._id });
        await user.setProfileImage({ file: finalFileToUpload });
      }

      setShowEditProfileModal(false);
    } catch (error) {
      console.error(error);
      alert(t('common.error'));
    } finally {
      setIsUpdating(false);
    }
  };

  // 👇 3. GÓI GIAO DIỆN VÀO BIẾN ĐỂ ĐẨY RA PORTAL 👇
  const modalContent = (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-[500px] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">

        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-white">
          <button onClick={() => setShowEditProfileModal(false)} className="text-gray-500 font-medium hover:text-black">{t('common.cancel')}</button>
          <h2 className="text-[16px] font-bold">{t('profile.edit_profile')}</h2>
          <button onClick={handleSave} disabled={isUpdating} className={`font-bold ${isUpdating ? 'text-gray-400' : 'text-blue-500 hover:text-blue-700'}`}>
            {isUpdating ? t('edit_profile.saving') : t('common.done')}
          </button>
        </div>

        <div className="p-6 space-y-6 bg-gray-50/50">
          <div className="flex flex-col items-center">
            <img
              src={avatarPreview || user.imageUrl || "https://ui-avatars.com/api/?name=User"}
              className="w-20 h-20 rounded-full object-cover border border-gray-200 mb-3 shadow-sm"
              alt="Avatar"
            />
            <input type="file" accept="image/*" ref={fileInputRef} onChange={handleAvatarChange} className="hidden" />
            <button onClick={() => fileInputRef.current?.click()} className="text-[15px] font-bold text-blue-500 hover:underline">
              {t('edit_profile.change_photo')}
            </button>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm space-y-4">
            <div>
              <label className="text-[12px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">{t('edit_profile.bio_label')}</label>
              <textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder={t('edit_profile.bio_placeholder')} className="w-full text-[15px] outline-none min-h-[60px] resize-none" />
            </div>

            <div className="h-[1px] bg-gray-100 w-full" />

            <div>
              <label className="text-[12px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">{t('edit_profile.link_label')}</label>
              <input type="text" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://example.com" className="w-full text-[15px] outline-none py-1" />
            </div>

            <div className="h-[1px] bg-gray-100 w-full" />

            <div>
              <label className={`text-[12px] font-bold uppercase tracking-wider mb-1 block ${link ? 'text-gray-500' : 'text-gray-300'}`}>{t('edit_profile.link_title_label')}</label>
              <input
                type="text"
                value={linkTitle}
                onChange={(e) => setLinkTitle(e.target.value)}
                placeholder={link ? t('edit_profile.link_title_placeholder') : t('edit_profile.link_title_placeholder')}
                disabled={!link}
                className={`w-full text-[15px] outline-none py-1 ${!link ? 'text-gray-400 bg-transparent cursor-not-allowed' : ''}`}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // 👇 BẮN THẲNG RA BODY CỦA HTML ĐỂ CHỐNG LỖI CSS 👇
  return createPortal(modalContent, document.body);
}