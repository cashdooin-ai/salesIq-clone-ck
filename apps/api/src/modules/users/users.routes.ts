import { FastifyInstance } from 'fastify';
import { prisma } from '@nexvo/database';
import { ERROR_CODES } from '@nexvo/shared';
import { requireAuth, requireAdmin, canModifyUser } from '../../middleware/index.js';

export async function userRoutes(fastify: FastifyInstance) {
  // List users (require authentication, filter by organization)
  fastify.get('/', { preHandler: requireAuth }, async (request, reply) => {
    const users = await prisma.user.findMany({
      where: {
        organizationId: request.user!.organizationId,
      },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        role: true,
        status: true,
        lastSeenAt: true,
        createdAt: true,
      },
    });

    return { success: true, data: users };
  });

  // Get user by ID (require authentication, same organization)
  fastify.get('/:id', { preHandler: requireAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const user = await prisma.user.findUnique({
      where: {
        id,
        organizationId: request.user!.organizationId,
      },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        role: true,
        status: true,
        settings: true,
        lastSeenAt: true,
        createdAt: true,
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

  // Update user (require admin or self)
  fastify.put('/:id', { preHandler: [requireAuth, canModifyUser] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { name, avatar, role, status, departmentId, settings } = request.body as any;

    // Check if trying to change role
    if (role && request.user!.id !== id) {
      // Only admins can change roles
      const isAdmin = ['ADMIN', 'OWNER'].includes(request.user!.role);
      if (!isAdmin) {
        return reply.status(403).send({
          success: false,
          error: {
            code: ERROR_CODES.FORBIDDEN,
            message: 'Only admins can change user roles',
          },
        });
      }
    }

    const user = await prisma.user.update({
      where: {
        id,
        organizationId: request.user!.organizationId,
      },
      data: {
        ...(name && { name }),
        ...(avatar !== undefined && { avatar }),
        ...(role && { role }),
        ...(status && { status }),
        ...(departmentId !== undefined && { departmentId }),
        ...(settings && { settings }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        role: true,
        status: true,
        departmentId: true,
        settings: true,
      },
    });

    return { success: true, data: user };
  });

  // Update user status (self only)
  fastify.put('/:id/status', { preHandler: requireAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { status } = request.body as { status: string };

    // Users can only update their own status
    if (id !== request.user!.id) {
      return reply.status(403).send({
        success: false,
        error: {
          code: ERROR_CODES.FORBIDDEN,
          message: 'You can only update your own status',
        },
      });
    }

    const user = await prisma.user.update({
      where: { id },
      data: { status: status as any, lastSeenAt: new Date() },
      select: { id: true, status: true },
    });

    return { success: true, data: user };
  });

  // Delete user (require admin)
  fastify.delete('/:id', { preHandler: [requireAuth, requireAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string };

    // Prevent self-deletion
    if (id === request.user!.id) {
      return reply.status(400).send({
        success: false,
        error: {
          code: ERROR_CODES.INVALID_INPUT,
          message: 'You cannot delete your own account',
        },
      });
    }

    // Check user exists and belongs to same organization
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, organizationId: true, role: true },
    });

    if (!user) {
      return reply.status(404).send({
        success: false,
        error: { code: ERROR_CODES.NOT_FOUND, message: 'User not found' },
      });
    }

    if (user.organizationId !== request.user!.organizationId) {
      return reply.status(403).send({
        success: false,
        error: {
          code: ERROR_CODES.FORBIDDEN,
          message: 'You can only delete users from your organization',
        },
      });
    }

    // Only owners can delete admins
    if (user.role === 'ADMIN' && request.user!.role !== 'OWNER') {
      return reply.status(403).send({
        success: false,
        error: {
          code: ERROR_CODES.FORBIDDEN,
          message: 'Only owners can delete admin users',
        },
      });
    }

    // Prevent deleting the only owner
    if (user.role === 'OWNER') {
      const ownerCount = await prisma.user.count({
        where: {
          organizationId: user.organizationId,
          role: 'OWNER',
        },
      });

      if (ownerCount <= 1) {
        return reply.status(400).send({
          success: false,
          error: {
            code: ERROR_CODES.INVALID_INPUT,
            message: 'Cannot delete the only owner. Please assign another owner first.',
          },
        });
      }
    }

    // Delete user
    await prisma.user.delete({
      where: { id },
    });

    return { success: true, data: { message: 'User deleted successfully' } };
  });
}
