"use client";

import { useState, useRef } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { useTranslation } from 'react-i18next';
import { useApp } from '../context/AppContext';
import ModerationModal from './ModerationModal';
import InviteFriendsModal from './InviteFriendsModal';
// 👇 IMPORT THƯ VIỆN NÉN ẢNH 👇
import imageCompression from 'browser-image-compression';

interface Props {
  onClose: () => void;
  workspace: any;
}

export default function ServerSettingsModal({ onClose, workspace }: Props) {
  const { t } = useTranslation();
  const { setActiveServerId, setActiveUniversityId } = useApp() as any;

  const [editName, setEditName] = useState(workspace?.name || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [imagePreview, setImagePreview] = useState<string | null>(workspace?.icon || null);
  const [isUploadingImage, setIsUploadingImage] = useState(false); // Thêm state loading cho ảnh

  // STATE BẬT TẮT CÁC MODAL CON
  const [showModeration, setShowModeration] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateServer = useMutation(api.university.updateServer);
  const deleteServer = useMutation(api.university.deleteServer);
  const generateUploadUrl = useMutation(api.users.generateUploadUrl);

  if (!workspace) return null;

  const handleSaveName = async () => {
    if (!editName.trim() || editName === workspace.name) return;
    setIsSaving(true);
    try {
      await updateServer({ serverId: workspace._id, name: editName });
      alert(t('alerts.save_server_name'));
    } catch (e: any) {
      alert(t('common.error') + ': ' + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImagePreview(URL.createObjectURL(file)); // Hiển thị tạm ảnh gốc lên màn hình
    setIsUploadingImage(true);

    try {
      // 👇 1. CẤU HÌNH NÉN AVATAR SERVER (Ép xuống dưới 100KB, kích thước 512px) 👇
      const options = {
        maxSizeMB: 0.1, 
        maxWidthOrHeight: 512, 
        useWebWorker: true,
      };

      // 👇 2. BẮT ĐẦU NÉN 👇
      let finalFileToUpload = file;
      try {
        finalFileToUpload = await imageCompression(file, options);
        console.log(`Đã nén Avatar Server từ ${file.size / 1024} KB xuống ${finalFileToUpload.size / 1024} KB`);
      } catch (compressError) {
        console.error("Lỗi nén ảnh Server:", compressError);
        // Lỗi thì dùng file gốc
      }

      // 👇 3. UPLOAD FILE ĐÃ NÉN 👇
      const postUrl = await generateUploadUrl();
      const result = await fetch(postUrl, { 
        method: "POST", 
        headers: { "Content-Type": finalFileToUpload.type }, 
        body: finalFileToUpload 
      });
      const { storageId } = await result.json();
      
      await updateServer({ serverId: workspace._id, iconStorageId: storageId });
      alert(t('alerts.change_server_icon'));
    } catch (e: any) {
      alert(t('common.error') + ': ' + e.message);
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleDeleteServer = async () => {
    if (window.confirm(t('alerts.delete_server_desc'))) {
      setIsDeleting(true);
      try {
        await deleteServer({ serverId: workspace._id });
        setActiveServerId('');
        setActiveUniversityId('');
        onClose();
      } catch (e: any) {
        alert(t('common.error') + ': ' + e.message);
        setIsDeleting(false);
      }
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-[99990] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
        <div className="bg-[#f2f2f7] w-full max-w-[420px] rounded-2xl shadow-2xl flex flex-col animate-in zoom-in-95 duration-200 overflow-hidden min-h-[550px]" onClick={(e) => e.stopPropagation()}>
          
          <div className="flex items-center justify-between p-4 bg-white border-b border-gray-200 shrink-0">
            <h2 className="text-[17px] font-bold text-black">{t('server.settings')}</h2>
            <button onClick={onClose} className="text-[#007AFF] font-semibold text-[17px] hover:opacity-80 transition-opacity">
              {t('common.done')}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-5 hidden-scrollbar">
            
            <div className="flex flex-col items-center mb-2">
              <div className="w-20 h-20 rounded-full bg-[#1c1c1e] flex items-center justify-center mb-3 overflow-hidden border border-gray-200 shadow-sm relative">
                {imagePreview ? (
                  <img loading="lazy" src={imagePreview} alt="Server Avatar" className={`w-full h-full object-cover ${isUploadingImage ? 'opacity-50' : ''}`} />
                ) : (
                  <span className="text-2xl font-bold text-white uppercase">{workspace.name.charAt(0)}</span>
                )}
                {/* Thêm biểu tượng quay quay lúc đang upload */}
                {isUploadingImage && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="animate-spin w-6 h-6 border-2 border-white border-t-transparent rounded-full"></div>
                  </div>
                )}
              </div>
              <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageSelect} disabled={isUploadingImage} />
              <button onClick={() => fileInputRef.current?.click()} disabled={isUploadingImage} className="bg-[#e5e5ea] hover:bg-[#d1d1d6] disabled:opacity-50 text-black text-[13px] font-bold py-2 px-5 rounded-full transition-colors">
                {isUploadingImage ? t('chat.loading', {defaultValue: 'Đang tải...'}) : t('server.change_avatar')}
              </button>
            </div>

            <div>
              <label className="text-[12px] font-bold text-gray-500 uppercase ml-2 mb-1.5 block tracking-wider">{t('server.server_name_label')}</label>
              <div className="bg-white rounded-xl flex items-center px-4 py-3.5 shadow-sm">
                <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="flex-1 bg-transparent outline-none text-[16px] text-black" />
                <button onClick={handleSaveName} disabled={editName === workspace.name || isSaving} className="text-[#007AFF] font-semibold text-[15px] ml-3 disabled:opacity-40 transition-opacity">
                  {isSaving ? '...' : t('common.save')}
                </button>
              </div>
            </div>

            <button onClick={() => setShowModeration(true)} className="bg-white w-full rounded-xl flex items-center px-4 py-4 shadow-sm hover:bg-gray-50 transition-colors">
              <svg className="w-5 h-5 text-[#007AFF] mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
              <span className="text-[16px] font-semibold text-[#007AFF]">{t('report.moderation_title')}</span>
            </button>

            <button onClick={() => setShowInviteModal(true)} className="bg-white w-full rounded-xl flex items-center px-4 py-4 shadow-sm hover:bg-gray-50 transition-colors">
              <svg className="w-5 h-5 text-[#007AFF] mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
              <span className="text-[16px] font-semibold text-[#007AFF]">{t('server.invite_friends')}</span>
            </button>

            <button onClick={handleDeleteServer} disabled={isDeleting} className="bg-[#FFEBEB] w-full rounded-xl flex items-center justify-center px-4 py-4 mt-6 hover:bg-[#FFD6D6] transition-colors">
              <span className="text-[16px] font-bold text-[#FF3B30]">{isDeleting ? '...' : t('server.delete_server')}</span>
            </button>

          </div>
        </div>
      </div>

      {showModeration && <ModerationModal serverId={workspace._id} onClose={() => setShowModeration(false)} />}
      {showInviteModal && <InviteFriendsModal serverId={workspace._id} onClose={() => setShowInviteModal(false)} />}
    </>
  );
}