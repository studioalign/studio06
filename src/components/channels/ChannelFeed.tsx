import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useChannel } from '../../hooks/useChannel';
import { useAuth } from '../../contexts/AuthContext';
import PostComposer from './PostComposer';
import PostCard from './PostCard';
import ChannelMembers from './ChannelMembers';
import { Users } from 'lucide-react';

interface ChannelFeedProps {
  channelId: string;
}

export default function ChannelFeed({ channelId }: ChannelFeedProps) {
  const { posts, channel, loading, error } = useChannel(channelId);
  const { userRole } = useAuth();
  const [showMembers, setShowMembers] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (channel?.members) {
      setIsAdmin(channel.members.some(m => m.role === 'admin'));
    }
  }, [channel]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-20 bg-gray-200 rounded-lg" />
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-40 bg-gray-200 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center text-red-500">
        <p>Error: {error}</p>
      </div>
    );
  }

  if (!channel) {
    return (
      <div className="p-6 text-center text-gray-500">
        <p>Channel not found</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="border-b bg-white p-4">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-xl font-semibold text-brand-primary">{channel.name}</h1>
            {channel.description && (
              <p className="text-gray-600 mt-1">{channel.description}</p>
            )}
          </div>
          <button
            onClick={() => setShowMembers(true)}
            className="flex items-center px-3 py-1 text-sm text-gray-600 hover:text-brand-primary"
          >
            <Users className="w-4 h-4 mr-1" />
            Members
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            isAdmin={isAdmin}
            channelId={channelId}
          />
        ))}
        {posts.length === 0 && (
          <div className="text-center text-gray-500">
            <p>No posts yet</p>
            <p className="text-sm">Be the first to post in this channel!</p>
          </div>
        )}
      </div>

      <div className="border-t bg-white p-4">
        <PostComposer channelId={channelId} />
      </div>
      
      {showMembers && (
        <ChannelMembers
          channelId={channelId}
          onClose={() => setShowMembers(false)}
        />
      )}
    </div>
  );
}