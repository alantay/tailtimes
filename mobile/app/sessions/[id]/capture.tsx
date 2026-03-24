import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiGet } from '../../../src/services/api';
import {
  toUploadableAsset,
  uploadSessionMedia,
  type UploadableAsset,
} from '../../../src/services/media';
import { SessionDetail, SessionUpdateTag } from '../../../src/types/api';

const mediaTypes: ImagePicker.MediaType[] = ['images', 'videos'];
const updateTags: SessionUpdateTag[] = ['walks', 'food', 'lounging', 'sleeping', 'misc'];

export default function CaptureScreen() {
  const { id: sessionId, intent } = useLocalSearchParams<{
    id: string;
    intent?: 'camera' | 'library';
  }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();

  const [selectedAsset, setSelectedAsset] = useState<UploadableAsset | null>(null);
  const [caption, setCaption] = useState('');
  const [selectedTags, setSelectedTags] = useState<SessionUpdateTag[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPreparingMedia, setIsPreparingMedia] = useState(false);
  const [videoThumbnailUri, setVideoThumbnailUri] = useState<string | null>(null);
  const hasAutoLaunched = useRef(false);

  const sessionQuery = useQuery({
    enabled: Boolean(sessionId),
    queryKey: ['session', sessionId],
    queryFn: () => apiGet<SessionDetail>(`/api/sessions/${sessionId}`),
  });

  const session = sessionQuery.data;

  useEffect(() => {
    if (
      hasAutoLaunched.current ||
      !session ||
      selectedAsset ||
      isPreparingMedia ||
      !intent
    ) {
      return;
    }

    hasAutoLaunched.current = true;

    if (intent === 'library') {
      void pickMedia('library');
      return;
    }

    void launchSystemCamera(mediaTypes);
  }, [intent, isPreparingMedia, selectedAsset, session]);

  useEffect(() => {
    let isCancelled = false;

    if (selectedAsset?.type !== 'video' || !selectedAsset.uri) {
      setVideoThumbnailUri(null);
      return () => {
        isCancelled = true;
      };
    }

    void VideoThumbnails.getThumbnailAsync(selectedAsset.uri, {
      time: 750,
    })
      .then((result) => {
        if (!isCancelled) {
          setVideoThumbnailUri(result.uri);
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setVideoThumbnailUri(null);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [selectedAsset?.type, selectedAsset?.uri]);

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!selectedAsset) throw new Error('Capture or choose media first');

      return uploadSessionMedia({
        sessionId: sessionId!,
        asset: selectedAsset,
        caption,
        tags: selectedTags.length > 0 ? selectedTags : undefined,
      });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['sessions'] }),
        queryClient.invalidateQueries({ queryKey: ['session', sessionId] }),
      ]);
      router.back();
    },
  });

  function resetDraft() {
    setSelectedAsset(null);
    setCaption('');
    setSelectedTags([]);
    setVideoThumbnailUri(null);
  }

  async function launchSystemCamera(cameraMediaTypes: ImagePicker.MediaType[]) {
    setError(null);
    setIsPreparingMedia(true);

    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        throw new Error('Camera access is required to capture media');
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: cameraMediaTypes,
        quality: 0.7,
        videoMaxDuration: 60,
        allowsEditing: false,
      });

      if (!result.canceled) {
        setSelectedAsset(toUploadableAsset(result.assets[0]));
      }
    } catch (captureError) {
      setError(captureError instanceof Error ? captureError.message : 'Could not capture media');
    } finally {
      setIsPreparingMedia(false);
    }
  }

  async function pickMedia(source: 'camera' | 'library') {
    if (source === 'camera') {
      await launchSystemCamera(mediaTypes);
      return;
    }

    setError(null);
    setIsPreparingMedia(true);

    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) throw new Error('Photo library access is required to choose media');

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes,
        quality: 0.7,
        allowsEditing: false,
      });

      if (!result.canceled) {
        setSelectedAsset(toUploadableAsset(result.assets[0]));
      }
    } catch (pickerError) {
      setError(pickerError instanceof Error ? pickerError.message : 'Could not prepare media');
    } finally {
      setIsPreparingMedia(false);
    }
  }

  async function handleUpload() {
    setError(null);
    try {
      await uploadMutation.mutateAsync();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Upload failed');
    }
  }

  if (sessionQuery.isPending) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff' }}>
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  if (!session) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff', padding: 24 }}>
        <Text style={{ fontSize: 22, fontWeight: '700', color: '#111827' }}>Session not found</Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={{ fontSize: 15, fontWeight: '600', color: '#16a34a' }}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  // ── Compose screen (Instagram-style) ──
  if (selectedAsset) {
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: '#ffffff' }}
        contentContainerStyle={{
          paddingTop: insets.top + 12,
          paddingBottom: insets.bottom + 24,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ paddingHorizontal: 20, paddingBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Pressable onPress={() => resetDraft()} style={{ paddingVertical: 8 }}>
              <Text style={{ fontSize: 15, fontWeight: '600', color: '#6b7280' }}>Cancel</Text>
            </Pressable>
            <View style={{ backgroundColor: '#f0fdf4', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#166534' }}>
                {session.petName} for {session.ownerName}
              </Text>
            </View>
          </View>
        </View>

        <View style={{ backgroundColor: '#000000' }}>
          {selectedAsset.type === 'video' ? (
            <View
              style={{
                width: '100%',
                height: 380,
                backgroundColor: '#111827',
                overflow: 'hidden',
              }}
            >
              {videoThumbnailUri ? (
                <Image
                  source={{ uri: videoThumbnailUri }}
                  resizeMode="cover"
                  style={{ width: '100%', height: '100%' }}
                />
              ) : null}

              <View
                style={{
                  position: 'absolute',
                  inset: 0,
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 12,
                  backgroundColor: videoThumbnailUri ? 'rgba(17,24,39,0.30)' : '#111827',
                  paddingHorizontal: 24,
                }}
              >
                <View
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: 36,
                    backgroundColor: 'rgba(255,255,255,0.16)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name="videocam" size={30} color="#ffffff" />
                </View>
                <Text style={{ fontSize: 17, fontWeight: '700', color: '#ffffff' }}>Video ready</Text>
                <Text style={{ textAlign: 'center', fontSize: 14, color: '#d1d5db' }}>
                  Preview frame shown here. Full playback is available after adding it to the session.
                </Text>
              </View>
            </View>
          ) : (
            <Image
              source={{ uri: selectedAsset.uri }}
              resizeMode="cover"
              style={{ width: '100%', height: 380 }}
            />
          )}
        </View>

        <View style={{ padding: 20, gap: 16 }}>
          <View style={{ gap: 8 }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151' }}>Tags (optional)</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {updateTags.map((option) => {
                const isSelected = selectedTags.includes(option);

                return (
                  <Pressable
                    key={option}
                    onPress={() =>
                      setSelectedTags((current) =>
                        current.includes(option)
                          ? current.filter((tag) => tag !== option)
                          : [...current, option]
                      )
                    }
                    style={{
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: isSelected ? '#16a34a' : '#d1d5db',
                      backgroundColor: isSelected ? '#f0fdf4' : '#ffffff',
                      paddingHorizontal: 12,
                      paddingVertical: 7,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: '600',
                        color: isSelected ? '#166534' : '#4b5563',
                        textTransform: 'capitalize',
                      }}
                    >
                      {option}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <TextInput
            value={caption}
            onChangeText={setCaption}
            placeholder="Write a caption (optional)"
            placeholderTextColor="#9ca3af"
            multiline
            textAlignVertical="top"
            style={{
              minHeight: 44,
              maxHeight: 120,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: '#e5e7eb',
              paddingHorizontal: 16,
              paddingVertical: 12,
              fontSize: 16,
              color: '#111827',
            }}
          />

          {error ? (
            <Text style={{ fontSize: 14, color: '#dc2626' }}>{error}</Text>
          ) : null}

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Pressable
              onPress={() => {
                resetDraft();
                if (intent === 'library') {
                  void pickMedia('library');
                } else {
                  void launchSystemCamera(mediaTypes);
                }
              }}
              style={{
                flex: 1,
                minHeight: 52,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 16,
                borderWidth: 1,
                borderColor: '#d1d5db',
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827' }}>Retake</Text>
            </Pressable>
            <Pressable
              disabled={uploadMutation.isPending}
              onPress={handleUpload}
              style={{
                flex: 1,
                minHeight: 52,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 16,
                backgroundColor: '#16a34a',
              }}
            >
              {uploadMutation.isPending ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#ffffff' }}>
                  Add to session
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </ScrollView>
    );
  }

  // ── Capture screen ──
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#ffffff' }}
      contentContainerStyle={{
        paddingTop: insets.top + 12,
        paddingBottom: insets.bottom + 24,
        gap: 16,
      }}
      keyboardShouldPersistTaps="handled"
    >
      <View style={{ paddingHorizontal: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Pressable onPress={() => router.back()} style={{ paddingVertical: 8 }}>
            <Text style={{ fontSize: 15, fontWeight: '600', color: '#6b7280' }}>Cancel</Text>
          </Pressable>
          <View style={{ backgroundColor: '#f0fdf4', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#166534' }}>
              {session.petName} for {session.ownerName}
            </Text>
          </View>
        </View>
      </View>

      <View
        style={{
          marginHorizontal: 20,
          borderRadius: 28,
          backgroundColor: '#f9fafb',
          borderWidth: 1,
          borderColor: '#e5e7eb',
          paddingHorizontal: 22,
          paddingVertical: 24,
          gap: 10,
        }}
      >
        <Text style={{ fontSize: 22, fontWeight: '700', color: '#111827' }}>Add an update</Text>
        <Text style={{ fontSize: 15, lineHeight: 22, color: '#6b7280' }}>
          Capture update opens your phone camera so you can switch between photo and video there.
        </Text>
      </View>

      <View style={{ paddingHorizontal: 20, gap: 12 }}>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Pressable
            disabled={isPreparingMedia}
            onPress={() => launchSystemCamera(mediaTypes)}
            style={{
              minWidth: 170,
              minHeight: 52,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 16,
              backgroundColor: '#16a34a',
            }}
          >
            {isPreparingMedia ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#ffffff' }}>
                Open camera
              </Text>
            )}
          </Pressable>
          <Pressable
            disabled={isPreparingMedia}
            onPress={() => pickMedia('library')}
            style={{
              flex: 1,
              minHeight: 52,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 16,
              borderWidth: 1,
              borderColor: '#bbf7d0',
              backgroundColor: '#f0fdf4',
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#15803d' }}>
              Choose from gallery
            </Text>
          </Pressable>
        </View>
      </View>

      {error ? (
        <View style={{ paddingHorizontal: 20 }}>
          <Text style={{ fontSize: 14, color: '#dc2626' }}>{error}</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}
