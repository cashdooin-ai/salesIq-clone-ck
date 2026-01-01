import { Handle, Position } from 'reactflow';
import { Zap } from 'lucide-react';

export function ActionNode({
  data,
}: {
  data: {
    label: string;
    action?: { type: string; params: any };
  };
}) {
  return (
    <div className="rounded-lg border-2 border-orange-500 bg-white px-4 py-3 shadow-md min-w-[200px]">
      <Handle type="target" position={Position.Top} className="!bg-orange-500" />
      <div className="flex items-start gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-500 text-white">
          <Zap className="h-4 w-4" />
        </div>
        <div className="flex-1">
          <div className="text-xs font-medium text-gray-500">Action</div>
          <div className="text-sm font-semibold text-gray-900">{data.label}</div>
          {data.action && (
            <div className="mt-1 text-xs text-orange-600 font-medium capitalize">
              {data.action.type.replace('_', ' ')}
            </div>
          )}
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-orange-500" />
    </div>
  );
}
