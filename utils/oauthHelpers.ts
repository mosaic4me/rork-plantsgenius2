import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as AppleAuthentication from 'expo-apple-authentication';
import { Platform } from 'react-native';
import * as Crypto from 'expo-crypto';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
const GOOGLE_ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;

export interface OAuthUser {
  id: string;
  email: string;
  fullName: string;
  provider: 'google' | 'apple';
  idToken?: string;
}

export function isGoogleOAuthConfigured(): boolean {
  let clientId = GOOGLE_WEB_CLIENT_ID;
  if (Platform.OS === 'ios') {
    clientId = GOOGLE_IOS_CLIENT_ID;
  } else if (Platform.OS === 'android') {
    clientId = GOOGLE_ANDROID_CLIENT_ID;
  }
  return !!(clientId && !clientId.includes('your_google'));
}

export async function signInWithGoogle(): Promise<OAuthUser | null> {
  try {
    if (!isGoogleOAuthConfigured()) {
      throw new Error('Google Sign-In is not configured yet. Please use email/password authentication or Guest Mode.');
    }

    const redirectUri = AuthSession.makeRedirectUri({
      scheme: 'plantsgenius',
    });

    console.log('[Google OAuth] Redirect URI:', redirectUri);

    let clientId = GOOGLE_WEB_CLIENT_ID || '';
    if (Platform.OS === 'ios') {
      clientId = GOOGLE_IOS_CLIENT_ID || '';
    } else if (Platform.OS === 'android') {
      clientId = GOOGLE_ANDROID_CLIENT_ID || '';
    }

    console.log('[Google OAuth] Platform:', Platform.OS);
    console.log('[Google OAuth] Client ID available:', !!clientId);

    const discovery = {
      authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenEndpoint: 'https://oauth2.googleapis.com/token',
      revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
    };

    const request = new AuthSession.AuthRequest({
      clientId,
      redirectUri,
      scopes: ['openid', 'profile', 'email'],
      responseType: AuthSession.ResponseType.Token,
    });

    const result = await request.promptAsync(discovery);

    if (result.type === 'success') {
      const { access_token } = result.params;
      
      const userInfoResponse = await fetch(
        'https://www.googleapis.com/oauth2/v2/userinfo',
        {
          headers: { Authorization: `Bearer ${access_token}` },
        }
      );

      const userInfo = await userInfoResponse.json();

      console.log('[Google OAuth] User info:', userInfo);

      return {
        id: userInfo.id,
        email: userInfo.email,
        fullName: userInfo.name || userInfo.email.split('@')[0],
        provider: 'google',
        idToken: access_token,
      };
    }

    console.log('[Google OAuth] Auth cancelled or failed:', result.type);
    return null;
  } catch (error: any) {
    console.error('[Google OAuth] Error:', error);
    if (error.message && error.message.includes('not configured')) {
      throw error;
    }
    throw new Error('Failed to sign in with Google. Please try again.');
  }
}

export async function signInWithApple(): Promise<OAuthUser | null> {
  try {
    if (Platform.OS !== 'ios') {
      throw new Error('Apple Sign In is only available on iOS');
    }

    const isAvailable = await AppleAuthentication.isAvailableAsync();
    if (!isAvailable) {
      throw new Error('Apple Sign In is not available on this device');
    }

    const nonce = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      Math.random().toString()
    );

    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce,
    });

    console.log('[Apple OAuth] Credential:', credential);

    const fullName = credential.fullName
      ? `${credential.fullName.givenName || ''} ${credential.fullName.familyName || ''}`.trim()
      : credential.email?.split('@')[0] || 'User';

    return {
      id: credential.user,
      email: credential.email || '',
      fullName,
      provider: 'apple',
      idToken: credential.identityToken || undefined,
    };
  } catch (error: any) {
    if (error.code === 'ERR_CANCELED') {
      console.log('[Apple OAuth] User cancelled');
      return null;
    }
    console.error('[Apple OAuth] Error:', error);
    throw new Error('Failed to sign in with Apple. Please try again.');
  }
}
