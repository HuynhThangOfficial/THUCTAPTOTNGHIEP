import { useState } from 'react';
import { useSignIn } from '@clerk/clerk-react';
import { KeyRound, ArrowRight, Mail, AlertCircle, Eye, EyeOff } from 'lucide-react';
import logoImg from '../assets/konket-logo-green.png'; // Nhớ check lại đường dẫn logo

const LoginPage = () => {
  const { isLoaded, signIn, setActive } = useSignIn();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // --- ĐĂNG NHẬP BẰNG EMAIL / MẬT KHẨU ---
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
        // Nếu đăng nhập thành công, set session (Quyền Admin sẽ được check ở AdminGuard)
        await setActive({ session: result.createdSessionId });
      } else {
        // Xử lý các trường hợp cần xác thực thêm (2FA) nếu có
        console.log(result);
      }
    } catch (err: any) {
      setError(err.errors?.[0]?.message || 'Tài khoản hoặc mật khẩu không chính xác.');
    } finally {
      setIsLoading(false);
    }
  };

  // --- ĐĂNG NHẬP BẰNG GOOGLE ---
  const loginWithGoogle = () => {
    if (!isLoaded) return;
    signIn.authenticateWithRedirect({
      strategy: "oauth_google",
      redirectUrl: "/sso-callback",
      redirectUrlComplete: "/", // Link trỏ về trang Dashboard Admin sau khi login Google xong
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
           <img loading="lazy"src={logoImg} alt="Logo" className="h-16 w-auto object-contain" />
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

          <form onSubmit={handleSubmit} className="space-y-6">
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

            {error && (
              <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

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

          {/* NÚT ĐĂNG NHẬP BẰNG GOOGLE */}
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Hoặc tiếp tục với</span>
              </div>
            </div>

            <div className="mt-6">
              <button
                type="button"
                onClick={loginWithGoogle}
                className="w-full flex items-center justify-center gap-3 py-3 border border-gray-300 rounded-xl bg-white text-gray-700 hover:bg-gray-50 font-medium transition-colors shadow-sm"
              >
                <img loading="lazy"src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5" alt="Google" />
                <span>Đăng nhập bằng Google</span>
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default LoginPage;