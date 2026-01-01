import { useState, useEffect } from 'react';
import { X, Trash2 } from 'lucide-react';
import { useChatbotStore } from '@/stores/chatbotStore';
import type { BotButton } from '@/types';

export function NodeEditor() {
  const { selectedNode, updateNode, deleteNode, setSelectedNode } = useChatbotStore();
  const [localData, setLocalData] = useState(selectedNode?.data || {});

  useEffect(() => {
    setLocalData(selectedNode?.data || {});
  }, [selectedNode]);

  if (!selectedNode) {
    return (
      <div className="flex h-full w-80 items-center justify-center border-l bg-white p-6">
        <div className="text-center text-sm text-gray-500">
          Select a node to edit its properties
        </div>
      </div>
    );
  }

  const handleUpdate = (field: string, value: any) => {
    const newData = { ...localData, [field]: value };
    setLocalData(newData);
    updateNode(selectedNode.id, { data: newData });
  };

  const handleButtonChange = (index: number, field: 'label' | 'value', value: string) => {
    const buttons = [...(localData.buttons || [])];
    buttons[index] = { ...buttons[index], [field]: value };
    handleUpdate('buttons', buttons);
  };

  const addButton = () => {
    const buttons = [...(localData.buttons || []), { label: 'New Button', value: 'new' }];
    handleUpdate('buttons', buttons);
  };

  const removeButton = (index: number) => {
    const buttons = (localData.buttons || []).filter((_: any, i: number) => i !== index);
    handleUpdate('buttons', buttons);
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this node?')) {
      deleteNode(selectedNode.id);
      setSelectedNode(null);
    }
  };

  return (
    <div className="flex h-full w-80 flex-col border-l bg-white">
      <div className="flex items-center justify-between border-b p-4">
        <h3 className="text-sm font-semibold text-gray-900">Edit Node</h3>
        <div className="flex gap-2">
          <button
            onClick={handleDelete}
            className="rounded p-1 text-red-600 hover:bg-red-50"
            title="Delete node"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <button
            onClick={() => setSelectedNode(null)}
            className="rounded p-1 hover:bg-gray-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Label</label>
            <input
              type="text"
              value={localData.label || ''}
              onChange={(e) => handleUpdate('label', e.target.value)}
              className="w-full rounded border px-3 py-2 text-sm"
            />
          </div>

          {selectedNode.type !== 'start' && selectedNode.type !== 'end' && (
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Content</label>
              <textarea
                value={localData.content || ''}
                onChange={(e) => handleUpdate('content', e.target.value)}
                rows={3}
                className="w-full rounded border px-3 py-2 text-sm"
              />
            </div>
          )}

          {selectedNode.type === 'question' && (
            <>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">
                  Input Type
                </label>
                <select
                  value={localData.inputType || 'text'}
                  onChange={(e) => handleUpdate('inputType', e.target.value)}
                  className="w-full rounded border px-3 py-2 text-sm"
                >
                  <option value="text">Text</option>
                  <option value="email">Email</option>
                  <option value="number">Number</option>
                  <option value="phone">Phone</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">
                  Variable Name
                </label>
                <input
                  type="text"
                  value={localData.variableName || ''}
                  onChange={(e) => handleUpdate('variableName', e.target.value)}
                  placeholder="e.g., user_name"
                  className="w-full rounded border px-3 py-2 text-sm"
                />
              </div>
            </>
          )}

          {selectedNode.type === 'buttons' && (
            <div>
              <label className="mb-2 block text-xs font-medium text-gray-700">Buttons</label>
              <div className="space-y-2">
                {(localData.buttons || []).map((button: BotButton, index: number) => (
                  <div key={index} className="rounded border p-2">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-700">
                        Button {index + 1}
                      </span>
                      <button
                        onClick={() => removeButton(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                    <input
                      type="text"
                      value={button.label}
                      onChange={(e) => handleButtonChange(index, 'label', e.target.value)}
                      placeholder="Button label"
                      className="mb-1 w-full rounded border px-2 py-1 text-xs"
                    />
                    <input
                      type="text"
                      value={button.value}
                      onChange={(e) => handleButtonChange(index, 'value', e.target.value)}
                      placeholder="Button value"
                      className="w-full rounded border px-2 py-1 text-xs"
                    />
                  </div>
                ))}
                <button
                  onClick={addButton}
                  className="w-full rounded border border-dashed border-gray-300 py-2 text-xs text-gray-600 hover:bg-gray-50"
                >
                  + Add Button
                </button>
              </div>
            </div>
          )}

          {selectedNode.type === 'condition' && localData.condition && (
            <div>
              <label className="mb-2 block text-xs font-medium text-gray-700">Condition</label>
              <div className="space-y-2">
                <input
                  type="text"
                  value={localData.condition.field || ''}
                  onChange={(e) =>
                    handleUpdate('condition', {
                      ...localData.condition,
                      field: e.target.value,
                    })
                  }
                  placeholder="Field name"
                  className="w-full rounded border px-3 py-2 text-sm"
                />
                <select
                  value={localData.condition.operator || 'equals'}
                  onChange={(e) =>
                    handleUpdate('condition', {
                      ...localData.condition,
                      operator: e.target.value,
                    })
                  }
                  className="w-full rounded border px-3 py-2 text-sm"
                >
                  <option value="equals">Equals</option>
                  <option value="not_equals">Not Equals</option>
                  <option value="contains">Contains</option>
                  <option value="greater_than">Greater Than</option>
                  <option value="less_than">Less Than</option>
                </select>
                <input
                  type="text"
                  value={localData.condition.value || ''}
                  onChange={(e) =>
                    handleUpdate('condition', {
                      ...localData.condition,
                      value: e.target.value,
                    })
                  }
                  placeholder="Value"
                  className="w-full rounded border px-3 py-2 text-sm"
                />
              </div>
            </div>
          )}

          {selectedNode.type === 'action' && localData.action && (
            <div>
              <label className="mb-2 block text-xs font-medium text-gray-700">Action Type</label>
              <select
                value={localData.action.type || 'assign'}
                onChange={(e) =>
                  handleUpdate('action', { ...localData.action, type: e.target.value })
                }
                className="w-full rounded border px-3 py-2 text-sm"
              >
                <option value="assign">Assign to Operator</option>
                <option value="tag">Add Tag</option>
                <option value="webhook">Call Webhook</option>
                <option value="email">Send Email</option>
                <option value="update_field">Update Field</option>
              </select>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
