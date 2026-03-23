import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import AppLoadingScreen from '../../src/components/AppLoadingScreen';
import { useAuth } from '../../src/context/AuthContext';
import { apiPost } from '../../src/services/api';
import { SessionSummary } from '../../src/types/api';
import { normalizeDateInput } from '../../src/utils/formatDate';

const petTypes = ['dog', 'cat', 'other'] as const;

export default function NewSessionScreen() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [petName, setPetName] = useState('');
  const [petType, setPetType] = useState<(typeof petTypes)[number]>('dog');
  const [ownerName, setOwnerName] = useState('');
  const [ownerContact, setOwnerContact] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const createSessionMutation = useMutation({
    mutationFn: async () => {
      if (!petName.trim()) {
        throw new Error('Pet name is required');
      }

      if (!ownerName.trim()) {
        throw new Error('Owner name is required');
      }

      const normalizedStartDate = normalizeDateInput(startDate);

      if (!normalizedStartDate) {
        throw new Error('Start date is required');
      }

      return apiPost<SessionSummary>('/api/sessions', {
        petName: petName.trim(),
        petType,
        ownerName: ownerName.trim(),
        ownerContact: ownerContact.trim() || undefined,
        startDate: normalizedStartDate,
        notes: notes.trim() || undefined,
      });
    },
    onSuccess: async (session) => {
      await queryClient.invalidateQueries({ queryKey: ['sessions'] });
      router.replace(`/sessions/${session.id}`);
    },
  });

  if (isLoading) {
    return <AppLoadingScreen label="Loading your account..." />;
  }

  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  async function handleSubmit() {
    setError(null);

    try {
      await createSessionMutation.mutateAsync();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Could not create session');
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.select({ ios: 'padding', default: undefined })}
      style={{ flex: 1, backgroundColor: '#ffffff' }}
    >
      <ScrollView contentContainerStyle={{ padding: 24, gap: 16 }}>
        <Text style={{ fontSize: 30, fontWeight: '700', color: '#111827' }}>Create a session</Text>
        <Text style={{ fontSize: 16, color: '#6b7280', lineHeight: 24 }}>
          Start a new boarding timeline and get the owner share link ready for the first update.
        </Text>

        <TextInput
          placeholder="Pet name"
          value={petName}
          onChangeText={setPetName}
          style={{
            borderWidth: 1,
            borderColor: '#e5e7eb',
            borderRadius: 16,
            paddingHorizontal: 16,
            paddingVertical: 14,
            fontSize: 16,
          }}
        />

        <View style={{ flexDirection: 'row', gap: 10 }}>
          {petTypes.map((option) => {
            const isActive = option === petType;

            return (
              <Pressable
                key={option}
                onPress={() => setPetType(option)}
                style={{
                  flex: 1,
                  borderRadius: 999,
                  paddingVertical: 12,
                  backgroundColor: isActive ? '#16a34a' : '#f3f4f6',
                }}
              >
                <Text
                  style={{
                    textAlign: 'center',
                    textTransform: 'capitalize',
                    fontWeight: '600',
                    color: isActive ? '#ffffff' : '#374151',
                  }}
                >
                  {option}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <TextInput
          placeholder="Owner name"
          value={ownerName}
          onChangeText={setOwnerName}
          style={{
            borderWidth: 1,
            borderColor: '#e5e7eb',
            borderRadius: 16,
            paddingHorizontal: 16,
            paddingVertical: 14,
            fontSize: 16,
          }}
        />

        <TextInput
          placeholder="Owner contact (optional)"
          value={ownerContact}
          onChangeText={setOwnerContact}
          style={{
            borderWidth: 1,
            borderColor: '#e5e7eb',
            borderRadius: 16,
            paddingHorizontal: 16,
            paddingVertical: 14,
            fontSize: 16,
          }}
        />

        <TextInput
          placeholder="Start date (YYYY-MM-DD)"
          value={startDate}
          onChangeText={setStartDate}
          autoCapitalize="none"
          style={{
            borderWidth: 1,
            borderColor: '#e5e7eb',
            borderRadius: 16,
            paddingHorizontal: 16,
            paddingVertical: 14,
            fontSize: 16,
          }}
        />

        <TextInput
          placeholder="Notes (optional)"
          value={notes}
          onChangeText={setNotes}
          multiline
          textAlignVertical="top"
          style={{
            minHeight: 120,
            borderWidth: 1,
            borderColor: '#e5e7eb',
            borderRadius: 16,
            paddingHorizontal: 16,
            paddingVertical: 14,
            fontSize: 16,
          }}
        />

        {error ? <Text style={{ color: '#dc2626' }}>{error}</Text> : null}

        <Pressable
          disabled={createSessionMutation.isPending}
          onPress={handleSubmit}
          style={{
            minHeight: 56,
            borderRadius: 16,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#16a34a',
          }}
        >
          {createSessionMutation.isPending ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={{ color: '#ffffff', fontWeight: '600', fontSize: 16 }}>Create session</Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
