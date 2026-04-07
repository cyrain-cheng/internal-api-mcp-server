import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerAuthTools } from "./tools/auth.js";
import { registerApiTools } from "./tools/api.js";

async function main() {
  const server = new McpServer({
    name: "giikin-api",
    version: "1.0.0",
  });

  registerAuthTools(server);
  registerApiTools(server);

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("MCP Server 启动失败:", err);
  process.exit(1);
});
