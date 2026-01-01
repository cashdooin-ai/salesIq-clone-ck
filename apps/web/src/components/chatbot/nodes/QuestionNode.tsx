import { Handle, Position } from 'reactflow';
import { HelpCircle } from 'lucide-react';

export function QuestionNode({
  data,
}: {
  data: { label: string; content?: string; inputType?: string };
}) {
  return (
    <div className="rounded-lg border-2 border-purple-500 bg-white px-4 py-3 shadow-md min-w-[200px]">
      <Handle type="target" position={Position.Top} className="!bg-purple-500" />
      <div className="flex items-start gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-500 text-white">
          <HelpCircle className="h-4 w-4" />
        </div>
        <div className="flex-1">
          <div className="text-xs font-medium text-gray-500">Question</div>
          <div className="text-sm font-semibold text-gray-900">{data.label}</div>
          {data.content && (
            <div className="mt-1 text-xs text-gray-600 line-clamp-2">{data.content}</div>
          )}
          {data.inputType && (
            <div className="mt-1 text-xs text-purple-600 font-medium">
              Input: {data.inputType}
            </div>
          )}
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-purple-500" />
    </div>
  );
}
