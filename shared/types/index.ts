export type MediaType = 'photo' | 'video';
export type SessionStatus = 'upcoming' | 'live' | 'ended';
export type SessionUpdateTag = 'walks' | 'food' | 'lounging' | 'sleeping' | 'misc';

export interface SessionStats {
  totalUpdates: number;
  totalPhotos: number;
  totalVideos: number;
  lastUpdateAt: string | null;
}

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

export interface PublicSitterProfile {
  name: string;
  bio?: string | null;
  location?: string | null;
  profileImage?: string | null;
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
  status: SessionStatus;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  stats: SessionStats;
}

export interface SessionUpdate {
  id: string;
  sessionId: string;
  type: MediaType;
  mediaUrl: string;
  caption?: string | null;
  tags?: SessionUpdateTag[] | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}

export interface SessionDetail extends SessionSummary {
  updates: SessionUpdate[];
}

export interface PublicSessionUpdate {
  id: string;
  type: MediaType;
  mediaUrl: string;
  caption?: string | null;
  tags?: SessionUpdateTag[] | null;
  createdAt: string;
}

export interface PublicSessionFeed {
  session: {
    petName: string;
    petType: string;
    ownerName: string;
    startDate: string;
    endDate?: string | null;
  };
  sitter: {
    name: string;
    profileImage?: string | null;
  };
  updates: PublicSessionUpdate[];
}

export interface CreateSitterInput {
  name: string;
  email: string;
  bio?: string;
  phone?: string;
  location?: string;
}

export interface UpdateSitterInput {
  name?: string;
  bio?: string | null;
  phone?: string | null;
  location?: string | null;
  profileImage?: string | null;
}

export interface CreateSessionInput {
  petName: string;
  petType: string;
  ownerName: string;
  ownerContact?: string;
  startDate: string;
  endDate: string;
  notes?: string;
}

export interface UpdateSessionInput {
  endDate?: string | null;
  notes?: string | null;
  isActive?: boolean;
}

export interface CreateSessionUpdateInput {
  cloudinaryPublicId: string;
  mediaUrl: string;
  type: MediaType;
  caption?: string;
  tags?: SessionUpdateTag[];
  metadata?: Record<string, unknown>;
}
