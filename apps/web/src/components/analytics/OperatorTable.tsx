import { Avatar } from '@/components/ui/Avatar';

interface Operator {
  id: string;
  name: string;
  avatar: string | null;
  conversationsHandled: number;
  avgResponseTime: number;
  avgRating: number;
  totalMessages: number;
}

interface OperatorTableProps {
  operators: Operator[];
}

function formatTime(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

export function OperatorTable({ operators }: OperatorTableProps) {
  if (operators.length === 0) {
    return (
      <div className="flex h-80 items-center justify-center rounded-lg border bg-card">
        <p className="text-sm text-muted-foreground">No operator data available</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card">
      <div className="border-b p-6">
        <h3 className="text-lg font-semibold">Top Operators</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Operator
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Conversations
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Avg Response
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Rating
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Messages
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {operators.map((operator) => (
              <tr key={operator.id} className="hover:bg-muted/50">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <Avatar
                      src={operator.avatar || undefined}
                      alt={operator.name}
                      fallback={operator.name.substring(0, 2).toUpperCase()}
                    />
                    <span className="font-medium">{operator.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm">
                  {operator.conversationsHandled}
                </td>
                <td className="px-6 py-4 text-sm">
                  {formatTime(operator.avgResponseTime)}
                </td>
                <td className="px-6 py-4 text-sm">
                  {operator.avgRating > 0 ? (
                    <div className="flex items-center gap-1">
                      <span>{operator.avgRating.toFixed(1)}</span>
                      <span className="text-yellow-500">★</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">N/A</span>
                  )}
                </td>
                <td className="px-6 py-4 text-sm">{operator.totalMessages}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
