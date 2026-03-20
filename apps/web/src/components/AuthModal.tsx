"use client";

import { useState, useEffect, useRef } from 'react';
import { useClerk, useUser } from '@clerk/nextjs';
import { useApp } from '../context/AppContext';

export default function AuthModal() {
  const { showAuthModal, setShowAuthModal } = useApp() as any;
  
  const clerk = useClerk();
  const { user } = useUser(); 
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [mode, setMode] = useState<'login' | 'register' | 'setup'>('login');
  
  // State Form
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [agreedTerms, setAgreedTerms] = useState(false);
  
  // State Setup Modal 2
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState('');
  
  // State UI
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [countdown, setCountdown] = useState(0);

  // Hook 1: Đếm ngược OTP
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Hook 2: "BẪY" OAUTH THIẾU THÔNG TIN
  // Ngay khi Clerk load xong và phát hiện user CHƯA CÓ username (Do vừa login bằng Google/FB)
  // Lập tức bật AuthModal chế độ 'setup' lên để ép nhập!
  useEffect(() => {
    if (clerk.loaded && clerk.user) {
      if (!clerk.user.username) {
        setShowAuthModal(true);
        setMode('setup');
      }
    }
  }, [clerk.loaded, clerk.user, setShowAuthModal]);

  // CHẶN RENDER SỚM (Phải nằm dưới các Hooks)
  if (!showAuthModal) return null;
  const isClerkReady = clerk && clerk.client && clerk.loaded;

  // Xử lý chọn ảnh
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isClerkReady || isLoading) return;
    setIsLoading(true); setErrorMsg('');
    try {
      const result = await clerk.client.signIn.create({ identifier: email, password });
      if (result.status === "complete") {
        await clerk.setActive({ session: result.createdSessionId });
        setShowAuthModal(false);
        window.location.reload(); 
      }
    } catch (err: any) {
      setErrorMsg(err.errors?.[0]?.message || "Tài khoản hoặc mật khẩu không chính xác.");
    } finally { setIsLoading(false); }
  };

  const handleSendOTP = async () => {
    if (!email) return setErrorMsg("Vui lòng nhập Email trước khi gửi mã.");
    setIsLoading(true); setErrorMsg('');
    try {
      await clerk.client.signUp.create({ emailAddress: email });
      await clerk.client.signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setCountdown(60); 
      alert("Đã gửi mã xác nhận đến Email của bạn!");
    } catch (err: any) {
      setErrorMsg(err.errors?.[0]?.message || "Lỗi gửi mã xác nhận hoặc email đã tồn tại.");
    } finally { setIsLoading(false); }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return setErrorMsg("Vui lòng nhập Mật khẩu.");
    if (password !== confirmPassword) return setErrorMsg("Mật khẩu nhập lại không khớp.");
    if (!agreedTerms) return setErrorMsg("Vui lòng đồng ý với Điều Khoản Dịch Vụ.");
    if (!otpCode) return setErrorMsg("Vui lòng nhập Mã Xác Nhận.");
    
    setIsLoading(true); setErrorMsg('');
    try {
      await clerk.client.signUp.update({ password });
      const result = await clerk.client.signUp.attemptEmailAddressVerification({ code: otpCode });
      
      if (result.status === "complete" || result.status === "missing_requirements") {
        if (result.status === "complete") await clerk.setActive({ session: result.createdSessionId });
        setUsername(`user_${Math.random().toString(36).substring(2, 9)}`); 
        setMode('setup'); 
      }
    } catch (err: any) {
      if (err.errors?.[0]?.code === "verification_already_verified" || err.errors?.[0]?.code === "form_conditional_param_value_disallowed") {
         setUsername(`user_${Math.random().toString(36).substring(2, 9)}`); 
         setMode('setup');
      } else {
         setErrorMsg(err.errors?.[0]?.message || "Mã xác nhận không chính xác hoặc mật khẩu chưa đủ mạnh.");
      }
    } finally { setIsLoading(false); }
  };

  // CẬP NHẬT: LƯU TÊN HIỂN THỊ VÀ ẢNH ĐẠI DIỆN
  const handleSetupComplete = async () => {
    setIsLoading(true); setErrorMsg('');
    try {
      let activeUser = clerk.user;

      if (clerk.client.signUp.status === "missing_requirements") {
        const res = await clerk.client.signUp.update({ 
          username: username,
          firstName: displayName || username 
        });
        if (res.status === "complete") {
          await clerk.setActive({ session: res.createdSessionId });
          activeUser = clerk.user; 
        }
      }

      if (activeUser) {
        await activeUser.update({ 
          username: username, 
          firstName: displayName || username 
        });
        if (avatarFile) {
          await activeUser.setProfileImage({ file: avatarFile });
        }
      }

      setShowAuthModal(false);
      window.location.reload(); 
    } catch (err: any) {
      setErrorMsg("Nickname đã tồn tại hoặc không hợp lệ.");
    } finally { setIsLoading(false); }
  };

  const handleOAuth = async (strategy: any) => {
    if (!isClerkReady) return;
    try {
      await clerk.client.signIn.authenticateWithRedirect({ 
        strategy, 
        redirectUrl: "/sso-callback", 
        redirectUrlComplete: "/",
      });
    } catch (err) {
      console.log("Lỗi OAuth");
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      
      {mode !== 'setup' && (
        <div className="bg-white rounded-[20px] shadow-2xl w-[420px] p-8 relative animate-in zoom-in-95 duration-200">
          
          <button onClick={() => setShowAuthModal(false)} className="absolute top-5 right-5 text-gray-500 hover:text-black">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>

          <div className="text-center mb-6">
            <h1 className="text-[22px] font-black tracking-widest text-slate-800 mb-4">H O Y O V E R S E</h1>
            <h2 className="text-xl font-bold text-gray-900">{mode === 'login' ? 'Đăng Nhập' : 'Đăng Ký'}</h2>
          </div>

          {errorMsg && <div className="text-red-500 text-[13px] text-center mb-4 font-medium px-2">{errorMsg}</div>}

          <div id="clerk-captcha"></div>

          {mode === 'register' ? (
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full h-11 px-4 rounded-[10px] border border-gray-200 text-[14px] outline-none focus:border-blue-500 transition-colors" />
              
              <div className="relative">
                <input type="text" placeholder="Mã Xác Nhận" value={otpCode} onChange={(e) => setOtpCode(e.target.value)} className="w-full h-11 pl-4 pr-16 rounded-[10px] border border-gray-200 text-[14px] outline-none focus:border-blue-500 transition-colors" />
                <button type="button" onClick={handleSendOTP} disabled={countdown > 0 || isLoading} className="absolute right-4 top-1/2 -translate-y-1/2 text-[14px] font-medium text-blue-500 disabled:text-gray-400">
                  {countdown > 0 ? `${countdown}s` : 'Gửi'}
                </button>
              </div>

              <div className="relative">
                <input type={showPassword ? "text" : "password"} placeholder="Vui lòng nhập mật khẩu" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full h-11 pl-4 pr-10 rounded-[10px] border border-gray-200 text-[14px] outline-none focus:border-blue-500 transition-colors" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                  )}
                </button>
              </div>

              <div className="relative">
                <input type={showConfirmPassword ? "text" : "password"} placeholder="Vui lòng nhập lại mật khẩu" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full h-11 pl-4 pr-10 rounded-[10px] border border-gray-200 text-[14px] outline-none focus:border-blue-500 transition-colors" />
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showConfirmPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                  )}
                </button>
              </div>

              <label className="flex items-start gap-2 mt-2 cursor-pointer group">
                <input type="checkbox" checked={agreedTerms} onChange={(e) => setAgreedTerms(e.target.checked)} className="mt-1 border-gray-300 rounded text-blue-600 focus:ring-blue-500 cursor-pointer" />
                <span className="text-[11px] text-gray-500 leading-snug">
                  Tôi đã đọc và đồng ý <span className="text-blue-500 hover:underline">Điều Khoản Dịch Vụ</span>, <span className="text-blue-500 hover:underline">Chính Sách Về Quyền Riêng Tư</span>
                </span>
              </label>

              <button type="submit" disabled={isLoading || !agreedTerms || !otpCode} className="w-full h-11 bg-[#e6e8eb] text-[#a5a8b1] font-bold rounded-[10px] mt-2 transition-colors [&:not(:disabled)]:bg-gray-900 [&:not(:disabled)]:text-white [&:not(:disabled)]:hover:bg-black">
                {isLoading ? "Đang xử lý..." : "Đăng Ký"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full h-11 px-4 rounded-[10px] border border-gray-200 text-[14px] outline-none focus:border-blue-500 transition-colors" />
              
              <div className="relative">
                <input type={showPassword ? "text" : "password"} placeholder="Mật Khẩu" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full h-11 pl-4 pr-10 rounded-[10px] border border-gray-200 text-[14px] outline-none focus:border-blue-500 transition-colors" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                  )}
                </button>
              </div>

              <button type="submit" disabled={isLoading || !email || !password} className="w-full h-11 bg-[#e6e8eb] text-[#a5a8b1] font-bold rounded-[10px] mt-2 transition-colors [&:not(:disabled)]:bg-gray-900 [&:not(:disabled)]:text-white [&:not(:disabled)]:hover:bg-black">
                {isLoading ? "Đang đăng nhập..." : "Đăng Nhập"}
              </button>
            </form>
          )}

          <div className={`flex items-center mt-5 ${mode === 'login' ? 'justify-between' : 'justify-end'}`}>
            {mode === 'login' && (
              <a href="https://account.newyas.com" target="_blank" rel="noopener noreferrer" className="text-[13px] text-gray-500 hover:text-black font-medium">
                Quên mật khẩu?
              </a>
            )}
            <div>
              <span className="text-[13px] text-gray-600">
                {mode === 'login' ? "Chưa có tài khoản? " : "Đã có tài khoản? "}
              </span>
              <button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setErrorMsg(''); }} className="text-[13px] text-blue-500 hover:underline font-medium">
                {mode === 'login' ? "Đăng Ký" : "Đăng Nhập"}
              </button>
            </div>
          </div>

          <div className="relative flex items-center justify-center mt-6 mb-4 pointer-events-none">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
            <span className="relative bg-white px-3 text-[11px] text-gray-400 uppercase tracking-wider">Đăng nhập bằng phương thức khác</span>
          </div>

          <div className="flex justify-center items-center gap-4">
            <button onClick={() => handleOAuth("oauth_google")} disabled={!isClerkReady} className="w-10 h-10 rounded-full border border-gray-200 flex justify-center items-center hover:bg-gray-50 transition-colors disabled:opacity-50"><svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg></button>
            <button onClick={() => handleOAuth("oauth_facebook")} disabled={!isClerkReady} className="w-10 h-10 rounded-full border border-gray-200 flex justify-center items-center hover:bg-gray-50 transition-colors disabled:opacity-50"><svg className="w-4 h-4 text-[#1877F2]" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg></button>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------- */}
      {/* MODAL 2: THIẾT LẬP SAU KHI THÀNH CÔNG */}
      {/* --------------------------------------------------------- */}
      {mode === 'setup' && (
        <div className="bg-white rounded-[20px] shadow-2xl w-[400px] p-8 relative animate-in zoom-in-95 duration-300">
          
          {/* Nút Đóng */}
          <button onClick={() => setShowAuthModal(false)} className="absolute top-5 right-5 text-gray-500 hover:text-black">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>

          <div className="text-center mb-6">
            <h2 className="text-[20px] font-bold text-gray-900 mb-2">Đăng Ký Thành Công</h2>
            <p className="text-[13px] text-gray-400 leading-relaxed">Vui lòng thiết lập hình đại diện và tên hiển thị để hoàn tất quá trình tham gia cộng đồng.</p>
          </div>

          <div className="flex justify-center mb-6 relative w-fit mx-auto group">
            <div className="w-24 h-24 rounded-full bg-indigo-50 border-4 border-indigo-100 flex items-center justify-center overflow-hidden shadow-inner">
              <img src={avatarPreview || "https://ui-avatars.com/api/?name=New&background=E5E7EB&color=9CA3AF"} alt="Avatar" className="w-full h-full object-cover" />
            </div>
            <input type="file" accept="image/*" ref={fileInputRef} onChange={handleAvatarChange} className="hidden" />
            <button type="button" onClick={() => fileInputRef.current?.click()} className="absolute bottom-0 right-0 bg-white border border-gray-200 p-1.5 rounded-full shadow-sm cursor-pointer hover:bg-gray-50 hover:scale-110 transition-transform">
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            </button>
          </div>

          {errorMsg && <div className="text-red-500 text-[13px] text-center mb-4 font-medium">{errorMsg}</div>}

          <div className="mb-4">
            <input type="text" placeholder="Tên hiển thị (Ví dụ: Nguyễn Văn A)" value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="w-full border border-gray-200 rounded-[10px] px-4 py-3 text-[14px] outline-none focus:border-blue-500 transition-colors bg-gray-50/50" />
          </div>

          <div className="relative mb-8">
            <input type="text" placeholder="Tên người dùng (ID duy nhất)" value={username} onChange={(e) => setUsername(e.target.value.substring(0, 20))} className="w-full border-b border-gray-300 py-2 pr-12 text-[15px] font-medium text-gray-800 outline-none focus:border-blue-500 transition-colors bg-transparent text-center" />
            <span className="absolute right-0 bottom-2.5 text-[12px] text-gray-400">{username.length}/20</span>
          </div>

          <button onClick={handleSetupComplete} disabled={isLoading || !username || !displayName} className="w-full h-11 bg-[#eaebfc] hover:bg-[#d8dbff] text-[#5865F2] font-bold rounded-[10px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            {isLoading ? "Đang lưu..." : "Bắt Đầu Trải Nghiệm"}
          </button>
        </div>
      )}

    </div>
  );
}