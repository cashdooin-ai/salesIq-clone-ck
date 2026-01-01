import { Handle, Position } from 'reactflow';
import { CheckCircle } from 'lucide-react';

export function EndNode({ data }: { data: { label: string } }) {
  return (
    <div className="rounded-lg border-2 border-red-500 bg-red-50 px-4 py-3 shadow-md">
      <Handle type="target" position={Position.Top} className="!bg-red-500" />
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500 text-white">
          <CheckCircle className="h-4 w-4" />
        </div>
        <div>
          <div className="text-xs font-medium text-gray-500">End</div>
          <div className="text-sm font-semibold text-gray-900">{data.label}</div>
        </div>
      </div>
    </div>
  );
}
