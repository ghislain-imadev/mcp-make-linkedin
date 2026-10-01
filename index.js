import express from "express";
import cors from "cors";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

const app = express();

// Configuration CORS très permissive pour éviter tout blocage
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

app.use(express.json());

// Ajout d'une route de test basique
app.get("/", (req, res) => {
  res.send("Le serveur MCP fonctionne !");
});

const server = new Server(
  { name: "linkedin-make-mcp", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  console.log("Mammouth a demandé la liste des outils !");
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

// (J'ai masqué l'intérieur de CallToolRequestSchema pour raccourcir, vous pouvez remettre la logique Make ici)
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  console.log("Mammouth demande l'exécution de l'outil :", request.params.name);
  return { toolResult: { content: [{ type: "text", text: "Test réussi" }] } };
});

// Variable globale pour le transport (plus simple pour tester)
let transport;

app.get("/sse", async (req, res) => {
  console.log("-> Nouvelle connexion SSE entrante depuis Mammouth");
  try {
    transport = new SSEServerTransport("/message", res);
    await server.connect(transport);
    console.log("-> Connexion SSE établie avec succès");
  } catch (error) {
    console.error("-> Erreur lors de la connexion SSE :", error);
  }
});

app.post("/message", async (req, res) => {
  console.log("-> Nouveau message POST reçu sur /message");
  if (transport) {
    try {
      await transport.handlePostMessage(req, res);
      console.log("-> Message traité avec succès");
    } catch (error) {
      console.error("-> Erreur lors du traitement du message :", error);
    }
  } else {
    console.error("-> Transport non initialisé");
    res.status(404).send("Transport non initialisé");
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Serveur MCP démarré et en écoute sur le port ${PORT}`);
});
