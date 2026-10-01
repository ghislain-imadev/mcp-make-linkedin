import express from "express";
import cors from "cors";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

const app = express();
app.use(cors());
app.use(express.json());

// Notre serveur MCP
const server = new Server(
  { name: "linkedin-make-mcp", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

// Déclaration de l'outil
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "publish_linkedin_post",
        description: "Publie un post sur LinkedIn via Make",
        inputSchema: { 
          type: "object", 
          properties: { text: { type: "string", description: "Le contenu du post" } }, 
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
    const webhookUrl = process.env.MAKE_WEBHOOK_URL; 
    
    if (!webhookUrl) {
      throw new Error("L'URL du Webhook Make n'est pas configurée.");
    }
    
    // Envoi à Make
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ post_content: text })
    });
    
    if (response.ok) {
      return { toolResult: { content: [{ type: "text", text: "Post envoyé à Make.com avec succès !" }] } };
    } else {
      throw new Error("Erreur lors de l'envoi à Make.com");
    }
  }
  throw new Error("Outil inconnu");
});

// Traitement direct des requêtes JSON-RPC (Le format de Mammouth)
app.post(["/sse", "/message", "/"], async (req, res) => {
  console.log("📥 Requête reçue de Mammouth :", req.body.method);
  
  try {
    // Si c'est la demande d'initialisation de Mammouth
    if (req.body.method === "initialize") {
      res.json({
        jsonrpc: "2.0",
        id: req.body.id,
        result: {
          protocolVersion: "2024-11-05",
          capabilities: { tools: {} },
          serverInfo: { name: "linkedin-make-mcp", version: "1.0.0" }
        }
      });
      return;
    }

    // Si c'est une demande de la liste des outils (tools/list)
    if (req.body.method === "tools/list") {
      res.json({
        jsonrpc: "2.0",
        id: req.body.id,
        result: {
          tools: [
            {
              name: "publish_linkedin_post",
              description: "Publie un post sur LinkedIn via Make",
              inputSchema: { 
                type: "object", 
                properties: { text: { type: "string", description: "Le contenu du post" } }, 
                required: ["text"] 
              }
            }
          ]
        }
      });
      return;
    }

    // Si c'est l'exécution de l'outil
    if (req.body.method === "tools/call") {
      const text = req.body.params.arguments.text;
      const webhookUrl = process.env.MAKE_WEBHOOK_URL;
      
      if (!webhookUrl) throw new Error("URL Webhook manquante");

      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ post_content: text })
      });

      res.json({
        jsonrpc: "2.0",
        id: req.body.id,
        result: {
          content: [{ type: "text", text: "Le post a bien été envoyé à Make.com pour publication !" }]
        }
      });
      return;
    }
    
    // Si la méthode n'est pas gérée, on répond quand même pour ne pas bloquer Mammouth
    res.json({
      jsonrpc: "2.0",
      id: req.body.id,
      result: {}
    });

  } catch (error) {
    console.error("❌ Erreur :", error.message);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Serveur MCP (Mode HTTP direct) prêt sur le port ${PORT}`);
});
