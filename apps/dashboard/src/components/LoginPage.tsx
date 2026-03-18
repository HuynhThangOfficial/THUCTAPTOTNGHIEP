import { useState } from 'react';
import { useSignIn } from '@clerk/clerk-react';
import { KeyRound, ArrowRight, Mail, RotateCcw, AlertCircle, Eye, EyeOff } from 'lucide-react';
import logoImg from '../assets/konket-logo-green.png';

const LoginPage = () => {
  const { isLoaded, signIn, setActive } = useSignIn();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Trạng thái kiểm soát form
  const [isCodeSent, setIsCodeSent] = useState(false);
  const [verificationType, setVerificationType] = useState<'first_factor' | 'second_factor' | null>(null);
  const [activeStrategy, setActiveStrategy] = useState<string>(''); 
  
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // --- BƯỚC 1: XỬ LÝ ĐĂNG NHẬP ---
  const handleSubmit = async (e: React.FormEvent) => {
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
      } 
      else if (result.status === 'needs_first_factor') {
        const factor = result.supportedFirstFactors?.find(f => f.strategy === 'email_code');
        if (factor) {
          await signIn.prepareFirstFactor({
            strategy: 'email_code',
            emailAddressId: factor.emailAddressId,
          });
          setVerificationType('first_factor');
          setActiveStrategy('email_code');
          setIsCodeSent(true);
        } else {
          setError('Hệ thống không tìm thấy phương thức gửi mã phù hợp.');
        }
      } 
      else if (result.status === 'needs_second_factor') {
        const factor = result.supportedSecondFactors?.find(
          f => f.strategy === 'email_code' || f.strategy === 'phone_code'
        );
        if (factor) {
          await signIn.prepareSecondFactor({
            strategy: factor.strategy as any,
          });
          setVerificationType('second_factor');
          setActiveStrategy(factor.strategy);
          setIsCodeSent(true);
        } else {
          setError('Tài khoản yêu cầu 2FA nhưng không tìm thấy phương thức hỗ trợ.');
        }
      } 
      else {
        console.log("Trạng thái Clerk:", result.status);
        setError(`Hệ thống yêu cầu thêm bước: ${result.status}`);
      }
    } catch (err: any) {
      setError(err.errors?.[0]?.longMessage || 'Email hoặc mật khẩu không chính xác.');
    } finally {
      setIsLoading(false);
    }
  };

  // --- HÀM GỬI LẠI MÃ ---
  const handleResendCode = async () => {
    if (!isLoaded || !verificationType || !activeStrategy) return;
    setError('');
    setIsLoading(true);
    try {
      if (verificationType === 'first_factor') {
        await signIn.prepareFirstFactor({ strategy: activeStrategy as any });
      } else {
        await signIn.prepareSecondFactor({ strategy: activeStrategy as any });
      }
      setError('Mã xác thực mới đã được gửi lại.');
    } catch (err: any) {
      setError(err.errors?.[0]?.longMessage || 'Không thể gửi lại mã.');
    } finally {
      setIsLoading(false);
    }
  };

  // --- BƯỚC 2: XÁC THỰC MÃ OTP ---
  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded) return;
    setError('');
    setIsLoading(true);

    try {
      let result;
      if (verificationType === 'first_factor') {
        result = await signIn.attemptFirstFactor({
          strategy: activeStrategy as any,
          code,
        });
      } else {
        result = await signIn.attemptSecondFactor({
          strategy: activeStrategy as any,
          code,
        });
      }

      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
      } else {
        setError('Mã xác thực không chính xác.');
      }
    } catch (err: any) {
      setError(err.errors?.[0]?.longMessage || 'Mã xác thực không chính xác.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-green-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        
        {/* HEADER FORM */}
<div className="text-center mb-4">
  <div className="inline-flex items-center justify-center w-48 h-48 -mb-10 mx-auto overflow-hidden">
    <img 
      src={logoImg} 
      alt="KonKet Logo" 
      className="w-full h-full object-contain"
    />
  </div>
  <h1 className="text-2xl font-black text-gray-800 tracking-tight relative z-10">
    Trang Quản Trị Hệ Thống KonKet
  </h1>
  <p className="text-sm text-gray-500 mt-1 font-medium">
    Dành cho quản trị viên hệ thống của KonKet
  </p>
</div>

        {/* BOX ĐĂNG NHẬP */}
        <div className="bg-white rounded-2xl shadow-xl shadow-emerald-100/50 p-6 sm:p-8 border border-emerald-100 relative overflow-hidden transition-all duration-300">
          
          {isCodeSent ? (
            <form onSubmit={handleVerify} className="space-y-4 animate-in slide-in-from-right-4 duration-300">
              <button 
                type="button" 
                onClick={() => setIsCodeSent(false)}
                className="flex items-center gap-2 text-sm text-gray-400 hover:text-emerald-600 transition-colors"
              >
                <RotateCcw className="w-4 h-4" /> Quay lại đăng nhập
              </button>

              <div className="text-center">
                <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Mail className="w-5 h-5" />
                </div>
                <h2 className="text-lg font-bold text-gray-800">Xác thực mã OTP</h2>
                <p className="text-xs text-gray-500 mt-1">Chúng tôi đã gửi mã xác thực gồm 6 chữ số đến bạn.</p>
              </div>

              <div>
                <input
                  type="text"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="000000"
                  className="w-full text-center text-2xl tracking-[0.75rem] font-bold py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all bg-gray-50 focus:bg-white outline-none"
                />
              </div>

              {error && (
                <div className={`p-2.5 border rounded-lg text-xs flex items-center gap-2 ${error.includes('gửi lại') ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-red-50 border-red-100 text-red-700'}`}>
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading || code.length < 6}
                className="w-full py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Đang xác thực...' : 'Xác nhận mã'}
              </button>

              <p className="text-center text-xs text-gray-500 mt-3">
                Không nhận được mã?{' '}
                <button type="button" onClick={handleResendCode} className="text-emerald-600 font-medium hover:text-emerald-700">
                  Gửi lại
                </button>
              </p>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Tên đăng nhập hoặc Email</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Mail className="w-4 h-4 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all bg-gray-50 focus:bg-white outline-none text-sm"
                    placeholder="admin@konket.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Mật khẩu</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <KeyRound className="w-4 h-4 text-gray-400" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all bg-gray-50 focus:bg-white outline-none text-sm"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-3 px-1 flex items-center text-gray-400 hover:text-emerald-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="p-2.5 bg-red-50 border border-red-100 rounded-lg text-red-600 text-xs flex items-center gap-2 animate-pulse">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-green-600 text-white font-bold rounded-xl hover:shadow-emerald-200 hover:shadow-lg transition-all disabled:opacity-70 flex items-center justify-center gap-2 text-sm"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                    <span>Đang kiểm tra...</span>
                  </>
                ) : (
                  <>
                    <span>Đăng nhập</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>
        
        <p className="text-center text-gray-400 text-xs mt-5">
          © 2026 Newyas. Mọi quyền được bảo lưu.
        </p>
      </div>
    </div>
  );
};

export default LoginPage;