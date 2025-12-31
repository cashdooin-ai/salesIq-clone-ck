import { MapPin, Eye, Clock, Star, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatDuration, formatRelativeTime } from '@/lib/utils';
import type { Visitor } from '@/types';

interface VisitorCardProps {
  visitor: Visitor;
}

export function VisitorCard({ visitor }: VisitorCardProps) {
  const navigate = useNavigate();

  const handleStartChat = () => {
    // Navigate to chat or create new conversation
    navigate('/?visitor=' + visitor.id);
  };

  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="mb-4 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Avatar
            src={visitor.avatar}
            name={visitor.name || visitor.email || 'Anonymous'}
            size="lg"
            status={visitor.isOnline ? 'online' : 'offline'}
          />
          <div>
            <h3 className="font-semibold">
              {visitor.name || visitor.email || 'Anonymous'}
            </h3>
            {visitor.email && visitor.name && (
              <p className="text-xs text-muted-foreground">{visitor.email}</p>
            )}
          </div>
        </div>

        {visitor.score !== undefined && (
          <div className="flex items-center gap-1 rounded-full bg-yellow-50 px-2 py-1">
            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
            <span className="text-xs font-semibold">{visitor.score}</span>
          </div>
        )}
      </div>

      <div className="mb-4 space-y-2 text-sm">
        {visitor.location && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span>
              {visitor.location.city}, {visitor.location.country}
            </span>
          </div>
        )}

        <div className="flex items-center gap-2 text-muted-foreground">
          <Eye className="h-4 w-4" />
          <span>{visitor.pageViews} page views</span>
        </div>

        <div className="flex items-center gap-2 text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>
            Online for {formatDuration(visitor.sessionDuration)}
          </span>
        </div>
      </div>

      {visitor.currentPage && (
        <div className="mb-4">
          <p className="mb-1 text-xs font-medium text-muted-foreground">Current Page:</p>
          <p className="truncate rounded-md bg-muted px-2 py-1 text-xs font-mono">
            {visitor.currentPage}
          </p>
        </div>
      )}

      {visitor.tags && visitor.tags.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-1">
          {visitor.tags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
          {visitor.tags.length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{visitor.tags.length - 3}
            </Badge>
          )}
        </div>
      )}

      <Button
        variant="primary"
        size="sm"
        className="w-full gap-2"
        onClick={handleStartChat}
      >
        <MessageSquare className="h-4 w-4" />
        Start Chat
      </Button>

      <p className="mt-2 text-center text-xs text-muted-foreground">
        First visit {formatRelativeTime(visitor.firstVisit)}
      </p>
    </div>
  );
}
