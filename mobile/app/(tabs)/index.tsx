import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../src/context/AuthContext';
import { apiGet } from '../../src/services/api';
import { SessionSummary } from '../../src/types/api';
import { formatShortDate } from '../../src/utils/formatDate';

function getStatusPill(status: SessionSummary['status']) {
  if (status === 'live') {
    return { backgroundColor: '#dcfce7', textColor: '#166534', label: 'Live' };
  }

  if (status === 'upcoming') {
    return { backgroundColor: '#dbeafe', textColor: '#1d4ed8', label: 'Upcoming' };
  }

  return { backgroundColor: '#e5e7eb', textColor: '#4b5563', label: 'Ended' };
}

export default function HomeScreen() {
  const { sitterProfile } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const sessionsQuery = useQuery({
    queryKey: ['sessions'],
    queryFn: () => apiGet<SessionSummary[]>('/api/sessions'),
  });

  if (sessionsQuery.isPending) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#16a34a" />
        <Text className="mt-4 text-gray-600">Loading sessions...</Text>
      </View>
    );
  }

  if (sessionsQuery.isError) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-8">
        <Text className="text-2xl font-bold text-gray-900">Could not load sessions</Text>
        <Text className="mt-2 text-center text-gray-600">
          {sessionsQuery.error instanceof Error ? sessionsQuery.error.message : 'Try again in a moment.'}
        </Text>
      </View>
    );
  }

  const sessions = sessionsQuery.data ?? [];

  return (
    <View className="flex-1 bg-white">
      <FlatList
        data={sessions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          padding: 24,
          paddingTop: insets.top + 24,
          gap: 16,
          paddingBottom: insets.bottom + 80,
        }}
        ListHeaderComponent={
          <View className="mb-4 gap-4">
            <View className="gap-3">
              <Text className="text-sm font-semibold uppercase tracking-[2px] text-green-700">
                TailTimes
              </Text>
              <Text className="text-4xl font-bold text-gray-900">
                {sitterProfile ? `Hi, ${sitterProfile.name}` : 'Your sessions'}
              </Text>
            </View>

            {sessions.length > 0 ? (
              <Pressable
                onPress={() => router.push('/sessions/new')}
                style={{
                  alignSelf: 'flex-start',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: '#d1d5db',
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                }}
              >
                <Ionicons name="add" size={18} color="#374151" />
                <Text style={{ fontSize: 15, fontWeight: '600', color: '#374151' }}>
                  New session
                </Text>
              </Pressable>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          <View className="rounded-3xl border border-dashed border-gray-300 px-6 py-10">
            <Text className="text-2xl font-semibold text-gray-900">No sessions yet</Text>
            <Text className="mt-2 text-base leading-6 text-gray-600">
              Start one now and TailTimes will generate the shareable owner feed link for you.
            </Text>
            <Pressable
              onPress={() => router.push('/sessions/new')}
              className="mt-6 self-start rounded-2xl bg-green-600 px-5 py-3"
            >
              <Text className="font-semibold text-white">Create a session</Text>
            </Pressable>
          </View>
        }
        renderItem={({ item }) => {
          const statusPill = getStatusPill(item.status);
          const canCapture = item.isActive && item.status === 'live';

          return (
          <Pressable
            onPress={() => router.push(`/sessions/${item.id}`)}
            className="rounded-3xl border border-gray-200 px-5 py-5"
            style={{
              backgroundColor: canCapture ? '#ffffff' : '#f9fafb',
            }}
          >
            <View className="flex-row items-start justify-between gap-3">
              <View className="flex-1">
                <Text className="text-xs font-semibold uppercase tracking-[2px] text-green-700">
                  {item.petType}
                </Text>
                <Text className="mt-2 text-2xl font-bold text-gray-900">{item.petName}</Text>
                <Text className="mt-1 text-base text-gray-600">Owner: {item.ownerName}</Text>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                {canCapture ? (
                  <Pressable
                    onPress={(e) => {
                      e.stopPropagation();
                      router.push(`/sessions/${item.id}/capture`);
                    }}
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      backgroundColor: '#16a34a',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Ionicons name="camera" size={20} color="#ffffff" />
                  </Pressable>
                ) : null}

                <View
                  className="rounded-full px-3 py-2"
                  style={{ backgroundColor: statusPill.backgroundColor }}
                >
                  <Text
                    className="text-xs font-semibold uppercase tracking-[1px]"
                    style={{ color: statusPill.textColor }}
                  >
                    {statusPill.label}
                  </Text>
                </View>
              </View>
            </View>

            <View className="mt-4 flex-row flex-wrap gap-3">
              <View className="rounded-2xl bg-gray-50 px-4 py-3">
                <Text className="text-xs font-semibold uppercase tracking-[1px] text-gray-500">
                  Starts
                </Text>
                <Text className="mt-1 text-sm font-semibold text-gray-900">
                  {formatShortDate(item.startDate)}
                </Text>
              </View>
              <View className="rounded-2xl bg-gray-50 px-4 py-3">
                <Text className="text-xs font-semibold uppercase tracking-[1px] text-gray-500">
                  Updates
                </Text>
                <Text className="mt-1 text-sm font-semibold text-gray-900">
                  {item.stats.totalUpdates}
                </Text>
              </View>
              <View className="rounded-2xl bg-gray-50 px-4 py-3">
                <Text className="text-xs font-semibold uppercase tracking-[1px] text-gray-500">
                  Last share
                </Text>
                <Text className="mt-1 text-sm font-semibold text-gray-900">
                  {item.stats.lastUpdateAt ? formatShortDate(item.stats.lastUpdateAt) : 'Not yet'}
                </Text>
              </View>
            </View>
          </Pressable>
          );
        }}
      />

      <StatusBar style="auto" />
    </View>
  );
}
