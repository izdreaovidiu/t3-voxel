import type { Server as NetServer } from "http";
import type { NextApiResponse } from "next";
import type { Server as SocketIOServer } from "socket.io";

export type NextApiResponseServerIo = NextApiResponse & {
  socket: {
    server: NetServer & {
      io: SocketIOServer;
    };
  };
};

export interface ServerToClientEvents {
  "user-joined": (data: { userId: string; socketId: string }) => void;
  "user-left": (data: { userId: string }) => void;
  offer: (data: { from: string; offer: RTCSessionDescriptionInit }) => void;
  answer: (data: { from: string; answer: RTCSessionDescriptionInit }) => void;
  "ice-candidate": (data: {
    from: string;
    candidate: RTCIceCandidateInit;
  }) => void;
}

export interface ClientToServerEvents {
  "join-room": (roomId: string) => void;
  "leave-room": (roomId: string) => void;
  offer: (data: { target: string; offer: RTCSessionDescriptionInit }) => void;
  answer: (data: { target: string; answer: RTCSessionDescriptionInit }) => void;
  "ice-candidate": (data: {
    target: string;
    candidate: RTCIceCandidateInit;
  }) => void;
}
