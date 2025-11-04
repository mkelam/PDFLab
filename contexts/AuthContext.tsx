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
  login: (credentials: LoginCredentials) => Promise<{ user: User }>;
  logout: () => Promise<void>;
  signup: (credentials: SignupCredentials) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('authToken');
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
          } else {
            // Token invalid, clear it
            localStorage.removeItem('authToken');
          }
        } catch (error) {
          console.error('Auth check failed:', error);
          localStorage.removeItem('authToken');
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

      // Store access token (Python backend returns access_token, not token)
      const token = data.access_token || data.token;
      localStorage.setItem('authToken', token);

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
      if (token) {
        localStorage.setItem('authToken', token);

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
    <AuthContext.Provider value={{ user, isLoading, login, logout, signup }}>
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
