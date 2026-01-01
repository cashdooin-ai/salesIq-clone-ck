import { v4 as uuidv4 } from 'uuid';
import path from 'path';

/**
 * Allowed MIME types for different upload contexts
 */
export const ALLOWED_MIME_TYPES = {
  images: [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
  ],
  documents: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
    'text/plain',
  ],
  archives: [
    'application/zip',
    'application/x-zip-compressed',
  ],
};

/**
 * All allowed MIME types for attachments (images + documents + archives)
 */
export const ATTACHMENT_MIME_TYPES = [
  ...ALLOWED_MIME_TYPES.images,
  ...ALLOWED_MIME_TYPES.documents,
  ...ALLOWED_MIME_TYPES.archives,
];

/**
 * Avatar-specific MIME types (images only)
 */
export const AVATAR_MIME_TYPES = ALLOWED_MIME_TYPES.images;

/**
 * Max file sizes in bytes
 */
export const MAX_FILE_SIZES = {
  avatar: 2 * 1024 * 1024, // 2MB
  attachment: 10 * 1024 * 1024, // 10MB
  widget: 5 * 1024 * 1024, // 5MB for widget uploads
};

/**
 * Upload folders
 */
export enum UploadFolder {
  AVATARS = 'avatars',
  ATTACHMENTS = 'attachments',
  WIDGET = 'widget',
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  return ext.startsWith('.') ? ext.substring(1) : ext;
}

/**
 * Check if MIME type is allowed
 */
export function isAllowedMimeType(mimeType: string, allowedTypes: string[]): boolean {
  return allowedTypes.includes(mimeType.toLowerCase());
}

/**
 * Generate unique filename with UUID
 */
export function generateUniqueFilename(originalName: string): string {
  const extension = getFileExtension(originalName);
  const uuid = uuidv4();
  return extension ? `${uuid}.${extension}` : uuid;
}

/**
 * Format file size to human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Validate file size
 */
export function validateFileSize(size: number, maxSize: number): boolean {
  return size <= maxSize;
}

/**
 * Get content type category
 */
export function getContentTypeCategory(mimeType: string): 'image' | 'document' | 'archive' | 'other' {
  if (ALLOWED_MIME_TYPES.images.includes(mimeType)) {
    return 'image';
  }
  if (ALLOWED_MIME_TYPES.documents.includes(mimeType)) {
    return 'document';
  }
  if (ALLOWED_MIME_TYPES.archives.includes(mimeType)) {
    return 'archive';
  }
  return 'other';
}

/**
 * Sanitize filename - remove special characters
 */
export function sanitizeFilename(filename: string): string {
  // Keep only alphanumeric, dots, dashes, and underscores
  return filename.replace(/[^a-zA-Z0-9._-]/g, '_');
}

/**
 * Extract file info from multipart file
 */
export interface FileInfo {
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
}

export function extractFileInfo(file: any): FileInfo {
  return {
    filename: file.filename,
    originalName: file.filename,
    mimeType: file.mimetype,
    size: file.file ? file.file.bytesRead : 0,
  };
}
