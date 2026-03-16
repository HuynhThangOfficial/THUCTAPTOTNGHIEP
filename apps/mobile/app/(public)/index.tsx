import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import { 
  View, 
  Text, 
  Image, 
  TouchableOpacity, 
  StyleSheet, 
  ScrollView, 
  ActivityIndicator, 
  TextInput,
  SafeAreaView,
  StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useOAuth, useSignIn } from '@clerk/clerk-expo';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Colors } from '@/constants/Colors'; // Lấy màu Xanh Lá xịn từ đây

WebBrowser.maybeCompleteAuthSession();

const LoginScreen = () => {
  const router = useRouter(); // Bật bộ điều hướng

  // Clerk OAuth
  const { startOAuthFlow: facebookAuth } = useOAuth({ strategy: 'oauth_facebook' });
  const { startOAuthFlow: googleAuth } = useOAuth({ strategy: 'oauth_google' });
  
  // Clerk Email/Password
  const { signIn, setActive, isLoaded } = useSignIn();

  // States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);

  // --- Logic Đăng nhập Email/Password ---
  const onSignInPress = async () => {
    if (!isLoaded || isLoading) return;
    if (!agreeTerms || !agreePrivacy) {
      alert("Bạn cần đồng ý với các điều khoản trước.");
      return;
    }

    setIsLoading(true);
    try {
      const completeSignIn = await signIn.create({
        identifier: email,
        password,
      });
      await setActive({ session: completeSignIn.createdSessionId });
    } catch (err: any) {
      alert("Lỗi đăng nhập: " + err.errors[0].message);
    } finally {
      setIsLoading(false);
    }
  };

  // --- Logic OAuth (Google/Facebook) ---
  const handleSocialLogin = async (strategy: 'google' | 'facebook') => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      const flow = strategy === 'google' ? googleAuth : facebookAuth;
      const { createdSessionId, setActive: setSessionActive } = await flow({
        redirectUrl: Linking.createURL('/(auth)/(tabs)/feed', { scheme: 'myapp' })
      });

      if (createdSessionId && setSessionActive) {
        await setSessionActive({ session: createdSessionId });
      }
    } catch (err) {
      console.error(`Lỗi đăng nhập ${strategy}:`, err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* PHẦN TRÊN: Nền xanh lá + Logo Hình Ảnh */}
      <View style={styles.header}>
        <View style={styles.logoCircle}>
           <Image 
             source={require('@/assets/images/KonKet-logo.png')} 
             style={styles.logoImage} 
             resizeMode="contain" 
           />
        </View>
      </View>

      {/* PHẦN DƯỚI: Card trắng chứa Form */}
      <View style={styles.formCard}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{paddingBottom: 40}}>
          
          {/* Input Email */}
          <View style={styles.inputWrapper}>
            <Text style={styles.inputLabel}>Tên người dùng/Email</Text>
            <View style={styles.inputBox}>
              <TextInput 
                style={styles.textInput}
                placeholder="Nhập tên người dùng hoặc email"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
              />
              {email.length > 0 && (
                <TouchableOpacity onPress={() => setEmail('')}>
                  <Ionicons name="close-circle" size={20} color="#ccc" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Input Password */}
          <View style={styles.inputWrapper}>
            <Text style={styles.inputLabel}>Mật khẩu</Text>
            <View style={styles.inputBox}>
              <TextInput 
                style={styles.textInput}
                placeholder="Nhập mật khẩu"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons name={showPassword ? "eye-outline" : "eye-off-outline"} size={20} color="#ccc" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Checkboxes */}
          <TouchableOpacity style={styles.checkboxRow} onPress={() => setAgreeTerms(!agreeTerms)}>
            <Ionicons name={agreeTerms ? "checkbox" : "square-outline"} size={22} color={agreeTerms ? Colors.primary : "#ccc"} />
            <Text style={styles.checkboxText}>Đã đọc và đồng ý với <Text style={styles.linkBold}>Điều Khoản Dịch Vụ Của Forums</Text></Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.checkboxRow} onPress={() => setAgreePrivacy(!agreePrivacy)}>
            <Ionicons name={agreePrivacy ? "checkbox" : "square-outline"} size={22} color={agreePrivacy ? Colors.primary : "#ccc"} />
            <Text style={styles.checkboxText}>Đồng ý cho phép thu thập và sử dụng thông tin theo <Text style={styles.linkBold}>Chính Sách Bảo Mật</Text></Text>
          </TouchableOpacity>

          {/* Nút Đăng Nhập Chính */}
          <TouchableOpacity 
            style={[
              styles.btnPrimary, 
              (!email || !password || !agreeTerms || !agreePrivacy) && { backgroundColor: '#E0E0E0' }
            ]}
            onPress={onSignInPress}
            disabled={isLoading}
          >
            {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnPrimaryText}>Đăng Nhập</Text>}
          </TouchableOpacity>

          {/* Links: Quên mật khẩu & Đăng ký (ĐÃ GẮN ROUTER) */}
          <View style={styles.footerLinks}>
            <TouchableOpacity>
              <Text style={styles.linkGreen}>Quên mật khẩu</Text>
            </TouchableOpacity>
            
            <TouchableOpacity onPress={() => router.push('/(public)/register' as any)}>
  <Text style={styles.linkGreen}>Đăng Ký Ngay</Text>
</TouchableOpacity>
          </View>

          {/* Login Social */}
          <View style={styles.dividerRow}>
            <View style={styles.line} /><Text style={styles.dividerText}>Đăng nhập bằng phương thức khác</Text><View style={styles.line} />
          </View>

          <View style={styles.socialRow}>
            {/* Nút Google */}
            <TouchableOpacity style={styles.socialBtn} onPress={() => handleSocialLogin('google')}>
               <Image 
                 source={require('@/assets/images/google_icon.png')} 
                 style={styles.socialIconImage} 
                 resizeMode="contain" 
               />
            </TouchableOpacity>
            
            {/* Nút Facebook */}
            <TouchableOpacity style={styles.socialBtn} onPress={() => handleSocialLogin('facebook')}>
               <Image 
                 source={require('@/assets/images/facebook_icon.png')} 
                 style={styles.socialIconImage} 
                 resizeMode="contain" 
               />
            </TouchableOpacity>
          </View>

        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary, // Đã đồng bộ màu
  },
  header: {
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoCircle: {
    width: 100,
    height: 100,
    backgroundColor: '#fff',
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden', // Giữ cho logo không tràn ra ngoài viền tròn
  },
  logoImage: {
    width: 65,
    height: 65,
  },
  formCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopLeftRadius: 35,
    borderTopRightRadius: 35,
    paddingHorizontal: 25,
    paddingTop: 30,
  },
  inputWrapper: {
    marginBottom: 20,
  },
  inputLabel: {
    color: '#999',
    fontSize: 13,
    marginBottom: 5,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F0F0F0',
    borderRadius: 12,
    paddingHorizontal: 15,
    height: 55,
    backgroundColor: '#FAFAFA',
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  checkboxText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
    flex: 1,
  },
  linkBold: {
    color: Colors.primary,
    fontWeight: '600',
  },
  btnPrimary: {
    backgroundColor: Colors.primary,
    height: 55,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  btnPrimaryText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  footerLinks: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  linkGreen: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: 'bold', // In đậm lên cho dễ bấm
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: '#F0F0F0',
  },
  dividerText: {
    color: '#CCC',
    fontSize: 12,
    marginHorizontal: 10,
  },
  socialRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 25,
  },
  socialBtn: {
    width: 55,
    height: 55,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAFAFA', // Thêm màu nền xám nhẹ để nổi icon
  },
  socialIconImage: {
    width: 28,
    height: 28,
  }
});

export default LoginScreen;