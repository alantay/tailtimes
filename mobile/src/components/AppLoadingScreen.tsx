import { ActivityIndicator, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function AppLoadingScreen({ label = 'Loading TailTimes...' }: { label?: string }) {
  const insets = useSafeAreaInsets();

  return (
    <View
      className="flex-1 items-center justify-center bg-white px-8"
      style={{
        paddingTop: insets.top + 24,
        paddingBottom: insets.bottom + 24,
      }}
    >
      <ActivityIndicator size="large" color="#16a34a" />
      <Text className="mt-4 text-base text-gray-600">{label}</Text>
    </View>
  );
}
