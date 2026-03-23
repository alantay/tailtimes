import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useState } from 'react';
import { useAuth } from '../../src/context/AuthContext';

export default function ProfileScreen() {
  const { signOut, sitterProfile } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSignOut() {
    setIsSubmitting(true);

    try {
      await signOut();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <View className="flex-1 bg-white px-6 py-12">
      <Text className="text-3xl font-bold text-gray-900">Profile</Text>
      <Text className="mt-2 text-base text-gray-600">
        Your sitter identity is live. Editing the full profile comes next.
      </Text>

      <View className="mt-8 rounded-3xl border border-gray-200 bg-gray-50 p-5">
        <Text className="text-sm font-semibold uppercase tracking-[2px] text-green-700">Sitter</Text>
        <Text className="mt-3 text-2xl font-bold text-gray-900">{sitterProfile?.name ?? 'Unknown'}</Text>
        <Text className="mt-2 text-base text-gray-600">{sitterProfile?.email ?? 'No email available'}</Text>
        <Text className="mt-4 text-sm text-gray-500">
          Bio, location, and portfolio controls will plug into these backend routes next.
        </Text>
      </View>

      <Pressable
        disabled={isSubmitting}
        onPress={handleSignOut}
        className="mt-8 flex-row items-center justify-center rounded-2xl border border-gray-300 px-4 py-4"
      >
        {isSubmitting ? (
          <ActivityIndicator color="#111827" />
        ) : (
          <Text className="text-base font-semibold text-gray-900">Sign out</Text>
        )}
      </Pressable>
    </View>
  );
}
