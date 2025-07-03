"use client";

import { SignedIn, useUser } from "@clerk/nextjs";
import { api } from "~/utils/api";

export default function DebugPage() {
  const { user, isLoaded } = useUser();
  
  // Test basic auth
  const { data: authTest, isLoading: authLoading, error: authError } = api.server.testAuth.useQuery();
  
  // Test getUserServers
  const { data: servers, isLoading: serversLoading, error: serversError } = api.server.getUserServers.useQuery();
  
  // Test user creation
  const syncUserMutation = api.user.getOrCreateUser.useMutation();

  const handleSyncUser = () => {
    if (user) {
      syncUserMutation.mutate({
        clerkId: user.id,
        email: user.emailAddresses[0]?.emailAddress || "",
        username: user.username || user.firstName || `User_${user.id.slice(-8)}`,
        avatar: user.imageUrl,
      });
    }
  };

  return (
    <SignedIn>
      <div className="container mx-auto p-8">
        <h1 className="text-3xl font-bold mb-8">Debug Page</h1>
        
        {/* Clerk User Info */}
        <div className="mb-8 p-4 border rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Clerk User Info</h2>
          <pre className="text-sm bg-gray-100 p-4 rounded">
            {JSON.stringify({
              isLoaded,
              userId: user?.id,
              username: user?.username,
              email: user?.emailAddresses[0]?.emailAddress,
              firstName: user?.firstName,
              lastName: user?.lastName,
            }, null, 2)}
          </pre>
        </div>

        {/* Auth Test */}
        <div className="mb-8 p-4 border rounded-lg">
          <h2 className="text-xl font-semibold mb-4">tRPC Auth Test</h2>
          {authLoading && <p>Loading auth test...</p>}
          {authError && (
            <div className="text-red-600">
              <p>Auth Error: {authError.message}</p>
              <pre className="text-sm bg-red-100 p-4 rounded">
                {JSON.stringify(authError, null, 2)}
              </pre>
            </div>
          )}
          {authTest && (
            <div className="text-green-600">
              <p>Auth Success!</p>
              <pre className="text-sm bg-green-100 p-4 rounded">
                {JSON.stringify(authTest, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* User Sync Test */}
        <div className="mb-8 p-4 border rounded-lg">
          <h2 className="text-xl font-semibold mb-4">User Sync Test</h2>
          <button
            onClick={handleSyncUser}
            disabled={syncUserMutation.isPending}
            className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            {syncUserMutation.isPending ? 'Syncing...' : 'Sync User'}
          </button>
          
          {syncUserMutation.error && (
            <div className="text-red-600 mt-4">
              <p>Sync Error: {syncUserMutation.error.message}</p>
              <pre className="text-sm bg-red-100 p-4 rounded">
                {JSON.stringify(syncUserMutation.error, null, 2)}
              </pre>
            </div>
          )}
          
          {syncUserMutation.data && (
            <div className="text-green-600 mt-4">
              <p>Sync Success!</p>
              <pre className="text-sm bg-green-100 p-4 rounded">
                {JSON.stringify(syncUserMutation.data, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Servers Test */}
        <div className="mb-8 p-4 border rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Get Servers Test</h2>
          {serversLoading && <p>Loading servers...</p>}
          {serversError && (
            <div className="text-red-600">
              <p>Servers Error: {serversError.message}</p>
              <pre className="text-sm bg-red-100 p-4 rounded">
                {JSON.stringify(serversError, null, 2)}
              </pre>
            </div>
          )}
          {servers && (
            <div className="text-green-600">
              <p>Found {servers.length} servers</p>
              <pre className="text-sm bg-green-100 p-4 rounded">
                {JSON.stringify(servers, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Console Logs */}
        <div className="mb-8 p-4 border rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Console Logs</h2>
          <p className="text-sm text-gray-600">
            Check the browser console and server console for detailed logs.
          </p>
        </div>
      </div>
    </SignedIn>
  );
}
