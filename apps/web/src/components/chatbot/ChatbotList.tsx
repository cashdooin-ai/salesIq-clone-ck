import { useEffect, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useChatbotStore } from '@/stores/chatbotStore';
import { ChatbotCard } from './ChatbotCard';

export function ChatbotList() {
  const navigate = useNavigate();
  const { chatbots, fetchChatbots, isLoading, createChatbot } = useChatbotStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    fetchChatbots();
  }, [fetchChatbots]);

  const handleCreateChatbot = async () => {
    const name = prompt('Enter chatbot name:');
    if (!name) return;

    const description = prompt('Enter chatbot description (optional):');

    try {
      const chatbot = await createChatbot({
        name,
        description: description || undefined,
      });
      navigate(`/chatbots/${chatbot.id}/builder`);
    } catch (error) {
      alert('Failed to create chatbot');
    }
  };

  const filteredChatbots = chatbots.filter((chatbot) => {
    const matchesSearch =
      chatbot.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      chatbot.description?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || chatbot.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="h-full overflow-auto">
      <div className="border-b bg-white px-6 py-4">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Chatbots</h1>
          <button
            onClick={handleCreateChatbot}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Create Chatbot
          </button>
        </div>

        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search chatbots..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border px-10 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border px-4 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      <div className="p-6">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="text-sm text-gray-500">Loading chatbots...</div>
          </div>
        ) : filteredChatbots.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center">
            <div className="text-center">
              <div className="mb-2 text-lg font-semibold text-gray-900">No chatbots found</div>
              <p className="mb-4 text-sm text-gray-500">
                {searchQuery || statusFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Get started by creating your first chatbot'}
              </p>
              {!searchQuery && statusFilter === 'all' && (
                <button
                  onClick={handleCreateChatbot}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
                >
                  <Plus className="h-4 w-4" />
                  Create Your First Chatbot
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredChatbots.map((chatbot) => (
              <ChatbotCard key={chatbot.id} chatbot={chatbot} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
