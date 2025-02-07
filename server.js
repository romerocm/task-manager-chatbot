// server.js
import express from "express";
import { config } from "dotenv";
import { writeFile, readFile } from "fs/promises";
import { join } from "path";
import ViteExpress from "vite-express";
import { createServer as createViteServer } from "vite";
import db from "./src/utils/db.js";

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

// Function to manage .env file
const updateEnvFile = async (keys) => {
  try {
    const envPath = join(process.cwd(), ".env");
    let envContent = "";

    try {
      envContent = await readFile(envPath, "utf8");
    } catch (error) {
      console.log("No existing .env file, creating new one");
    }

    const envLines = envContent.split("\n").filter((line) => line.trim());
    const envMap = new Map();

    envLines.forEach((line) => {
      const [key, ...valueParts] = line.split("=");
      if (key) {
        envMap.set(key.trim(), valueParts.join("=").trim());
      }
    });

    if (keys.VITE_OPENAI_API_KEY !== undefined) {
      envMap.set("VITE_OPENAI_API_KEY", keys.VITE_OPENAI_API_KEY);
    }
    if (keys.VITE_ANTHROPIC_API_KEY !== undefined) {
      envMap.set("VITE_ANTHROPIC_API_KEY", keys.VITE_ANTHROPIC_API_KEY);
    }

    const newEnvContent =
      Array.from(envMap.entries())
        .map(([key, value]) => `${key}=${value}`)
        .join("\n") + "\n";

    await writeFile(envPath, newEnvContent, "utf8");
    console.log(".env file updated successfully");

    Object.entries(keys).forEach(([key, value]) => {
      if (value !== undefined) {
        process.env[key] = value;
      }
    });

    return true;
  } catch (error) {
    console.error("Error updating .env file:", error);
    throw error;
  }
};

// API endpoints for managing API keys
app.post("/api/keys", async (req, res) => {
  try {
    console.log("Received request to update API keys");
    const { VITE_OPENAI_API_KEY, VITE_ANTHROPIC_API_KEY } = req.body;

    await updateEnvFile({
      VITE_OPENAI_API_KEY,
      VITE_ANTHROPIC_API_KEY,
    });

    res.json({
      success: true,
      message: "API keys updated successfully",
    });
  } catch (error) {
    console.error("Error saving API keys:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      details: "Error occurred while saving API keys",
    });
  }
});

app.get("/api/keys", async (req, res) => {
  try {
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
    res.json({ success: true, keys });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/api/keys/test", async (req, res) => {
  try {
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

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// User management endpoints
app.get("/api/users", async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM users ORDER BY name");
    res.json({ success: true, users: result.rows });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Task management endpoints
app.get("/api/tasks", async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        t.*,
        u.name as assignee_name,
        u.email as assignee_email,
        u.avatar_url as assignee_avatar
      FROM tasks t
      LEFT JOIN users u ON t.assignee_id = u.id
      ORDER BY t.status, t.position, t.created_at DESC
    `);
    res.json({ success: true, tasks: result.rows });
  } catch (error) {
    console.error("Error fetching tasks:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/api/tasks", async (req, res) => {
  try {
    const tasks = Array.isArray(req.body) ? req.body : [req.body];

    const createdTasks = await db.transaction(async (client) => {
      const results = [];
      for (const task of tasks) {
        // Get max position for the status
        const posResult = await client.query(
          `SELECT COALESCE(MAX(position) + 1, 0) as next_pos 
           FROM tasks 
           WHERE status = $1`,
          [task.status || "todo"]
        );
        const position = posResult.rows[0].next_pos;

        const {
          title,
          description,
          priority,
          estimatedTime,
          status = "todo",
        } = task;

        const result = await client.query(
          `INSERT INTO tasks (title, description, priority, estimated_time, status, position)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING *`,
          [title, description, priority, estimatedTime, status, position]
        );
        results.push(result.rows[0]);
      }
      return results;
    });

    res.json({ success: true, tasks: createdTasks });
  } catch (error) {
    console.error("Error creating tasks:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// New endpoint to update task positions
app.put("/api/tasks/positions", async (req, res) => {
  try {
    const { status, positions } = req.body;

    await db.transaction(async (client) => {
      // Update each task's position
      for (const { id, position } of positions) {
        await client.query(
          `UPDATE tasks 
           SET position = $1, 
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $2 AND status = $3`,
          [position, id, status]
        );
      }
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Error updating task positions:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Update the status change endpoint to handle positions
app.put("/api/tasks/:taskId/status", async (req, res) => {
  try {
    const { taskId } = req.params;
    const { status, position } = req.body;

    const result = await db.transaction(async (client) => {
      // First, get the task's current status and position
      const currentTask = await client.query(
        "SELECT status FROM tasks WHERE id = $1",
        [taskId]
      );

      if (currentTask.rows.length === 0) {
        throw new Error("Task not found");
      }

      // Get max position in target status
      const maxPosResult = await client.query(
        `SELECT COALESCE(MAX(position) + 1, 0) as next_pos 
         FROM tasks 
         WHERE status = $1`,
        [status]
      );
      const newPosition = position ?? maxPosResult.rows[0].next_pos;

      // Update the task
      const updatedTask = await client.query(
        `UPDATE tasks 
         SET status = $1, 
             position = $2,
             updated_at = CURRENT_TIMESTAMP 
         WHERE id = $3 
         RETURNING *`,
        [status, newPosition, taskId]
      );

      return updatedTask.rows[0];
    });

    res.json({ success: true, task: result });
  } catch (error) {
    console.error("Error updating task status:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put("/api/tasks/:taskId/priority", async (req, res) => {
  try {
    const { taskId } = req.params;
    const { priority } = req.body;

    const result = await db.query(
      `UPDATE tasks 
       SET priority = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2 
       RETURNING *`,
      [priority, taskId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Task not found" });
    }

    res.json({ success: true, task: result.rows[0] });
  } catch (error) {
    console.error("Error updating task priority:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put("/api/tasks/:taskId/assign", async (req, res) => {
  try {
    const { taskId } = req.params;
    const { assigneeId } = req.body;

    const result = await db.query(
      `UPDATE tasks 
       SET assignee_id = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2 
       RETURNING *`,
      [assigneeId, taskId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Task not found" });
    }

    // Get the updated task with assignee information
    const taskWithAssignee = await db.query(
      `SELECT 
        t.*,
        u.name as assignee_name,
        u.email as assignee_email,
        u.avatar_url as assignee_avatar
       FROM tasks t
       LEFT JOIN users u ON t.assignee_id = u.id
       WHERE t.id = $1`,
      [taskId]
    );

    res.json({ success: true, task: taskWithAssignee.rows[0] });
  } catch (error) {
    console.error("Error assigning task:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete("/api/tasks/:taskId", async (req, res) => {
  try {
    const { taskId } = req.params;

    // First, get the task to know its status and position
    const taskResult = await db.query(
      "SELECT status, position FROM tasks WHERE id = $1",
      [taskId]
    );

    if (taskResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Task not found",
      });
    }

    const { status, position } = taskResult.rows[0];

    await db.transaction(async (client) => {
      // Delete the task
      const result = await client.query(
        "DELETE FROM tasks WHERE id = $1 RETURNING *",
        [taskId]
      );

      // Update positions of remaining tasks
      await client.query(
        `UPDATE tasks 
         SET position = position - 1,
             updated_at = CURRENT_TIMESTAMP
         WHERE status = $1 
         AND position > $2`,
        [status, position]
      );

      if (result.rows.length === 0) {
        throw new Error("Task not found");
      }
    });

    res.json({
      success: true,
      message: "Task deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting task:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

app.post("/api/tasks/delete", async (req, res) => {
  try {
    const { taskIds } = req.body;

    if (!Array.isArray(taskIds) || taskIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Invalid task IDs provided",
      });
    }

    await db.transaction(async (client) => {
      // Get tasks to be deleted with their positions
      const tasksToDelete = await client.query(
        "SELECT id, status, position FROM tasks WHERE id = ANY($1)",
        [taskIds]
      );

      // Delete tasks
      await client.query("DELETE FROM tasks WHERE id = ANY($1)", [taskIds]);

      // Update positions for each status group
      const statusGroups = {};
      tasksToDelete.rows.forEach((task) => {
        if (!statusGroups[task.status]) {
          statusGroups[task.status] = new Set();
        }
        statusGroups[task.status].add(task.position);
      });

      // Update positions for remaining tasks in each affected status
      for (const [status, positions] of Object.entries(statusGroups)) {
        const posArray = Array.from(positions).sort((a, b) => a - b);
        for (let i = 0; i < posArray.length; i++) {
          await client.query(
            `UPDATE tasks 
             SET position = position - 1,
                 updated_at = CURRENT_TIMESTAMP
             WHERE status = $1 
             AND position > $2`,
            [status, posArray[i] - i]
          );
        }
      }
    });

    res.json({
      success: true,
      message: `Tasks deleted successfully`,
    });
  } catch (error) {
    console.error("Error deleting tasks:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

app.put("/api/tasks/:taskId", async (req, res) => {
  try {
    const { taskId } = req.params;
    const updates = req.body;

    console.log(`Received update request for task ID: ${taskId}`, updates);

    const result = await db.query(
      `UPDATE tasks 
       SET title = $1, description = $2, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $3 
       RETURNING *`,
      [updates.title, updates.description, taskId]
    );

    if (result.rows.length === 0) {
      console.warn(`Task with ID ${taskId} not found`);
      return res.status(404).json({ success: false, error: "Task not found" });
    }

    res.json({ success: true, task: result.rows[0] });
  } catch (error) {
    console.error("Error updating task:", error);
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
