import { FastifyInstance, FastifyRequest } from 'fastify';
import { MultipartFile } from '@fastify/multipart';
import { prisma } from '@nexvo/database';
import { storageService } from '../../services/storage.js';
import {
  avatarUploadSchema,
  attachmentUploadSchema,
  deleteUploadSchema,
} from './uploads.validation.js';
import { UploadFolder } from '../../lib/upload.js';

/**
 * Upload routes for handling file uploads
 */
export async function uploadRoutes(fastify: FastifyInstance) {
  /**
   * Upload user avatar
   * POST /api/v1/uploads/avatar
   */
  fastify.post('/avatar', async (request, reply) => {
    try {
      // Get multipart file
      const data = await request.file();

      if (!data) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'NO_FILE',
            message: 'No file uploaded',
          },
        });
      }

      // Get file buffer
      const buffer = await data.toBuffer();

      // Validate file
      const validation = avatarUploadSchema.safeParse({
        mimeType: data.mimetype,
        size: buffer.length,
      });

      if (!validation.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: validation.error.errors[0].message,
            details: validation.error.errors,
          },
        });
      }

      // TODO: Get user info from auth middleware
      // For now, we'll use placeholder values
      const userId = (request as any).user?.id || null;
      const organizationId = (request as any).user?.organizationId || 'default';

      // Upload to storage
      const { url, filename } = await storageService.uploadFromBuffer(
        buffer,
        UploadFolder.AVATARS,
        data.filename,
        data.mimetype
      );

      // Save upload record
      const upload = await prisma.upload.create({
        data: {
          organizationId,
          userId,
          filename,
          originalName: data.filename,
          mimeType: data.mimetype,
          size: buffer.length,
          url,
          folder: UploadFolder.AVATARS,
        },
      });

      return {
        success: true,
        data: {
          id: upload.id,
          url: upload.url,
          filename: upload.filename,
          originalName: upload.originalName,
          size: upload.size,
          mimeType: upload.mimeType,
        },
      };
    } catch (error: any) {
      fastify.log.error('Avatar upload error:', error);

      return reply.status(500).send({
        success: false,
        error: {
          code: 'UPLOAD_FAILED',
          message: 'Failed to upload avatar',
        },
      });
    }
  });

  /**
   * Upload chat attachment
   * POST /api/v1/uploads/attachment
   */
  fastify.post('/attachment', async (request, reply) => {
    try {
      // Get multipart file
      const data = await request.file();

      if (!data) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'NO_FILE',
            message: 'No file uploaded',
          },
        });
      }

      // Get file buffer
      const buffer = await data.toBuffer();

      // Validate file
      const validation = attachmentUploadSchema.safeParse({
        mimeType: data.mimetype,
        size: buffer.length,
      });

      if (!validation.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: validation.error.errors[0].message,
            details: validation.error.errors,
          },
        });
      }

      // TODO: Get user info from auth middleware
      const userId = (request as any).user?.id || null;
      const organizationId = (request as any).user?.organizationId || 'default';

      // Upload to storage
      const { url, filename } = await storageService.uploadFromBuffer(
        buffer,
        UploadFolder.ATTACHMENTS,
        data.filename,
        data.mimetype
      );

      // Save upload record
      const upload = await prisma.upload.create({
        data: {
          organizationId,
          userId,
          filename,
          originalName: data.filename,
          mimeType: data.mimetype,
          size: buffer.length,
          url,
          folder: UploadFolder.ATTACHMENTS,
        },
      });

      return {
        success: true,
        data: {
          id: upload.id,
          url: upload.url,
          filename: upload.filename,
          originalName: upload.originalName,
          size: upload.size,
          mimeType: upload.mimeType,
        },
      };
    } catch (error: any) {
      fastify.log.error('Attachment upload error:', error);

      return reply.status(500).send({
        success: false,
        error: {
          code: 'UPLOAD_FAILED',
          message: 'Failed to upload attachment',
        },
      });
    }
  });

  /**
   * Delete upload
   * DELETE /api/v1/uploads/:id
   * Note: Admin only - should add auth middleware
   */
  fastify.delete('/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      // Validate ID
      const validation = deleteUploadSchema.safeParse({ id });

      if (!validation.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid upload ID',
          },
        });
      }

      // Find upload
      const upload = await prisma.upload.findUnique({
        where: { id },
      });

      if (!upload) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Upload not found',
          },
        });
      }

      // TODO: Check if user has permission to delete
      // const userId = (request as any).user?.id;
      // const userRole = (request as any).user?.role;

      try {
        // Delete from storage
        await storageService.deleteFile(upload.url);
      } catch (error) {
        fastify.log.error('Failed to delete file from storage:', error);
        // Continue with database deletion even if storage deletion fails
      }

      // Delete from database
      await prisma.upload.delete({
        where: { id },
      });

      return {
        success: true,
        message: 'Upload deleted successfully',
      };
    } catch (error: any) {
      fastify.log.error('Delete upload error:', error);

      return reply.status(500).send({
        success: false,
        error: {
          code: 'DELETE_FAILED',
          message: 'Failed to delete upload',
        },
      });
    }
  });

  /**
   * List uploads
   * GET /api/v1/uploads
   * Note: Should add auth middleware and filter by organization
   */
  fastify.get('/', async (request, reply) => {
    try {
      const { folder, page = 1, limit = 20 } = request.query as any;

      // TODO: Get organization from auth
      // const organizationId = (request as any).user?.organizationId;

      const where = folder ? { folder } : {};

      const uploads = await prisma.upload.findMany({
        where,
        take: Number(limit),
        skip: (Number(page) - 1) * Number(limit),
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          filename: true,
          originalName: true,
          mimeType: true,
          size: true,
          url: true,
          folder: true,
          createdAt: true,
        },
      });

      const total = await prisma.upload.count({ where });

      return {
        success: true,
        data: uploads,
        meta: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit)),
        },
      };
    } catch (error: any) {
      fastify.log.error('List uploads error:', error);

      return reply.status(500).send({
        success: false,
        error: {
          code: 'LIST_FAILED',
          message: 'Failed to list uploads',
        },
      });
    }
  });

  /**
   * Get signed URL for private access
   * GET /api/v1/uploads/:id/signed-url
   */
  fastify.get('/:id/signed-url', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const { expiresIn = 3600 } = request.query as any;

      // Find upload
      const upload = await prisma.upload.findUnique({
        where: { id },
      });

      if (!upload) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Upload not found',
          },
        });
      }

      // Generate signed URL
      const signedUrl = await storageService.getSignedUrl(
        upload.url,
        Number(expiresIn)
      );

      return {
        success: true,
        data: {
          url: signedUrl,
          expiresIn: Number(expiresIn),
        },
      };
    } catch (error: any) {
      fastify.log.error('Signed URL error:', error);

      return reply.status(500).send({
        success: false,
        error: {
          code: 'SIGNED_URL_FAILED',
          message: 'Failed to generate signed URL',
        },
      });
    }
  });
}
