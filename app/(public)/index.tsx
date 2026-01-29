import { Colors } from '@/constants/Colors';
import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useOAuth } from '@clerk/clerk-expo';
import { UserFeedback } from '@sentry/react-native';
import * as Sentry from '@sentry/react-native';
import * as Linking from 'expo-linking';

const LoginScreen = () => {
  const { startOAuthFlow } = useOAuth({ strategy: 'oauth_facebook' });
  const { startOAuthFlow: googleAuth } = useOAuth({ strategy: 'oauth_google' });

  const handleFacebookLogin = async () => {
    try {
      const { createdSessionId, setActive } = await startOAuthFlow({
      redirectUrl: Linking.createURL('/(auth)/(tabs)/feed', {scheme: 'myapp' }) //ok
      });

      if (createdSessionId) {
        setActive!({ session: createdSessionId });
      }
    } catch (err) {
      console.error('OAuth error', err);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const { createdSessionId, setActive } = await googleAuth({
            redirectUrl: Linking.createURL('/(auth)/(tabs)/feed', {scheme: 'myapp' }) //ok
      });

      if (createdSessionId) {
        setActive!({ session: createdSessionId });
      }
    } catch (err) {
      console.error('OAuth error', err);
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
          <TouchableOpacity style={styles.loginButton} onPress={handleFacebookLogin}>
            <View style={styles.loginButtonContent}>
              <Image
                source={require('@/assets/images/facebook_icon.png')}
                style={styles.loginButtonImage}
              />
              <Text style={styles.loginButtonText}>Tiếp tục với Facebook</Text>
              <Ionicons name="chevron-forward" size={24} color={Colors.border} />
            </View>
          </TouchableOpacity>

          {/* For tetstingh with a different account */}
          <TouchableOpacity style={styles.loginButton} onPress={handleGoogleLogin}>
            <View style={styles.loginButtonContent}>
              <Image
                source={require('@/assets/images/google_icon.png')}
                style={styles.loginButtonImage}
              />
              <Text style={styles.loginButtonText}>Tiếp tục với Google</Text>
              <Ionicons name="chevron-forward" size={24} color={Colors.border} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.loginButton}>
            <View style={styles.loginButtonContent}>
              <Text style={styles.loginButtonText}>Tiếp tục với tư cách khách</Text>
              <Ionicons name="chevron-forward" size={24} color={Colors.border} />
            </View>
            <Text style={styles.loginButtonSubtitle}>
              Bạn có thể vào KonKet mà không cần hồ sơ, nhưng sẽ không thể đăng bài, 
            tương tác hoặc nhận các đề xuất cá nhân hóa.
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={triggerError}>
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
