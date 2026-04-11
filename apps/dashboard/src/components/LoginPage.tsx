import { useState } from 'react';
import { useSignIn } from '@clerk/clerk-react';
import { KeyRound, ArrowRight, Mail, AlertCircle, Eye, EyeOff, ShieldCheck, ArrowLeft } from 'lucide-react';
import logoImg from '../assets/konket-logo-green.png';

const LoginPage = () => {
  const { isLoaded, signIn, setActive } = useSignIn();

  // State cho thông tin đăng nhập
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // State cho luồng 2FA (OTP)
  const [isVerifying2FA, setIsVerifying2FA] = useState(false);
  const [otpCode, setOtpCode] = useState('');

  // State trạng thái chung
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // --- BƯỚC 1: ĐĂNG NHẬP EMAIL / MẬT KHẨU ---
  const handleInitialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded) return;
    setError('');
    setIsLoading(true);

    try {
      const result = await signIn.create({
        identifier,
        password,
      });

      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
      } else if (result.status === 'needs_second_factor') {
        
        // 👇 KIỂM TRA PHƯƠNG THỨC 2FA VÀ KÍCH HOẠT GỬI MÃ 👇
        const secondFactor = result.supportedSecondFactors?.[0];
        
        if (secondFactor?.strategy === 'email_code') {
          // Bắt Clerk gửi mã về Email
          await signIn.prepareSecondFactor({
            strategy: 'email_code',
            emailAddressId: secondFactor.emailAddressId,
          });
        } else if (secondFactor?.strategy === 'phone_code') {
          // Bắt Clerk gửi SMS về Điện thoại
          await signIn.prepareSecondFactor({
            strategy: 'phone_code',
            phoneNumberId: secondFactor.phoneNumberId,
          });
        }
        // Nếu là TOTP (Authenticator App) thì không cần gọi prepare, cứ thế hiện form

        setIsVerifying2FA(true);
      } else {
        console.log("Trạng thái chưa xử lý:", result.status);
      }
    } catch (err: any) {
      setError(err.errors?.[0]?.message || 'Tài khoản hoặc mật khẩu không chính xác.');
    } finally {
      setIsLoading(false);
    }
  };

  // --- BƯỚC 2: XÁC THỰC MÃ OTP (2FA) ---
  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded) return;
    setError('');
    setIsLoading(true);

    try {
      // Lấy phương thức 2FA đang được cấu hình (Thường là 'totp' - Authenticator App hoặc 'phone_code' - SMS)
      const secondFactor = signIn.supportedSecondFactors?.[0];
      
      if (!secondFactor) {
        throw new Error('Không tìm thấy phương thức xác thực 2 lớp.');
      }

      const result = await signIn.attemptSecondFactor({
        strategy: secondFactor.strategy as any,
        code: otpCode,
      });

      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
      } else {
        setError('Xác thực thất bại, vui lòng thử lại.');
      }
    } catch (err: any) {
      setError(err.errors?.[0]?.message || 'Mã xác thực không chính xác.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
           <img loading="lazy" src={logoImg} alt="Logo" className="h-16 w-auto object-contain" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Đăng nhập Quản trị
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Chỉ dành riêng cho Ban quản trị hệ thống
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-2xl sm:px-10 border border-gray-100">

          {/* HIỂN THỊ LỖI CHUNG */}
          {error && (
            <div className="mb-6 p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!isVerifying2FA ? (
            // ==========================================
            // FORM 1: NHẬP EMAIL & MẬT KHẨU
            // ==========================================
            <form onSubmit={handleInitialSubmit} className="space-y-6 animate-in slide-in-from-bottom-4 fade-in duration-300">
              <div>
                <label className="block text-sm font-medium text-gray-700">Email hoặc Tên đăng nhập</label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                    placeholder="admin@example.com"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Mật khẩu</label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <KeyRound className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-xl focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || !identifier || !password}
                className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-green-600 text-white font-bold rounded-xl hover:shadow-lg transition-all disabled:opacity-70 flex items-center justify-center gap-2 text-sm"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <><span>Đăng nhập</span> <ArrowRight className="w-4 h-4" /></>
                )}
              </button>
            </form>
          ) : (
            // ==========================================
            // FORM 2: NHẬP MÃ OTP (XÁC THỰC 2 LỚP)
            // ==========================================
            <form onSubmit={handleVerifyOTP} className="space-y-6 animate-in slide-in-from-right-8 fade-in duration-300">
              <div className="text-center mb-6">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-emerald-100 mb-4">
                  <ShieldCheck className="h-6 w-6 text-emerald-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Xác thực 2 lớp</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Vui lòng nhập mã bảo mật (OTP) từ ứng dụng Authenticator hoặc tin nhắn của bạn.
                </p>
              </div>

              <div>
                <div className="mt-1 relative">
                  <input
                    type="text"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ''))} // Chỉ cho phép nhập số
                    maxLength={6}
                    className="block w-full px-3 py-4 text-center tracking-[0.5em] font-mono text-2xl border border-gray-300 rounded-xl focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="000000"
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  type="submit"
                  disabled={isLoading || otpCode.length < 6}
                  className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-green-600 text-white font-bold rounded-xl hover:shadow-lg transition-all disabled:opacity-70 flex items-center justify-center gap-2 text-sm"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <span>Xác nhận</span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsVerifying2FA(false);
                    setOtpCode('');
                    setError('');
                  }}
                  className="w-full py-3 text-gray-600 font-medium rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 text-sm"
                >
                  <ArrowLeft className="w-4 h-4" /> Quay lại
                </button>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
};

export default LoginPage;