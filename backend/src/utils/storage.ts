import { getDatabase } from './database.js';

export interface StorageConfig {
  bucket: string;
  folder?: string;
}

export interface UploadResult {
  url: string;
  path: string;
  size: number;
}

/**
 * Upload a file buffer to Supabase Storage
 */
export async function uploadFile(
  buffer: Buffer,
  fileName: string,
  mimeType: string,
  config: StorageConfig = { bucket: 'htn2025' }
): Promise<UploadResult> {
  const supabase = getDatabase();
  const folder = config.folder || '';
  const path = folder ? `${folder}/${fileName}` : fileName;

  const { data, error } = await supabase.storage
    .from(config.bucket)
    .upload(path, buffer, {
      contentType: mimeType,
      upsert: false
    });

  if (error) {
    console.error('❌ Error uploading file:', error);
    throw new Error(`Failed to upload file: ${error.message}`);
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from(config.bucket)
    .getPublicUrl(data.path);

  console.log(`📤 Uploaded file: ${data.path} (${buffer.length} bytes)`);

  return {
    url: urlData.publicUrl,
    path: data.path,
    size: buffer.length
  };
}

/**
 * Upload a base64 encoded image to Supabase Storage
 */
export async function uploadBase64Image(
  base64Data: string,
  fileName: string,
  config: StorageConfig = { bucket: 'htn2025', folder: 'images' }
): Promise<UploadResult> {
  // Remove data URL prefix if present
  const base64 = base64Data.replace(/^data:image\/[^;]+;base64,/, '');

  // Convert base64 to buffer
  const buffer = Buffer.from(base64, 'base64');

  // Determine MIME type from base64 data
  let mimeType = 'image/png'; // default
  if (base64Data.startsWith('data:image/jpeg')) {
    mimeType = 'image/jpeg';
  } else if (base64Data.startsWith('data:image/gif')) {
    mimeType = 'image/gif';
  } else if (base64Data.startsWith('data:image/webp')) {
    mimeType = 'image/webp';
  }

  return uploadFile(buffer, fileName, mimeType, config);
}

/**
 * Delete a file from Supabase Storage
 */
export async function deleteFile(
  path: string,
  bucket: string = 'media'
): Promise<void> {
  const supabase = getDatabase();

  const { error } = await supabase.storage
    .from(bucket)
    .remove([path]);

  if (error) {
    console.error('❌ Error deleting file:', error);
    throw new Error(`Failed to delete file: ${error.message}`);
  }

  console.log(`🗑️  Deleted file: ${path}`);
}

/**
 * Get public URL for a file
 */
export function getPublicUrl(path: string, bucket: string = 'media'): string {
  const supabase = getDatabase();
  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(path);

  return data.publicUrl;
}

/**
 * Generate a unique filename for uploaded files
 */
export function generateFileName(originalName: string, prefix?: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const extension = originalName.split('.').pop() || 'png';
  const baseName = prefix ? `${prefix}_${timestamp}_${random}` : `${timestamp}_${random}`;

  return `${baseName}.${extension}`;
}

/**
 * Storage configurations for different types of media
 */
export const StorageConfigs = {
  character: { bucket: 'htn2025', folder: 'characters' },
  scene: { bucket: 'htn2025', folder: 'scenes' },
  object: { bucket: 'htn2025', folder: 'objects' },
  frame: { bucket: 'htn2025', folder: 'frames' },
  video: { bucket: 'htn2025', folder: 'videos' }
} as const;
