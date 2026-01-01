import { useNavigate } from 'react-router-dom';
import { Bot, Edit2, Trash2, Play, Pause } from 'lucide-react';
import { format } from 'date-fns';
import type { Chatbot } from '@/types';
import { useChatbotStore } from '@/stores/chatbotStore';

interface ChatbotCardProps {
  chatbot: Chatbot;
}

export function ChatbotCard({ chatbot }: ChatbotCardProps) {
  const navigate = useNavigate();
  const { deleteChatbot, updateChatbot } = useChatbotStore();

  const handleEdit = () => {
    navigate(`/chatbots/${chatbot.id}/builder`);
  };

  const handleDelete = async () => {
    if (confirm(`Are you sure you want to delete "${chatbot.name}"?`)) {
      try {
        await deleteChatbot(chatbot.id);
      } catch (error) {
        console.error('Failed to delete chatbot:', error);
      }
    }
  };

  const handleToggleStatus = async () => {
    try {
      const newStatus = chatbot.status === 'active' ? 'inactive' : 'active';
      await updateChatbot(chatbot.id, { status: newStatus });
    } catch (error) {
      console.error('Failed to update chatbot status:', error);
    }
  };

  return (
    <div className="rounded-lg border bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
      <div className="mb-4 flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
            <Bot className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{chatbot.name}</h3>
            {chatbot.description && (
              <p className="mt-1 text-sm text-gray-600">{chatbot.description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleStatus}
            className={`rounded-lg p-2 transition-colors ${
              chatbot.status === 'active'
                ? 'text-green-600 hover:bg-green-50'
                : 'text-gray-400 hover:bg-gray-50'
            }`}
            title={chatbot.status === 'active' ? 'Deactivate' : 'Activate'}
          >
            {chatbot.status === 'active' ? (
              <Play className="h-4 w-4" />
            ) : (
              <Pause className="h-4 w-4" />
            )}
          </button>
          <button
            onClick={handleEdit}
            className="rounded-lg p-2 text-blue-600 transition-colors hover:bg-blue-50"
            title="Edit chatbot"
          >
            <Edit2 className="h-4 w-4" />
          </button>
          <button
            onClick={handleDelete}
            className="rounded-lg p-2 text-red-600 transition-colors hover:bg-red-50"
            title="Delete chatbot"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4 border-t pt-4">
        <div>
          <span
            className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
              chatbot.status === 'active'
                ? 'bg-green-100 text-green-700'
                : chatbot.status === 'draft'
                ? 'bg-gray-100 text-gray-700'
                : 'bg-red-100 text-red-700'
            }`}
          >
            {chatbot.status.charAt(0).toUpperCase() + chatbot.status.slice(1)}
          </span>
        </div>

        <div className="ml-auto text-xs text-gray-500">
          Updated {format(new Date(chatbot.updatedAt), 'MMM d, yyyy')}
        </div>
      </div>

      {chatbot.flow && (
        <div className="mt-3 flex gap-4 border-t pt-3 text-xs text-gray-600">
          <div>
            <span className="font-medium">{chatbot.flow.nodes?.length || 0}</span> nodes
          </div>
          <div>
            <span className="font-medium">{chatbot.flow.edges?.length || 0}</span> connections
          </div>
        </div>
      )}
    </div>
  );
}
