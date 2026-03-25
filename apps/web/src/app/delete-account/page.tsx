'use client';
import React from 'react';
import { useTranslation } from 'react-i18next'; 

export default function DeleteAccountPage() {
  // Lấy thêm i18n ra để dùng hàm đổi ngôn ngữ
  const { t, i18n } = useTranslation();

  // Hàm chuyển đổi ngôn ngữ
  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  return (
    <div style={{ padding: '40px', maxWidth: '600px', margin: '0 auto', fontFamily: 'sans-serif', lineHeight: '1.6' }}>
      
      {/* 🇻🇳 🇬🇧 🇨🇳 NÚT CHUYỂN NGÔN NGỮ Ở ĐÂY */}
      <div style={{ textAlign: 'right', marginBottom: '20px' }}>
        <button onClick={() => changeLanguage('vi')} style={{ marginRight: '10px', padding: '5px 10px', cursor: 'pointer', borderRadius: '5px', border: '1px solid #CBD5E0', background: '#fff' }}>🇻🇳 VN</button>
        <button onClick={() => changeLanguage('en')} style={{ marginRight: '10px', padding: '5px 10px', cursor: 'pointer', borderRadius: '5px', border: '1px solid #CBD5E0', background: '#fff' }}>🇬🇧 EN</button>
        <button onClick={() => changeLanguage('zh')} style={{ padding: '5px 10px', cursor: 'pointer', borderRadius: '5px', border: '1px solid #CBD5E0', background: '#fff' }}>🇨🇳 CN</button>
      </div>

      <h1 style={{ color: '#E53E3E', borderBottom: '2px solid #E53E3E', paddingBottom: '10px' }}>
        {t('deleteAccount.title')}
      </h1>
      
      <p style={{ fontSize: '16px', marginTop: '20px' }}>
        {t('deleteAccount.description')}
      </p>

      <div style={{ background: '#F7FAFC', border: '1px solid #E2E8F0', padding: '20px', borderRadius: '8px', marginTop: '20px' }}>
        
        <h3 style={{ color: '#2D3748', marginTop: '0' }}>{t('deleteAccount.method1.title')}</h3>
        <p>{t('deleteAccount.method1.subtitle')}</p>
        <ul style={{ background: '#fff', padding: '15px 30px', borderRadius: '5px', border: '1px solid #CBD5E0' }}>
          <li><strong>{t('deleteAccount.method1.webLabel')}</strong><br/> {t('deleteAccount.method1.webSteps')}</li>
          <li style={{ marginTop: '10px' }}><strong>{t('deleteAccount.method1.appLabel')}</strong><br/> {t('deleteAccount.method1.appSteps')}</li>
        </ul>

        <h3 style={{ color: '#2D3748', marginTop: '30px' }}>{t('deleteAccount.method2.title')}</h3>
        <p>{t('deleteAccount.method2.subtitle')}</p>
        <ul style={{ background: '#fff', padding: '15px 30px', borderRadius: '5px', border: '1px solid #CBD5E0' }}>
          <li><strong>{t('deleteAccount.method2.sendTo')}</strong> contact@newyas.com</li>
          <li><strong>{t('deleteAccount.method2.subject')}</strong> {t('deleteAccount.method2.subjectText')}</li>
          <li><strong>{t('deleteAccount.method2.content')}</strong> {t('deleteAccount.method2.contentText')}</li>
        </ul>
        
      </div>

      <div style={{ marginTop: '30px', padding: '15px', background: '#FFF5F5', borderRadius: '8px', color: '#C53030' }}>
        <strong>
          {/* Đã bọc thẻ span cho emoji để Vercel không kêu ca */}
          <span role="img" aria-label="warning">⚠️</span> {t('deleteAccount.warning.title')}
        </strong>
        <p style={{ margin: '5px 0 0 0', fontSize: '14px' }}>
          {t('deleteAccount.warning.content')}
        </p>
      </div>
    </div>
  );
}