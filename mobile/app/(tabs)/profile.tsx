import { useMutation } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
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
import { useAuth } from '../../src/context/AuthContext';
import { apiPatch } from '../../src/services/api';
import { toUploadableAsset, uploadAssetToCloudinary } from '../../src/services/media';
import { SitterProfile } from '../../src/types/api';

export default function ProfileScreen() {
  const { refreshSitterProfile, signOut, sitterProfile } = useAuth();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [phone, setPhone] = useState('');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sitterProfile) {
      return;
    }

    setName(sitterProfile.name ?? '');
    setBio(sitterProfile.bio ?? '');
    setLocation(sitterProfile.location ?? '');
    setPhone(sitterProfile.phone ?? '');
    setProfileImage(sitterProfile.profileImage ?? null);
  }, [sitterProfile]);

  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      return apiPatch<SitterProfile>('/api/sitters/me', {
        name: name.trim() || undefined,
        bio: bio.trim() || null,
        location: location.trim() || null,
        phone: phone.trim() || null,
        profileImage,
      });
    },
    onSuccess: async () => {
      await refreshSitterProfile();
      setError(null);
    },
  });

  const uploadProfileImageMutation = useMutation({
    mutationFn: async () => {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        throw new Error('Photo library access is required to choose a profile image');
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (result.canceled || !result.assets[0]) {
        return null;
      }

      const uploadResult = await uploadAssetToCloudinary(toUploadableAsset(result.assets[0]));
      const nextProfile = await apiPatch<SitterProfile>('/api/sitters/me', {
        profileImage: uploadResult.secure_url,
      });

      return nextProfile;
    },
    onSuccess: async (nextProfile) => {
      if (!nextProfile) {
        return;
      }

      setProfileImage(nextProfile.profileImage ?? null);
      await refreshSitterProfile();
      setError(null);
    },
  });

  const signOutMutation = useMutation({
    mutationFn: () => signOut(),
  });

  async function handleSignOut() {
    setError(null);

    try {
      await signOutMutation.mutateAsync();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Could not sign out');
    }
  }

  async function handleSave() {
    setError(null);

    try {
      if (!name.trim()) {
        throw new Error('Name is required');
      }

      await updateProfileMutation.mutateAsync();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Could not save profile');
    }
  }

  return (
    <ScrollView
      className="flex-1 bg-white"
      contentContainerStyle={{
        paddingHorizontal: 24,
        paddingTop: insets.top + 24,
        paddingBottom: insets.bottom + 40,
        gap: 20,
      }}
      keyboardShouldPersistTaps="handled"
    >
      <View>
        <Text className="text-3xl font-bold text-gray-900">Profile</Text>
        <Text className="mt-2 text-base leading-6 text-gray-600">
          Keep your sitter identity polished so owners see a trustworthy face behind every update.
        </Text>
      </View>

      <View className="items-center rounded-3xl border border-gray-200 bg-gray-50 px-6 py-6">
        {profileImage ? (
          <Image
            source={{ uri: profileImage }}
            style={{ width: 96, height: 96, borderRadius: 48 }}
          />
        ) : (
          <View className="h-24 w-24 items-center justify-center rounded-full bg-green-100">
            <Text className="text-2xl font-bold text-green-700">
              {(name || sitterProfile?.name || 'T').slice(0, 1).toUpperCase()}
            </Text>
          </View>
        )}

        <Text className="mt-4 text-xl font-bold text-gray-900">{name || sitterProfile?.name || 'Your profile'}</Text>
        <Text className="mt-1 text-sm text-gray-600">{sitterProfile?.email ?? 'No email available'}</Text>

        <Pressable
          disabled={uploadProfileImageMutation.isPending}
          onPress={() => {
            setError(null);
            void uploadProfileImageMutation.mutateAsync().catch((submitError) => {
              setError(
                submitError instanceof Error ? submitError.message : 'Could not update profile image'
              );
            });
          }}
          className="mt-5 min-h-[48px] min-w-[180px] items-center justify-center rounded-2xl border border-green-200 px-4"
        >
          {uploadProfileImageMutation.isPending ? (
            <ActivityIndicator color="#15803d" />
          ) : (
            <Text className="text-base font-semibold text-green-700">Update profile photo</Text>
          )}
        </Pressable>
      </View>

      <View className="gap-4 rounded-3xl border border-gray-200 px-5 py-5">
        <Text className="text-lg font-semibold text-gray-900">About you</Text>

        <View className="gap-2">
          <Text className="text-sm font-semibold text-gray-700">Name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            className="rounded-2xl border border-gray-200 px-4 py-4 text-base"
          />
        </View>

        <View className="gap-2">
          <Text className="text-sm font-semibold text-gray-700">Phone</Text>
          <TextInput
            value={phone}
            onChangeText={setPhone}
            placeholder="Phone number"
            keyboardType="phone-pad"
            className="rounded-2xl border border-gray-200 px-4 py-4 text-base"
          />
        </View>

        <View className="gap-2">
          <Text className="text-sm font-semibold text-gray-700">Location</Text>
          <TextInput
            value={location}
            onChangeText={setLocation}
            placeholder="City or neighborhood"
            className="rounded-2xl border border-gray-200 px-4 py-4 text-base"
          />
        </View>

        <View className="gap-2">
          <Text className="text-sm font-semibold text-gray-700">Bio</Text>
          <TextInput
            value={bio}
            onChangeText={setBio}
            placeholder="Tell owners what kind of care you provide"
            multiline
            textAlignVertical="top"
            className="min-h-[120px] rounded-2xl border border-gray-200 px-4 py-4 text-base"
          />
        </View>
      </View>

      {error ? <Text className="text-sm text-red-600">{error}</Text> : null}

      <Pressable
        disabled={updateProfileMutation.isPending}
        onPress={handleSave}
        className="min-h-[56px] items-center justify-center rounded-2xl bg-green-600 px-4"
      >
        {updateProfileMutation.isPending ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text className="text-base font-semibold text-white">Save profile</Text>
        )}
      </Pressable>

      <Pressable
        disabled={signOutMutation.isPending}
        onPress={handleSignOut}
        className="min-h-[56px] items-center justify-center rounded-2xl border border-gray-300 px-4"
      >
        {signOutMutation.isPending ? (
          <ActivityIndicator color="#111827" />
        ) : (
          <Text className="text-base font-semibold text-gray-900">Sign out</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}
