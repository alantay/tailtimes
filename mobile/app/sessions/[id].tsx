import { useQuery } from '@tanstack/react-query';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { Share, ScrollView, Text, View } from 'react-native';
import { Pressable } from 'react-native';
import AppLoadingScreen from '../../src/components/AppLoadingScreen';
import { useAuth } from '../../src/context/AuthContext';
import { apiGet } from '../../src/services/api';
import { SessionDetail } from '../../src/types/api';
import { formatShortDate } from '../../src/utils/formatDate';

export default function SessionDetailScreen() {
  const { user, isLoading } = useAuth();
  const params = useLocalSearchParams<{ id: string }>();
  const sessionId = typeof params.id === 'string' ? params.id : '';

  const sessionQuery = useQuery({
    enabled: Boolean(user && sessionId),
    queryKey: ['session', sessionId],
    queryFn: () => apiGet<SessionDetail>(`/api/sessions/${sessionId}`),
  });

  if (isLoading) {
    return <AppLoadingScreen label="Loading your session..." />;
  }

  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  if (sessionQuery.isPending) {
    return <AppLoadingScreen label="Loading your session..." />;
  }

  if (sessionQuery.isError || !sessionQuery.data) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff', padding: 24 }}>
        <Text style={{ fontSize: 22, fontWeight: '700', color: '#111827' }}>Session unavailable</Text>
        <Text style={{ marginTop: 8, textAlign: 'center', color: '#6b7280' }}>
          {sessionQuery.error instanceof Error ? sessionQuery.error.message : 'Could not load this session.'}
        </Text>
      </View>
    );
  }

  const session = sessionQuery.data;

  async function handleShare() {
    await Share.share({
      message: `https://tailtimes.app/s/${session.shareLink}`,
    });
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#ffffff' }} contentContainerStyle={{ padding: 24, gap: 20 }}>
      <View style={{ gap: 6 }}>
        <Text style={{ fontSize: 32, fontWeight: '700', color: '#111827' }}>{session.petName}</Text>
        <Text style={{ fontSize: 16, color: '#6b7280', textTransform: 'capitalize' }}>{session.petType} boarding session</Text>
      </View>

      <View
        style={{
          borderRadius: 24,
          backgroundColor: '#f0fdf4',
          padding: 20,
          gap: 10,
        }}
      >
        <Text style={{ fontSize: 14, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', color: '#15803d' }}>
          Session snapshot
        </Text>
        <Text style={{ fontSize: 16, color: '#166534' }}>
          {formatShortDate(session.startDate)} to {formatShortDate(session.endDate)}
        </Text>
        <Text style={{ fontSize: 16, color: '#166534' }}>
          {session.stats.totalUpdates} updates, {session.stats.totalPhotos} photos, {session.stats.totalVideos} videos
        </Text>
      </View>

      <Pressable
        onPress={handleShare}
        style={{
          minHeight: 52,
          borderRadius: 16,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1,
          borderColor: '#d1d5db',
        }}
      >
        <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827' }}>Share owner link</Text>
      </Pressable>

      <View style={{ gap: 12 }}>
        <Text style={{ fontSize: 22, fontWeight: '700', color: '#111827' }}>Updates</Text>
        {session.updates.length === 0 ? (
          <View
            style={{
              borderRadius: 20,
              borderWidth: 1,
              borderColor: '#e5e7eb',
              padding: 18,
            }}
          >
            <Text style={{ color: '#6b7280' }}>No updates yet. The capture flow will plug in here next.</Text>
          </View>
        ) : (
          session.updates.map((update) => (
            <View
              key={update.id}
              style={{
                borderRadius: 20,
                borderWidth: 1,
                borderColor: '#e5e7eb',
                padding: 18,
                gap: 8,
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#111827', textTransform: 'capitalize' }}>
                {update.type} • {formatShortDate(update.createdAt)}
              </Text>
              <Text style={{ color: '#6b7280' }}>{update.caption || 'No caption yet'}</Text>
              <Text style={{ color: '#16a34a' }}>{update.mediaUrl}</Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}
