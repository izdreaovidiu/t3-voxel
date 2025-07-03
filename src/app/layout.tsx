import { ClerkProvider } from "@clerk/nextjs";
import { Inter } from "next/font/google";
import { TRPCReactProvider } from "~/trpc/react";
import { Toaster } from "sonner";
import { EnhancedSocketProvider } from "~/contexts/EnhancedSocketContext";

import "~/styles/globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata = {
  title: "Video Call App",
  description: "WebRTC video calling with T3 stack",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={`font-sans ${inter.variable}`}>
          <TRPCReactProvider>
            <EnhancedSocketProvider>
              {children}
            </EnhancedSocketProvider>
            <Toaster position="top-right" richColors />
          </TRPCReactProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
