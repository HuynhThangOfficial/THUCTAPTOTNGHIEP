import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { useSignUp, useUser } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';

export default function RegisterScreen() {
  const router = useRouter();
  const { isLoaded, signUp, setActive } = useSignUp();
  const { user } = useUser();

  // State quản lý các bước (1 đến 5)
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Bước 1: Email
  const [email, setEmail] = useState('');

  // Bước 2: Điều khoản (6 mục)
  const [terms, setTerms] = useState({
    t1: false, // Dịch vụ KonKet
    t2: false, // Quyền riêng tư
    t3: false, // Dịch vụ Forums
    t4: false, // Bảo mật Forums
    t5: false, // Email tiếp thị (Optional)
    t6: false, // Push tiếp thị (Optional)
  });
  
  const isAllAccepted = Object.values(terms).every(Boolean);
  const handleToggleAll = () => {
    const newValue = !isAllAccepted;
    setTerms({ t1: newValue, t2: newValue, t3: newValue, t4: newValue, t5: newValue, t6: newValue });
  };
  // Chỉ yêu cầu 4 mục đầu tiên bắt buộc
  const canProceedTerms = terms.t1 && terms.t2 && terms.t3 && terms.t4;

  // Bước 3: OTP & Đếm ngược
  const [code, setCode] = useState('');
  const [countdown, setCountdown] = useState(60);

  // Bước 4: Mật khẩu
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Bước 5: Nickname
  const [nickname, setNickname] = useState('');

  // --- LOGIC ĐẾM NGƯỢC 60s ---
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (step === 3 && countdown > 0) {
      interval = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [step, countdown]);

  // ---------------- LÔ-GÍC CÁC BƯỚC ---------------- //

  // B1 -> B2
  const onEmailSubmit = () => {
    if (!email.includes('@')) return Alert.alert('Lỗi', 'Email không hợp lệ!');
    setStep(2);
  };

  // B2 -> B3
  const onTermsAccept = async () => {
    if (!canProceedTerms) return Alert.alert('Lỗi', 'Vui lòng đồng ý với các điều khoản bắt buộc!');
    if (!isLoaded) return;
    setLoading(true);
    try {
      await signUp.create({ emailAddress: email });
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setCountdown(60); // Bắt đầu đếm ngược 60s
      setStep(3);
    } catch (err: any) {
      Alert.alert('Lỗi', err.errors?.[0]?.message || 'Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  // Nút gửi lại mã ở B3
  const onResendOTP = async () => {
    if (!isLoaded) return;
    try {
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setCountdown(60); // Reset bộ đếm
      Alert.alert('Thành công', 'Đã gửi lại mã xác nhận vào email của bạn.');
    } catch (err: any) {
      Alert.alert('Lỗi', 'Không thể gửi lại mã lúc này.');
    }
  };

  // B3 -> B4
  const onVerifyOTP = async () => {
    if (!isLoaded) return;
    setLoading(true);
    try {
      const completeSignUp = await signUp.attemptEmailAddressVerification({ code });
      if (completeSignUp.status !== 'complete') {
        setStep(4);
      }
    } catch (err: any) {
      Alert.alert('Lỗi OTP', 'Mã xác nhận không đúng hoặc đã hết hạn.');
    } finally {
      setLoading(false);
    }
  };

  // B4 -> B5
  const onSetPassword = () => {
    if (password !== confirmPassword) return Alert.alert('Lỗi', 'Mật khẩu không khớp!');
    if (password.length < 8) return Alert.alert('Lỗi', 'Mật khẩu phải từ 8 ký tự!');
    
    // Tạo nickname random và đẩy sang bước 5, chưa gọi API
    const randomName = 'user_' + Math.random().toString(36).substring(2, 10);
    setNickname(randomName);
    setStep(5);
  };

  // B5 -> Hoàn Thành
  const onFinish = async () => {
    if (!isLoaded) return;
    setLoading(true);
    try {
      const completeSignUp = await signUp.update({ 
        password: password,
        username: nickname 
      });
      
      if (completeSignUp.status === 'complete') {
        await setActive({ session: completeSignUp.createdSessionId });
        router.replace('/(auth)/(tabs)/feed' as any);
      }
    } catch (err: any) {
      Alert.alert('Lỗi', err.errors?.[0]?.message || 'Không thể lưu thông tin.');
    } finally {
      setLoading(false);
    }
  };

  // Component render từng dòng Checkbox cho gọn
  const CheckboxItem = ({ checked, onPress, title, subTitle, isLink = false }: any) => (
    <TouchableOpacity style={styles.checkboxRow} onPress={onPress}>
      <Ionicons 
        name={checked ? "checkmark-circle" : "ellipse-outline"} 
        size={24} 
        color={checked ? Colors.primary : "#ccc"} 
      />
      <View style={styles.checkboxTexts}>
        <Text style={[styles.checkboxTitle, isLink && { color: '#4B88E8' }]}>{title}</Text>
        {subTitle && <Text style={styles.checkboxSub}>{subTitle}</Text>}
      </View>
    </TouchableOpacity>
  );

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      {/* ẨN HEADER MẶC ĐỊNH CỦA EXPO ROUTER */}
      <Stack.Screen options={{ headerShown: false }} />

      {/* Nút quay lại */}
      {step < 5 && (
        <TouchableOpacity style={styles.backButton} onPress={() => (step === 1 ? router.back() : setStep(step - 1))}>
          <Ionicons name="chevron-back" size={28} color="black" />
        </TouchableOpacity>
      )}

      <View style={styles.content}>
        {/* --- BƯỚC 1: EMAIL --- */}
        {step === 1 && (
          <View style={styles.stepContainer}>
            <View style={styles.logoContainer}>
              <Text style={styles.logoText}>Kon<Text style={{ color: Colors.primary }}>Ket</Text></Text>
            </View>
            <Text style={styles.title}>Tạo Thẻ Thông Hành</Text>
            <Text style={styles.subtitle}>Dùng để đăng nhập trang web, ứng dụng KonKet</Text>
            
            <TextInput style={styles.input} placeholder="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
            
            <TouchableOpacity style={[styles.button, !email && {backgroundColor: '#ccc'}]} onPress={onEmailSubmit} disabled={!email}>
              <Text style={styles.buttonText}>Tiếp</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* --- BƯỚC 2: ĐIỀU KHOẢN (FULL) --- */}
        {step === 2 && (
          <ScrollView showsVerticalScrollIndicator={false} style={{ width: '100%', marginTop: 80 }}>
            <Text style={styles.titleLeft}>Điều Khoản Và Quyền Riêng Tư</Text>
            
            <CheckboxItem 
              checked={isAllAccepted} onPress={handleToggleAll} 
              title="Đồng Ý Toàn Bộ" subTitle="Tôi đã đọc và đồng ý toàn bộ Điều khoản dịch vụ và Chính sách quyền riêng tư của KonKet." 
            />
            <View style={styles.divider} />
            <CheckboxItem checked={terms.t1} onPress={() => setTerms({...terms, t1: !terms.t1})} title="Đồng ý với Điều Khoản Dịch Vụ KonKet" isLink />
            <CheckboxItem checked={terms.t2} onPress={() => setTerms({...terms, t2: !terms.t2})} title="Đồng ý cho phép thu thập và sử dụng thông tin cá nhân theo Chính Sách Về Quyền Riêng Tư" isLink />
            <CheckboxItem checked={terms.t3} onPress={() => setTerms({...terms, t3: !terms.t3})} title="Đã đọc và đồng ý với Điều Khoản Dịch Vụ Của Forums" isLink />
            <CheckboxItem checked={terms.t4} onPress={() => setTerms({...terms, t4: !terms.t4})} title="Đồng ý cho phép thu thập và sử dụng thông tin cá nhân theo Chính Sách Bảo Mật Của Forums" isLink />
            <CheckboxItem checked={terms.t5} onPress={() => setTerms({...terms, t5: !terms.t5})} title="Đồng ý nhận thông tin tiếp thị - Email thông tin" />
            <CheckboxItem checked={terms.t6} onPress={() => setTerms({...terms, t6: !terms.t6})} title="Đồng ý nhận thông tin tiếp thị - Push" />

            <TouchableOpacity style={[styles.button, { marginTop: 30 }, !canProceedTerms && {backgroundColor: '#ccc'}]} onPress={onTermsAccept} disabled={loading || !canProceedTerms}>
              {loading ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>Tiếp Tục</Text>}
            </TouchableOpacity>
          </ScrollView>
        )}

        {/* --- BƯỚC 3: XÁC MINH OTP --- */}
        {step === 3 && (
          <View style={styles.stepContainer}>
            <View style={styles.iconCircle}><Ionicons name="mail" size={40} color="white" /></View>
            <Text style={styles.title}>Xác Minh Bảo Mật</Text>
            <Text style={styles.subtitle}>Vui lòng nhập mã xác nhận từ email{'\n'}<Text style={{fontWeight: 'bold', color: 'black'}}>{email}</Text></Text>
            
            <TextInput
              style={[styles.input, { textAlign: 'center', letterSpacing: 10, fontSize: 24, fontWeight: 'bold' }]}
              placeholder="000000" value={code} onChangeText={setCode} keyboardType="number-pad" maxLength={6}
            />
            
            {/* Đếm ngược & Gửi lại mã */}
            <TouchableOpacity onPress={onResendOTP} disabled={countdown > 0} style={{ marginTop: 10, marginBottom: 20 }}>
              <Text style={{ color: countdown > 0 ? '#999' : '#4B88E8', fontSize: 15 }}>
                {countdown > 0 ? `Nhận mã xác nhận (${countdown}s)` : 'Gửi lại mã xác nhận'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.button, code.length < 6 && {backgroundColor: '#ccc'}]} onPress={onVerifyOTP} disabled={loading || code.length < 6}>
              {loading ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>Xác Nhận OTP</Text>}
            </TouchableOpacity>
          </View>
        )}

        {/* --- BƯỚC 4: THIẾT LẬP MẬT KHẨU (CÓ CON MẮT) --- */}
        {step === 4 && (
          <View style={styles.stepContainer}>
            <View style={styles.iconCircle}><Ionicons name="lock-closed" size={40} color="white" /></View>
            <Text style={styles.title}>Thiết lập mã xác nhận</Text>
            <Text style={styles.subtitle}>Vui lòng thiết lập mật khẩu mạnh hơn</Text>
            
            <View style={styles.passwordContainer}>
              <TextInput style={styles.passwordInput} placeholder="Vui lòng nhập mật khẩu" value={password} onChangeText={setPassword} secureTextEntry={!showPassword} />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons name={showPassword ? "eye-outline" : "eye-off-outline"} size={22} color="#999" />
              </TouchableOpacity>
            </View>

            <View style={styles.passwordContainer}>
              <TextInput style={styles.passwordInput} placeholder="Vui lòng nhập lại mật khẩu" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry={!showConfirmPassword} />
              <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                <Ionicons name={showConfirmPassword ? "eye-outline" : "eye-off-outline"} size={22} color="#999" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.rulesContainer}>
              <Text style={styles.ruleText}>✓ Mật khẩu gồm 8-30 số, chữ cái hoặc ký tự</Text>
              <Text style={styles.ruleText}>✓ Đảm bảo hai lần nhập mật khẩu giống nhau</Text>
            </View>

            <TouchableOpacity style={styles.button} onPress={onSetPassword}>
              <Text style={styles.buttonText}>Xác Nhận</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* --- BƯỚC 5: THÀNH CÔNG & NICKNAME --- */}
        {step === 5 && (
          <View style={styles.stepContainer}>
            <Text style={[styles.title, { color: Colors.primary }]}>Đăng Ký Thành Công</Text>
            <Text style={styles.subtitle}>Nhấn vào phía dưới để thiết lập nickname. Bạn có thể đổi sau.</Text>
            
            <View style={styles.avatarPlaceholder}><Ionicons name="person" size={50} color="#ccc" /></View>
            
            <TextInput style={[styles.input, { textAlign: 'center' }]} value={nickname} onChangeText={setNickname} />

            <TouchableOpacity style={styles.button} onPress={onFinish} disabled={loading}>
              {loading ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>Vào KonKet</Text>}
            </TouchableOpacity>
          </View>
        )}

      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white' },
  backButton: { position: 'absolute', top: 50, left: 20, zIndex: 10 },
  content: { flex: 1, paddingHorizontal: 25, justifyContent: 'center' },
  stepContainer: { alignItems: 'center', width: '100%' },
  
  logoContainer: { marginBottom: 30 },
  logoText: { fontSize: 32, fontWeight: 'bold', letterSpacing: 2 },
  
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
  titleLeft: { fontSize: 22, fontWeight: 'bold', marginBottom: 25, alignSelf: 'flex-start' },
  subtitle: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 30, lineHeight: 20 },
  
  input: { width: '100%', backgroundColor: '#F9F9F9', borderRadius: 12, padding: 16, fontSize: 16, marginBottom: 15, borderWidth: 1, borderColor: '#E0E0E0' },
  
  // Style cho form mật khẩu có con mắt
  passwordContainer: { 
    flexDirection: 'row', alignItems: 'center', width: '100%', backgroundColor: '#F9F9F9', 
    borderRadius: 12, paddingHorizontal: 16, marginBottom: 15, borderWidth: 1, borderColor: '#E0E0E0', height: 55 
  },
  passwordInput: { flex: 1, fontSize: 16 },

  button: { width: '100%', backgroundColor: Colors.primary, borderRadius: 25, paddingVertical: 16, alignItems: 'center', marginTop: 10, marginBottom: 40 },
  buttonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  
  // Điều khoản
  checkboxRow: { flexDirection: 'row', alignItems: 'flex-start', width: '100%', marginBottom: 16 },
  checkboxTexts: { marginLeft: 12, flex: 1, paddingTop: 2 },
  checkboxTitle: { fontSize: 14, fontWeight: '500', color: '#333', lineHeight: 20 },
  checkboxSub: { fontSize: 13, color: '#888', lineHeight: 18, marginTop: 4 },
  divider: { width: '100%', height: 1, backgroundColor: '#EEE', marginVertical: 15 },
  
  iconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#8CAEF2', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  
  rulesContainer: { width: '100%', marginBottom: 30, paddingLeft: 10 },
  ruleText: { fontSize: 13, color: '#666', marginBottom: 8 },
  
  avatarPlaceholder: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#F0F0F0', justifyContent: 'center', alignItems: 'center', marginBottom: 30 }
});