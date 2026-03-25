"use client";

import { useState } from 'react';
import { useAuth, useClerk, useUser } from '@clerk/nextjs';
import { useQuery, useMutation } from 'convex/react';
// Kiểm tra lại đường dẫn import này cho khớp dự án của bạn
import { api } from '../../../../convex/_generated/api';
// 👇 Import hàm dịch
import { useTranslation } from 'react-i18next';

interface SettingsModalProps {
  onClose: () => void;
}

export default function SettingsModal({ onClose }: SettingsModalProps) {
  const { signOut } = useAuth();
  const { client, setActive } = useClerk();
  const { user } = useUser();

  // Lấy hàm t (translate) và i18n (để đổi ngôn ngữ)
  const { t, i18n } = useTranslation();

  // Các state quản lý menu con
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const [showAccountSwitch, setShowAccountSwitch] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Lấy dữ liệu và Mutation từ Convex
  const userProfile = useQuery(api.users.current);
  const updateLanguage = useMutation(api.users.updateLanguage);

  const LANGUAGES = [
    { code: 'vi', label: 'Tiếng Việt 🇻🇳' },
    { code: 'en', label: 'English 🇺🇸' },
    { code: 'zh', label: '中文 🇨🇳' }
  ];

  const getLanguageName = (code?: string) => {
    const lang = LANGUAGES.find(l => l.code === code);
    return lang ? lang.label : 'English 🇺🇸';
  };

  // --- CÁC HÀM XỬ LÝ LOGIC ---
  const handleLanguageChange = async (langCode: string) => {
    // 1. Đổi giao diện Web sang ngôn ngữ mới ngay lập tức
    i18n.changeLanguage(langCode);

    if (userProfile?._id) {
      try {
        // 2. Lưu xuống Database để lần sau vào vẫn giữ ngôn ngữ này
        await updateLanguage({ userId: userProfile._id, language: langCode });
        setShowLanguageMenu(false);
      } catch(e) {
        console.log(t('common.error'), e);
      }
    }
  };

  const handleCopyLink = () => {
    const profileLink = `https://konket.app/profile/${userProfile?.username || userProfile?._id}`;
    navigator.clipboard.writeText(profileLink);
    alert(t('chat.copied'));
  };

  const handleSwitchAccount = async (sessionId: string) => {
    try {
      await setActive({ session: sessionId });
      setShowAccountSwitch(false);
      onClose();
    } catch (err) {
      alert(t('settings.switch_account_error'));
    }
  };

  const handleLogout = async () => {
    if (confirm(t('settings.logout_confirm'))) {
      await signOut();
      onClose();
    }
  };

  const handleDeleteAccount = async () => {
    if (confirm(t('settings.delete_account_warning_desc'))) {
      try {
        setIsDeleting(true);
        await user?.delete(); // Xóa tài khoản trên Clerk
        await signOut();
        onClose();
      } catch (error: any) {
        alert(error.errors?.[0]?.message || t('settings.delete_account_error'));
        setIsDeleting(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm transition-all" onClick={onClose}>

      {isDeleting && (
        <div className="absolute inset-0 z-[10000] bg-white/80 flex flex-col items-center justify-center">
          <div className="animate-spin w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full mb-4"></div>
          <span className="font-bold text-gray-700">{t('settings.deleting_account')}</span>
        </div>
      )}

      {/* KHUNG MODAL CHÍNH */}
      <div
        className="bg-[#f2f3f5] w-full max-w-[500px] max-h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200 bg-white shrink-0">
          <h2 className="text-xl font-extrabold text-gray-800">{t('settings.title')}</h2>
          <button onClick={onClose} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-full transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Nội dung Cài đặt (Cuộn được) */}
        <div className="flex-1 overflow-y-auto hidden-scrollbar p-5 space-y-6">

          {/* Mục 1: Thông tin tài khoản */}
          <div>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 ml-1">Tài khoản của tôi</h3>
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
               <img loading="lazy"src={user?.imageUrl || "https://ui-avatars.com/api/?name=Guest"} alt="Avatar" className="w-16 h-16 rounded-full border border-gray-200 object-cover" />
               <div className="flex-1 min-w-0">
                 <div className="text-lg font-bold text-gray-900 truncate">{user?.fullName || user?.username || t('settings.default_user')}</div>
                 <div className="text-sm text-gray-500 truncate">@{user?.username}</div>
               </div>
               <button className="px-4 py-2 bg-[#5865F2] hover:bg-[#4752C4] text-white text-sm font-semibold rounded-lg transition-colors shadow-sm whitespace-nowrap">
                 {t('profile.edit_profile')}
               </button>
            </div>
          </div>

          {/* Mục 2: Cài đặt hiển thị & Đa ngôn ngữ */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">

            {/* Chuyển đổi tài khoản */}
            <div className="relative">
              <button onClick={() => setShowAccountSwitch(!showAccountSwitch)} className="w-full flex items-center justify-between p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors text-left">
                 <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                    <span className="text-[15px] font-medium text-gray-800">{t('settings.switch_account')}</span>
                 </div>
                 <svg className={`w-5 h-5 text-gray-400 transition-transform ${showAccountSwitch ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>

              {showAccountSwitch && (
                <div className="bg-gray-50 border-b border-gray-100 py-2">
                  {client.sessions.map((session) => (
                    <button key={session.id} onClick={() => handleSwitchAccount(session.id)} className="w-full flex items-center gap-3 px-6 py-2 hover:bg-gray-200 transition-colors">
                      <img loading="lazy"src={session.user?.imageUrl} alt="Avt" className="w-8 h-8 rounded-full border border-gray-300" />
                      <span className="text-sm font-medium text-gray-700 flex-1 text-left">{session.user?.fullName || session.user?.username}</span>
                      {session.id === client.lastActiveSessionId && <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Ngôn ngữ */}
            <div className="relative">
              <button onClick={() => setShowLanguageMenu(!showLanguageMenu)} className="w-full flex items-center justify-between p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors text-left">
                 <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" /></svg>
                    <span className="text-[15px] font-medium text-gray-800">{t('settings.app_language')}</span>
                 </div>
                 <div className="text-sm text-gray-500 flex items-center gap-2">
                    {getLanguageName(userProfile?.language)} <svg className={`w-4 h-4 transition-transform ${showLanguageMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                 </div>
              </button>

              {showLanguageMenu && (
                <div className="bg-gray-50 border-b border-gray-100 py-2">
                  {LANGUAGES.map((lang) => (
                    <button key={lang.code} onClick={() => handleLanguageChange(lang.code)} className="w-full px-6 py-2.5 hover:bg-gray-200 transition-colors text-left flex items-center justify-between">
                      <span className="text-sm text-gray-700">{lang.label}</span>
                      {userProfile?.language === lang.code && <svg className="w-4 h-4 text-[#5865F2]" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Chia sẻ hồ sơ */}
            <button onClick={handleCopyLink} className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors text-left">
               <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                  <span className="text-[15px] font-medium text-gray-800">{t('settings.share_profile')}</span>
               </div>
               <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>

          </div>

          {/* Mục 3: Vùng nguy hiểm */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
             <button onClick={handleLogout} className="w-full flex items-center p-4 border-b border-gray-100 hover:bg-red-50 transition-colors text-left group">
                <svg className="w-5 h-5 text-red-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                <span className="text-[15px] font-semibold text-red-500">{t('settings.logout')}</span>
             </button>

             <button onClick={handleDeleteAccount} className="w-full flex items-center p-4 hover:bg-red-50 transition-colors text-left group">
                <svg className="w-5 h-5 text-red-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                <span className="text-[15px] font-semibold text-red-500">{t('settings.delete_account')}</span>
             </button>
          </div>

        </div>
      </div>
    </div>
  );
}