import { prisma } from '@nexvo/database';

interface DateRange {
  start: Date;
  end: Date;
}

interface OverviewStats {
  totalConversations: number;
  activeConversations: number;
  totalVisitors: number;
  onlineVisitors: number;
  avgResponseTime: number; // seconds
  avgRating: number;
  conversationsToday: number;
  visitorsToday: number;
}

interface ConversationMetrics {
  byStatus: { status: string; count: number }[];
  byChannel: { channel: string; count: number }[];
  byDay: { date: string; count: number }[];
  avgDuration: number;
  resolutionRate: number;
}

interface VisitorMetrics {
  newVisitors: number;
  returningVisitors: number;
  byLocation: { location: string; count: number }[];
  byDevice: { device: string; count: number }[];
  totalSessions: number;
  avgSessionDuration: number;
}

interface OperatorMetrics {
  operators: {
    id: string;
    name: string;
    avatar: string | null;
    conversationsHandled: number;
    avgResponseTime: number;
    avgRating: number;
    totalMessages: number;
  }[];
  totalOperators: number;
}

class AnalyticsService {
  /**
   * Get dashboard overview stats
   */
  async getOverviewStats(organizationId: string, dateRange: DateRange): Promise<OverviewStats> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Total conversations in date range
    const totalConversations = await prisma.conversation.count({
      where: {
        organizationId,
        createdAt: {
          gte: dateRange.start,
          lte: dateRange.end,
        },
      },
    });

    // Active conversations (status = ACTIVE)
    const activeConversations = await prisma.conversation.count({
      where: {
        organizationId,
        status: 'ACTIVE',
      },
    });

    // Total unique visitors in date range
    const totalVisitors = await prisma.visitor.count({
      where: {
        organizationId,
        lastSeenAt: {
          gte: dateRange.start,
          lte: dateRange.end,
        },
      },
    });

    // Online visitors (last seen in last 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const onlineVisitors = await prisma.visitor.count({
      where: {
        organizationId,
        lastSeenAt: {
          gte: fiveMinutesAgo,
        },
      },
    });

    // Average response time (time between conversation creation and first response)
    const conversationsWithResponse = await prisma.conversation.findMany({
      where: {
        organizationId,
        createdAt: {
          gte: dateRange.start,
          lte: dateRange.end,
        },
        firstResponseAt: {
          not: null,
        },
      },
      select: {
        createdAt: true,
        firstResponseAt: true,
      },
    });

    let avgResponseTime = 0;
    if (conversationsWithResponse.length > 0) {
      const totalResponseTime = conversationsWithResponse.reduce((sum, conv) => {
        const responseTime = conv.firstResponseAt!.getTime() - conv.createdAt.getTime();
        return sum + responseTime / 1000; // Convert to seconds
      }, 0);
      avgResponseTime = Math.round(totalResponseTime / conversationsWithResponse.length);
    }

    // Average rating
    const ratingsResult = await prisma.conversation.aggregate({
      where: {
        organizationId,
        createdAt: {
          gte: dateRange.start,
          lte: dateRange.end,
        },
        rating: {
          not: null,
        },
      },
      _avg: {
        rating: true,
      },
    });

    const avgRating = ratingsResult._avg.rating || 0;

    // Conversations today
    const conversationsToday = await prisma.conversation.count({
      where: {
        organizationId,
        createdAt: {
          gte: today,
        },
      },
    });

    // Visitors today
    const visitorsToday = await prisma.visitor.count({
      where: {
        organizationId,
        lastSeenAt: {
          gte: today,
        },
      },
    });

    return {
      totalConversations,
      activeConversations,
      totalVisitors,
      onlineVisitors,
      avgResponseTime,
      avgRating: Math.round(avgRating * 10) / 10,
      conversationsToday,
      visitorsToday,
    };
  }

  /**
   * Get conversation metrics
   */
  async getConversationMetrics(
    organizationId: string,
    dateRange: DateRange
  ): Promise<ConversationMetrics> {
    // Conversations by status
    const byStatusRaw = await prisma.conversation.groupBy({
      by: ['status'],
      where: {
        organizationId,
        createdAt: {
          gte: dateRange.start,
          lte: dateRange.end,
        },
      },
      _count: true,
    });

    const byStatus = byStatusRaw.map((item) => ({
      status: item.status,
      count: item._count,
    }));

    // Conversations by channel
    const byChannelRaw = await prisma.conversation.groupBy({
      by: ['channel'],
      where: {
        organizationId,
        createdAt: {
          gte: dateRange.start,
          lte: dateRange.end,
        },
      },
      _count: true,
    });

    const byChannel = byChannelRaw.map((item) => ({
      channel: item.channel,
      count: item._count,
    }));

    // Conversations by day
    const conversations = await prisma.conversation.findMany({
      where: {
        organizationId,
        createdAt: {
          gte: dateRange.start,
          lte: dateRange.end,
        },
      },
      select: {
        createdAt: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Group by day
    const byDayMap = new Map<string, number>();
    conversations.forEach((conv) => {
      const date = conv.createdAt.toISOString().split('T')[0];
      byDayMap.set(date, (byDayMap.get(date) || 0) + 1);
    });

    const byDay = Array.from(byDayMap.entries()).map(([date, count]) => ({
      date,
      count,
    }));

    // Average duration (time from creation to closure)
    const closedConversations = await prisma.conversation.findMany({
      where: {
        organizationId,
        createdAt: {
          gte: dateRange.start,
          lte: dateRange.end,
        },
        closedAt: {
          not: null,
        },
      },
      select: {
        createdAt: true,
        closedAt: true,
      },
    });

    let avgDuration = 0;
    if (closedConversations.length > 0) {
      const totalDuration = closedConversations.reduce((sum, conv) => {
        const duration = conv.closedAt!.getTime() - conv.createdAt.getTime();
        return sum + duration / 1000; // Convert to seconds
      }, 0);
      avgDuration = Math.round(totalDuration / closedConversations.length);
    }

    // Resolution rate
    const totalConversations = await prisma.conversation.count({
      where: {
        organizationId,
        createdAt: {
          gte: dateRange.start,
          lte: dateRange.end,
        },
      },
    });

    const resolvedCount = await prisma.conversation.count({
      where: {
        organizationId,
        createdAt: {
          gte: dateRange.start,
          lte: dateRange.end,
        },
        status: 'RESOLVED',
      },
    });

    const resolutionRate =
      totalConversations > 0 ? Math.round((resolvedCount / totalConversations) * 100) : 0;

    return {
      byStatus,
      byChannel,
      byDay,
      avgDuration,
      resolutionRate,
    };
  }

  /**
   * Get visitor metrics
   */
  async getVisitorMetrics(
    organizationId: string,
    dateRange: DateRange
  ): Promise<VisitorMetrics> {
    // New vs returning visitors
    const allVisitors = await prisma.visitor.findMany({
      where: {
        organizationId,
        lastSeenAt: {
          gte: dateRange.start,
          lte: dateRange.end,
        },
      },
      select: {
        firstSeenAt: true,
      },
    });

    const newVisitors = allVisitors.filter(
      (v) => v.firstSeenAt >= dateRange.start && v.firstSeenAt <= dateRange.end
    ).length;

    const returningVisitors = allVisitors.length - newVisitors;

    // Visitors by location (from sessions)
    const sessionsByLocation = await prisma.visitorSession.groupBy({
      by: ['country'],
      where: {
        visitor: {
          organizationId,
        },
        startedAt: {
          gte: dateRange.start,
          lte: dateRange.end,
        },
        country: {
          not: null,
        },
      },
      _count: true,
    });

    const byLocation = sessionsByLocation
      .map((item) => ({
        location: item.country || 'Unknown',
        count: item._count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10 locations

    // Visitors by device
    const sessionsByDevice = await prisma.visitorSession.groupBy({
      by: ['device'],
      where: {
        visitor: {
          organizationId,
        },
        startedAt: {
          gte: dateRange.start,
          lte: dateRange.end,
        },
        device: {
          not: null,
        },
      },
      _count: true,
    });

    const byDevice = sessionsByDevice.map((item) => ({
      device: item.device || 'Unknown',
      count: item._count,
    }));

    // Total sessions
    const totalSessions = await prisma.visitorSession.count({
      where: {
        visitor: {
          organizationId,
        },
        startedAt: {
          gte: dateRange.start,
          lte: dateRange.end,
        },
      },
    });

    // Average session duration
    const sessionsWithDuration = await prisma.visitorSession.findMany({
      where: {
        visitor: {
          organizationId,
        },
        startedAt: {
          gte: dateRange.start,
          lte: dateRange.end,
        },
        endedAt: {
          not: null,
        },
      },
      select: {
        startedAt: true,
        endedAt: true,
      },
    });

    let avgSessionDuration = 0;
    if (sessionsWithDuration.length > 0) {
      const totalDuration = sessionsWithDuration.reduce((sum, session) => {
        const duration = session.endedAt!.getTime() - session.startedAt.getTime();
        return sum + duration / 1000; // Convert to seconds
      }, 0);
      avgSessionDuration = Math.round(totalDuration / sessionsWithDuration.length);
    }

    return {
      newVisitors,
      returningVisitors,
      byLocation,
      byDevice,
      totalSessions,
      avgSessionDuration,
    };
  }

  /**
   * Get operator performance metrics
   */
  async getOperatorMetrics(
    organizationId: string,
    dateRange: DateRange
  ): Promise<OperatorMetrics> {
    // Get all operators in the organization
    const operators = await prisma.user.findMany({
      where: {
        organizationId,
      },
      select: {
        id: true,
        name: true,
        avatar: true,
      },
    });

    const operatorMetrics = await Promise.all(
      operators.map(async (operator) => {
        // Conversations handled
        const conversationsHandled = await prisma.conversation.count({
          where: {
            organizationId,
            operatorId: operator.id,
            createdAt: {
              gte: dateRange.start,
              lte: dateRange.end,
            },
          },
        });

        // Average response time
        const conversationsWithResponse = await prisma.conversation.findMany({
          where: {
            organizationId,
            operatorId: operator.id,
            createdAt: {
              gte: dateRange.start,
              lte: dateRange.end,
            },
            firstResponseAt: {
              not: null,
            },
          },
          select: {
            createdAt: true,
            firstResponseAt: true,
          },
        });

        let avgResponseTime = 0;
        if (conversationsWithResponse.length > 0) {
          const totalResponseTime = conversationsWithResponse.reduce((sum, conv) => {
            const responseTime = conv.firstResponseAt!.getTime() - conv.createdAt.getTime();
            return sum + responseTime / 1000; // Convert to seconds
          }, 0);
          avgResponseTime = Math.round(totalResponseTime / conversationsWithResponse.length);
        }

        // Average rating
        const ratingsResult = await prisma.conversation.aggregate({
          where: {
            organizationId,
            operatorId: operator.id,
            createdAt: {
              gte: dateRange.start,
              lte: dateRange.end,
            },
            rating: {
              not: null,
            },
          },
          _avg: {
            rating: true,
          },
        });

        const avgRating = ratingsResult._avg.rating || 0;

        // Total messages sent
        const totalMessages = await prisma.message.count({
          where: {
            senderId: operator.id,
            senderType: 'OPERATOR',
            createdAt: {
              gte: dateRange.start,
              lte: dateRange.end,
            },
          },
        });

        return {
          id: operator.id,
          name: operator.name,
          avatar: operator.avatar,
          conversationsHandled,
          avgResponseTime,
          avgRating: Math.round(avgRating * 10) / 10,
          totalMessages,
        };
      })
    );

    // Filter operators with at least one conversation handled and sort by conversations
    const activeOperatorMetrics = operatorMetrics
      .filter((op) => op.conversationsHandled > 0)
      .sort((a, b) => b.conversationsHandled - a.conversationsHandled);

    return {
      operators: activeOperatorMetrics,
      totalOperators: operators.length,
    };
  }
}

export const analyticsService = new AnalyticsService();
