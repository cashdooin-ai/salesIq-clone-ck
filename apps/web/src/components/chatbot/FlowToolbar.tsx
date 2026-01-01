import { Save, Play, Upload, Trash2 } from 'lucide-react';
import { useChatbotStore } from '@/stores/chatbotStore';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

interface FlowToolbarProps {
  chatbotId: string;
}

export function FlowToolbar({ chatbotId }: FlowToolbarProps) {
  const navigate = useNavigate();
  const { saveFlow, validateFlow, publishChatbot, clearFlow, isLoading, currentChatbot } =
    useChatbotStore();
  const [isSaving, setIsSaving] = useState(false);
  const [isValidating, setIsValidating] = useState(false);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await saveFlow(chatbotId);
      alert('Flow saved successfully!');
    } catch (error) {
      alert('Failed to save flow');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = async () => {
    try {
      setIsValidating(true);
      const result = await validateFlow();

      if (result.valid) {
        alert('Flow is valid! Ready to publish.');
      } else {
        alert(`Flow validation failed:\n${result.errors?.join('\n')}`);
      }
    } catch (error) {
      alert('Failed to validate flow');
    } finally {
      setIsValidating(false);
    }
  };

  const handlePublish = async () => {
    try {
      setIsValidating(true);
      const result = await validateFlow();

      if (!result.valid) {
        alert(`Cannot publish. Flow validation failed:\n${result.errors?.join('\n')}`);
        return;
      }

      if (
        confirm(
          'Are you sure you want to publish this chatbot? It will become active for visitors.'
        )
      ) {
        await saveFlow(chatbotId);
        await publishChatbot(chatbotId);
        alert('Chatbot published successfully!');
        navigate('/chatbots');
      }
    } catch (error) {
      alert('Failed to publish chatbot');
    } finally {
      setIsValidating(false);
    }
  };

  const handleClear = () => {
    if (confirm('Are you sure you want to clear the entire flow? This cannot be undone.')) {
      clearFlow();
    }
  };

  return (
    <div className="flex items-center justify-between border-b bg-white px-6 py-3">
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-semibold text-gray-900">
          {currentChatbot?.name || 'Chatbot Builder'}
        </h2>
        {currentChatbot?.status && (
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              currentChatbot.status === 'active'
                ? 'bg-green-100 text-green-700'
                : currentChatbot.status === 'draft'
                ? 'bg-gray-100 text-gray-700'
                : 'bg-red-100 text-red-700'
            }`}
          >
            {currentChatbot.status.charAt(0).toUpperCase() + currentChatbot.status.slice(1)}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={handleClear}
          disabled={isLoading}
          className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          <Trash2 className="h-4 w-4" />
          Clear
        </button>

        <button
          onClick={handleSave}
          disabled={isSaving || isLoading}
          className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {isSaving ? 'Saving...' : 'Save'}
        </button>

        <button
          onClick={handleTest}
          disabled={isValidating || isLoading}
          className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          <Play className="h-4 w-4" />
          {isValidating ? 'Testing...' : 'Test'}
        </button>

        <button
          onClick={handlePublish}
          disabled={isValidating || isLoading}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
        >
          <Upload className="h-4 w-4" />
          Publish
        </button>
      </div>
    </div>
  );
}
