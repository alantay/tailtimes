import * as ImagePicker from 'expo-image-picker';
import { apiGet, apiPost } from './api';
import { SessionUpdate, SessionUpdateTag } from '../types/api';

const publicCloudName = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME;
const publicUploadPreset = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

export interface UploadableAsset {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
  type: 'photo' | 'video';
  width?: number;
  height?: number;
  duration?: number | null;
}

interface SignedUploadResponse {
  success: boolean;
  data: {
    signature: string;
    timestamp: number;
    cloudName?: string;
    apiKey?: string;
  };
}

interface CloudinaryUploadResponse {
  public_id: string;
  secure_url: string;
  resource_type: 'image' | 'video' | 'raw' | string;
  bytes?: number;
  width?: number;
  height?: number;
  duration?: number;
  format?: string;
  original_filename?: string;
}

interface StoredSessionUpdate extends SessionUpdate {
  thumbnailUrl?: string;
}

interface UploadOptions {
  sessionId: string;
  asset: UploadableAsset;
  caption?: string;
  tags?: SessionUpdateTag[];
}

type UploadConfig =
  | {
      mode: 'signed';
      signature: string;
      timestamp: number;
      cloudName: string;
      apiKey: string;
    }
  | {
      mode: 'unsigned';
      cloudName: string;
      uploadPreset: string;
    };

function getAssetFileExtension(asset: UploadableAsset) {
  if (asset.fileName?.includes('.')) {
    return asset.fileName.split('.').pop() ?? 'jpg';
  }

  if (asset.mimeType?.includes('/')) {
    return asset.mimeType.split('/').pop() ?? 'jpg';
  }

  return asset.type === 'video' ? 'mp4' : 'jpg';
}

function getAssetMimeType(asset: UploadableAsset) {
  if (asset.mimeType) {
    return asset.mimeType;
  }

  return asset.type === 'video' ? 'video/mp4' : 'image/jpeg';
}

function getAssetFileName(asset: UploadableAsset) {
  if (asset.fileName?.trim()) {
    return asset.fileName;
  }

  const extension = getAssetFileExtension(asset);
  const prefix = asset.type === 'video' ? 'tailtimes-video' : 'tailtimes-photo';
  return `${prefix}-${Date.now()}.${extension}`;
}

async function getUploadConfig(): Promise<UploadConfig> {
  try {
    const response = await apiGet<SignedUploadResponse>('/api/media/sign');
    const cloudName = response.data.cloudName || publicCloudName;

    if (response.data.signature && response.data.timestamp && response.data.apiKey && cloudName) {
      return {
        mode: 'signed',
        signature: response.data.signature,
        timestamp: response.data.timestamp,
        cloudName,
        apiKey: response.data.apiKey,
      };
    }
  } catch (error) {
    if (!publicCloudName || !publicUploadPreset) {
      throw error;
    }
  }

  if (!publicCloudName || !publicUploadPreset) {
    throw new Error('Cloudinary upload is not configured');
  }

  return {
    mode: 'unsigned',
    cloudName: publicCloudName,
    uploadPreset: publicUploadPreset,
  };
}

async function uploadToCloudinary(asset: UploadableAsset) {
  const uploadConfig = await getUploadConfig();
  const formData = new FormData();

  formData.append('file', {
    uri: asset.uri,
    type: getAssetMimeType(asset),
    name: getAssetFileName(asset),
  } as never);

  if (uploadConfig.mode === 'signed') {
    formData.append('api_key', uploadConfig.apiKey);
    formData.append('timestamp', String(uploadConfig.timestamp));
    formData.append('signature', uploadConfig.signature);
  } else {
    formData.append('upload_preset', uploadConfig.uploadPreset);
  }

  const uploadResponse = await fetch(
    `https://api.cloudinary.com/v1_1/${uploadConfig.cloudName}/auto/upload`,
    {
      method: 'POST',
      body: formData,
    }
  );

  const rawBody = await uploadResponse.text();
  const parsedBody = rawBody ? JSON.parse(rawBody) : null;

  if (!uploadResponse.ok) {
    const message =
      parsedBody?.error?.message || parsedBody?.error || 'Cloudinary upload failed';
    throw new Error(message);
  }

  return parsedBody as CloudinaryUploadResponse;
}

export async function uploadAssetToCloudinary(asset: UploadableAsset) {
  return uploadToCloudinary(asset);
}

export function toUploadableAsset(
  asset: Pick<
    ImagePicker.ImagePickerAsset,
    'uri' | 'fileName' | 'mimeType' | 'type' | 'width' | 'height' | 'duration'
  >
): UploadableAsset {
  return {
    uri: asset.uri,
    fileName: asset.fileName,
    mimeType: asset.mimeType,
    type: asset.type === 'video' ? 'video' : 'photo',
    width: asset.width,
    height: asset.height,
    duration: asset.duration,
  };
}

export async function uploadSessionMedia(options: UploadOptions) {
  const uploadResult = await uploadAssetToCloudinary(options.asset);

  return apiPost<StoredSessionUpdate>(`/api/sessions/${options.sessionId}/updates`, {
    cloudinaryPublicId: uploadResult.public_id,
    mediaUrl: uploadResult.secure_url,
    type: uploadResult.resource_type === 'video' ? 'video' : 'photo',
    caption: options.caption?.trim() || undefined,
    tags: options.tags,
    metadata: {
      bytes: uploadResult.bytes,
      width: uploadResult.width,
      height: uploadResult.height,
      duration: uploadResult.duration,
      format: uploadResult.format,
      originalFilename: uploadResult.original_filename || getAssetFileName(options.asset),
    },
  });
}
