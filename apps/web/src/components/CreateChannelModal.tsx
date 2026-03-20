"use client";

import { useState, useEffect } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { Id } from '../../../../convex/_generated/dataModel';
import { useTranslation } from 'react-i18next';
import { X, Hash, FolderPlus } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  serverId: string;
  type: 'channel' | 'category';
  parentId?: string;
}

export default function CreateChannelModal({ isOpen, onClose, serverId, type, parentId }: Props) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createChannel = useMutation((api as any).university.createChannel);

  useEffect(() => {
    if (isOpen) {
      setName('');
      setIsAnonymous(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      let finalName = name.trim();
      if (type === 'channel') {
         finalName = finalName.toLowerCase().replace(/\s+/g, '-');
      }

      // 👇 FIX LỖI: Tạo Payload động để loại bỏ hoàn toàn các trường undefined
      // Điều này giúp Convex Web không bị báo lỗi "dư trường dữ liệu" khi tạo Category
      const payload: any = {
        serverId: serverId as Id<"servers">,
        name: finalName,
        type: type,
      };

      // Chỉ gửi parentId nếu thực sự có
      if (parentId) {
        payload.parentId = parentId as Id<"channels">;
      }

      // Chỉ gửi isAnonymous nếu đang tạo Kênh (Channel)
      if (type === 'channel') {
        payload.isAnonymous = isAnonymous;
      }

      await createChannel(payload);
      onClose();
    } catch (error: any) {
      console.error(error);
      alert(t('common.error') + ": " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const title = type === 'category'
    ? t('channel.create_title', { type: t('common.category') })
    : t('channel.create_title', { type: t('common.channel') });

  const placeholder = type === 'category'
    ? t('channel.placeholder_category', { defaultValue: 'Tên danh mục mới' })
    : t('channel.placeholder_channel', { defaultValue: 'tên-kênh-mới' });

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in" onClick={onClose}>
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>

        {/* HEADER */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-white">
          <h2 className="text-[18px] font-extrabold text-gray-900 flex items-center gap-2">
            {type === 'category' ? <FolderPlus className="w-5 h-5 text-gray-500" /> : <Hash className="w-5 h-5 text-gray-500" />}
            {title}
          </h2>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* BODY FORM */}
        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          <div>
            <label className="block text-[12px] font-extrabold text-gray-500 uppercase tracking-wider mb-2">
              {type === 'category' ? t('common.category') : t('common.channel')} TÊN
            </label>
            <div className="relative">
              {type === 'channel' && <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />}
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={placeholder}
                className={`w-full bg-[#f2f3f5] border border-transparent rounded-xl py-2.5 text-gray-800 focus:outline-none focus:border-[#5865F2] focus:bg-white transition-all font-medium ${type === 'channel' ? 'pl-9 pr-4' : 'px-4'}`}
                autoFocus
              />
            </div>
          </div>

          {/* Công tắc Ẩn danh (Chỉ hiển thị khi tạo Kênh) */}
          {type === 'channel' && (
            <div className="flex items-center justify-between bg-gray-50 p-3.5 rounded-xl border border-gray-100">
              <div>
                <div className="font-bold text-[14px] text-gray-800">{t('channel.confession_title')}</div>
                <div className="text-[12px] text-gray-500 mt-0.5">{t('channel.confession_desc')}</div>
              </div>
              <button
                type="button"
                onClick={() => setIsAnonymous(!isAnonymous)}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none ${isAnonymous ? 'bg-[#5865F2]' : 'bg-gray-300'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isAnonymous ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
          )}

          {/* FOOTER BUTTONS */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl hover:bg-gray-100 text-gray-600 transition-colors text-[14px] font-bold">
              {t('common.cancel')}
            </button>
            <button type="submit" disabled={!name.trim() || isSubmitting} className="flex-1 py-2.5 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] disabled:bg-indigo-300 text-white transition-colors text-[14px] font-bold shadow-sm">
              {isSubmitting ? '...' : t('channel.create_btn')}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}