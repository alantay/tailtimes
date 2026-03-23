export interface SitterProfile {
  id: string;
  name: string;
  email: string;
  bio?: string | null;
  phone?: string | null;
  location?: string | null;
  profileImage?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SessionStats {
  totalUpdates: number;
  totalPhotos: number;
  totalVideos: number;
  lastUpdateAt: string | null;
}

export interface SessionSummary {
  id: string;
  sitterId: string;
  petName: string;
  petType: string;
  ownerName: string;
  ownerContact?: string | null;
  startDate: string;
  endDate?: string | null;
  shareLink: string;
  isActive: boolean;
  isPublic: boolean;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  stats: SessionStats;
}

export interface SessionUpdate {
  id: string;
  sessionId: string;
  type: 'photo' | 'video';
  mediaUrl: string;
  caption?: string | null;
  metadata?: Record<string, unknown> | null;
  isPublic: boolean;
  createdAt: string;
}

export interface SessionDetail extends SessionSummary {
  updates: SessionUpdate[];
}
