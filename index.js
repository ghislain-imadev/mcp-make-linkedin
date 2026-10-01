import express from "express";
import cors from "cors";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

const app = express();
app.use(cors());
app.use(express.json());

// Mouchard global
app.use((req, res, next) => {
  console.log(`[${req.method}] Requête reçue sur : ${req.url}`);
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
        description: "Publie un post sur LinkedIn",
        inputSchema: { type: "object", properties: { text: { type: "string" } }, required: ["text"] }
      }
    ]
  };
});

let transport;

// L'ancienne route GET pour le SSE (au cas où)
app.get("/sse", async (req, res) => {
  const callbackUrl = `https://${req.headers.host}/message`;
  transport = new SSEServerTransport(callbackUrl, res);
  await server.connect(transport);
});

// NOUVEAU : On attrape le POST que Mammouth envoie !
app.post("/sse", (req, res) => {
  console.log("👀 BINGO ! Mammouth a envoyé un POST sur /sse");
  console.log("📦 Contenu du message (Body) :", JSON.stringify(req.body, null, 2));
  console.log("🏷️ En-têtes (Headers) :", JSON.stringify(req.headers, null, 2));
  
  // On renvoie un succès temporaire pour voir si Mammouth est content
  res.status(200).json({ status: "success", message: "POST bien reçu !" });
});

app.post("/message", async (req, res) => {
  if (transport) await transport.handlePostMessage(req, res);
  else res.status(404).send("Pas de session SSE active");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Serveur MCP prêt sur le port ${PORT}`);
});
