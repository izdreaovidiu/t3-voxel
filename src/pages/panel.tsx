import { type NextPage } from "next";
import { renderTrpcPanel } from "trpc-panel";
import { appRouter } from "~/server/api/root";

// This is a workaround for tRPC Panel to work with tRPC v11
declare module "trpc-panel" {
  interface RouterMeta {
    [key: string]: unknown;
  }
}

const Panel: NextPage = () => {
  if (process.env.NODE_ENV === "production") {
    return <div>Not available in production</div>;
  }

  const panelHtml = renderTrpcPanel(appRouter as any, {
    url: "http://localhost:3000/api/trpc",
    transformer: "superjson",
  });

  return (
    <div dangerouslySetInnerHTML={{ __html: panelHtml }} className="min-h-screen" />
  );
};

export default Panel;
