import React from 'react';
import ChannelList from './ChannelList';
import ChannelFeed from './ChannelFeed';
import { useParams } from 'react-router-dom';
import { MessageSquare } from 'lucide-react';

export default function ChannelLayout() {
  const { channelId } = useParams();

  return (
    <div className="h-[calc(100vh-4rem)] flex">
      <div className="w-80 border-r bg-white">
        <ChannelList />
      </div>
      <div className="flex-1 bg-gray-50">
        {!channelId ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-500">
            <MessageSquare className="w-16 h-16 mb-4 text-brand-secondary-400" />
            <h2 className="text-xl font-semibold text-brand-primary mb-2">Welcome to Class Channels</h2>
            <p className="text-center max-w-md mb-4">
              Stay connected with your class community. Select a channel to view updates,
              announcements, and join the conversation.
            </p>
          </div>
        ) : (
          <ChannelFeed channelId={channelId} />
        )}
      </div>
    </div>
  );
}