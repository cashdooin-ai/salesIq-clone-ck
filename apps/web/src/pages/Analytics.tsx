import { useEffect } from 'react';
import { MessageSquare, Users, Clock, Star } from 'lucide-react';
import { useAnalyticsStore } from '@/stores/analyticsStore';
import { StatsCard } from '@/components/analytics/StatsCard';
import { ConversationChart } from '@/components/analytics/ConversationChart';
import { ChannelPieChart } from '@/components/analytics/ChannelPieChart';
import { OperatorTable } from '@/components/analytics/OperatorTable';
import { VisitorMap } from '@/components/analytics/VisitorMap';
import { DateRangePicker } from '@/components/analytics/DateRangePicker';

function formatTime(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) {
    return `${minutes}m ${remainingSeconds}s`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

export function Analytics() {
  const {
    overviewStats,
    conversationMetrics,
    visitorMetrics,
    operatorMetrics,
    dateRange,
    isLoading,
    error,
    setDateRange,
    fetchAllMetrics,
  } = useAnalyticsStore();

  useEffect(() => {
    fetchAllMetrics();
  }, [fetchAllMetrics]);

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-semibold text-destructive">Error loading analytics</p>
          <p className="mt-2 text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b bg-background px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Track your team's performance and customer engagement
            </p>
          </div>
          <DateRangePicker value={dateRange} onChange={setDateRange} />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {isLoading && !overviewStats ? (
          <div className="flex h-full items-center justify-center">
            <div className="spinner h-8 w-8" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Overview Stats */}
            {overviewStats && (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <StatsCard
                  title="Total Conversations"
                  value={overviewStats.totalConversations.toLocaleString()}
                  icon={MessageSquare}
                  description={`${overviewStats.conversationsToday} today`}
                />
                <StatsCard
                  title="Total Visitors"
                  value={overviewStats.totalVisitors.toLocaleString()}
                  icon={Users}
                  description={`${overviewStats.visitorsToday} today, ${overviewStats.onlineVisitors} online`}
                />
                <StatsCard
                  title="Avg Response Time"
                  value={formatTime(overviewStats.avgResponseTime)}
                  icon={Clock}
                  description="First response time"
                />
                <StatsCard
                  title="Satisfaction"
                  value={
                    overviewStats.avgRating > 0
                      ? `${overviewStats.avgRating.toFixed(1)} ★`
                      : 'N/A'
                  }
                  icon={Star}
                  description="Average rating"
                />
              </div>
            )}

            {/* Conversations Over Time */}
            {conversationMetrics && conversationMetrics.byDay.length > 0 && (
              <ConversationChart data={conversationMetrics.byDay} />
            )}

            {/* Additional Metrics */}
            {conversationMetrics && (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {/* Conversation Status */}
                <div className="rounded-lg border bg-card p-6">
                  <h3 className="mb-4 text-lg font-semibold">Conversation Status</h3>
                  <div className="space-y-3">
                    {conversationMetrics.byStatus.map((item) => (
                      <div key={item.status} className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                          {item.status.charAt(0) + item.status.slice(1).toLowerCase()}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {item.count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Conversation Stats */}
                <div className="rounded-lg border bg-card p-6">
                  <h3 className="mb-4 text-lg font-semibold">Conversation Stats</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Avg Duration</span>
                      <span className="text-sm text-muted-foreground">
                        {formatTime(conversationMetrics.avgDuration)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Resolution Rate</span>
                      <span className="text-sm text-muted-foreground">
                        {conversationMetrics.resolutionRate}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Visitor Stats */}
                {visitorMetrics && (
                  <div className="rounded-lg border bg-card p-6">
                    <h3 className="mb-4 text-lg font-semibold">Visitor Stats</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">New Visitors</span>
                        <span className="text-sm text-muted-foreground">
                          {visitorMetrics.newVisitors}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Returning Visitors</span>
                        <span className="text-sm text-muted-foreground">
                          {visitorMetrics.returningVisitors}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Total Sessions</span>
                        <span className="text-sm text-muted-foreground">
                          {visitorMetrics.totalSessions}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Avg Session</span>
                        <span className="text-sm text-muted-foreground">
                          {formatTime(visitorMetrics.avgSessionDuration)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Charts and Tables */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Channel Distribution */}
              {conversationMetrics && conversationMetrics.byChannel.length > 0 && (
                <ChannelPieChart data={conversationMetrics.byChannel} />
              )}

              {/* Visitor Locations */}
              {visitorMetrics && visitorMetrics.byLocation.length > 0 && (
                <VisitorMap data={visitorMetrics.byLocation} />
              )}
            </div>

            {/* Device Breakdown */}
            {visitorMetrics && visitorMetrics.byDevice.length > 0 && (
              <div className="rounded-lg border bg-card p-6">
                <h3 className="mb-4 text-lg font-semibold">Visitors by Device</h3>
                <div className="grid gap-4 md:grid-cols-3">
                  {visitorMetrics.byDevice.map((item) => (
                    <div
                      key={item.device}
                      className="flex items-center justify-between rounded-lg bg-muted p-4"
                    >
                      <span className="font-medium">
                        {item.device.charAt(0).toUpperCase() + item.device.slice(1)}
                      </span>
                      <span className="text-2xl font-bold">{item.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Operator Performance */}
            {operatorMetrics && operatorMetrics.operators.length > 0 && (
              <OperatorTable operators={operatorMetrics.operators} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
