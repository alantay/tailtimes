import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Video, ResizeMode } from 'expo-av';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Camera, CameraType, CameraView } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Component, type ReactNode, useEffect, useRef, useState } from 'react';
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
import { SessionDetail } from '../../../src/types/api';

const mediaTypes: ImagePicker.MediaType[] = ['images', 'videos'];
const supportsEmbeddedCamera = Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;

class CameraSurfaceBoundary extends Component<
  { children: ReactNode; onError: (error: Error) => void },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode; onError: (error: Error) => void }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    this.props.onError(error);
  }

  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

export default function CaptureScreen() {
  const { id: sessionId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<CameraView | null>(null);

  const [selectedAsset, setSelectedAsset] = useState<UploadableAsset | null>(null);
  const [caption, setCaption] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPreparingMedia, setIsPreparingMedia] = useState(false);
  const [cameraPermissionGranted, setCameraPermissionGranted] = useState<boolean | null>(null);
  const [microphonePermissionGranted, setMicrophonePermissionGranted] = useState<boolean | null>(
    null
  );
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<CameraType>('back');
  const [captureMode, setCaptureMode] = useState<'picture' | 'video'>('picture');
  const [isRecording, setIsRecording] = useState(false);
  const [useEmbeddedCamera, setUseEmbeddedCamera] = useState(supportsEmbeddedCamera);
  const hasAutoLaunched = useRef(false);

  const sessionQuery = useQuery({
    enabled: Boolean(sessionId),
    queryKey: ['session', sessionId],
    queryFn: () => apiGet<SessionDetail>(`/api/sessions/${sessionId}`),
  });

  const session = sessionQuery.data;

  // Request camera permission on mount
  useEffect(() => {
    void Camera.requestCameraPermissionsAsync().then((permission) => {
      setCameraPermissionGranted(permission.granted);
    });
  }, []);

  // Auto-launch system camera on Expo Go
  useEffect(() => {
    if (useEmbeddedCamera || hasAutoLaunched.current || !session || selectedAsset || isPreparingMedia) {
      return;
    }
    hasAutoLaunched.current = true;
    void pickMedia('camera');
  }, [useEmbeddedCamera, session, selectedAsset, isPreparingMedia]);

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!selectedAsset) throw new Error('Capture or choose media first');

      return uploadSessionMedia({
        sessionId: sessionId!,
        asset: selectedAsset,
        caption,
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
  }

  async function pickMedia(source: 'camera' | 'library') {
    setError(null);
    setIsPreparingMedia(true);

    try {
      if (source === 'camera') {
        if (!useEmbeddedCamera) {
          const permission = await ImagePicker.requestCameraPermissionsAsync();
          if (!permission.granted) throw new Error('Camera access is required to capture media');

          const result = await ImagePicker.launchCameraAsync({
            mediaTypes,
            cameraType:
              cameraFacing === 'back' ? ImagePicker.CameraType.back : ImagePicker.CameraType.front,
            quality: 0.7,
            videoMaxDuration: 60,
            allowsEditing: false,
          });

          if (!result.canceled) {
            setSelectedAsset(toUploadableAsset(result.assets[0]));
          }
          return;
        }

        const permission = await Camera.requestCameraPermissionsAsync();
        setCameraPermissionGranted(permission.granted);
        if (!permission.granted) throw new Error('Camera access is required to capture media');
        return;
      }

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

  async function handleCapture() {
    if (!cameraRef.current || !cameraReady) {
      setError('Camera is still getting ready');
      return;
    }

    setError(null);
    setIsPreparingMedia(true);

    try {
      if (captureMode === 'video') {
        const permission =
          microphonePermissionGranted === true
            ? { granted: true }
            : await Camera.requestMicrophonePermissionsAsync();

        setMicrophonePermissionGranted(permission.granted);
        if (!permission.granted) throw new Error('Microphone access is required to record video');

        if (isRecording) {
          cameraRef.current.stopRecording();
          return;
        }

        setIsRecording(true);
        const recorded = await cameraRef.current.recordAsync({ maxDuration: 60 });

        if (recorded?.uri) {
          setSelectedAsset({
            uri: recorded.uri,
            type: 'video',
            mimeType: 'video/mp4',
            fileName: `tailtimes-video-${Date.now()}.mp4`,
          });
        }
        return;
      }

      const picture = await cameraRef.current.takePictureAsync({
        quality: 0.7,
        shutterSound: false,
      });

      if (picture?.uri) {
        setSelectedAsset({
          uri: picture.uri,
          type: 'photo',
          mimeType: 'image/jpeg',
          width: picture.width,
          height: picture.height,
          fileName: `tailtimes-photo-${Date.now()}.jpg`,
        });
      }
    } catch (captureError) {
      setError(captureError instanceof Error ? captureError.message : 'Could not capture media');
    } finally {
      setIsPreparingMedia(false);
      setIsRecording(false);
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
            <Video
              source={{ uri: selectedAsset.uri }}
              useNativeControls
              isLooping
              resizeMode={ResizeMode.COVER}
              style={{ width: '100%', height: 380 }}
            />
          ) : (
            <Image
              source={{ uri: selectedAsset.uri }}
              resizeMode="cover"
              style={{ width: '100%', height: 380 }}
            />
          )}
        </View>

        <View style={{ padding: 20, gap: 16 }}>
          <TextInput
            value={caption}
            onChangeText={setCaption}
            placeholder="Write a caption..."
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
                if (!useEmbeddedCamera) void pickMedia('camera');
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
                  Send to {session.ownerName}
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

      {useEmbeddedCamera ? (
        <View style={{ borderRadius: 28, overflow: 'hidden', marginHorizontal: 20, backgroundColor: '#000000' }}>
          {cameraPermissionGranted ? (
            <CameraSurfaceBoundary
              onError={(cameraError) => {
                setUseEmbeddedCamera(false);
                setError(
                  cameraError.message ||
                    'The in-app camera hit a render error. Opening the phone camera instead.'
                );
              }}
            >
              <CameraView
                ref={cameraRef}
                active
                animateShutter
                facing={cameraFacing}
                mode={captureMode}
                mute={captureMode !== 'video'}
                onCameraReady={() => setCameraReady(true)}
                onMountError={(mountError) => {
                  setUseEmbeddedCamera(false);
                  setError(
                    mountError.message ||
                      'The in-app camera could not mount. Opening the phone camera instead.'
                  );
                }}
                style={{ width: '100%', height: 420 }}
              />
            </CameraSurfaceBoundary>
          ) : (
            <View style={{ alignItems: 'center', padding: 40 }}>
              <Text style={{ fontSize: 18, fontWeight: '600', color: '#ffffff' }}>
                Camera access needed
              </Text>
              <Pressable
                disabled={isPreparingMedia}
                onPress={() => pickMedia('camera')}
                style={{
                  marginTop: 20,
                  minHeight: 48,
                  minWidth: 160,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 16,
                  backgroundColor: '#16a34a',
                }}
              >
                <Text style={{ fontSize: 15, fontWeight: '600', color: '#ffffff' }}>
                  Enable camera
                </Text>
              </Pressable>
            </View>
          )}
        </View>
      ) : null}

      <View style={{ paddingHorizontal: 20, gap: 12 }}>
        {useEmbeddedCamera ? (
          <>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Pressable
                onPress={() => setCaptureMode('picture')}
                style={{
                  flex: 1,
                  borderRadius: 16,
                  paddingVertical: 12,
                  backgroundColor: captureMode === 'picture' ? '#16a34a' : '#f3f4f6',
                  alignItems: 'center',
                }}
              >
                <Text
                  style={{
                    fontWeight: '600',
                    color: captureMode === 'picture' ? '#ffffff' : '#374151',
                  }}
                >
                  Photo
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setCaptureMode('video')}
                style={{
                  flex: 1,
                  borderRadius: 16,
                  paddingVertical: 12,
                  backgroundColor: captureMode === 'video' ? '#16a34a' : '#f3f4f6',
                  alignItems: 'center',
                }}
              >
                <Text
                  style={{
                    fontWeight: '600',
                    color: captureMode === 'video' ? '#ffffff' : '#374151',
                  }}
                >
                  Video
                </Text>
              </Pressable>
            </View>

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Pressable
                onPress={() =>
                  setCameraFacing((current) => (current === 'back' ? 'front' : 'back'))
                }
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
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827' }}>
                  Flip camera
                </Text>
              </Pressable>
              <Pressable
                disabled={isPreparingMedia || !cameraPermissionGranted}
                onPress={handleCapture}
                style={{
                  flex: 1,
                  minHeight: 52,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 16,
                  backgroundColor:
                    captureMode === 'video' && isRecording ? '#dc2626' : '#16a34a',
                }}
              >
                {isPreparingMedia ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={{ fontSize: 16, fontWeight: '600', color: '#ffffff' }}>
                    {captureMode === 'video'
                      ? isRecording
                        ? 'Stop recording'
                        : 'Record video'
                      : 'Take photo'}
                  </Text>
                )}
              </Pressable>
            </View>
          </>
        ) : (
          <Pressable
            disabled={isPreparingMedia}
            onPress={() => pickMedia('camera')}
            style={{
              minHeight: 56,
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
        )}

        <Pressable
          disabled={isPreparingMedia}
          onPress={() => pickMedia('library')}
          style={{
            minHeight: 56,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 16,
            borderWidth: 1,
            borderColor: '#bbf7d0',
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: '600', color: '#15803d' }}>
            Choose from library
          </Text>
        </Pressable>
      </View>

      {error ? (
        <View style={{ paddingHorizontal: 20 }}>
          <Text style={{ fontSize: 14, color: '#dc2626' }}>{error}</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}
