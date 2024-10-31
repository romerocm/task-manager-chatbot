// scripts/start.js
import pg from "pg";
import { spawn } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import fs from "fs/promises";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const { Pool } = pg;

async function waitForDatabase() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  for (let i = 0; i < 30; i++) {
    try {
      await pool.query("SELECT 1");
      console.log("Database is ready");
      await pool.end();
      return true;
    } catch (err) {
      console.log("Waiting for database...", err.message);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  throw new Error("Database connection timeout");
}

async function runMigrations() {
  try {
    console.log("Running database migrations...");

    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    // Get all migration files
    const migrationsDir = join(dirname(__dirname), "migrations");
    const files = await fs.readdir(migrationsDir);
    const migrationFiles = files.filter((f) => f.endsWith(".sql")).sort();

    for (const file of migrationFiles) {
      console.log(`Checking migration: ${file}`);
      const migration = await fs.readFile(join(migrationsDir, file), "utf-8");
      try {
        await pool.query(migration);
        console.log(`Applied migration: ${file}`);
      } catch (error) {
        if (error.code === "42P07") {
          // Table already exists error
          console.log(`Migration ${file} was already applied`);
        } else {
          throw error;
        }
      }
    }

    await pool.end();
    console.log("Migration check completed");
  } catch (error) {
    console.error("Migration failed:", error);
    throw error;
  }
}

async function startServer() {
  try {
    await waitForDatabase();
    await runMigrations();

    // Start the application
    const serverPath = join(dirname(__dirname), "server.js");
    const server = spawn("node", [serverPath], {
      stdio: "inherit",
      shell: true,
    });

    server.on("error", (err) => {
      console.error("Failed to start server:", err);
      process.exit(1);
    });

    server.on("close", (code) => {
      if (code !== 0) {
        console.error(`Server process exited with code ${code}`);
        process.exit(code);
      }
    });
  } catch (error) {
    console.error("Startup failed:", error);
    process.exit(1);
  }
}

startServer();
