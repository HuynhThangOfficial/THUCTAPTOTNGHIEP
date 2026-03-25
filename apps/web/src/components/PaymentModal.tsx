"use client";

import { useState, useEffect } from 'react';
import { X, Lock, CreditCard, ChevronRight, Plus, Minus, Diamond, ShieldCheck, QrCode } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (quantity: number) => void;
  pricePerUnit: number;
  itemName: string;
}

// Bổ sung bước 'vietqr_info'
type Steps = 'select' | 'payment' | 'card_info' | 'momo_info' | 'vietqr_info';

export default function PaymentModal({ isOpen, onClose, onSuccess, pricePerUnit, itemName }: Props) {
  const [currentStep, setCurrentStep] = useState<Steps>('select');
  const [quantity, setQuantity] = useState<number | string>(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPaypalPopup, setShowPaypalPopup] = useState(false); 

  const MAX_QUANTITY = 20;
  const MIN_QUANTITY = 1;

  useEffect(() => {
    if (isOpen) {
      setCurrentStep('select');
      setQuantity(1);
      setIsProcessing(false);
      setShowPaypalPopup(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const incrementQuantity = () => setQuantity(prev => Math.min(Number(prev) + 1, MAX_QUANTITY));
  const decrementQuantity = () => setQuantity(prev => Math.max(Number(prev) - 1, MIN_QUANTITY));

  const handleQuantityBlur = () => {
    let num = parseInt(quantity as string);
    if (isNaN(num) || num < MIN_QUANTITY) setQuantity(MIN_QUANTITY);
    else if (num > MAX_QUANTITY) setQuantity(MAX_QUANTITY);
    else setQuantity(num);
  };

  const currentQuantity = Number(quantity) || MIN_QUANTITY;
  const totalPrice = currentQuantity * pricePerUnit;
  const totalPriceStr = totalPrice.toLocaleString('vi-VN') + ' VND';
  const itemNameStr = `${currentQuantity}x ${itemName}`;

  const goToPayment = () => {
    if (currentQuantity >= MIN_QUANTITY && currentQuantity <= MAX_QUANTITY) setCurrentStep('payment');
  };

  const goBack = () => {
    if (currentStep === 'payment') setCurrentStep('select');
    else if (currentStep === 'card_info' || currentStep === 'momo_info' || currentStep === 'vietqr_info') setCurrentStep('payment');
    else onClose();
  };

  const handleSelectMethod = (method: string) => {
    if (method === 'vietqr') setCurrentStep('vietqr_info');
    else if (method === 'card') setCurrentStep('card_info');
    else if (method === 'momo') setCurrentStep('momo_info');
    else if (method === 'paypal') setShowPaypalPopup(true);
  };

  const handleFinalSubmit = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      onSuccess(currentQuantity);
      onClose();
    }, 1500);
  };

  // --- BƯỚC 1: CHỌN SỐ LƯỢNG ---
  const renderSelectQuantity = () => (
    <div className="flex flex-col h-full justify-between">
      <div className="space-y-5">
        <div className="flex flex-col items-center">
          <Diamond className="w-20 h-20 text-[#4ade80] mb-3 drop-shadow-sm" />
          <h3 className="text-2xl font-black text-gray-900 drop-shadow-sm italic tracking-wide">UPGRADE STONE</h3>
          <p className="text-[13px] font-bold text-gray-500 uppercase tracking-wider mb-2">Chọn số lượng đá</p>
        </div>

        <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5 flex flex-col items-center shadow-inner">
          <div className="flex items-center gap-4 mb-4">
            <button onClick={decrementQuantity} disabled={currentQuantity <= MIN_QUANTITY || isProcessing} className="p-2.5 rounded-full bg-white border border-gray-200 text-gray-500 hover:text-red-500 disabled:opacity-50 transition-colors"><Minus className="w-5 h-5" /></button>
            <input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} onBlur={handleQuantityBlur} className="text-4xl font-extrabold text-gray-900 w-24 text-center bg-transparent outline-none tabular-nums" min={MIN_QUANTITY} max={MAX_QUANTITY} />
            <button onClick={incrementQuantity} disabled={currentQuantity >= MAX_QUANTITY || isProcessing} className="p-2.5 rounded-full bg-white border border-gray-200 text-gray-500 hover:text-[#22c55e] disabled:opacity-50 transition-colors"><Plus className="w-5 h-5" /></button>
          </div>
          <div className="flex justify-between items-center w-full px-4 py-3 bg-white rounded-lg border border-gray-200 shadow-sm">
            <p className="text-[14px] font-semibold text-gray-600 uppercase tracking-wide">Tổng cộng</p>
            <p className="text-[18px] font-extrabold text-[#16a34a]">{totalPriceStr}</p>
          </div>
        </div>
      </div>
      <button onClick={goToPayment} className="w-full flex items-center justify-center gap-2 py-3.5 px-4 mt-6 rounded-xl bg-[#22c55e] hover:bg-[#16a34a] text-white font-bold transition-colors disabled:opacity-50 text-[16px] shrink-0 shadow-sm">
        Tiếp Tục <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  );

  // --- BƯỚC 2: CHỌN PHƯƠNG THỨC THÊM VIETQR MÀU NỔI BẬT ---
  const renderPaymentMethod = () => (
    <div className="flex flex-col h-full justify-between">
      <div className="space-y-6">
        <div className="text-center"><h2 className="text-[20px] font-bold text-gray-900 mb-1">Thanh Toán</h2></div>

        <div className="mb-4">
          <div className="flex justify-between items-center mb-2"><p className="text-[13px] font-bold text-gray-500 uppercase">Sản phẩm</p><p className="text-[13px] font-bold text-gray-500 uppercase">Giá</p></div>
          <div className="flex justify-between items-center bg-gray-50 p-4 rounded-xl border border-gray-100 shadow-inner">
            <p className="font-semibold text-gray-800">{itemNameStr}</p><p className="font-bold text-[#16a34a] text-[16px]">{totalPriceStr}</p>
          </div>
        </div>

        <p className="text-[13px] font-bold text-gray-500 uppercase mb-3">Chọn loại thanh toán</p>
        
        <div className="space-y-3 mb-6">
          {/* NÚT VIETQR TỰ ĐỘNG - TO VÀ NỔI BẬT NHẤT */}
          <button onClick={() => handleSelectMethod('vietqr')} disabled={isProcessing} className="w-full flex items-center justify-center gap-2 py-4 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-colors shadow-md border-b-4 border-blue-800">
            <QrCode className="w-6 h-6" /> Chuyển Khoản Tự Động (VietQR)
          </button>

          {/* 3 NÚT CŨ NẰM NGANG HÀNG NHAU */}
          <div className="grid grid-cols-3 gap-2">
            <button onClick={() => handleSelectMethod('card')} disabled={isProcessing} className="flex flex-col items-center justify-center gap-1.5 py-3 px-2 rounded-xl bg-[#22c55e] hover:bg-[#16a34a] text-white font-bold transition-colors shadow-sm text-[12px]">
              <CreditCard className="w-6 h-6" /> Thẻ Quốc Tế
            </button>
            <button onClick={() => handleSelectMethod('paypal')} disabled={isProcessing} className="flex flex-col items-center justify-center gap-1.5 py-3 px-2 rounded-xl bg-[#0079C1] hover:bg-[#0065a3] text-white font-bold transition-colors shadow-sm text-[12px]">
              <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current"><path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 6.007 0h7.46c2.535 0 4.677.854 5.42 3.659.344 1.306.275 2.802-.27 4.195-1.026 2.628-3.418 4.417-6.262 4.417h-2.12c-.533 0-.981.382-1.063.901l-1.34 7.643a.64.64 0 0 1-.633.522h-1.123Zm6.568-15.63H9.12c-.266 0-.49.19-.53.45L7.248 13.82c-.04.26.166.491.431.491h2.12c1.99 0 3.682-1.22 4.402-3.064.38-1.01.428-2.093.187-2.996-.452-1.713-1.89-2.544-3.744-2.544Z"/></svg>
              PayPal
            </button>
            <button onClick={() => handleSelectMethod('momo')} disabled={isProcessing} className="flex flex-col items-center justify-center gap-1.5 py-3 px-2 rounded-xl bg-[#A50064] hover:bg-[#8A0053] text-white font-bold transition-colors shadow-sm text-[12px]">
              Ví MoMo
            </button>
          </div>
        </div>

      </div>
    </div>
  );

  // --- BƯỚC 3C: MÀN HÌNH VIETQR (MỚI) ---
  const renderVietQRInfo = () => {
    // 🔴 THAY THÔNG TIN NGÂN HÀNG CỦA BẠN VÀO ĐÂY 🔴
    const BANK_ID = "MB"; // Tên viết tắt ngân hàng (VD: MB, VCB, TCB, ACB, VPB...)
    const ACCOUNT_NO = "8799999899"; // Số tài khoản của bạn
    const ACCOUNT_NAME = "HUYNH TRONG THANG"; // Tên chủ tài khoản (Viết hoa không dấu)
    
    // Tạo nội dung chuyển khoản ngẫu nhiên để phân biệt các đơn hàng
    const orderCode = `NAPDA${Math.floor(Math.random() * 10000)}`; 
    
    // API tạo ảnh QR tự động của VietQR
    const qrImageUrl = `https://img.vietqr.io/image/${BANK_ID}-${ACCOUNT_NO}-compact2.png?amount=${totalPrice}&addInfo=${orderCode}&accountName=${ACCOUNT_NAME}`;

    return (
      <div className="flex flex-col h-full justify-between animate-in slide-in-from-right-4 duration-300">
        <div className="space-y-4 flex flex-col items-center">
          <div className="text-center mb-2">
            <h2 className="text-[20px] font-bold text-gray-900 mb-1">Quét mã QR</h2>
            <p className="text-[13px] text-gray-500">Sử dụng App Ngân hàng hoặc MoMo để quét</p>
          </div>
          
          {/* HIỂN THỊ ẢNH QR THẬT */}
          <div className="bg-white p-2 rounded-2xl border-2 border-blue-100 shadow-md flex flex-col items-center justify-center relative overflow-hidden">
            <img loading="lazy"
              src={qrImageUrl} 
              alt="VietQR" 
              className="w-56 h-56 object-contain"
            />
            {/* Lớp overlay quét mờ mờ cho ngầu */}
            <div className="absolute top-0 left-0 w-full h-2 bg-blue-400/40 blur-sm animate-[pulse_2s_infinite]"></div>
          </div>

          {/* Thông tin chuyển khoản */}
          <div className="bg-blue-50/50 w-full p-4 rounded-xl border border-blue-100 space-y-3">
            <div className="flex justify-between items-center border-b border-blue-100 pb-2">
              <span className="text-gray-500 text-[13px] font-semibold">Tài khoản:</span>
              <span className="font-bold text-gray-800 text-right">{ACCOUNT_NO}<br/><span className="text-[11px] text-gray-500">{ACCOUNT_NAME}</span></span>
            </div>
            <div className="flex justify-between items-center border-b border-blue-100 pb-2">
              <span className="text-gray-500 text-[13px] font-semibold">Số tiền:</span>
              <span className="font-bold text-[#16a34a] text-[16px]">{totalPriceStr}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500 text-[13px] font-semibold">Nội dung:</span>
              <span className="font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded tracking-widest">{orderCode}</span>
            </div>
          </div>

          <p className="text-[12px] text-orange-600 text-center font-medium px-4 mt-2">
            ⚠️ Hệ thống sẽ tự động xác nhận và cộng đá trong vòng 5-10 giây sau khi chuyển khoản thành công.
          </p>
        </div>
      </div>
    );
  };

  const renderCardInfo = () => (
    <div className="flex flex-col h-full justify-between animate-in slide-in-from-right-4 duration-300">
      <div className="space-y-4">
        <div className="text-center mb-6"><h2 className="text-[20px] font-bold text-gray-900 mb-1">Thanh Toán</h2></div>
        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="text-[13px] font-semibold text-gray-600">Số thẻ</label>
            <div className="flex gap-1"><div className="w-6 h-4 bg-gray-200 rounded text-[8px] flex justify-center items-center font-bold text-blue-800 italic">VISA</div><div className="w-6 h-4 bg-gray-200 rounded text-[8px] flex justify-center items-center font-bold text-red-500">MC</div></div>
          </div>
          <div className="relative"><CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-yellow-500" /><input type="text" placeholder="Số thẻ" className="w-full bg-white border border-gray-300 rounded-lg py-2.5 pl-10 pr-3 text-[14px] focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" /><div className="absolute right-2 top-1/2 -translate-y-1/2 bg-black text-white text-[10px] font-bold px-1.5 py-0.5 rounded">Dùng link</div></div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="text-[13px] font-semibold text-gray-600 mb-1 block">Ngày hết hạn</label><input type="text" placeholder="MM/YY" className="w-full bg-white border border-gray-300 rounded-lg py-2.5 px-3 text-[14px] focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" /></div>
          <div><label className="text-[13px] font-semibold text-gray-600 mb-1 block">CVC</label><input type="text" placeholder="Mã an toàn" className="w-full bg-white border border-gray-300 rounded-lg py-2.5 px-3 text-[14px] focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" /></div>
        </div>
        <div><label className="text-[13px] font-semibold text-gray-600 mb-1 block">Tên trên thẻ</label><input type="text" placeholder="Tên" className="w-full bg-white border border-gray-300 rounded-lg py-2.5 px-3 text-[14px] focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" /></div>
      </div>
    </div>
  );

  const renderMomoInfo = () => (
    <div className="flex flex-col space-y-4 animate-in slide-in-from-right-4 duration-300 pb-4">
      <div className="text-center mb-2"><h2 className="text-[20px] font-bold text-gray-900 mb-1">Thanh Toán</h2></div>
      <div><label className="text-[12px] font-semibold text-gray-600 mb-1 block">Quốc gia</label><select className="w-full bg-white border border-gray-300 rounded-lg py-2.5 px-3 text-[14px] outline-none"><option>Vietnam</option></select></div>
      <div><label className="text-[12px] font-semibold text-gray-600 mb-1 block">Tên</label><input type="text" className="w-full bg-white border border-gray-300 rounded-lg py-2.5 px-3 text-[14px] outline-none" /></div>
      <div><label className="text-[12px] font-semibold text-gray-600 mb-1 block">Địa chỉ</label><input type="text" placeholder="123 Discord Drive" className="w-full bg-white border border-gray-300 rounded-lg py-2.5 px-3 text-[14px] outline-none" /></div>
      <div><label className="text-[12px] font-semibold text-gray-600 mb-1 block">Địa chỉ 2 (Tùy chọn)</label><input type="text" placeholder="Căn hộ" className="w-full bg-white border border-gray-300 rounded-lg py-2.5 px-3 text-[14px] outline-none" /></div>
      <div><label className="text-[12px] font-semibold text-gray-600 mb-1 block">Thành phố</label><input type="text" placeholder="Coolsville" className="w-full bg-white border border-gray-300 rounded-lg py-2.5 px-3 text-[14px] outline-none" /></div>
      <div><label className="text-[12px] font-semibold text-gray-600 mb-1 block">Tiểu bang/Tỉnh/Vùng</label><input type="text" className="w-full bg-white border border-gray-300 rounded-lg py-2.5 px-3 text-[14px] outline-none" /></div>
      <div><label className="text-[12px] font-semibold text-gray-600 mb-1 block">Mã bưu điện</label><input type="text" className="w-full bg-white border border-gray-300 rounded-lg py-2.5 px-3 text-[14px] outline-none" /></div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in" onClick={onClose}>
      <div className="bg-white w-full max-w-[500px] h-[600px] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
        
        <div className="relative h-28 bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 p-4 shrink-0">
          <button onClick={onClose} className="absolute top-4 right-4 p-1.5 text-white/80 hover:text-white hover:bg-black/20 rounded-full transition-colors"><X className="w-5 h-5" /></button>
          <div className="absolute top-4 left-6 bg-white/20 px-2.5 py-1 rounded text-[11px] font-bold text-white backdrop-blur-md">💎 {itemName}</div>
        </div>

        <div className="flex items-center justify-center bg-gray-50 p-3 border-b border-gray-100 text-[12px] font-medium space-x-1.5 shrink-0">
          <span className={currentStep === 'select' ? 'text-[#16a34a] font-bold' : 'text-gray-800'}>Chọn Gói Đá</span>
          <ChevronRight className={`w-3.5 h-3.5 ${currentStep !== 'select' ? 'text-[#22c55e]' : 'text-gray-400'}`} />
          <span className={currentStep !== 'select' ? 'text-[#16a34a] font-bold' : 'text-gray-500'}>Thanh Toán</span>
          <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-gray-400">Xem lại</span>
        </div>

        <div className="flex-1 p-6 relative flex flex-col overflow-y-auto hidden-scrollbar">
          {currentStep === 'select' && renderSelectQuantity()}
          {currentStep === 'payment' && renderPaymentMethod()}
          {currentStep === 'card_info' && renderCardInfo()}
          {currentStep === 'momo_info' && renderMomoInfo()}
          {currentStep === 'vietqr_info' && renderVietQRInfo()}
        </div>

        <div className="bg-gray-50 p-4 flex items-center justify-between border-t border-gray-100 shadow-inner shrink-0 relative z-20">
          <button onClick={goBack} disabled={isProcessing} className="text-[13px] font-bold text-gray-500 hover:text-gray-800 transition-colors disabled:opacity-50">Trở lại</button>
          
          {(currentStep === 'card_info' || currentStep === 'momo_info' || currentStep === 'vietqr_info') ? (
             <div className="flex items-center gap-3">
               <div className="flex items-center gap-1.5 text-[12px] font-bold text-gray-500"><Lock className="w-3.5 h-3.5" /> An toàn</div>
               <button onClick={handleFinalSubmit} disabled={isProcessing} className="bg-[#5865F2] hover:bg-[#4752C4] text-white text-[13px] font-bold py-2 px-6 rounded transition-colors disabled:opacity-50">
                 {currentStep === 'vietqr_info' ? "Xác nhận đã chuyển" : "Tiếp theo"}
               </button>
             </div>
          ) : (
            <div className="flex items-center gap-1.5 text-[12px] font-bold text-green-600"><ShieldCheck className="w-4 h-4" /> Bảo mật thanh toán</div>
          )}
        </div>

        {isProcessing && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white p-4 rounded-xl shadow-lg flex flex-col items-center">
               <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
               <span className="text-[13px] font-bold text-gray-700">Đang kiểm tra giao dịch...</span>
            </div>
          </div>
        )}
      </div>

      {showPaypalPopup && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowPaypalPopup(false)}>
          <div className="bg-white w-[420px] rounded shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
            <div className="bg-gray-100 border-b border-gray-300 p-2 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 text-[12px] text-gray-600 truncate w-3/4"><Lock className="w-3 h-3 text-green-700" /><span className="truncate">Đăng nhập vào tài khoản PayPal của bạn - Google Chrome</span></div>
              <button onClick={() => setShowPaypalPopup(false)} className="hover:bg-gray-300 p-1 rounded"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-8 flex flex-col items-center">
              <svg className="w-8 h-8 mb-6" viewBox="0 0 24 24" fill="#003087"><path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 6.007 0h7.46c2.535 0 4.677.854 5.42 3.659.344 1.306.275 2.802-.27 4.195-1.026 2.628-3.418 4.417-6.262 4.417h-2.12c-.533 0-.981.382-1.063.901l-1.34 7.643a.64.64 0 0 1-.633.522h-1.123Zm6.568-15.63H9.12c-.266 0-.49.19-.53.45L7.248 13.82c-.04.26.166.491.431.491h2.12c1.99 0 3.682-1.22 4.402-3.064.38-1.01.428-2.093.187-2.996-.452-1.713-1.89-2.544-3.744-2.544Z"/></svg>
              <h2 className="text-xl font-bold text-gray-900 mb-6">Nhập địa chỉ email của bạn để bắt đầu.</h2>
              <input type="text" placeholder="Email hoặc số điện thoại di động" className="w-full border-2 border-blue-600 rounded pt-3 pb-3 px-3 mb-2 focus:outline-none" />
              <div className="w-full text-left mb-6"><a href="#" className="text-[#0070ba] font-bold text-[14px] hover:underline">Bạn quên email?</a></div>
              <button onClick={handleFinalSubmit} className="w-full bg-[#0070ba] hover:bg-[#003087] text-white font-bold py-3.5 rounded-full mb-6 transition-colors">Tiếp theo</button>
              <div className="w-full flex items-center justify-between mb-6"><div className="h-[1px] bg-gray-300 flex-1"></div><span className="text-gray-500 text-[13px] px-3">hoặc</span><div className="h-[1px] bg-gray-300 flex-1"></div></div>
              <button className="w-full bg-white border border-[#0070ba] text-[#0070ba] font-bold py-3.5 rounded-full hover:bg-blue-50 transition-colors">Tạo tài khoản</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}