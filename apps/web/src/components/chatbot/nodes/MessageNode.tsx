import { Handle, Position } from 'reactflow';
import { MessageSquare } from 'lucide-react';

export function MessageNode({ data }: { data: { label: string; content?: string } }) {
  return (
    <div className="rounded-lg border-2 border-blue-500 bg-white px-4 py-3 shadow-md min-w-[200px]">
      <Handle type="target" position={Position.Top} className="!bg-blue-500" />
      <div className="flex items-start gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500 text-white">
          <MessageSquare className="h-4 w-4" />
        </div>
        <div className="flex-1">
          <div className="text-xs font-medium text-gray-500">Message</div>
          <div className="text-sm font-semibold text-gray-900">{data.label}</div>
          {data.content && (
            <div className="mt-1 text-xs text-gray-600 line-clamp-2">{data.content}</div>
          )}
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-blue-500" />
    </div>
  );
}
