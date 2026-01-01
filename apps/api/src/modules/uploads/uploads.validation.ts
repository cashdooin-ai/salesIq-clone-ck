import { z } from 'zod';
import {
  AVATAR_MIME_TYPES,
  ATTACHMENT_MIME_TYPES,
  MAX_FILE_SIZES,
} from '../../lib/upload.js';

/**
 * Validate avatar upload
 */
export const avatarUploadSchema = z.object({
  mimeType: z.string().refine(
    (mime) => AVATAR_MIME_TYPES.includes(mime.toLowerCase()),
    {
      message: `Invalid file type. Allowed types: ${AVATAR_MIME_TYPES.join(', ')}`,
    }
  ),
  size: z.number().max(MAX_FILE_SIZES.avatar, {
    message: `File size must be less than ${MAX_FILE_SIZES.avatar / (1024 * 1024)}MB`,
  }),
});

/**
 * Validate attachment upload
 */
export const attachmentUploadSchema = z.object({
  mimeType: z.string().refine(
    (mime) => ATTACHMENT_MIME_TYPES.includes(mime.toLowerCase()),
    {
      message: `Invalid file type. Allowed types: images, documents (PDF, DOC, DOCX, XLS, XLSX, TXT), and ZIP files`,
    }
  ),
  size: z.number().max(MAX_FILE_SIZES.attachment, {
    message: `File size must be less than ${MAX_FILE_SIZES.attachment / (1024 * 1024)}MB`,
  }),
});

/**
 * Validate widget upload (stricter limits)
 */
export const widgetUploadSchema = z.object({
  mimeType: z.string().refine(
    (mime) => ATTACHMENT_MIME_TYPES.includes(mime.toLowerCase()),
    {
      message: `Invalid file type`,
    }
  ),
  size: z.number().max(MAX_FILE_SIZES.widget, {
    message: `File size must be less than ${MAX_FILE_SIZES.widget / (1024 * 1024)}MB`,
  }),
});

/**
 * Delete upload schema
 */
export const deleteUploadSchema = z.object({
  id: z.string().cuid(),
});
