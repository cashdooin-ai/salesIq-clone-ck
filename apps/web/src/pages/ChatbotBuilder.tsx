import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { FlowBuilder } from '@/components/chatbot/FlowBuilder';
import { NodePalette } from '@/components/chatbot/NodePalette';
import { NodeEditor } from '@/components/chatbot/NodeEditor';
import { FlowToolbar } from '@/components/chatbot/FlowToolbar';
import { useChatbotStore } from '@/stores/chatbotStore';

export function ChatbotBuilder() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { fetchChatbot, isLoading, error } = useChatbotStore();

  useEffect(() => {
    if (id) {
      fetchChatbot(id);
    }
  }, [id, fetchChatbot]);

  if (!id) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900">Invalid Chatbot ID</h2>
          <button
            onClick={() => navigate('/chatbots')}
            className="mt-4 text-sm text-primary hover:underline"
          >
            Go back to chatbots
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-sm text-gray-500">Loading chatbot...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900">Error loading chatbot</h2>
          <p className="mt-2 text-sm text-gray-500">{error}</p>
          <button
            onClick={() => navigate('/chatbots')}
            className="mt-4 text-sm text-primary hover:underline"
          >
            Go back to chatbots
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b bg-white px-6 py-3">
        <button
          onClick={() => navigate('/chatbots')}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Chatbots
        </button>
      </div>

      <FlowToolbar chatbotId={id} />

      <div className="flex flex-1 overflow-hidden">
        <NodePalette />
        <div className="flex-1">
          <FlowBuilder />
        </div>
        <NodeEditor />
      </div>
    </div>
  );
}
