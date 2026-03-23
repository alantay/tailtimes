import { Redirect, Slot } from 'expo-router';
import AppLoadingScreen from '../../src/components/AppLoadingScreen';
import { useAuth } from '../../src/context/AuthContext';

export default function AuthLayout() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <AppLoadingScreen label="Checking your session..." />;
  }

  if (user) {
    return <Redirect href="/(tabs)" />;
  }

  return <Slot />;
}
