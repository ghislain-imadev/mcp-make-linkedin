import express from "express";
import cors from "cors";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

const app = express();
app.use(cors());

// Le serveur MCP
const server = new Server(
  { name: "linkedin-make-mcp", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

// Déclaration de l'outil pour Mammouth
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

// Exécution de l'outil
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "publish_linkedin_post") {
    const text = request.params.arguments.text;
    const webhookUrl = process.env.MAKE_WEBHOOK_URL; // On mettra l'URL dans Render

    if (!webhookUrl) {
      throw new Error("L'URL du Webhook Make n'est pas configurée.");
    }

    // Envoi au webhook Make
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

// Configuration du transport SSE pour qu'il soit accessible par URL
let transport;
app.get("/sse", async (req, res) => {
  transport = new SSEServerTransport("/message", res);
  await server.connect(transport);
});

app.post("/message", async (req, res) => {
  if (transport) {
    await transport.handlePostMessage(req, res);
  } else {
    res.status(503).send("Serveur non prêt");
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Serveur MCP en écoute sur le port ${PORT}`);
});
