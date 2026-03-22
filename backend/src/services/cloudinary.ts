import { v2 as cloudinary } from 'cloudinary';

if (!process.env.CLOUDINARY_URL) {
  throw new Error('CLOUDINARY_URL environment variable is required');
}

cloudinary.config({
  secure: true,
});

export interface UploadResult {
  public_id: string;
  secure_url: string;
  width: number;
  height: number;
  format: string;
  resource_type: string;
  bytes: number;
  created_at: string;
}

export class CloudinaryService {
  static async uploadMedia(
    buffer: Buffer,
    options: {
      folder?: string;
      public_id?: string;
      resource_type?: 'image' | 'video';
      transformation?: any;
    } = {}
  ): Promise<UploadResult> {
    try {
      const result = await new Promise<UploadResult>((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          {
            folder: options.folder || 'tailtimes',
            resource_type: options.resource_type || 'auto',
            public_id: options.public_id,
            transformation: options.transformation || [
              { quality: 'auto', fetch_format: 'auto' }
            ],
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result as UploadResult);
          }
        ).end(buffer);
      });

      return result;
    } catch (error) {
      console.error('Cloudinary upload error:', error);
      throw new Error('Failed to upload media');
    }
  }

  static async deleteMedia(publicId: string): Promise<boolean> {
    try {
      const result = await cloudinary.uploader.destroy(publicId);
      return result.result === 'ok';
    } catch (error) {
      console.error('Cloudinary delete error:', error);
      return false;
    }
  }

  static generateTransformation(options: {
    width?: number;
    height?: number;
    crop?: string;
    quality?: string | number;
  }) {
    return {
      width: options.width,
      height: options.height,
      crop: options.crop || 'limit',
      quality: options.quality || 'auto',
      fetch_format: 'auto',
    };
  }

  // Generate a signed upload signature for direct mobile uploads.
  // The mobile app sends this to Cloudinary directly — no file passes through the backend.
  static generateSignature(params: Record<string, string | number>): string {
    const stringToSign = Object.keys(params)
      .sort()
      .map((key) => `${key}=${params[key]}`)
      .join('&');
    return cloudinary.utils.api_sign_request(params, process.env.CLOUDINARY_API_SECRET || '');
  }

  static generateThumbnail(publicId: string, options: {
    width?: number;
    height?: number;
  } = {}) {
    return cloudinary.url(publicId, {
      transformation: this.generateTransformation({
        width: options.width || 300,
        height: options.height || 300,
        crop: 'fill',
        quality: 'auto',
      })
    });
  }
}