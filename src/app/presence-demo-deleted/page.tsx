// src/app/presence-demo/page.tsx
'use client';

import { SignedIn, useUser } from '@clerk/nextjs';
import { MembersList } from '~/components/presence/MembersList';
import { UserSync } from '~/components/auth';

export default function PresenceDemoPage() {
  const { user } = useUser();

  return (
    <SignedIn>
      <UserSync>
        <div className="min-h-screen bg-gradient-to-br from-[#0D1117] via-[#161B22] to-[#21262D] p-8">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-white mb-4">
                🎮 Voxel Presence System Demo
              </h1>
              <p className="text-gray-400 text-lg">
                Real-time user presence with activity tracking
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Demo Info */}
              <div className="bg-[#161B22] rounded-xl border border-gray-700/50 p-6">
                <h2 className="text-xl font-bold text-white mb-4">✨ Features</h2>
                <div className="space-y-3 text-sm text-gray-300">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>Real-time online/offline status</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                    <span>Auto-away after 5 minutes of inactivity</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span>Browser activity detection (with extension)</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    <span>Manual status updates</span>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-blue-600/20 border border-blue-600/30 rounded-lg">
                  <h3 className="text-blue-300 font-medium mb-2">📱 Browser Extension</h3>
                  <p className="text-blue-200 text-sm">
                    Install the browser extension to automatically share your browsing activity
                    like \"Browsing Brave - youtube.com\"
                  </p>
                </div>

                <div className="mt-4 p-4 bg-green-600/20 border border-green-600/30 rounded-lg">
                  <h3 className="text-green-300 font-medium mb-2">🔗 How to Test</h3>
                  <ol className="text-green-200 text-sm space-y-1 list-decimal list-inside">
                    <li>Open this page in another browser/device</li>
                    <li>Sign in with a different account</li>
                    <li>Watch real-time presence updates!</li>
                  </ol>
                </div>
              </div>

              {/* Live Presence */}
              <div className="bg-[#161B22] rounded-xl border border-gray-700/50 p-6">
                <h2 className="text-xl font-bold text-white mb-4">👥 Live Presence</h2>
                <MembersList />
              </div>
            </div>

            {/* Current User Info */}
            <div className="mt-8 bg-[#161B22] rounded-xl border border-gray-700/50 p-6">
              <h2 className="text-xl font-bold text-white mb-4">👤 Your Profile</h2>
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-xl">
                  {user?.firstName?.charAt(0) || user?.username?.charAt(0) || 'U'}
                </div>
                <div>
                  <h3 className="text-white font-medium">
                    {user?.firstName} {user?.lastName} 
                    {user?.username && ` (@${user.username})`}
                  </h3>
                  <p className="text-gray-400 text-sm">
                    User ID: {user?.id}
                  </p>
                  <p className="text-gray-400 text-sm">
                    Email: {user?.emailAddresses[0]?.emailAddress}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </UserSync>
    </SignedIn>
  );
}