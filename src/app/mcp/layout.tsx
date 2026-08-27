import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "MCP Server - Collega Resumari a ChatGPT, Claude e Cursor",
  description:
    "Collega Resumari a ChatGPT, Claude.ai, Cursor e altri client MCP per trascrivere e riassumere video YouTube direttamente dai tuoi agenti AI. Endpoint Streamable HTTP: https://resumari.com/api/mcp.",
  openGraph: {
    title: "MCP Server - Collega Resumari a ChatGPT, Claude e Cursor",
    description:
      "Trascrivi e riassumi video YouTube dai tuoi agenti AI tramite MCP.",
    url: "https://resumari.com/mcp",
    siteName: "Resumari",
  },
  alternates: { canonical: "https://resumari.com/mcp" },
};

export default function McpLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
