import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, Alert, ScrollView, Image } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { useSignUp } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next'; // 👈 IMPORT DỊCH

export default function RegisterScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isLoaded, signUp, setActive } = useSignUp();
  const { t } = useTranslation(); // 👈 KHỞI TẠO HOOK

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // B1: Email
  const [email, setEmail] = useState('');

  // B2: Điều khoản
  const [terms, setTerms] = useState({ t1: false, t2: false, t3: false, t4: false, t5: false, t6: false });
  const isAllAccepted = Object.values(terms).every(Boolean);
  const handleToggleAll = () => {
    const newValue = !isAllAccepted;
    setTerms({ t1: newValue, t2: newValue, t3: newValue, t4: newValue, t5: newValue, t6: newValue });
  };
  const canProceedTerms = terms.t1 && terms.t2 && terms.t3 && terms.t4;

  // B3: OTP
  const [code, setCode] = useState('');
  const [countdown, setCountdown] = useState(60);

  // B4: Mật khẩu
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (step === 3 && countdown > 0) {
      interval = setInterval(() => setCountdown((prev) => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [step, countdown]);

  const onEmailSubmit = () => {
    if (!email.includes('@')) return Alert.alert(t('register.error'), t('register.invalid_email'));
    setStep(2);
  };

  const onTermsAccept = async () => {
    if (!canProceedTerms) return Alert.alert(t('register.error'), t('register.agree_mandatory_terms'));
    if (!isLoaded) return;
    setLoading(true);
    try {
      await signUp.create({ emailAddress: email });
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setCountdown(60);
      setStep(3);
    } catch (err: any) { 
      Alert.alert(t('register.error'), err.errors?.[0]?.message || t('register.error_occurred')); 
    } 
    finally { setLoading(false); }
  };

  const onResendOTP = async () => {
    if (!isLoaded) return;
    try {
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setCountdown(60);
      Alert.alert(t('register.success'), t('register.otp_resent'));
    } catch (err: any) { Alert.alert(t('register.error'), t('register.otp_resend_error')); }
  };

  const onVerifyOTP = async () => {
    if (!isLoaded) return;
    setLoading(true);
    try {
      const completeSignUp = await signUp.attemptEmailAddressVerification({ code });
      if (completeSignUp.status !== 'complete') setStep(4);
    } catch (err: any) { Alert.alert(t('register.otp_error'), t('register.otp_invalid')); } 
    finally { setLoading(false); }
  };

  // 🚀 CHỐT SỔ Ở BƯỚC 4
  const onFinishRegister = async () => {
    if (password !== confirmPassword) return Alert.alert(t('register.error'), t('register.password_mismatch'));
    if (password.length < 8) return Alert.alert(t('register.error'), t('register.password_length'));
    
    if (!isLoaded) return;
    setLoading(true);
    try {
      // TẠO TÊN NGẪU NHIÊN ĐỂ VƯỢT ẢI CLERK
      const tempUsername = 'user_' + Math.random().toString(36).substring(2, 10);

      const completeSignUp = await signUp.update({ 
        password: password,
        username: tempUsername 
      });
      
      if (completeSignUp.status === 'complete') {
        await setActive({ session: completeSignUp.createdSessionId });
        router.replace('/(auth)/onboarding' as any);
      } else {
        console.log("Trạng thái bị kẹt:", completeSignUp.status);
      }
    } catch (err: any) {
      Alert.alert(t('register.error'), err.errors?.[0]?.message || t('register.cannot_create_password'));
    } finally {
      setLoading(false);
    }
  };

  const CheckboxItem = ({ checked, onPress, title, subTitle, isLink = false }: any) => (
    <TouchableOpacity style={styles.checkboxRow} onPress={onPress}>
      <Ionicons name={checked ? "checkmark-circle" : "ellipse-outline"} size={24} color={checked ? Colors.primary : "#ccc"} />
      <View style={styles.checkboxTexts}>
        <Text style={[styles.checkboxTitle, isLink && { color: '#4B88E8' }]}>{title}</Text>
        {subTitle && <Text style={styles.checkboxSub}>{subTitle}</Text>}
      </View>
    </TouchableOpacity>
  );

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <TouchableOpacity 
        style={[styles.backButton, { top: insets.top + 10 }]} 
        onPress={() => (step === 1 ? router.back() : setStep(step - 1))}
      >
        <Ionicons name="chevron-back" size={28} color="black" />
      </TouchableOpacity>

      <View style={[styles.content, { paddingTop: insets.top + 50 }]}>
        
        {step === 1 && (
          <View style={styles.stepContainer}>
            <View style={styles.logoContainer}>
              <Image source={require('@/assets/images/KonKet-logo.png')} style={{width: 160, height: 60}} resizeMode="contain" />
            </View>
            <Text style={styles.title}>{t('register.create_account')}</Text>
            <Text style={styles.subtitle}>{t('register.account_desc')}</Text>
            
            <TextInput style={styles.input} placeholder={t('register.email_placeholder')} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
            <TouchableOpacity style={[styles.button, !email && {backgroundColor: '#ccc'}]} onPress={onEmailSubmit} disabled={!email}>
              <Text style={styles.buttonText}>{t('register.next')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 2 && (
          <ScrollView showsVerticalScrollIndicator={false} style={{ width: '100%' }}>
            <Text style={styles.titleLeft}>{t('register.terms_privacy')}</Text>
            <CheckboxItem checked={isAllAccepted} onPress={handleToggleAll} title={t('register.agree_all')} subTitle={t('register.agree_all_desc')} />
            <View style={styles.divider} />
            <CheckboxItem checked={terms.t1} onPress={() => setTerms({...terms, t1: !terms.t1})} title={t('register.term_1')} isLink />
            <CheckboxItem checked={terms.t2} onPress={() => setTerms({...terms, t2: !terms.t2})} title={t('register.term_2')} isLink />
            <CheckboxItem checked={terms.t3} onPress={() => setTerms({...terms, t3: !terms.t3})} title={t('register.term_3')} isLink />
            <CheckboxItem checked={terms.t4} onPress={() => setTerms({...terms, t4: !terms.t4})} title={t('register.term_4')} isLink />
            <CheckboxItem checked={terms.t5} onPress={() => setTerms({...terms, t5: !terms.t5})} title={t('register.term_5')} />
            <CheckboxItem checked={terms.t6} onPress={() => setTerms({...terms, t6: !terms.t6})} title={t('register.term_6')} />

            <TouchableOpacity style={[styles.button, { marginTop: 30, marginBottom: 50 }, !canProceedTerms && {backgroundColor: '#ccc'}]} onPress={onTermsAccept} disabled={loading || !canProceedTerms}>
              {loading ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>{t('register.continue')}</Text>}
            </TouchableOpacity>
          </ScrollView>
        )}

        {step === 3 && (
          <View style={styles.stepContainer}>
            <View style={styles.iconCircle}><Ionicons name="mail" size={40} color="white" /></View>
            <Text style={styles.title}>{t('register.security_verification')}</Text>
            <Text style={styles.subtitle}>
              {t('register.enter_otp_desc')}
              <Text style={{fontWeight: 'bold', color: 'black'}}>{email}</Text>
            </Text>
            
            <TextInput style={[styles.input, { textAlign: 'center', letterSpacing: 10, fontSize: 24, fontWeight: 'bold' }]} placeholder="000000" value={code} onChangeText={setCode} keyboardType="number-pad" maxLength={6} />
            
            <TouchableOpacity onPress={onResendOTP} disabled={countdown > 0} style={{ marginTop: 10, marginBottom: 20 }}>
              <Text style={{ color: countdown > 0 ? '#999' : '#4B88E8', fontSize: 15 }}>
                {countdown > 0 ? t('register.get_otp_countdown', { countdown }) : t('register.resend_otp')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.button, code.length < 6 && {backgroundColor: '#ccc'}]} onPress={onVerifyOTP} disabled={loading || code.length < 6}>
              {loading ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>{t('register.verify_otp')}</Text>}
            </TouchableOpacity>
          </View>
        )}

        {step === 4 && (
          <View style={styles.stepContainer}>
            <View style={styles.iconCircle}><Ionicons name="lock-closed" size={40} color="white" /></View>
            <Text style={styles.title}>{t('register.set_password_title')}</Text>
            <Text style={styles.subtitle}>{t('register.set_password_desc')}</Text>
            
            <View style={styles.passwordContainer}>
              <TextInput style={styles.passwordInput} placeholder={t('register.password_placeholder')} value={password} onChangeText={setPassword} secureTextEntry={!showPassword} />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}><Ionicons name={showPassword ? "eye-outline" : "eye-off-outline"} size={22} color="#999" /></TouchableOpacity>
            </View>

            <View style={styles.passwordContainer}>
              <TextInput style={styles.passwordInput} placeholder={t('register.confirm_password_placeholder')} value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry={!showConfirmPassword} />
              <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}><Ionicons name={showConfirmPassword ? "eye-outline" : "eye-off-outline"} size={22} color="#999" /></TouchableOpacity>
            </View>
            
            <View style={styles.rulesContainer}>
              <Text style={styles.ruleText}>{t('register.rule_1')}</Text>
              <Text style={styles.ruleText}>{t('register.rule_2')}</Text>
            </View>

            <TouchableOpacity style={styles.button} onPress={onFinishRegister} disabled={loading}>
              {loading ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>{t('register.finish')}</Text>}
            </TouchableOpacity>
          </View>
        )}

      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white' },
  backButton: { position: 'absolute', left: 20, zIndex: 10, padding: 5 },
  content: { flex: 1, paddingHorizontal: 25 },
  stepContainer: { alignItems: 'center', width: '100%' },
  logoContainer: { marginBottom: 30 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
  titleLeft: { fontSize: 22, fontWeight: 'bold', marginBottom: 25, alignSelf: 'flex-start' },
  subtitle: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 30, lineHeight: 20 },
  input: { width: '100%', backgroundColor: '#F9F9F9', borderRadius: 12, padding: 16, fontSize: 16, marginBottom: 15, borderWidth: 1, borderColor: '#E0E0E0' },
  passwordContainer: { flexDirection: 'row', alignItems: 'center', width: '100%', backgroundColor: '#F9F9F9', borderRadius: 12, paddingHorizontal: 16, marginBottom: 15, borderWidth: 1, borderColor: '#E0E0E0', height: 55 },
  passwordInput: { flex: 1, fontSize: 16 },
  button: { width: '100%', backgroundColor: Colors.primary, borderRadius: 25, paddingVertical: 16, alignItems: 'center', marginTop: 10, marginBottom: 40 },
  buttonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  checkboxRow: { flexDirection: 'row', alignItems: 'flex-start', width: '100%', marginBottom: 16 },
  checkboxTexts: { marginLeft: 12, flex: 1, paddingTop: 2 },
  checkboxTitle: { fontSize: 14, fontWeight: '500', color: '#333', lineHeight: 20 },
  checkboxSub: { fontSize: 13, color: '#888', lineHeight: 18, marginTop: 4 },
  divider: { width: '100%', height: 1, backgroundColor: '#EEE', marginVertical: 15 },
  iconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#8CAEF2', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  rulesContainer: { width: '100%', marginBottom: 30, paddingLeft: 10 },
  ruleText: { fontSize: 13, color: '#666', marginBottom: 8 },
});