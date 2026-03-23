import { ActivityIndicator, Text, View } from 'react-native';

export default function AppLoadingScreen({ label = 'Loading TailTimes...' }: { label?: string }) {
  return (
    <View className="flex-1 items-center justify-center bg-white px-8">
      <ActivityIndicator size="large" color="#16a34a" />
      <Text className="mt-4 text-base text-gray-600">{label}</Text>
    </View>
  );
}
