import { useMutation, useQueryClient } from '@tanstack/react-query';
import DateTimePicker from '@react-native-community/datetimepicker';
import type { DateTimePickerEvent } from '@react-native-community/datetimepicker';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppLoadingScreen from '../../src/components/AppLoadingScreen';
import { useAuth } from '../../src/context/AuthContext';
import { apiPost } from '../../src/services/api';
import { SessionSummary } from '../../src/types/api';

const petTypes = ['dog', 'cat', 'other'] as const;

function toSessionDateIso(date: Date) {
  return new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0, 0)
  ).toISOString();
}

function toDisplayDate(date: Date) {
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function NewSessionScreen() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const [petName, setPetName] = useState('');
  const [petType, setPetType] = useState<(typeof petTypes)[number]>('dog');
  const [ownerName, setOwnerName] = useState('');
  const [ownerContact, setOwnerContact] = useState('');
  const [startDate, setStartDate] = useState(() => new Date());
  const [endDate, setEndDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
  });
  const [activeDateField, setActiveDateField] = useState<'start' | 'end' | null>(null);
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

      if (endDate < startDate) {
        throw new Error('End date must be on or after start date');
      }

      return apiPost<SessionSummary>('/api/sessions', {
        petName: petName.trim(),
        petType,
        ownerName: ownerName.trim(),
        ownerContact: ownerContact.trim() || undefined,
        startDate: toSessionDateIso(startDate),
        endDate: toSessionDateIso(endDate),
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

  function handleDateChange(event: DateTimePickerEvent, selectedDate?: Date) {
    if (Platform.OS === 'android') {
      setActiveDateField(null);
    }

    if (!selectedDate || event.type === 'dismissed' || !activeDateField) {
      return;
    }

    if (activeDateField === 'start') {
      setStartDate(selectedDate);

      if (selectedDate > endDate) {
        setEndDate(selectedDate);
      }

      return;
    }

    if (selectedDate < startDate) {
      setEndDate(startDate);
      return;
    }

    setEndDate(selectedDate);
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.select({ ios: 'padding', default: undefined })}
      style={{ flex: 1, backgroundColor: '#ffffff' }}
    >
      <ScrollView
        contentContainerStyle={{
          padding: 24,
          paddingTop: insets.top + 24,
          paddingBottom: insets.bottom + 24,
          gap: 16,
        }}
      >
        <Pressable
          onPress={() => router.replace('/(tabs)')}
          style={{ alignSelf: 'flex-start', paddingVertical: 6 }}
        >
          <Text style={{ fontSize: 15, fontWeight: '600', color: '#16a34a' }}>
            Back to sessions
          </Text>
        </Pressable>

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

        <View style={{ gap: 10 }}>
          <Text style={{ fontSize: 15, fontWeight: '600', color: '#374151' }}>Session dates</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Pressable
              onPress={() => setActiveDateField('start')}
              style={{
                flex: 1,
                borderWidth: 1,
                borderColor: '#e5e7eb',
                borderRadius: 16,
                paddingHorizontal: 16,
                paddingVertical: 14,
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#6b7280' }}>Start date</Text>
              <Text style={{ marginTop: 4, fontSize: 16, color: '#111827' }}>{toDisplayDate(startDate)}</Text>
            </Pressable>

            <Pressable
              onPress={() => setActiveDateField('end')}
              style={{
                flex: 1,
                borderWidth: 1,
                borderColor: '#e5e7eb',
                borderRadius: 16,
                paddingHorizontal: 16,
                paddingVertical: 14,
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#6b7280' }}>End date</Text>
              <Text style={{ marginTop: 4, fontSize: 16, color: '#111827' }}>{toDisplayDate(endDate)}</Text>
            </Pressable>
          </View>

          {activeDateField ? (
            <View
              style={{
                borderRadius: 16,
                borderWidth: 1,
                borderColor: '#e5e7eb',
                backgroundColor: '#f9fafb',
                padding: 12,
                gap: 8,
              }}
            >
              <DateTimePicker
                value={activeDateField === 'start' ? startDate : endDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleDateChange}
                minimumDate={activeDateField === 'end' ? startDate : undefined}
              />
              {Platform.OS === 'ios' ? (
                <Pressable
                  onPress={() => setActiveDateField(null)}
                  style={{
                    alignSelf: 'flex-end',
                    borderRadius: 999,
                    backgroundColor: '#16a34a',
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#ffffff' }}>Done</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
        </View>

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
