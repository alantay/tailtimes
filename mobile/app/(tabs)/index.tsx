import { useQuery, useQueryClient } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';
import { useAuth } from '../../src/context/AuthContext';
import { apiGet, apiPost } from '../../src/services/api';
import { SessionSummary } from '../../src/types/api';
import { formatShortDate, normalizeDateInput } from '../../src/utils/formatDate';

export default function HomeScreen() {
  const { sitterProfile } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const hasCreatedDemoSession = useRef(false);
  const sessionsQuery = useQuery({
    queryKey: ['sessions'],
    queryFn: () => apiGet<SessionSummary[]>('/api/sessions'),
  });

  async function handleCreateDemoSession() {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const normalizedStartDate = normalizeDateInput(today);

    if (!normalizedStartDate) {
      throw new Error('Could not prepare a valid demo start date');
    }

    const demoSession = await apiPost<SessionSummary>('/api/sessions', {
      petName: `Mochi ${now.getHours()}${now.getMinutes()}`,
      petType: 'dog',
      ownerName: 'Jamie Chen',
      ownerContact: '+1-555-0100',
      startDate: normalizedStartDate,
      notes: 'Created from the in-app dev shortcut for simulator validation.',
    });

    await queryClient.invalidateQueries({ queryKey: ['sessions'] });
    router.push(`/sessions/${demoSession.id}`);
  }

  useEffect(() => {
    if (
      !__DEV__ ||
      hasCreatedDemoSession.current ||
      sessionsQuery.isPending ||
      sessionsQuery.isError ||
      !sessionsQuery.data ||
      sessionsQuery.data.length > 0
    ) {
      return;
    }

    hasCreatedDemoSession.current = true;
    void handleCreateDemoSession().catch((error) => {
      console.error('Failed to create demo session', error);
      hasCreatedDemoSession.current = false;
    });
  }, [sessionsQuery.data, sessionsQuery.isError, sessionsQuery.isPending]);

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
        contentContainerStyle={{ padding: 24, gap: 16, paddingBottom: 120 }}
        ListHeaderComponent={
          <View className="mb-4 gap-3">
            <Text className="text-sm font-semibold uppercase tracking-[2px] text-green-700">
              TailTimes
            </Text>
            <Text className="text-4xl font-bold text-gray-900">
              {sitterProfile ? `Hi, ${sitterProfile.name}` : 'Your sessions'}
            </Text>
            <Text className="text-base leading-6 text-gray-600">
              Active boarding timelines, owner links, and update history all in one place.
            </Text>
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
            {__DEV__ ? (
              <Pressable
                onPress={handleCreateDemoSession}
                className="mt-3 self-start rounded-2xl border border-green-200 px-5 py-3"
              >
                <Text className="font-semibold text-green-700">Create a demo session</Text>
              </Pressable>
            ) : null}
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/sessions/${item.id}`)}
            className="rounded-3xl border border-gray-200 px-5 py-5"
          >
            <Text className="text-xs font-semibold uppercase tracking-[2px] text-green-700">
              {item.petType}
            </Text>
            <Text className="mt-2 text-2xl font-bold text-gray-900">{item.petName}</Text>
            <Text className="mt-1 text-base text-gray-600">Owner: {item.ownerName}</Text>
            <Text className="mt-4 text-sm text-gray-500">
              Starts {formatShortDate(item.startDate)} • {item.stats.totalUpdates} updates
            </Text>
          </Pressable>
        )}
      />

      <Pressable
        onPress={() => router.push('/sessions/new')}
        className="absolute bottom-8 right-6 rounded-full bg-green-600 px-5 py-4 shadow"
      >
        <Text className="font-semibold text-white">New Session</Text>
      </Pressable>

      <StatusBar style="auto" />
    </View>
  );
}
