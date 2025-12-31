import { MapPin, Globe, Clock, Star, Eye, Tag } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useChatStore } from '@/stores/chatStore';
import { formatDuration, formatRelativeTime } from '@/lib/utils';

export function VisitorInfo() {
  const { activeConversation } = useChatStore();

  if (!activeConversation) {
    return null;
  }

  const { visitor } = activeConversation;

  return (
    <aside className="w-80 border-l bg-background overflow-y-auto">
      <div className="p-6">
        {/* Visitor Profile */}
        <div className="mb-6 text-center">
          <Avatar
            src={visitor.avatar}
            name={visitor.name || visitor.email || 'Anonymous'}
            size="xl"
            status={visitor.isOnline ? 'online' : 'offline'}
            className="mx-auto mb-3"
          />
          <h3 className="text-lg font-semibold">
            {visitor.name || visitor.email || 'Anonymous Visitor'}
          </h3>
          {visitor.email && (
            <p className="text-sm text-muted-foreground">{visitor.email}</p>
          )}
        </div>

        {/* Visitor Score */}
        {visitor.score !== undefined && (
          <div className="mb-6 rounded-lg border bg-muted/20 p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium">Visitor Score</span>
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span className="font-semibold">{visitor.score}</span>
              </div>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-yellow-400 transition-all"
                style={{ width: `${visitor.score}%` }}
              />
            </div>
          </div>
        )}

        {/* Location */}
        {visitor.location && (
          <div className="mb-6">
            <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <MapPin className="h-4 w-4" />
              Location
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">City:</span>
                <span>{visitor.location.city}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Country:</span>
                <span>{visitor.location.country}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">IP:</span>
                <span className="font-mono text-xs">{visitor.location.ip}</span>
              </div>
            </div>
          </div>
        )}

        {/* Device Info */}
        {(visitor.browser || visitor.os || visitor.device) && (
          <div className="mb-6">
            <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Globe className="h-4 w-4" />
              Device Info
            </h4>
            <div className="space-y-2 text-sm">
              {visitor.browser && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Browser:</span>
                  <span>{visitor.browser}</span>
                </div>
              )}
              {visitor.os && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">OS:</span>
                  <span>{visitor.os}</span>
                </div>
              )}
              {visitor.device && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Device:</span>
                  <span>{visitor.device}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Visit Stats */}
        <div className="mb-6">
          <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Clock className="h-4 w-4" />
            Visit Stats
          </h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">First Visit:</span>
              <span>{formatRelativeTime(visitor.firstVisit)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Last Seen:</span>
              <span>{formatRelativeTime(visitor.lastSeen)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Page Views:</span>
              <span>{visitor.pageViews}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Session Time:</span>
              <span>{formatDuration(visitor.sessionDuration)}</span>
            </div>
          </div>
        </div>

        {/* Current Page */}
        {visitor.currentPage && (
          <div className="mb-6">
            <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Eye className="h-4 w-4" />
              Current Page
            </h4>
            <p className="truncate rounded-md bg-muted px-3 py-2 text-xs font-mono">
              {visitor.currentPage}
            </p>
          </div>
        )}

        {/* Visited Pages */}
        {visitor.visitedPages && visitor.visitedPages.length > 0 && (
          <div className="mb-6">
            <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Eye className="h-4 w-4" />
              Recent Pages
            </h4>
            <div className="space-y-2">
              {visitor.visitedPages.slice(0, 5).map((page, index) => (
                <div key={index} className="rounded-md border bg-muted/20 p-2">
                  <p className="truncate text-xs font-medium">{page.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{page.url}</p>
                  <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{formatRelativeTime(page.timestamp)}</span>
                    <span>{formatDuration(page.duration)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tags */}
        {visitor.tags && visitor.tags.length > 0 && (
          <div className="mb-6">
            <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Tag className="h-4 w-4" />
              Tags
            </h4>
            <div className="flex flex-wrap gap-2">
              {visitor.tags.map((tag) => (
                <Badge key={tag} variant="outline">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-2">
          <Button variant="outline" className="w-full" size="sm">
            Add Note
          </Button>
          <Button variant="outline" className="w-full" size="sm">
            Add Tag
          </Button>
          <Button variant="outline" className="w-full" size="sm">
            View Full Profile
          </Button>
        </div>
      </div>
    </aside>
  );
}
