import { mkdir, writeFile, readFile, unlink, stat } from 'fs/promises';
import { join, dirname } from 'path';
import { createReadStream, createWriteStream } from 'fs';

const BLOB_BASE_PATH = join(process.cwd(), 'src', 'blob');

export type AssetType = 'characters' | 'scenes' | 'objects' | 'frames' | 'videos' | 'images' | 'temp';

export async function initBlobStore() {
  try {
    await mkdir(BLOB_BASE_PATH, { recursive: true });
    console.log('💾 Blob store initialized');
  } catch (error) {
    console.error('🚨 Error initializing blob store:', error);
    throw error;
  }
}

export function getBlobPath(projectId: string, type: AssetType, filename: string): string {
  return join(BLOB_BASE_PATH, projectId, type, filename);
}

export function getBlobUrl(projectId: string, type: AssetType, filename: string): string {
  return `/blob/${projectId}/${type}/${filename}`;
}

export async function saveBlobFile(
  projectId: string,
  type: AssetType,
  filename: string,
  data: Buffer | Uint8Array | string
): Promise<string> {
  const filePath = getBlobPath(projectId, type, filename);

  try {
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, data);

    const url = getBlobUrl(projectId, type, filename);
    console.log(`💾 Saved blob: ${url}`);
    return url;
  } catch (error) {
    console.error('🚨 Error saving blob file:', error);
    throw new Error(`Failed to save blob file: ${error}`);
  }
}

export async function getBlobFile(projectId: string, type: AssetType, filename: string): Promise<Buffer> {
  const filePath = getBlobPath(projectId, type, filename);

  try {
    const data = await readFile(filePath);
    return data;
  } catch (error) {
    console.error('🚨 Error reading blob file:', error);
    throw new Error(`Failed to read blob file: ${error}`);
  }
}

export function getBlobFileStream(projectId: string, type: AssetType, filename: string) {
  const filePath = getBlobPath(projectId, type, filename);
  return createReadStream(filePath);
}

export function createBlobFileStream(projectId: string, type: AssetType, filename: string) {
  const filePath = getBlobPath(projectId, type, filename);
  return createWriteStream(filePath);
}

export async function deleteBlobFile(projectId: string, type: AssetType, filename: string): Promise<void> {
  const filePath = getBlobPath(projectId, type, filename);

  try {
    await unlink(filePath);
    console.log(`🗑️  Deleted blob: ${getBlobUrl(projectId, type, filename)}`);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      console.error('🚨 Error deleting blob file:', error);
      throw new Error(`Failed to delete blob file: ${error}`);
    }
  }
}

export async function blobFileExists(projectId: string, type: AssetType, filename: string): Promise<boolean> {
  const filePath = getBlobPath(projectId, type, filename);

  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function getBlobFileInfo(projectId: string, type: AssetType, filename: string) {
  const filePath = getBlobPath(projectId, type, filename);

  try {
    const stats = await stat(filePath);
    return {
      size: stats.size,
      created: stats.birthtime,
      modified: stats.mtime,
      url: getBlobUrl(projectId, type, filename)
    };
  } catch (error) {
    throw new Error(`File not found: ${error}`);
  }
}

export async function cleanupProjectBlobs(projectId: string): Promise<void> {
  const projectPath = join(BLOB_BASE_PATH, projectId);

  try {
    const { rm } = await import('fs/promises');
    await rm(projectPath, { recursive: true, force: true });
    console.log(`🧹 Cleaned up blobs for project: ${projectId}`);
  } catch (error) {
    console.error('🚨 Error cleaning up project blobs:', error);
  }
}

export function generateAssetFilename(type: AssetType, extension: string, prefix?: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const baseName = prefix ? `${prefix}_${timestamp}_${random}` : `${timestamp}_${random}`;
  return `${baseName}.${extension}`;
}