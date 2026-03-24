import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Video, ResizeMode } from 'expo-av';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { Image, Share, ScrollView, Text, View } from 'react-native';
import { Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppLoadingScreen from '../../../src/components/AppLoadingScreen';
import { useAuth } from '../../../src/context/AuthContext';
import { apiGet } from '../../../src/services/api';
import { SessionDetail } from '../../../src/types/api';
import { formatShortDate } from '../../../src/utils/formatDate';
import { buildOwnerFeedUrl } from '../../../src/utils/ownerFeed';

export default function SessionDetailScreen() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
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
        <Pressable
          onPress={() => router.replace('/(tabs)')}
          style={{
            marginTop: 20,
            minHeight: 48,
            minWidth: 180,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 16,
            borderWidth: 1,
            borderColor: '#d1d5db',
            paddingHorizontal: 20,
          }}
        >
          <Text style={{ fontSize: 15, fontWeight: '600', color: '#111827' }}>Back to sessions</Text>
        </Pressable>
      </View>
    );
  }

  const session = sessionQuery.data;
  const ownerFeedUrl = buildOwnerFeedUrl(session.shareLink);

  async function handleShare() {
    await Share.share({
      message: ownerFeedUrl,
      url: ownerFeedUrl,
    });
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#ffffff' }}
      contentContainerStyle={{
        padding: 24,
        paddingTop: insets.top + 24,
        paddingBottom: insets.bottom + 24,
        gap: 20,
      }}
    >
      <Pressable
        onPress={() => router.replace('/(tabs)')}
        style={{ alignSelf: 'flex-start', paddingVertical: 6 }}
      >
        <Text style={{ fontSize: 15, fontWeight: '600', color: '#16a34a' }}>Back to sessions</Text>
      </Pressable>

      <View style={{ gap: 6 }}>
        <Text style={{ fontSize: 32, fontWeight: '700', color: '#111827' }}>{session.petName}</Text>
        <Text style={{ fontSize: 16, color: '#6b7280', textTransform: 'capitalize' }}>
          {session.petType} boarding session
        </Text>
      </View>

      {session.isActive ? (
        <Pressable
          onPress={() => router.push(`/sessions/${session.id}/capture`)}
          style={{
            minHeight: 56,
            borderRadius: 16,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            backgroundColor: '#16a34a',
          }}
        >
          <Ionicons name="camera" size={22} color="#ffffff" />
          <Text style={{ fontSize: 17, fontWeight: '700', color: '#ffffff' }}>Capture update</Text>
        </Pressable>
      ) : null}

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          borderRadius: 16,
          backgroundColor: '#f9fafb',
          paddingHorizontal: 16,
          paddingVertical: 14,
        }}
      >
        <Text style={{ fontSize: 14, color: '#6b7280' }}>
          {formatShortDate(session.startDate)} to {formatShortDate(session.endDate)}
        </Text>
        <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: '#d1d5db' }} />
        <Text style={{ fontSize: 14, color: '#6b7280' }}>
          {session.stats.totalUpdates} update{session.stats.totalUpdates === 1 ? '' : 's'}
        </Text>
      </View>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          borderRadius: 16,
          borderWidth: 1,
          borderColor: '#e5e7eb',
          paddingLeft: 16,
          overflow: 'hidden',
        }}
      >
        <Text
          selectable
          numberOfLines={1}
          style={{ flex: 1, fontSize: 13, color: '#16a34a' }}
        >
          {ownerFeedUrl}
        </Text>
        <Pressable
          onPress={handleShare}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            backgroundColor: '#f0fdf4',
            paddingHorizontal: 16,
            paddingVertical: 14,
            marginLeft: 12,
          }}
        >
          <Ionicons name="share-outline" size={16} color="#166534" />
          <Text style={{ fontSize: 14, fontWeight: '600', color: '#166534' }}>Share</Text>
        </Pressable>
      </View>

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
            <Text style={{ color: '#6b7280' }}>
              No updates yet. Capture a photo or video to start the owner timeline.
            </Text>
          </View>
        ) : (
          session.updates.map((update) => (
            <View
              key={update.id}
              style={{
                borderRadius: 20,
                borderWidth: 1,
                borderColor: '#e5e7eb',
                overflow: 'hidden',
                backgroundColor: '#ffffff',
                gap: 8,
              }}
            >
              {update.type === 'video' ? (
                <Video
                  source={{ uri: update.mediaUrl }}
                  useNativeControls
                  resizeMode={ResizeMode.COVER}
                  style={{ width: '100%', height: 260, backgroundColor: '#000000' }}
                />
              ) : (
                <Image
                  source={{ uri: update.mediaUrl }}
                  resizeMode="cover"
                  style={{ width: '100%', height: 260, backgroundColor: '#f3f4f6' }}
                />
              )}

              <View style={{ paddingHorizontal: 18, paddingTop: 16, paddingBottom: 18, gap: 8 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#111827', textTransform: 'capitalize' }}>
                  {update.type} update
                </Text>

                <Text style={{ color: '#6b7280' }}>{update.caption || 'No caption added for this update yet.'}</Text>
                <Text style={{ fontSize: 12, color: '#9ca3af' }}>{formatShortDate(update.createdAt)}</Text>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}
