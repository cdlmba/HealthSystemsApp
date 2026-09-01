import { useState, useEffect } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth, logout } from '../firebase';
import { logger } from '../logger';

// If the user has isMock property, we can define a MockUser interface
export interface MockUser {
  uid: string;
  isMock: boolean;
  displayName?: string;
  email?: string;
}

export type AppUser = FirebaseUser | MockUser | null;

export function useAuth() {
  const [user, setUser] = useState<AppUser>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (currentUser) => {
        setUser(currentUser);
        setLoading(false);
      },
      (error) => {
        logger.error('Auth state error:', error);
        setLoading(false);
      }
    );

    // Fallback: If Firebase takes longer than 5 seconds, drop loading state
    const timeoutId = setTimeout(() => {
      if (loading) {
        logger.warn('Firebase auth state timed out after 5 seconds');
        setLoading(false);
      }
    }, 5000);

    return () => {
      unsubscribe();
      clearTimeout(timeoutId);
    };
  }, [loading]);

  const handleLogout = async () => {
    try {
      localStorage.removeItem('dean_tracker_mock_user');
      setUser(null);
      await logout();
      logger.info('User logged out successfully');
    } catch (error) {
      logger.error('Logout failed:', error);
    }
  };

  return { user, loading, handleLogout };
}
