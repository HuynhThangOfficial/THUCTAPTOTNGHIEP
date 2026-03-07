import { Colors } from '@/constants/Colors';
import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useOAuth } from '@clerk/clerk-expo';
import { UserFeedback } from '@sentry/react-native';
import * as Sentry from '@sentry/react-native';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

// Xóa các session web đang bị kẹt
WebBrowser.maybeCompleteAuthSession();

const LoginScreen = () => {
  const { startOAuthFlow: facebookAuth } = useOAuth({ strategy: 'oauth_facebook' });
  const { startOAuthFlow: googleAuth } = useOAuth({ strategy: 'oauth_google' });

  // Tạo State khóa nút
  const [isLoading, setIsLoading] = useState(false);

  const handleFacebookLogin = async () => {
    if (isLoading) return; // Nếu đang chạy thì ngưng
    setIsLoading(true);    // Khóa các nút lại

    try {
      const { createdSessionId, setActive } = await facebookAuth({
        redirectUrl: Linking.createURL('/(auth)/(tabs)/feed', {scheme: 'myapp' }) 
      });

      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
      }
    } catch (err) {
      console.error('Lỗi đăng nhập Facebook:', err);
    } finally {
      setIsLoading(false); // Xử lý xong mở khóa ra
    }
  };

  const handleGoogleLogin = async () => {
    if (isLoading) return; 
    setIsLoading(true);

    try {
      const { createdSessionId, setActive } = await googleAuth({
        redirectUrl: Linking.createURL('/(auth)/(tabs)/feed', {scheme: 'myapp' }) 
      });

      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
      }
    } catch (err) {
      console.error('Lỗi đăng nhập Google:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const triggerError = () => {
    try {
      throw new Error('This is a test error');
    } catch (error) {
      const sentryId = Sentry.captureMessage('Houston, we have a problem');

      const userFeedback: UserFeedback = {
        event_id: sentryId,
        name: 'Simon Grimm',
        email: 'simon@galaxies.dev',
        comments: 'Enrich the error message with more information',
      };

      Sentry.captureUserFeedback(userFeedback);
    }
  };

  return (
    <View style={styles.container}>
      <Image source={require('@/assets/images/login.png')} style={styles.loginImage} />
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Chọn phương thức đăng nhập để vào KonKet</Text>

        <View style={styles.buttonContainer}>
          
          {/* NÚT FACEBOOK */}
          <TouchableOpacity 
            style={[styles.loginButton, isLoading && { opacity: 0.6 }]} 
            onPress={handleFacebookLogin}
            disabled={isLoading}
          >
            <View style={styles.loginButtonContent}>
              <Image source={require('@/assets/images/facebook_icon.png')} style={styles.loginButtonImage} />
              
              <Text style={styles.loginButtonText}>Tiếp tục với Facebook</Text>
              
              {isLoading ? (
                 <ActivityIndicator color={Colors.border} />
              ) : (
                 <Ionicons name="chevron-forward" size={24} color={Colors.border} />
              )}
            </View>
          </TouchableOpacity>

          {/* NÚT GOOGLE */}
          <TouchableOpacity 
            style={[styles.loginButton, isLoading && { opacity: 0.6 }]} 
            onPress={handleGoogleLogin}
            disabled={isLoading}
          >
            <View style={styles.loginButtonContent}>
              <Image source={require('@/assets/images/google_icon.png')} style={styles.loginButtonImage} />
              
              <Text style={styles.loginButtonText}>Tiếp tục với Google</Text>
              
              {isLoading ? (
                 <ActivityIndicator color={Colors.border} />
              ) : (
                 <Ionicons name="chevron-forward" size={24} color={Colors.border} />
              )}
            </View>
          </TouchableOpacity>

          {/* NÚT KHÁCH (Giữ nguyên giao diện) */}
          <TouchableOpacity 
            style={[styles.loginButton, isLoading && { opacity: 0.6 }]}
            disabled={isLoading}
          >
            <View style={styles.loginButtonContent}>
              <Text style={[styles.loginButtonText, { marginLeft: 10 }]}>Tiếp tục với tư cách khách</Text>
              <Ionicons name="chevron-forward" size={24} color={Colors.border} />
            </View>
            <Text style={styles.loginButtonSubtitle}>
              Bạn có thể vào KonKet mà không cần hồ sơ, nhưng sẽ không thể đăng bài, 
              tương tác hoặc nhận các đề xuất cá nhân hóa.
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={triggerError} disabled={isLoading}>
            <Text style={styles.switchAccountButtonText}>Đổi tài khoản</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    gap: 20,
    backgroundColor: Colors.background,
  },
  loginImage: {
    width: '100%',
    height: 350,
    resizeMode: 'cover',
  },
  title: {
    fontSize: 17,
    fontFamily: 'DMSans_500Medium',
  },
  buttonContainer: {
    gap: 20,
    marginHorizontal: 20,
  },
  loginButton: {
    backgroundColor: '#fff',
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  loginButtonText: {
    color: '#000',
    fontSize: 15,
    fontFamily: 'DMSans_500Medium',
    flex: 1,
  },
  loginButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  loginButtonImage: {
    width: 50,
    height: 50,
  },
  loginButtonSubtitle: {
    fontSize: 12,
    fontFamily: 'DMSans_400Regular',
    color: '#acacac',
    marginTop: 5,
  },
  switchAccountButtonText: {
    fontSize: 14,
    color: Colors.border,
    alignSelf: 'center',
  },
});

export default LoginScreen;