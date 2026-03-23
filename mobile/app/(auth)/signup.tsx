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
import { useAuth } from '../../src/context/AuthContext';

export default function SignupScreen() {
  const { signUp } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    setError(null);
    setIsSubmitting(true);

    try {
      await signUp(name, email, password);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Could not create account');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.select({ ios: 'padding', default: undefined })}
      className="flex-1 bg-white"
    >
      <View className="flex-1 justify-center px-6">
        <Text className="text-sm font-semibold uppercase tracking-[2px] text-green-700">TailTimes</Text>
        <Text className="mt-3 text-4xl font-bold text-gray-900">Create your sitter account</Text>
        <Text className="mt-3 text-base leading-6 text-gray-600">
          Set up your profile once and start sharing structured updates instead of chat spam.
        </Text>

        <View className="mt-10 gap-4">
          <TextInput
            autoCapitalize="words"
            autoComplete="name"
            placeholder="Your name"
            value={name}
            onChangeText={setName}
            className="rounded-2xl border border-gray-200 px-4 py-4 text-base"
          />
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
            autoComplete="new-password"
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
            <Text className="text-base font-semibold text-white">Create account</Text>
          )}
        </Pressable>

        <Text className="mt-6 text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link href="/(auth)/login" className="font-semibold text-green-700">
            Sign in
          </Link>
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}
