import { Redirect, Slot } from 'expo-router';
import AppLoadingScreen from '../../src/components/AppLoadingScreen';
import { useAuth } from '../../src/context/AuthContext';

export default function TabLayout() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <AppLoadingScreen label="Preparing your workspace..." />;
  }

  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  return <Slot />;
}
