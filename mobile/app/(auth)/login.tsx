import { Link } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../src/context/AuthContext';

export default function LoginScreen() {
  const { signIn, signInWithDemoAccount } = useAuth();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    setError(null);
    setIsSubmitting(true);

    try {
      await signIn(email, password);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Could not sign in');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDemoSignIn() {
    setError(null);
    setIsSubmitting(true);

    try {
      await signInWithDemoAccount();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Could not open demo account');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.select({ ios: 'padding', default: undefined })}
      className="flex-1 bg-white"
    >
      <View
        className="flex-1 justify-center px-6"
        style={{
          paddingTop: insets.top + 24,
          paddingBottom: insets.bottom + 24,
        }}
      >
        <Text className="text-sm font-semibold uppercase tracking-[2px] text-green-700">TailTimes</Text>
        <Text className="mt-3 text-4xl font-bold text-gray-900">Welcome back</Text>
        <Text className="mt-3 text-base leading-6 text-gray-600">
          Sign in to manage your boarding sessions and keep owners updated.
        </Text>

        <View className="mt-10 gap-4">
          <TextInput
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            className="rounded-2xl border border-gray-200 px-4 py-4 text-base"
          />
          <TextInput
            autoCapitalize="none"
            autoComplete="password"
            placeholder="Password"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            className="rounded-2xl border border-gray-200 px-4 py-4 text-base"
          />
        </View>

        {error ? <Text className="mt-4 text-sm text-red-600">{error}</Text> : null}

        <Pressable
          disabled={isSubmitting}
          onPress={handleSubmit}
          className="mt-6 flex-row items-center justify-center rounded-2xl bg-green-600 px-4 py-4"
        >
          {isSubmitting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text className="text-base font-semibold text-white">Sign in</Text>
          )}
        </Pressable>

        {__DEV__ ? (
          <Pressable
            disabled={isSubmitting}
            onPress={handleDemoSignIn}
            className="mt-3 flex-row items-center justify-center rounded-2xl border border-green-200 px-4 py-4"
          >
            <Text className="text-base font-semibold text-green-700">Use demo account</Text>
          </Pressable>
        ) : null}

        <Text className="mt-6 text-center text-sm text-gray-600">
          New here?{' '}
          <Link href="/(auth)/signup" className="font-semibold text-green-700">
            Create an account
          </Link>
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}
