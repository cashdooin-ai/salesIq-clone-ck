import { Handle, Position } from 'reactflow';
import { Square } from 'lucide-react';

export function ButtonsNode({
  data,
}: {
  data: { label: string; content?: string; buttons?: { label: string; value: string }[] };
}) {
  return (
    <div className="rounded-lg border-2 border-indigo-500 bg-white px-4 py-3 shadow-md min-w-[200px]">
      <Handle type="target" position={Position.Top} className="!bg-indigo-500" />
      <div className="flex items-start gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500 text-white">
          <Square className="h-4 w-4" />
        </div>
        <div className="flex-1">
          <div className="text-xs font-medium text-gray-500">Buttons</div>
          <div className="text-sm font-semibold text-gray-900">{data.label}</div>
          {data.content && (
            <div className="mt-1 text-xs text-gray-600 line-clamp-2">{data.content}</div>
          )}
          {data.buttons && data.buttons.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {data.buttons.slice(0, 3).map((btn, i) => (
                <div
                  key={i}
                  className="rounded bg-indigo-100 px-2 py-1 text-xs text-indigo-700"
                >
                  {btn.label}
                </div>
              ))}
              {data.buttons.length > 3 && (
                <div className="text-xs text-gray-500">+{data.buttons.length - 3} more</div>
              )}
            </div>
          )}
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-indigo-500" />
    </div>
  );
}
