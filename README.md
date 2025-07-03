# Voxel - Voice Chat Application

A Discord-like voice chat application built with Next.js, tRPC, Prisma, Socket.IO, and WebRTC.

## Features
- Real-time voice and video calls
- Screen sharing capabilities  
- Text messaging
- Server and channel management
- User presence system
- Invite system

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up environment variables:
   ```bash
   cp .env.example .env
   ```

3. Set up the database:
   ```bash
   npx prisma db push
   npx prisma generate
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

## Technologies Used
- Next.js 14
- tRPC for type-safe APIs
- Prisma ORM  
- Socket.IO for real-time communication
- WebRTC for voice/video calls
- Clerk for authentication
- Tailwind CSS for styling
