import { Ionicons } from '@expo/vector-icons';
import { Redirect, Slot, usePathname, useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppLoadingScreen from '../../src/components/AppLoadingScreen';
import { useAuth } from '../../src/context/AuthContext';

const tabs = [
  { href: '/(tabs)', icon: 'home-outline', label: 'Sessions' },
  { href: '/(tabs)/profile', icon: 'person-outline', label: 'Profile' },
] as const;

export default function TabLayout() {
  const { user, isLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  if (isLoading) {
    return <AppLoadingScreen label="Preparing your workspace..." />;
  }

  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#ffffff' }}>
      <View style={{ flex: 1 }}>
        <Slot />
      </View>

      <View
        style={{
          flexDirection: 'row',
          borderTopWidth: 1,
          borderTopColor: '#e5e7eb',
          backgroundColor: '#ffffff',
          paddingHorizontal: 8,
          paddingTop: 10,
          paddingBottom: insets.bottom + 14,
        }}
      >
        {tabs.map((tab) => {
          const isActive =
            tab.href === '/(tabs)'
              ? pathname === '/(tabs)' || pathname === '/'
              : pathname === tab.href;

          return (
            <Pressable
              key={tab.href}
              onPress={() => router.replace(tab.href)}
              style={{
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                paddingVertical: 6,
              }}
            >
              <Ionicons
                name={tab.icon}
                size={22}
                color={isActive ? '#16a34a' : '#6b7280'}
              />
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '600',
                  color: isActive ? '#16a34a' : '#6b7280',
                }}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
