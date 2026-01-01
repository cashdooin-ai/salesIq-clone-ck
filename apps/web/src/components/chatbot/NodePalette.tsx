import { Play, MessageSquare, HelpCircle, Square, GitBranch, Zap, CheckCircle } from 'lucide-react';
import type { BotNodeType, BotNodeData } from '@/types';
import { useChatbotStore } from '@/stores/chatbotStore';

interface NodeTemplate {
  type: BotNodeType;
  icon: React.ElementType;
  label: string;
  description: string;
  color: string;
  defaultData: BotNodeData;
}

const nodeTemplates: NodeTemplate[] = [
  {
    type: 'start',
    icon: Play,
    label: 'Start',
    description: 'Entry point of the flow',
    color: 'green',
    defaultData: { label: 'Start' },
  },
  {
    type: 'message',
    icon: MessageSquare,
    label: 'Message',
    description: 'Send a message to user',
    color: 'blue',
    defaultData: { label: 'New Message', content: 'Hello! How can I help you?' },
  },
  {
    type: 'question',
    icon: HelpCircle,
    label: 'Question',
    description: 'Ask for user input',
    color: 'purple',
    defaultData: {
      label: 'Ask Question',
      content: 'What is your name?',
      inputType: 'text',
      variableName: 'user_name',
    },
  },
  {
    type: 'buttons',
    icon: Square,
    label: 'Buttons',
    description: 'Show quick reply buttons',
    color: 'indigo',
    defaultData: {
      label: 'Show Buttons',
      content: 'Choose an option:',
      buttons: [
        { label: 'Option 1', value: 'opt1' },
        { label: 'Option 2', value: 'opt2' },
      ],
    },
  },
  {
    type: 'condition',
    icon: GitBranch,
    label: 'Condition',
    description: 'Branch based on condition',
    color: 'yellow',
    defaultData: {
      label: 'Check Condition',
      condition: { field: 'variable', operator: 'equals', value: 'value' },
    },
  },
  {
    type: 'action',
    icon: Zap,
    label: 'Action',
    description: 'Perform an action',
    color: 'orange',
    defaultData: {
      label: 'Perform Action',
      action: { type: 'assign', params: {} },
    },
  },
  {
    type: 'end',
    icon: CheckCircle,
    label: 'End',
    description: 'End conversation',
    color: 'red',
    defaultData: { label: 'End' },
  },
];

export function NodePalette() {
  const { addNode, nodes } = useChatbotStore();

  const handleAddNode = (template: NodeTemplate) => {
    const newNode = {
      id: `node-${Date.now()}`,
      type: template.type,
      data: { ...template.defaultData },
      position: {
        x: Math.random() * 400 + 100,
        y: Math.random() * 400 + 100,
      },
    };

    addNode(newNode);
  };

  return (
    <div className="h-full w-64 border-r bg-white p-4">
      <h3 className="mb-4 text-sm font-semibold text-gray-900">Node Palette</h3>
      <div className="space-y-2">
        {nodeTemplates.map((template) => {
          const Icon = template.icon;
          const disabled = template.type === 'start' && nodes.some((n) => n.type === 'start');

          return (
            <button
              key={template.type}
              onClick={() => !disabled && handleAddNode(template)}
              disabled={disabled}
              className={`w-full rounded-lg border p-3 text-left transition-colors ${
                disabled
                  ? 'cursor-not-allowed opacity-50'
                  : 'hover:bg-gray-50 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start gap-2">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full bg-${template.color}-500 text-white`}
                  style={{
                    backgroundColor:
                      template.color === 'green'
                        ? '#22c55e'
                        : template.color === 'blue'
                        ? '#3b82f6'
                        : template.color === 'purple'
                        ? '#a855f7'
                        : template.color === 'indigo'
                        ? '#6366f1'
                        : template.color === 'yellow'
                        ? '#eab308'
                        : template.color === 'orange'
                        ? '#f97316'
                        : '#ef4444',
                  }}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">{template.label}</div>
                  <div className="text-xs text-gray-500">{template.description}</div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
