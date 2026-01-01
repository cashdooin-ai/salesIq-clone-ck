import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl as getS3SignedUrl } from '@aws-sdk/s3-request-presigner';
import { config } from '../config/index.js';
import { generateUniqueFilename } from '../lib/upload.js';
import { Readable } from 'stream';

/**
 * S3-compatible storage service for MinIO/S3
 */
class StorageService {
  private s3Client: S3Client;
  private bucket: string;
  private endpoint: string;

  constructor() {
    const { s3 } = config;

    // Initialize S3 client with MinIO/S3 configuration
    this.s3Client = new S3Client({
      endpoint: s3.endpoint,
      region: s3.region,
      credentials: {
        accessKeyId: s3.accessKey,
        secretAccessKey: s3.secretKey,
      },
      forcePathStyle: true, // Required for MinIO
    });

    this.bucket = s3.bucket;
    this.endpoint = s3.endpoint;
  }

  /**
   * Initialize storage - create bucket if it doesn't exist
   */
  async initialize(): Promise<void> {
    try {
      // Check if bucket exists
      await this.s3Client.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch (error: any) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        // Create bucket if it doesn't exist
        await this.s3Client.send(new CreateBucketCommand({ Bucket: this.bucket }));
        console.log(`Created bucket: ${this.bucket}`);
      } else {
        console.error('Error initializing storage:', error);
        throw error;
      }
    }
  }

  /**
   * Upload a file to storage
   * @param file - File buffer or stream
   * @param folder - Folder path (e.g., 'avatars', 'attachments')
   * @param originalName - Original filename
   * @param mimeType - File MIME type
   * @returns Object with file URL and key
   */
  async uploadFile(
    file: Buffer | Readable,
    folder: string,
    originalName: string,
    mimeType: string
  ): Promise<{ url: string; key: string; filename: string }> {
    try {
      // Generate unique filename
      const filename = generateUniqueFilename(originalName);
      const key = `${folder}/${filename}`;

      // Upload to S3
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file,
        ContentType: mimeType,
        // Make files publicly accessible (adjust ACL based on your needs)
        // ACL: 'public-read', // Note: MinIO might not support ACL
      });

      await this.s3Client.send(command);

      // Construct public URL
      const url = `${this.endpoint}/${this.bucket}/${key}`;

      return { url, key, filename };
    } catch (error) {
      console.error('Error uploading file:', error);
      throw new Error('Failed to upload file');
    }
  }

  /**
   * Delete a file from storage
   * @param key - File key or full URL
   */
  async deleteFile(key: string): Promise<void> {
    try {
      // Extract key from URL if full URL is provided
      const fileKey = this.extractKeyFromUrl(key);

      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: fileKey,
      });

      await this.s3Client.send(command);
    } catch (error) {
      console.error('Error deleting file:', error);
      throw new Error('Failed to delete file');
    }
  }

  /**
   * Get a signed URL for temporary access
   * @param key - File key
   * @param expiresIn - Expiration time in seconds (default: 3600 = 1 hour)
   * @returns Signed URL
   */
  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    try {
      // Extract key from URL if full URL is provided
      const fileKey = this.extractKeyFromUrl(key);

      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: fileKey,
      });

      const signedUrl = await getS3SignedUrl(this.s3Client, command, { expiresIn });
      return signedUrl;
    } catch (error) {
      console.error('Error generating signed URL:', error);
      throw new Error('Failed to generate signed URL');
    }
  }

  /**
   * Upload file from buffer with metadata
   * Convenience method that wraps uploadFile
   */
  async uploadFromBuffer(
    buffer: Buffer,
    folder: string,
    originalName: string,
    mimeType: string
  ): Promise<{ url: string; key: string; filename: string }> {
    return this.uploadFile(buffer, folder, originalName, mimeType);
  }

  /**
   * Upload file from stream
   * Convenience method for streaming uploads
   */
  async uploadFromStream(
    stream: Readable,
    folder: string,
    originalName: string,
    mimeType: string
  ): Promise<{ url: string; key: string; filename: string }> {
    return this.uploadFile(stream, folder, originalName, mimeType);
  }

  /**
   * Extract key from URL
   * Handles both full URLs and direct keys
   */
  private extractKeyFromUrl(urlOrKey: string): string {
    if (!urlOrKey.startsWith('http')) {
      return urlOrKey;
    }

    // Extract key from URL: http://endpoint/bucket/folder/file.ext -> folder/file.ext
    const url = new URL(urlOrKey);
    const pathParts = url.pathname.split('/').filter(Boolean);

    // Remove bucket name from path if present
    if (pathParts[0] === this.bucket) {
      pathParts.shift();
    }

    return pathParts.join('/');
  }

  /**
   * Check if storage is healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.s3Client.send(new HeadBucketCommand({ Bucket: this.bucket }));
      return true;
    } catch (error) {
      console.error('Storage health check failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const storageService = new StorageService();

// Initialize storage on module load (async, non-blocking)
storageService.initialize().catch((error) => {
  console.error('Failed to initialize storage:', error);
});
