import express from "express";
import cors from "cors";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

const app = express();
app.use(cors());
app.use(express.json());

// 🕵️ Mouchard global : affiche TOUT ce qui arrive sur le serveur
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
  console.log("✅ Mammouth demande la liste des outils !");
  return {
    tools: [
      {
        name: "publish_linkedin_post",
        description: "Publie un post sur LinkedIn via Make.com",
        inputSchema: {
          type: "object",
          properties: {
            text: {
              type: "string",
              description: "Le contenu du post LinkedIn à publier"
            }
          },
          required: ["text"]
        }
      }
    ]
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  console.log("🛠️ Mammouth exécute l'outil :", request.params.name);
  return { toolResult: { content: [{ type: "text", text: "Test réussi" }] } };
});

let transport;

app.get("/sse", async (req, res) => {
  // 🔑 L'astuce est ici : on génère dynamiquement l'URL absolue complète
  const callbackUrl = `https://${req.headers.host}/message`;
  console.log(`-> Connexion SSE. URL de retour envoyée à Mammouth : ${callbackUrl}`);
  
  transport = new SSEServerTransport(callbackUrl, res);
  await server.connect(transport);
});

app.post("/message", async (req, res) => {
  if (transport) {
    await transport.handlePostMessage(req, res);
  } else {
    res.status(404).send("Pas de session SSE active");
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Serveur MCP prêt sur le port ${PORT}`);
});
