import React, { useState } from 'react';
import { Plus, User } from 'lucide-react';
import { useMessaging } from '../../contexts/MessagingContext';
import { formatMessageDate } from '../../utils/messagingUtils';
import NewMessageModal from './NewMessageModal';
import { useAuth } from '../../contexts/AuthContext';

export default function ConversationList() {
  const { conversations, activeConversation, setActiveConversation } = useMessaging();
  const { userId } = useAuth();
  const [showNewMessage, setShowNewMessage] = useState(false);

  const getParticipantDisplay = (conversation: any) => {
    const otherParticipant = conversation.participants.find(
      (p: any) => p.user_id !== userId
    );
    return otherParticipant?.email || 'Unknown User';
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b">
        <button
          onClick={() => setShowNewMessage(true)}
          className="w-full flex items-center justify-center px-4 py-2 bg-brand-primary text-white rounded-md hover:bg-brand-secondary-400"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Message
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            <p>No conversations yet</p>
            <p className="text-sm">Start a new conversation to begin messaging</p>
          </div>
        ) : (
          <div className="divide-y">
            {conversations.map((conversation) => (
              <button
                key={conversation.id}
                onClick={() => setActiveConversation(conversation.id)}
                className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${
                  activeConversation === conversation.id ? 'bg-brand-secondary-100/10' : ''
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <div className="flex items-center">
                    <User className="w-5 h-5 text-gray-400 mr-2" />
                    <h3 className="font-medium text-gray-900">
                      {getParticipantDisplay(conversation)}
                    </h3>
                  </div>
                  {conversation.last_message_at && (
                    <span className="text-xs text-gray-500">
                      {formatMessageDate(conversation.last_message_at)}
                    </span>
                  )}
                </div>
                {conversation.last_message && (
                  <p className="text-sm text-gray-500 truncate">
                    {conversation.last_message}
                  </p>
                )}
                {conversation.participants.some(
                  (p) => p.unread_count > 0
                ) && (
                  <div className="mt-1">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-brand-primary text-white">
                      {conversation.participants
                        .reduce((total, p) => total + p.unread_count, 0)}
                    </span>
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {showNewMessage && (
        <NewMessageModal onClose={() => setShowNewMessage(false)} />
      )}
    </div>
  );
}