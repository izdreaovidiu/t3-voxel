// src/app/user-profile/page.tsx
'use client';

import { SignedIn, UserProfile } from '@clerk/nextjs';
import { ArrowLeft, X } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function UserProfilePage() {
  const router = useRouter();

  return (
    <SignedIn>
      <div className="min-h-screen bg-gradient-to-br from-[#0D1117] via-[#161B22] to-[#21262D] p-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.back()}
                className="flex items-center justify-center w-10 h-10 rounded-lg bg-[#161B22] border border-gray-700/50 text-gray-400 hover:text-white hover:bg-gray-700/30 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-white">User Settings</h1>
                <p className="text-gray-400">Manage your account settings and preferences</p>
              </div>
            </div>
            
            <button
              onClick={() => window.close()}
              className="flex items-center justify-center w-10 h-10 rounded-lg bg-[#161B22] border border-gray-700/50 text-gray-400 hover:text-white hover:bg-gray-700/30 transition-colors"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Clerk UserProfile Component */}
          <div className="bg-[#161B22] rounded-xl border border-gray-700/50 p-1 shadow-2xl">
            <UserProfile 
              appearance={{
                baseTheme: undefined,
                variables: {
                  colorPrimary: '#57F287',
                  colorDanger: '#ED4245',
                  colorSuccess: '#57F287',
                  colorWarning: '#FEE75C',
                  colorNeutral: '#161B22',
                  colorBackground: '#161B22',
                  colorInputBackground: '#21262D',
                  colorInputText: '#ffffff',
                  colorText: '#ffffff',
                  colorTextSecondary: '#8b949e',
                  colorTextOnPrimaryBackground: '#000000',
                  borderRadius: '0.75rem',
                  fontFamily: 'inherit',
                  fontSize: '14px',
                },
                elements: {
                  rootBox: {
                    width: '100%',
                  },
                  card: {
                    backgroundColor: '#161B22',
                    border: '1px solid rgba(107, 114, 126, 0.3)',
                    borderRadius: '0.75rem',
                    boxShadow: 'none',
                  },
                  navbar: {
                    backgroundColor: '#21262D',
                    borderRight: '1px solid rgba(107, 114, 126, 0.3)',
                  },
                  navbarButton: {
                    color: '#8b949e',
                    '&:hover': {
                      backgroundColor: 'rgba(87, 242, 135, 0.1)',
                      color: '#57F287',
                    },
                    '&[data-active]': {
                      backgroundColor: 'rgba(87, 242, 135, 0.2)',
                      color: '#57F287',
                      borderRight: '2px solid #57F287',
                    },
                  },
                  pageScrollBox: {
                    backgroundColor: '#161B22',
                  },
                  page: {
                    backgroundColor: '#161B22',
                  },
                  formFieldInput: {
                    backgroundColor: '#21262D',
                    borderColor: 'rgba(107, 114, 126, 0.3)',
                    color: '#ffffff',
                    '&:focus': {
                      borderColor: '#57F287',
                      boxShadow: '0 0 0 1px #57F287',
                    },
                  },
                  formFieldLabel: {
                    color: '#ffffff',
                  },
                  formButtonPrimary: {
                    backgroundColor: '#57F287',
                    color: '#000000',
                    '&:hover': {
                      backgroundColor: '#3BA55C',
                    },
                  },
                  badge: {
                    backgroundColor: 'rgba(87, 242, 135, 0.2)',
                    color: '#57F287',
                  },
                  avatarBox: {
                    borderColor: '#57F287',
                  },
                  profileSectionTitle: {
                    color: '#ffffff',
                  },
                  profileSectionContent: {
                    color: '#8b949e',
                  },
                  menuButton: {
                    color: '#8b949e',
                    '&:hover': {
                      backgroundColor: 'rgba(87, 242, 135, 0.1)',
                      color: '#57F287',
                    },
                  },
                  menuItem: {
                    '&:hover': {
                      backgroundColor: 'rgba(87, 242, 135, 0.1)',
                      color: '#57F287',
                    },
                  },
                  alert: {
                    backgroundColor: '#21262D',
                    borderColor: 'rgba(107, 114, 126, 0.3)',
                    color: '#8b949e',
                  },
                  alertText: {
                    color: '#8b949e',
                  },
                }
              }}
            />
          </div>

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-gray-500 text-sm">
              🎮 Voxel • Powered by Clerk Authentication
            </p>
          </div>
        </div>
      </div>
    </SignedIn>
  );
}