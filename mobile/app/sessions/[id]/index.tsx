import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, Image, Share, ScrollView, Text, View } from 'react-native';
import { Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppLoadingScreen from '../../../src/components/AppLoadingScreen';
import { useAuth } from '../../../src/context/AuthContext';
import { apiGet } from '../../../src/services/api';
import { SessionDetail, SessionUpdateTag } from '../../../src/types/api';
import { formatShortDate, formatUpdateTimestamp } from '../../../src/utils/formatDate';
import { openVideoPreview } from '../../../src/utils/openVideoPreview';
import { buildOwnerFeedUrl } from '../../../src/utils/ownerFeed';

const tagStyles: Record<SessionUpdateTag, { backgroundColor: string; borderColor: string; textColor: string }> = {
  walks: { backgroundColor: '#e0f2fe', borderColor: '#bae6fd', textColor: '#0c4a6e' },
  food: { backgroundColor: '#fef3c7', borderColor: '#fde68a', textColor: '#92400e' },
  lounging: { backgroundColor: '#dcfce7', borderColor: '#bbf7d0', textColor: '#166534' },
  sleeping: { backgroundColor: '#e0e7ff', borderColor: '#c7d2fe', textColor: '#3730a3' },
  misc: { backgroundColor: '#f3f4f6', borderColor: '#e5e7eb', textColor: '#374151' },
};

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
  const canCapture = session.isActive && session.status === 'live';
  const sessionStatusLabel = session.status === 'live' ? 'Live' : session.status === 'upcoming' ? 'Upcoming' : 'Ended';

  async function handleShare() {
    await Share.share({
      message: ownerFeedUrl,
      url: ownerFeedUrl,
    });
  }

  async function handlePreviewVideo(uri: string) {
    try {
      await openVideoPreview(uri);
    } catch (previewError) {
      Alert.alert(
        'Preview unavailable',
        previewError instanceof Error ? previewError.message : 'Could not open this video preview.'
      );
    }
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

      {canCapture ? (
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Pressable
            onPress={() =>
              router.push({
                pathname: `/sessions/${session.id}/capture`,
                params: { intent: 'camera' },
              })
            }
            style={{
              flex: 1,
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

          <Pressable
            onPress={() =>
              router.push({
                pathname: `/sessions/${session.id}/capture`,
                params: { intent: 'library' },
              })
            }
            style={{
              minHeight: 56,
              minWidth: 126,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: '#bbf7d0',
              backgroundColor: '#f0fdf4',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              paddingHorizontal: 14,
            }}
          >
            <Ionicons name="images-outline" size={20} color="#15803d" />
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#15803d' }}>Gallery</Text>
          </Pressable>
        </View>
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
        <Text style={{ fontSize: 14, color: '#6b7280' }}>{sessionStatusLabel}</Text>
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
                <Pressable
                  onPress={() => {
                    void handlePreviewVideo(update.mediaUrl);
                  }}
                  style={{
                    height: 260,
                    backgroundColor: '#111827',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 12,
                    paddingHorizontal: 24,
                  }}
                >
                  <View
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: 32,
                      backgroundColor: 'rgba(255,255,255,0.14)',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Ionicons name="play" size={28} color="#ffffff" style={{ marginLeft: 4 }} />
                  </View>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: '#ffffff' }}>
                    Preview video
                  </Text>
                </Pressable>
              ) : (
                <Image
                  source={{ uri: update.mediaUrl }}
                  resizeMode="cover"
                  style={{ width: '100%', height: 260, backgroundColor: '#f3f4f6' }}
                />
              )}

              <View style={{ paddingHorizontal: 18, paddingTop: 14, paddingBottom: 18, gap: 10 }}>
                <Text style={{ fontSize: 12, color: '#9ca3af' }}>
                  {formatUpdateTimestamp(update.createdAt)}
                </Text>
                {update.tags?.length ? (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    {update.tags.map((tag) => (
                      <View
                        key={tag}
                        style={{
                          alignSelf: 'flex-start',
                          borderRadius: 999,
                          borderWidth: 1,
                          borderColor: tagStyles[tag].borderColor,
                          backgroundColor: tagStyles[tag].backgroundColor,
                          paddingHorizontal: 10,
                          paddingVertical: 4,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: '700',
                            color: tagStyles[tag].textColor,
                            textTransform: 'capitalize',
                          }}
                        >
                          {tag}
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : null}
                {update.caption ? <Text style={{ color: '#6b7280' }}>{update.caption}</Text> : null}
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}
