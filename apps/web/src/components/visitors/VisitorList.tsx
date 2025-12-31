import { useEffect, useState } from 'react';
import { Search, Filter } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { VisitorCard } from './VisitorCard';
import { useVisitorStore } from '@/stores/visitorStore';

export function VisitorList() {
  const { onlineVisitors, fetchVisitors, isLoading } = useVisitorStore();
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchVisitors({ online: true });
  }, [fetchVisitors]);

  const filteredVisitors = onlineVisitors.filter((visitor) => {
    const matchesSearch =
      !searchQuery ||
      visitor.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      visitor.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      visitor.location?.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      visitor.location?.country?.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesSearch;
  });

  return (
    <div className="flex h-full flex-col">
      <div className="border-b bg-background p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Online Visitors</h1>
            <p className="text-sm text-muted-foreground">
              {onlineVisitors.length} visitor{onlineVisitors.length !== 1 ? 's' : ''} currently online
            </p>
          </div>
          <Button variant="outline" size="sm">
            <Filter className="mr-2 h-4 w-4" />
            Filter
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search visitors..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="flex h-32 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : filteredVisitors.length === 0 ? (
          <div className="flex h-32 items-center justify-center text-center">
            <div>
              <div className="mb-2 text-4xl">👥</div>
              <p className="text-muted-foreground">
                {searchQuery ? 'No visitors found' : 'No online visitors'}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredVisitors.map((visitor) => (
              <VisitorCard key={visitor.id} visitor={visitor} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
