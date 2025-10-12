'use client';

import SimpleVideoPlayer from '@/components/player/SimpleVideoPlayer';

export default function VideoSection() {
  return (
    <section className="bg-secondary py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Video Player - 75% */}
          <div className="lg:w-3/4">
            <SimpleVideoPlayer />
          </div>

          {/* Chat Window - 25% */}
          <div className="lg:w-1/4">
            <div className="bg-black/40 backdrop-blur-sm rounded-xl border border-accent/20 h-full min-h-[400px] lg:min-h-[500px] flex flex-col">
              {/* Chat Header */}
              <div className="p-4 border-b border-accent/20">
                <h3 className="text-white font-semibold text-lg">Live Chat</h3>
                <p className="text-gray-400 text-sm">Chat will be available during live events</p>
              </div>

              {/* Chat Messages Area */}
              <div className="flex-1 p-4 overflow-y-auto">
                <div className="space-y-3">
                  {/* Empty state */}
                  <div className="text-center text-gray-500 mt-8">
                    <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <p className="text-sm">No messages yet</p>
                    <p className="text-xs text-gray-600 mt-1">Chat will appear here during live streams</p>
                  </div>
                </div>
              </div>

              {/* Chat Input */}
              <div className="p-4 border-t border-accent/20">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    placeholder="Type a message..."
                    className="flex-1 bg-secondary/50 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 text-sm focus:outline-none focus:border-accent disabled:opacity-50"
                    disabled
                  />
                  <button 
                    className="bg-accent hover:bg-accent/90 text-black px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled
                  >
                    Send
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">Chat is disabled when stream is inactive</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}