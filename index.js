import express from "express";
import cors from "cors";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

const app = express();
app.use(cors());
// On remet express.json() car le système en a besoin pour interpréter le POST
app.use(express.json());

const server = new Server(
  { name: "linkedin-make-mcp", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
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
  if (request.params.name === "publish_linkedin_post") {
    const text = request.params.arguments.text;
    const webhookUrl = process.env.MAKE_WEBHOOK_URL; 
    
    if (!webhookUrl) {
      throw new Error("L'URL du Webhook Make n'est pas configurée.");
    }
    
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ post_content: text })
    });
    
    if (response.ok) {
      return { toolResult: { content: [{ type: "text", text: "Le post a bien été envoyé à Make.com pour publication !" }] } };
    } else {
      throw new Error("Erreur lors de l'envoi à Make.com");
    }
  }
  throw new Error("Outil inconnu");
});

const transports = new Map();

app.get("/sse", async (req, res) => {
  // On utilise un chemin relatif pour plus de compatibilité avec les clients MCP
  const transport = new SSEServerTransport("/message", res);
  transports.set(transport.sessionId, transport);
  await server.connect(transport);
  
  req.on("close", () => {
    transports.delete(transport.sessionId);
  });
});

app.post("/message", async (req, res) => {
  const sessionId = req.query.sessionId;
  const transport = transports.get(sessionId);
  
  if (transport) {
    await transport.handlePostMessage(req, res);
  } else {
    res.status(404).send("Session introuvable");
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Serveur MCP en écoute sur le port ${PORT}`);
});
