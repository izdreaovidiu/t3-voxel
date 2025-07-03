import { type NextApiRequest, type NextApiResponse } from "next";
import { appRouter } from "~/server/api/root";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(_: NextApiRequest, res: NextApiResponse) {
  if (process.env.NODE_ENV !== "development") {
    return res.status(404).send("Not Found");
  }

  try {
    const { renderTrpcPanel } = await import("trpc-ui");
    
    const panelHtml = renderTrpcPanel(appRouter, {
      url: "/api/trpc",
      transformer: "superjson",
      meta: {
        title: "Voxel API Panel",
        description: "Interactive API documentation for the Voxel application.",
      },
    });

    // Set security headers
    res.setHeader("Content-Type", "text/html");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    
    return res.status(200).send(panelHtml);
  } catch (error) {
    console.error("Error rendering tRPC panel:", error);
    
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    if (!res.headersSent) {
      return res.status(500).json({ 
        error: "Failed to render tRPC panel",
        message: errorMessage,
        ...(process.env.NODE_ENV === "development" && { 
          stack: error instanceof Error ? error.stack : undefined 
        })
      });
    }
  }
}
