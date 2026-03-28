"use client";

import { useState, useEffect } from 'react'; // 👈 Thêm useEffect
import { createPortal } from 'react-dom'; // 👈 IMPORT PORTAL
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { Id } from '../../../../convex/_generated/dataModel';
import { useTranslation } from 'react-i18next';
import { X, Diamond, Trophy } from 'lucide-react';
import PaymentModal from './PaymentModal';

interface Props {
  workspace: any;
  channelCount: number;
  onClose: () => void;
}

const LEVEL_REQUIREMENTS = [
  { level: 0, totalStones: 0, channels: 30, costToNext: 1 },
  { level: 1, totalStones: 1, channels: 35, costToNext: 2 },
  { level: 2, totalStones: 3, channels: 40, costToNext: 2 },
  { level: 3, totalStones: 5, channels: 45, costToNext: 3 },
  { level: 4, totalStones: 8, channels: 50, costToNext: 3 },
  { level: 5, totalStones: 11, channels: 55, costToNext: 4 },
  { level: 6, totalStones: 15, channels: 60, costToNext: 4 },
  { level: 7, totalStones: 19, channels: 65, costToNext: 4 },
  { level: 8, totalStones: 23, channels: 70, costToNext: 5 },
  { level: 9, totalStones: 28, channels: 75, costToNext: 5 },
  { level: 10, totalStones: 33, channels: 80, costToNext: 0 }
];

export default function UpgradeServerModal({ workspace, channelCount, onClose }: Props) {
  const { t } = useTranslation();
  
  // 👇 STATE CHỐNG CHỚP LỖI SSR KHI DÙNG PORTAL 👇
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [isProcessing, setIsProcessing] = useState(false);
  const [showPayment, setShowPayment] = useState(false);

  const currentUser = useQuery(api.users.current);
  const topBoosters = useQuery(api.boosts.getTopBoosters, { serverId: workspace?._id });

  const boostServer = useMutation(api.boosts.boostServer);
  const buyStones = useMutation(api.boosts.buyStones);

  // Đợi render xong client mới nhả Portal ra
  if (!workspace || !currentUser || !mounted) return null;

  const stones = workspace.totalStones || 0;
  let currentInfo = LEVEL_REQUIREMENTS[0];
  for (let i = LEVEL_REQUIREMENTS.length - 1; i >= 0; i--) {
    if (stones >= LEVEL_REQUIREMENTS[i].totalStones) {
      currentInfo = LEVEL_REQUIREMENTS[i];
      break;
    }
  }

  const isMaxLevel = currentInfo.level >= 10;
  const nextLevelInfo = isMaxLevel ? currentInfo : LEVEL_REQUIREMENTS[currentInfo.level + 1];
  const stonesNeeded = isMaxLevel ? 0 : nextLevelInfo.totalStones - stones;

  const handleDonate = async () => {
    if ((currentUser.stones || 0) < 1) {
      alert(t('boost.not_enough_stones', { defaultValue: 'Bạn không đủ đá nâng cấp trong ví!' }));
      return;
    }
    setIsProcessing(true);
    try {
      await boostServer({ serverId: workspace._id as Id<"servers"> });
      alert(t('alerts.donate_success', { defaultValue: 'Góp đá thành công!' }));
    } catch (error: any) {
      alert(t('common.error') + ": " + error.message);
    }
    setIsProcessing(false);
  };

  // 🔥 NHẬN SỐ LƯỢNG ĐÁ MUA TỪ PAYMENT MODAL VÀ LẶP MUA
  const handlePaymentSuccess = async (quantity: number) => {
    setIsProcessing(true);
    try {
      // Loop gọi hàm mua đá để hệ thống backend cộng dồn chuẩn xác nhất
      for (let i = 0; i < quantity; i++) {
        await buyStones();
      }
      alert(`Thanh toán thành công! Đã nạp ${quantity} Đá Nâng Cấp vào ví.`);
    } catch (error: any) {
      alert(t('common.error') + ": " + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // 👇 GÓI VÀO BIẾN ĐỂ BẮN PORTAL 👇
  const modalContent = (
    <>
      <div className="fixed inset-0 z-[99998] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in" onClick={onClose}>
        <div className="bg-[#f2f3f5] w-full max-w-[450px] h-[90vh] max-h-[800px] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>

          <div className="flex items-center justify-between p-4 bg-white border-b border-gray-200 shrink-0">
            <h2 className="text-[18px] font-extrabold text-gray-900">{t('upgrade.header_title')}</h2>
            <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-800 rounded-full hover:bg-gray-100 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto hidden-scrollbar p-5 space-y-6">

            <div className="bg-[#1b5e20] rounded-2xl p-5 text-white shadow-md relative overflow-hidden">
              <div className="absolute top-0 right-0 opacity-10"><Diamond className="w-32 h-32 -mt-4 -mr-4" /></div>
              <p className="text-[14px] font-semibold text-[#a5d6a7] mb-2">{t('upgrade.banner_desc')}</p>
              <h3 className="text-[22px] font-extrabold mb-1">{t('upgrade.banner_status', { total: stones, level: currentInfo.level })}</h3>
              <p className="text-[14px] text-[#c8e6c9] font-medium mb-5">{t('upgrade.capacity', { current: channelCount, limit: currentInfo.channels })}</p>

              <button onClick={handleDonate} disabled={isProcessing} className="w-full bg-[#4ade80] hover:bg-[#22c55e] text-[#064e3b] font-bold py-3 rounded-xl transition-colors shadow-sm mb-2">
                {isProcessing ? '...' : t('upgrade.btn_donate')}
              </button>
              <p className="text-center text-[12px] text-[#a5d6a7] font-medium">
                {isMaxLevel ? t('upgrade.max_level_reached') : t('upgrade.stones_needed', { stones: stonesNeeded })}
              </p>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm flex flex-col items-center">
              <div className="text-[15px] font-bold text-gray-800 mb-3 flex items-center">
                {t('upgrade.wallet', { stones: currentUser.stones || 0 })}
              </div>
              <button onClick={() => setShowPayment(true)} disabled={isProcessing} className="w-full bg-white border-2 border-[#4ade80] text-[#16a34a] font-bold py-2.5 rounded-xl hover:bg-[#f0fdf4] transition-colors">
                {isProcessing ? 'Đang xử lý...' : t('upgrade.btn_buy', { defaultValue: 'Buy Upgrade Stone (25K VND)' })}
              </button>
            </div>

            <div>
              <h4 className="text-[13px] font-bold text-gray-500 uppercase tracking-wider mb-3 ml-1">{t('upgrade.path_title')}</h4>
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                {LEVEL_REQUIREMENTS.slice(1).map((lvl) => {
                  const isAchieved = currentInfo.level >= lvl.level;
                  return (
                    <div key={lvl.level} className={`flex items-center justify-between p-3 border-b border-gray-100 last:border-0 ${isAchieved ? 'bg-[#f0fdf4]' : ''}`}>
                      <div>
                        <div className={`font-bold text-[14px] ${isAchieved ? 'text-green-800' : 'text-gray-800'}`}>
                          {t('upgrade.level', { level: lvl.level })}
                        </div>
                        <div className="text-[12px] font-medium text-gray-500 flex items-center mt-0.5">
                          <Diamond className={`w-3.5 h-3.5 mr-1 ${isAchieved ? 'text-green-500' : 'text-blue-500'}`} />
                          {t('upgrade.requirement', { stones: lvl.totalStones })}
                        </div>
                      </div>
                      <span className={`font-bold text-[13px] px-2 py-1 rounded-lg ${isAchieved ? 'bg-green-100 text-green-700' : 'bg-blue-50 text-blue-600'}`}>
                        {t('upgrade.max_channels', { max: lvl.channels })}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {topBoosters && topBoosters.length > 0 && (
              <div>
                <h4 className="text-[13px] font-bold text-gray-500 uppercase tracking-wider mb-3 ml-1 flex items-center">
                  <Trophy className="w-4 h-4 mr-1 text-amber-500" /> {t('upgrade.leaderboard_title')}
                </h4>
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                  {topBoosters.map((booster: any, index: number) => (
                    <div key={booster._id} className="flex items-center justify-between p-3 border-b border-gray-100 last:border-0 hover:bg-gray-50">
                      <div className="flex items-center gap-3">
                        <div className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${index === 0 ? 'bg-yellow-100 text-yellow-700' : index === 1 ? 'bg-gray-200 text-gray-700' : index === 2 ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-500'}`}>
                          {index + 1}
                        </div>
                        <img loading="lazy"src={booster.imageUrl || "https://ui-avatars.com/api/?name=U"} alt="Avt" className="w-8 h-8 rounded-full border border-gray-200 object-cover" />
                        <span className="text-[14px] font-bold text-gray-800 truncate max-w-[120px]">{booster.first_name || booster.username}</span>
                      </div>
                      <div className="flex items-center text-[13px] font-bold text-pink-600">
                        {booster.totalStones} <Diamond className="w-3.5 h-3.5 ml-1" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* COMPONENT THANH TOÁN */}
      <PaymentModal 
        isOpen={showPayment} 
        onClose={() => setShowPayment(false)} 
        itemName="Upgrade Stone"
        pricePerUnit={25000}
        onSuccess={handlePaymentSuccess}
      />
    </>
  );

  // 👇 RA LỆNH BẮN PORTAL 👇
  return createPortal(modalContent, document.body);
}