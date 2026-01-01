import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '@nexvo/database';
import { generateApiKey, slugify, ERROR_CODES } from '@nexvo/shared';
import { signTokens, verifyRefreshToken } from './auth.utils.js';
import { requireAuth } from '../../middleware/index.js';
import { notificationService } from '../../services/notifications.js';
import { config } from '../../config/index.js';

// Validation schemas
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2),
  organizationName: z.string().min(2),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string(),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});

const requestPasswordResetSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token: z.string(),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});

export async function authRoutes(fastify: FastifyInstance) {
  // Register
  fastify.post('/register', async (request, reply) => {
    const body = registerSchema.parse(request.body);

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email: body.email },
    });

    if (existingUser) {
      return reply.status(400).send({
        success: false,
        error: { code: 'ALREADY_EXISTS', message: 'Email already registered' },
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(body.password, 12);

    // Create organization and user
    const organization = await prisma.organization.create({
      data: {
        name: body.organizationName,
        slug: slugify(body.organizationName) + '-' + Date.now().toString(36),
        apiKeys: {
          create: {
            key: generateApiKey(),
            name: 'Default API Key',
          },
        },
        users: {
          create: {
            email: body.email,
            passwordHash,
            name: body.name,
            role: 'OWNER',
          },
        },
      },
      include: {
        users: true,
        apiKeys: true,
      },
    });

    const user = organization.users[0];
    const tokens = await signTokens(user.id, organization.id);

    // Send welcome email (async, non-blocking)
    notificationService.sendWelcomeEmail(user.id).catch(err => {
      request.log.error({ err, userId: user.id }, 'Failed to send welcome email');
    });

    return {
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          organizationId: organization.id,
          organizationSlug: organization.slug,
        },
        tokens,
        apiKey: organization.apiKeys[0].key,
      },
    };
  });

  // Login
  fastify.post('/login', async (request, reply) => {
    const body = loginSchema.parse(request.body);

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: body.email },
      include: { organization: true },
    });

    if (!user) {
      return reply.status(401).send({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
      });
    }

    // Verify password
    const validPassword = await bcrypt.compare(body.password, user.passwordHash);

    if (!validPassword) {
      return reply.status(401).send({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
      });
    }

    // Update last seen
    await prisma.user.update({
      where: { id: user.id },
      data: { lastSeenAt: new Date(), status: 'ONLINE' },
    });

    const tokens = await signTokens(user.id, user.organizationId);

    return {
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
          role: user.role,
          organizationId: user.organizationId,
          organizationSlug: user.organization.slug,
        },
        tokens,
      },
    };
  });

  // Refresh token
  fastify.post('/refresh', async (request, reply) => {
    const { refreshToken } = request.body as { refreshToken: string };

    if (!refreshToken) {
      return reply.status(401).send({
        success: false,
        error: { code: 'TOKEN_INVALID', message: 'Refresh token required' },
      });
    }

    try {
      const payload = await verifyRefreshToken(refreshToken);
      const tokens = await signTokens(payload.userId, payload.organizationId);

      return { success: true, data: { tokens } };
    } catch {
      return reply.status(401).send({
        success: false,
        error: { code: 'TOKEN_INVALID', message: 'Invalid refresh token' },
      });
    }
  });

  // Get current user
  fastify.get('/me', { preHandler: requireAuth }, async (request, reply) => {
    // User is already attached by requireAuth middleware
    const user = await prisma.user.findUnique({
      where: { id: request.user!.id },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        role: true,
        status: true,
        settings: true,
        organizationId: true,
        departmentId: true,
        createdAt: true,
        lastSeenAt: true,
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            logo: true,
            plan: true,
          },
        },
        department: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!user) {
      return reply.status(404).send({
        success: false,
        error: { code: ERROR_CODES.NOT_FOUND, message: 'User not found' },
      });
    }

    return { success: true, data: user };
  });

  // Update current user profile
  fastify.put('/me', { preHandler: requireAuth }, async (request, reply) => {
    const { name, avatar, settings } = request.body as any;

    const user = await prisma.user.update({
      where: { id: request.user!.id },
      data: {
        ...(name && { name }),
        ...(avatar !== undefined && { avatar }),
        ...(settings && { settings }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        role: true,
        status: true,
        settings: true,
      },
    });

    return { success: true, data: user };
  });

  // Change password
  fastify.post('/change-password', { preHandler: requireAuth }, async (request, reply) => {
    const body = changePasswordSchema.parse(request.body);

    // Get current user with password
    const user = await prisma.user.findUnique({
      where: { id: request.user!.id },
      select: { id: true, passwordHash: true },
    });

    if (!user) {
      return reply.status(404).send({
        success: false,
        error: { code: ERROR_CODES.NOT_FOUND, message: 'User not found' },
      });
    }

    // Verify current password
    const validPassword = await bcrypt.compare(body.currentPassword, user.passwordHash);

    if (!validPassword) {
      return reply.status(400).send({
        success: false,
        error: {
          code: ERROR_CODES.INVALID_CREDENTIALS,
          message: 'Current password is incorrect',
        },
      });
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(body.newPassword, 12);

    // Update password
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newPasswordHash },
    });

    return {
      success: true,
      data: { message: 'Password changed successfully' },
    };
  });

  // Request password reset
  fastify.post('/request-password-reset', async (request, reply) => {
    const body = requestPasswordResetSchema.parse(request.body);

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: body.email },
    });

    // Always return success (don't reveal if email exists)
    if (user) {
      // Generate reset token
      const resetToken = jwt.sign(
        { userId: user.id, type: 'password-reset' },
        config.jwtSecret,
        { expiresIn: '1h' }
      );

      // Send password reset email (async, non-blocking)
      notificationService.sendPasswordResetEmail(user.id, resetToken).catch(err => {
        request.log.error({ err, userId: user.id }, 'Failed to send password reset email');
      });

      request.log.info({ userId: user.id, email: user.email }, 'Password reset requested');
    }

    return {
      success: true,
      data: {
        message: 'If the email exists, a password reset link has been sent.',
      },
    };
  });

  // Reset password with token
  fastify.post('/reset-password', async (request, reply) => {
    const body = resetPasswordSchema.parse(request.body);

    try {
      // Verify reset token
      const payload = jwt.verify(body.token, config.jwtSecret) as {
        userId: string;
        type: string;
      };

      if (payload.type !== 'password-reset') {
        return reply.status(400).send({
          success: false,
          error: { code: 'INVALID_TOKEN', message: 'Invalid reset token' },
        });
      }

      // Hash new password
      const newPasswordHash = await bcrypt.hash(body.newPassword, 12);

      // Update password
      await prisma.user.update({
        where: { id: payload.userId },
        data: { passwordHash: newPasswordHash },
      });

      return {
        success: true,
        data: { message: 'Password reset successfully' },
      };
    } catch {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired reset token',
        },
      });
    }
  });

  // Logout
  fastify.post('/logout', { preHandler: requireAuth }, async (request, reply) => {
    // Update user status to offline
    await prisma.user.update({
      where: { id: request.user!.id },
      data: { status: 'OFFLINE', lastSeenAt: new Date() },
    });

    // In production, you might also want to:
    // - Invalidate the refresh token
    // - Clear session from Redis
    // - Emit socket event for user offline

    return { success: true, data: { message: 'Logged out successfully' } };
  });
}
