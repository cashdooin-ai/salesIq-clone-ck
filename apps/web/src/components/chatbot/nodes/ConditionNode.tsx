import { Handle, Position } from 'reactflow';
import { GitBranch } from 'lucide-react';

export function ConditionNode({
  data,
}: {
  data: {
    label: string;
    condition?: { field: string; operator: string; value: string };
  };
}) {
  return (
    <div className="rounded-lg border-2 border-yellow-500 bg-white px-4 py-3 shadow-md min-w-[200px]">
      <Handle type="target" position={Position.Top} className="!bg-yellow-500" />
      <div className="flex items-start gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-yellow-500 text-white">
          <GitBranch className="h-4 w-4" />
        </div>
        <div className="flex-1">
          <div className="text-xs font-medium text-gray-500">Condition</div>
          <div className="text-sm font-semibold text-gray-900">{data.label}</div>
          {data.condition && (
            <div className="mt-1 text-xs text-gray-600">
              {data.condition.field} {data.condition.operator} {data.condition.value}
            </div>
          )}
        </div>
      </div>
      <div className="mt-2 flex justify-between px-2">
        <div className="text-xs font-medium text-green-600">Yes</div>
        <div className="text-xs font-medium text-red-600">No</div>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        id="yes"
        className="!bg-green-500 !left-[25%]"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="no"
        className="!bg-red-500 !left-[75%]"
      />
    </div>
  );
}
