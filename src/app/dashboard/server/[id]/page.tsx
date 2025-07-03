// app/dashboard/server/[id]/page.tsx
"use client";

import { useParams, useRouter } from "next/navigation";
import { SignedIn } from "@clerk/nextjs";
import DiscordServerPage from "~/app/_components/serverPage"; // Updated path
import { UserSync } from "~/components/auth";

export default function ServerPage() {
  const params = useParams();
  const router = useRouter();
  const serverId = params.id as string; // Keep as string since Prisma IDs are cuid strings

  const handleBack = () => {
    router.push("/dashboard"); // Navigate back to dashboard with carousel
  };

  return (
    <SignedIn>
      <UserSync>
        <DiscordServerPage serverId={serverId} onBack={handleBack} />
      </UserSync>
    </SignedIn>
  );
}
