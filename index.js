import express from "express";
import cors from "cors";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

const app = express();
app.use(cors());
app.use(express.json());

// 🕵️ SUPER MOUCHARD : Intercepte tout et affiche le contenu
app.use((req, res, next) => {
  console.log(`🚨 [${req.method}] Requête reçue sur : ${req.url}`);
  
  if (req.method === "POST") {
    console.log("📦 Contenu (Body) :", JSON.stringify(req.body, null, 2));
  }
  next();
});

app.get("/", (req, res) => {
  res.send("Le serveur MCP fonctionne !");
});

const server = new Server(
  { name: "linkedin-make-mcp", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "publish_linkedin_post",
        description: "Publie un post sur LinkedIn via Make",
        inputSchema: { type: "object", properties: { text: { type: "string" } }, required: ["text"] }
      }
    ]
  };
});

let transport;

app.get("/sse", async (req, res) => {
  const callbackUrl = `https://${req.headers.host}/message`;
  transport = new SSEServerTransport(callbackUrl, res);
  await server.connect(transport);
});

app.post("/message", async (req, res) => {
  if (transport) await transport.handlePostMessage(req, res);
  else res.status(404).send("Pas de session active");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Serveur MCP prêt sur le port ${PORT}`);
});
