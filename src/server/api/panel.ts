import { type NextApiRequest, type NextApiResponse } from "next";
import { renderPanel } from "~/trpc-panel";

export const config = {
  api: {
    bodyParser: false,
  },
};

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (process.env.NODE_ENV === "production") {
    return res.status(404).json({ message: "Not found" });
  }

  // Only allow GET requests
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    console.log("Rendering tRPC panel...");
    const panelHtml = renderPanel();
    
    // Set security headers
    res.setHeader("Content-Type", "text/html");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    
    return res.status(200).send(panelHtml);
  } catch (error) {
    console.error("Error rendering tRPC panel:", error);
    
    // More detailed error response
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    if (!res.headersSent) {
      return res.status(500).json({ 
        error: "Failed to render tRPC panel",
        message: errorMessage,
        ...(process.env.NODE_ENV === "development" && { stack: errorStack })
      });
    }
  }
};

export default handler;
