import { Handle, Position } from 'reactflow';
import { Play } from 'lucide-react';

export function StartNode({ data }: { data: { label: string } }) {
  return (
    <div className="rounded-lg border-2 border-green-500 bg-green-50 px-4 py-3 shadow-md">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500 text-white">
          <Play className="h-4 w-4" />
        </div>
        <div>
          <div className="text-xs font-medium text-gray-500">Start</div>
          <div className="text-sm font-semibold text-gray-900">{data.label}</div>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-green-500" />
    </div>
  );
}
