import { User } from 'firebase/auth';
import { createContext, useContext, useEffect, useState } from 'react';
import { SitterProfile } from '../types/api';
import { apiGet, apiPost } from '../services/api';
import {
  signInWithEmail,
  signOut as signOutUser,
  signUpWithEmail,
  subscribeToAuthChanges,
} from '../services/auth';

interface AuthContextValue {
  user: User | null;
  sitterProfile: SitterProfile | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signInWithDemoAccount: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshSitterProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function getDefaultSitterName(user: User) {
  if (user.displayName?.trim()) {
    return user.displayName.trim();
  }

  if (user.email) {
    return user.email.split('@')[0];
  }

  return 'TailTimes Sitter';
}

async function ensureSitterProfile(user: User) {
  if (!user.email) {
    throw new Error('Authenticated user does not have an email address');
  }

  return apiPost<SitterProfile>('/api/sitters', {
    name: getDefaultSitterName(user),
    email: user.email,
  });
}

const DEMO_ACCOUNT = {
  name: 'Demo Sitter',
  email: 'demo.sitter@tailtimes.app',
  password: 'TailTimesDemo123!',
} as const;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [sitterProfile, setSitterProfile] = useState<SitterProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function refreshSitterProfile() {
    const profile = await apiGet<SitterProfile>('/api/sitters/me');
    setSitterProfile(profile);
  }

  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges(async (nextUser) => {
      setUser(nextUser);

      if (!nextUser) {
        setSitterProfile(null);
        setIsLoading(false);
        return;
      }

      try {
        const profile = await ensureSitterProfile(nextUser);
        setSitterProfile(profile);
      } catch (error) {
        console.error('Failed to sync sitter profile', error);
        setSitterProfile(null);
      } finally {
        setIsLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const value: AuthContextValue = {
    user,
    sitterProfile,
    isLoading,
    async signIn(email, password) {
      setIsLoading(true);

      try {
        const credentials = await signInWithEmail(email, password);
        const profile = await ensureSitterProfile(credentials.user);
        setUser(credentials.user);
        setSitterProfile(profile);
      } finally {
        setIsLoading(false);
      }
    },
    async signUp(name, email, password) {
      setIsLoading(true);

      try {
        const credentials = await signUpWithEmail(email, password, name);
        const profile = await ensureSitterProfile(credentials.user);
        setUser(credentials.user);
        setSitterProfile(profile);
      } finally {
        setIsLoading(false);
      }
    },
    async signInWithDemoAccount() {
      setIsLoading(true);

      try {
        try {
          const credentials = await signInWithEmail(DEMO_ACCOUNT.email, DEMO_ACCOUNT.password);
          const profile = await ensureSitterProfile(credentials.user);
          setUser(credentials.user);
          setSitterProfile(profile);
          return;
        } catch (signInError) {
          const message = signInError instanceof Error ? signInError.message : '';

          if (
            message &&
            !message.includes('user-not-found') &&
            !message.includes('invalid-credential') &&
            !message.includes('invalid-login-credentials')
          ) {
            throw signInError;
          }
        }

        const credentials = await signUpWithEmail(
          DEMO_ACCOUNT.email,
          DEMO_ACCOUNT.password,
          DEMO_ACCOUNT.name
        );
        const profile = await ensureSitterProfile(credentials.user);
        setUser(credentials.user);
        setSitterProfile(profile);
      } finally {
        setIsLoading(false);
      }
    },
    async signOut() {
      setIsLoading(true);

      try {
        await signOutUser();
        setUser(null);
        setSitterProfile(null);
      } finally {
        setIsLoading(false);
      }
    },
    refreshSitterProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
