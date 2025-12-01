'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3006';

interface User {
  id: string;
  email: string;
  name?: string;
  role?: string;
  plan: string;
  conversions_used: number;
  conversions_limit: number;
  created_at: string;
  is_beta_user?: boolean;
  beta_expires_at?: string;
  onboarding_completed?: boolean;
  onboarding_completed_at?: string;
  onboarding_skipped?: boolean;
  subscription_status?: 'active' | 'canceled' | 'expired' | 'none';
  subscription_end_date?: string;
}

interface LoginCredentials {
  email: string;
  password: string;
}

interface SignupCredentials extends LoginCredentials {
  name?: string;
  firstName?: string;
  lastName?: string;
  confirmPassword?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<{ user: User }>;
  logout: () => Promise<void>;
  signup: (credentials: SignupCredentials) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isAuthenticated = !!user;

  // Check for existing session on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('authToken');
      const refreshToken = localStorage.getItem('refreshToken');

      if (token) {
        try {
          // Verify token and get user data
          const response = await fetch(`${API_URL}/api/auth/profile`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          if (response.ok) {
            const data = await response.json();
            // Python backend returns user data directly, not wrapped in data.user
            setUser(data);
          } else if (response.status === 401 && refreshToken) {
            // Token expired, try to refresh
            console.log('⚠️ Access token expired, attempting refresh...');
            try {
              const refreshResponse = await fetch(`${API_URL}/api/auth/refresh`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ refresh_token: refreshToken })
              });

              if (refreshResponse.ok) {
                const refreshData = await refreshResponse.json();
                // Store new tokens
                localStorage.setItem('authToken', refreshData.token);
                localStorage.setItem('refreshToken', refreshData.refresh_token);

                // Fetch profile with new token
                const newProfileResponse = await fetch(`${API_URL}/api/auth/profile`, {
                  headers: {
                    'Authorization': `Bearer ${refreshData.token}`
                  }
                });

                if (newProfileResponse.ok) {
                  const profileData = await newProfileResponse.json();
                  setUser(profileData);
                  console.log('✅ Session restored with refreshed token');
                }
              } else {
                // Refresh failed, clear tokens
                localStorage.removeItem('authToken');
                localStorage.removeItem('refreshToken');
              }
            } catch (refreshError) {
              console.error('Token refresh failed:', refreshError);
              localStorage.removeItem('authToken');
              localStorage.removeItem('refreshToken');
            }
          } else {
            // Token invalid, clear it
            localStorage.removeItem('authToken');
            localStorage.removeItem('refreshToken');
          }
        } catch (error) {
          console.error('Auth check failed:', error);
          localStorage.removeItem('authToken');
          localStorage.removeItem('refreshToken');
        }
      }
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (credentials: LoginCredentials) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || data.error || data.message || 'Login failed');
      }

      // Store access token and refresh token
      const token = data.access_token || data.token;
      const refreshToken = data.refresh_token;
      localStorage.setItem('authToken', token);
      if (refreshToken) {
        localStorage.setItem('refreshToken', refreshToken);
      }

      // Fetch user profile after successful login
      const profileResponse = await fetch(`${API_URL}/api/auth/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (profileResponse.ok) {
        const profileData = await profileResponse.json();
        setUser(profileData);
        return { user: profileData };
      }

      throw new Error('Failed to fetch user profile');
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    setUser(null);
  };

  const signup = async (credentials: SignupCredentials) => {
    setIsLoading(true);
    try {
      // Combine firstName and lastName into name for backend
      const name = credentials.firstName && credentials.lastName
        ? `${credentials.firstName} ${credentials.lastName}`
        : credentials.name || credentials.email.split('@')[0];

      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: credentials.email,
          password: credentials.password,
          name: name
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || data.error || data.message || 'Signup failed');
      }

      // Auto-login after successful signup
      // Backend returns token and user data
      const token = data.token || data.access_token;
      const refreshToken = data.refresh_token;
      if (token) {
        localStorage.setItem('authToken', token);
        if (refreshToken) {
          localStorage.setItem('refreshToken', refreshToken);
        }

        // Set user data from signup response
        if (data.user) {
          setUser(data.user);
        }
      }
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, isAuthenticated, login, logout, signup }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Hook to redirect authenticated users away from guest-only pages (login, signup)
export function useGuestOnly() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user) {
      // Redirect admin users to admin panel, regular users to dashboard
      if (user.role && ['support', 'finance', 'admin', 'super_admin'].includes(user.role)) {
        router.push('/admin');
      } else {
        router.push('/dashboard');
      }
    }
  }, [user, isLoading, router]);
}

// Hook to require authentication and redirect if not authenticated
export function useRequireAuth() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  return { user, isLoading };
}
