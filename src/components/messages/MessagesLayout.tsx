import React from 'react';
import ConversationList from './ConversationList';
import MessageThread from './MessageThread';
import { useMessaging } from '../../contexts/MessagingContext';
import { MessageSquare, Users } from 'lucide-react';

export default function MessagesLayout() {
  const { activeConversation, conversations, loading } = useMessaging();

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-48" />
          <div className="h-4 bg-gray-200 rounded w-32" />
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex">
      <div className="w-80 border-r bg-white">
        <ConversationList />
      </div>
      <div className="flex-1 bg-gray-50">
        {conversations.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-500 p-8">
            <Users className="w-16 h-16 mb-4 text-brand-secondary-400" />
            <h2 className="text-xl font-semibold text-brand-primary mb-2">Welcome to Messages</h2>
            <p className="text-center max-w-md mb-4">
              Start connecting with teachers, parents, and studio owners. Click the "New Message" 
              button to begin your first conversation.
            </p>
            <div className="p-4 bg-brand-secondary-100/10 rounded-lg text-sm">
              <p className="text-brand-secondary-400">
                💡 Tip: Use messages to discuss class schedules, student progress, or any other 
                studio-related matters.
              </p>
            </div>
          </div>
        ) : activeConversation ? (
          <MessageThread />
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-gray-500">
            <MessageSquare className="w-16 h-16 mb-4 text-brand-secondary-400" />
            <p className="text-lg font-medium">Select a conversation</p>
            <p className="text-sm">Choose a conversation from the list to start messaging</p>
          </div>
        )}
      </div>
    </div>
  );
}