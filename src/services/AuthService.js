import AsyncStorage from '@react-native-async-storage/async-storage';

// ============================================
// WORDPRESS API CONFIGURATION
// ============================================
// Change this to your WordPress site URL
const WP_BASE_URL = 'https://menorahedu.in';
const API_NAMESPACE = 'wp-json/menorah/v1';

const API_ENDPOINTS = {
  GOOGLE_LOGIN: `${WP_BASE_URL}/${API_NAMESPACE}/auth/google`,
  GUEST_LOGIN: `${WP_BASE_URL}/${API_NAMESPACE}/auth/guest`,
  REFRESH_TOKEN: `${WP_BASE_URL}/${API_NAMESPACE}/auth/refresh`,
  USER_PROFILE: `${WP_BASE_URL}/${API_NAMESPACE}/user/profile`,
  LOGOUT: `${WP_BASE_URL}/${API_NAMESPACE}/auth/logout`,
  VERIFY_GOOGLE: `${WP_BASE_URL}/${API_NAMESPACE}/auth/google/verify`,
};

// ============================================
// TOKEN STORAGE KEYS
// ============================================
const STORAGE_KEYS = {
  ACCESS_TOKEN: 'menorah_access_token',
  REFRESH_TOKEN: 'menorah_refresh_token',
  USER_DATA: 'menorah_user_data',
  TOKEN_EXPIRES: 'menorah_token_expires',
};

// ============================================
// API SERVICE CLASS
// ============================================
class AuthService {

  /**
   * Store authentication tokens
   */
  static async storeAuthData(tokens, userData) {
    try {
      await AsyncStorage.multiSet([
        [STORAGE_KEYS.ACCESS_TOKEN, tokens.access_token],
        [STORAGE_KEYS.REFRESH_TOKEN, tokens.refresh_token],
        [STORAGE_KEYS.TOKEN_EXPIRES, tokens.expires_at.toString()],
        [STORAGE_KEYS.USER_DATA, JSON.stringify(userData)],
      ]);
      return true;
    } catch (error) {
      console.error('Error storing auth data:', error);
      return false;
    }
  }

  /**
   * Get stored access token
   */
  static async getAccessToken() {
    try {
      return await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    } catch (error) {
      console.error('Error getting access token:', error);
      return null;
    }
  }

  /**
   * Get stored refresh token
   */
  static async getRefreshToken() {
    try {
      return await AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
    } catch (error) {
      console.error('Error getting refresh token:', error);
      return null;
    }
  }

  /**
   * Get stored user data
   */
  static async getUserData() {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error getting user data:', error);
      return null;
    }
  }

  /**
   * Check if token is expired
   */
  static async isTokenExpired() {
    try {
      const expiresAt = await AsyncStorage.getItem(STORAGE_KEYS.TOKEN_EXPIRES);
      if (!expiresAt) return true;
      return Date.now() >= (parseInt(expiresAt) * 1000);
    } catch (error) {
      return true;
    }
  }

  /**
   * Clear all auth data (logout)
   */
  static async clearAuthData() {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.ACCESS_TOKEN,
        STORAGE_KEYS.REFRESH_TOKEN,
        STORAGE_KEYS.TOKEN_EXPIRES,
        STORAGE_KEYS.USER_DATA,
      ]);
      return true;
    } catch (error) {
      console.error('Error clearing auth data:', error);
      return false;
    }
  }

  /**
   * Make authenticated API request
   */
  static async authenticatedRequest(url, options = {}) {
    let token = await this.getAccessToken();

    // Check if token is expired and refresh if needed
    if (await this.isTokenExpired()) {
      const refreshed = await this.refreshAccessToken();
      if (!refreshed) {
        throw new Error('Session expired. Please login again.');
      }
      token = await this.getAccessToken();
    }

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      // Token invalid, try to refresh once
      const refreshed = await this.refreshAccessToken();
      if (refreshed) {
        token = await this.getAccessToken();
        return fetch(url, {
          ...options,
          headers: {
            ...headers,
            'Authorization': `Bearer ${token}`,
          },
        });
      }
      throw new Error('Session expired. Please login again.');
    }

    return response;
  }

  // ============================================
  // AUTHENTICATION METHODS
  // ============================================

  /**
   * Google Login - Send ID token to WordPress API
   * @param {string} idToken - Google ID token from react-native-google-signin
   */
  static async loginWithGoogle(idToken) {
    try {
      const response = await fetch(API_ENDPOINTS.GOOGLE_LOGIN, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id_token: idToken,
          device_info: 'React Native App',
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Google login failed');
      }

      // Store auth data
      await this.storeAuthData(result.data.tokens, result.data.user);

      return {
        success: true,
        user: result.data.user,
        tokens: result.data.tokens,
      };
    } catch (error) {
      console.error('Google login error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Guest Login - Continue without account
   * @param {string} deviceId - Unique device identifier
   */
  static async loginAsGuest(deviceId) {
    try {
      const response = await fetch(API_ENDPOINTS.GUEST_LOGIN, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          device_id: deviceId,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Guest login failed');
      }

      // Store auth data (guest tokens are shorter-lived)
      await this.storeAuthData(result.data.tokens, result.data.user);

      return {
        success: true,
        user: result.data.user,
        tokens: result.data.tokens,
        isGuest: true,
      };
    } catch (error) {
      console.error('Guest login error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Refresh Access Token using Refresh Token
   */
  static async refreshAccessToken() {
    try {
      const refreshToken = await this.getRefreshToken();

      if (!refreshToken) {
        return false;
      }

      const response = await fetch(API_ENDPOINTS.REFRESH_TOKEN, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refresh_token: refreshToken,
        }),
      });

      if (!response.ok) {
        await this.clearAuthData();
        return false;
      }

      const result = await response.json();

      // Update stored tokens
      const userData = await this.getUserData();
      await this.storeAuthData(result.data, userData);

      return true;
    } catch (error) {
      console.error('Token refresh error:', error);
      return false;
    }
  }

  /**
   * Get User Profile (Authenticated)
   */
  static async getUserProfile() {
    try {
      const response = await this.authenticatedRequest(API_ENDPOINTS.USER_PROFILE, {
        method: 'GET',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to get profile');
      }

      // Update stored user data
      await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(result.data));

      return {
        success: true,
        profile: result.data,
      };
    } catch (error) {
      console.error('Get profile error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Update User Profile (Authenticated)
   */
  static async updateUserProfile(profileData) {
    try {
      const response = await this.authenticatedRequest(API_ENDPOINTS.USER_PROFILE, {
        method: 'PUT',
        body: JSON.stringify(profileData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to update profile');
      }

      // Update stored user data
      await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(result.data));

      return {
        success: true,
        profile: result.data,
      };
    } catch (error) {
      console.error('Update profile error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Logout - Revoke token and clear storage
   */
  static async logout() {
    try {
      // Try to revoke token on server
      await this.authenticatedRequest(API_ENDPOINTS.LOGOUT, {
        method: 'POST',
      }).catch(() => {}); // Ignore errors

      // Clear local storage
      await this.clearAuthData();

      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Verify Google Token (Debug)
   */
  static async verifyGoogleToken(idToken) {
    try {
      const response = await fetch(API_ENDPOINTS.VERIFY_GOOGLE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id_token: idToken,
        }),
      });

      return await response.json();
    } catch (error) {
      console.error('Verify token error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Check if user is authenticated
   */
  static async isAuthenticated() {
    const token = await this.getAccessToken();
    if (!token) return false;

    const expired = await this.isTokenExpired();
    if (!expired) return true;

    // Try to refresh
    return await this.refreshAccessToken();
  }

  /**
   * Check if user is guest
   */
  static async isGuest() {
    const userData = await this.getUserData();
    return userData && userData.role === 'guest';
  }
}

export default AuthService;
export { STORAGE_KEYS, API_ENDPOINTS, WP_BASE_URL };
