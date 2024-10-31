// server.js
import express from "express";
import { config } from "dotenv";
import { writeFile, readFile, access } from "fs/promises";
import { constants } from "fs";
import { join } from "path";
import ViteExpress from "vite-express";
import { createServer as createViteServer } from "vite";

// Initialize environment variables
config();

const app = express();
app.use(express.json());

// Add error logging middleware
app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(500).json({
    success: false,
    error: err.message,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
});

// Function to ensure .env file exists with better error handling
async function ensureEnvFile() {
  const envPath = join(process.cwd(), ".env");
  try {
    await access(envPath, constants.F_OK);
    console.log(".env file exists");
  } catch {
    console.log("Creating new .env file");
    try {
      await writeFile(
        envPath,
        "VITE_OPENAI_API_KEY=\nVITE_ANTHROPIC_API_KEY=\n"
      );
      console.log(".env file created successfully");
    } catch (error) {
      console.error("Error creating .env file:", error);
      throw error;
    }
  }
}

// Function to read current .env content with error handling
async function readEnvFile() {
  const envPath = join(process.cwd(), ".env");
  try {
    const content = await readFile(envPath, "utf8");
    console.log("Successfully read .env file");
    return content;
  } catch (error) {
    console.error("Error reading .env file:", error);
    throw error;
  }
}

// Ensure .env file exists when server starts
ensureEnvFile().catch(console.error);

// Enhanced API key endpoint with better error handling
app.post("/api/keys", async (req, res) => {
  try {
    console.log("Received request to update API keys");
    const { VITE_OPENAI_API_KEY, VITE_ANTHROPIC_API_KEY } = req.body;

    console.log("Current working directory:", process.cwd());
    console.log("Writing to .env file...");

    // Read existing .env content
    let envContent = await readEnvFile();
    const envLines = envContent.split("\n").filter((line) => line.trim());

    // Create a map of existing variables
    const envMap = new Map();
    envLines.forEach((line) => {
      const [key, ...valueParts] = line.split("=");
      if (key) {
        envMap.set(key.trim(), valueParts.join("=").trim());
      }
    });

    // Update or add new values
    if (VITE_OPENAI_API_KEY !== undefined) {
      envMap.set("VITE_OPENAI_API_KEY", VITE_OPENAI_API_KEY);
    }
    if (VITE_ANTHROPIC_API_KEY !== undefined) {
      envMap.set("VITE_ANTHROPIC_API_KEY", VITE_ANTHROPIC_API_KEY);
    }

    // Convert map back to .env format
    const newEnvContent =
      Array.from(envMap.entries())
        .map(([key, value]) => `${key}=${value}`)
        .join("\n") + "\n";

    // Write to .env file
    const envPath = join(process.cwd(), ".env");
    await writeFile(envPath, newEnvContent);
    console.log("Successfully wrote to .env file");

    // Update process.env
    if (VITE_OPENAI_API_KEY !== undefined) {
      process.env.VITE_OPENAI_API_KEY = VITE_OPENAI_API_KEY;
      console.log("Updated OpenAI API key in process.env");
    }
    if (VITE_ANTHROPIC_API_KEY !== undefined) {
      process.env.VITE_ANTHROPIC_API_KEY = VITE_ANTHROPIC_API_KEY;
      console.log("Updated Anthropic API key in process.env");
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Error saving API keys:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      details: "Error occurred while saving API keys",
    });
  }
});

// Add test endpoint for API keys
app.get("/api/keys/test", async (req, res) => {
  try {
    console.log("Current API Keys (first few characters):");
    console.log(
      "OpenAI:",
      process.env.VITE_OPENAI_API_KEY
        ? `${process.env.VITE_OPENAI_API_KEY.slice(0, 3)}...`
        : "Not set"
    );
    console.log(
      "Anthropic:",
      process.env.VITE_ANTHROPIC_API_KEY
        ? `${process.env.VITE_ANTHROPIC_API_KEY.slice(0, 3)}...`
        : "Not set"
    );

    res.json({
      success: true,
      keysPresent: {
        openai: !!process.env.VITE_OPENAI_API_KEY,
        anthropic: !!process.env.VITE_ANTHROPIC_API_KEY,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Updated GET /api/keys endpoint
app.get("/api/keys", async (req, res) => {
  try {
    console.log("Fetching current API keys");
    const keys = {
      VITE_OPENAI_API_KEY: process.env.VITE_OPENAI_API_KEY
        ? `${process.env.VITE_OPENAI_API_KEY.slice(
            0,
            3
          )}...${process.env.VITE_OPENAI_API_KEY.slice(-4)}`
        : "",
      VITE_ANTHROPIC_API_KEY: process.env.VITE_ANTHROPIC_API_KEY
        ? `${process.env.VITE_ANTHROPIC_API_KEY.slice(
            0,
            3
          )}...${process.env.VITE_ANTHROPIC_API_KEY.slice(-4)}`
        : "",
    };
    console.log("API keys fetched successfully");
    res.json({ success: true, keys });
  } catch (error) {
    console.error("Error fetching API keys:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

const port = process.env.PORT || 3000;

async function startServer() {
  try {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });

    app.use(vite.middlewares);

    const server = app.listen(port, "0.0.0.0", () => {
      console.log(`Server running on port ${port}`);
    });

    ViteExpress.bind(app, server);
  } catch (err) {
    console.error("Error starting server:", err);
    process.exit(1);
  }
}

startServer();
