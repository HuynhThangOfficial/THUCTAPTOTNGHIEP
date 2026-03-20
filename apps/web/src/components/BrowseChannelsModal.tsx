"use client";

import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { Id } from '../../../../convex/_generated/dataModel';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';

interface Props {
  serverId: string;
  channels: any[];
  groups: any[];
  onClose: () => void;
}

export default function BrowseChannelsModal({ serverId, channels, groups, onClose }: Props) {
  const { t } = useTranslation();

  const hiddenChannels = useQuery((api as any).university.getHiddenChannelIds, { serverId: serverId as Id<"servers"> }) || [];
  const toggleVisibility = useMutation((api as any).university.toggleChannelVisibility);

  const handleToggle = async (channelId: string) => {
    try {
      await toggleVisibility({ channelId: channelId as Id<"channels">, serverId: serverId as Id<"servers"> });
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in" onClick={onClose}>
      <div className="bg-[#f2f3f5] w-full max-w-[400px] max-h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>

        <div className="p-4 border-b border-gray-200 bg-white flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-[18px] font-extrabold text-gray-900">{t('menu.browse_channels_title')}</h2>
            <p className="text-[13px] text-gray-500 mt-0.5">{t('menu.browse_channels_desc')}</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto hidden-scrollbar p-4 space-y-5">

          {channels.filter(c => !c.parentId).length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {channels.filter(c => !c.parentId).map(channel => {
                // 👇 ĐÃ GỠ BỎ KÊNH "chung" KHỎI DANH SÁCH BỊ KHÓA ẨN 👇
                const isDefault = channel.name === 'đại-sảnh';
                const isHidden = hiddenChannels.includes(channel._id);
                const isChecked = isDefault || !isHidden;

                return (
                  <div key={channel._id} className="flex items-center justify-between p-3.5 border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                    <div className="flex items-center gap-3">
                      <span className="text-gray-400 text-lg font-light">#</span>
                      <span className="text-[15px] font-semibold text-gray-800">{channel.name}</span>
                    </div>
                    <button
                       type="button"
                       disabled={isDefault}
                       onClick={() => handleToggle(channel._id)}
                       className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none ${isChecked ? 'bg-[#5865F2]' : 'bg-gray-300'} ${isDefault ? 'opacity-50 cursor-not-allowed' : ''}`}
                     >
                       <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isChecked ? 'translate-x-6' : 'translate-x-1'}`} />
                     </button>
                  </div>
                )
              })}
            </div>
          )}

          {groups.map(group => {
            const childChannels = channels.filter(c => c.parentId === group._id);
            if(childChannels.length === 0) return null;
            return (
              <div key={group._id}>
                <h3 className="text-[12px] font-extrabold text-gray-500 uppercase tracking-wider mb-2 ml-2">{group.name}</h3>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  {childChannels.map(channel => {
                    const isHidden = hiddenChannels.includes(channel._id);
                    const isChecked = !isHidden;
                    return (
                      <div key={channel._id} className="flex items-center justify-between p-3.5 border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                        <div className="flex items-center gap-3">
                          <span className="text-gray-400 text-lg font-light">#</span>
                          <span className="text-[15px] font-semibold text-gray-800">{channel.name}</span>
                        </div>
                        <button
                           type="button"
                           onClick={() => handleToggle(channel._id)}
                           className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none ${isChecked ? 'bg-[#5865F2]' : 'bg-gray-300'}`}
                         >
                           <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isChecked ? 'translate-x-6' : 'translate-x-1'}`} />
                         </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}

        </div>
      </div>
    </div>
  );
}