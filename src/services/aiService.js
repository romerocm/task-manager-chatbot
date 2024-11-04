// src/services/aiService.js

// Configuration constants for each provider
const PROVIDERS = {
  OPENAI: "openai",
  CLAUDE: "claude",
};

// API endpoints
const API_ENDPOINTS = {
  [PROVIDERS.OPENAI]: "https://api.openai.com/v1/chat/completions",
  [PROVIDERS.CLAUDE]: "https://api.anthropic.com/v1/messages",
};

// Provider-specific prompts
const PROMPTS = {
  [PROVIDERS.OPENAI]: {
    taskGeneration: `Analyze the following request and create a list of specific, actionable tasks. 
    Response must be a plain JSON array (no markdown, no code blocks) where each object has:
    - "title": A clear, concise task title (max 50 chars)
    - "description": Detailed explanation (max 200 chars)
    - "priority": "high", "medium", or "low"
    - "estimatedTime": estimated completion time in minutes
    - "status": "todo"
    
    Respond with ONLY the JSON array, no other text or formatting.`,

    taskAssignment: `Given the request to assign tasks, determine:
    1. The assignee name from the request
    2. Which tasks should be assigned

    Response must be a JSON object with:
    - "assigneeName": The full name of the person to assign tasks to
    - "assignAll": Boolean indicating if all tasks should be assigned
    - "specificTasks": Array of task titles if not assigning all tasks

    Example format: {
      "assigneeName": "Carlos Romero",
      "assignAll": true,
      "specificTasks": []
    }
    
    Or for specific tasks:
    {
      "assigneeName": "Carlos Romero",
      "assignAll": false,
      "specificTasks": ["Setup database", "Create API"]
    }
    
    Respond with ONLY the JSON, no other text.`,

    taskDeletion: `Given the request to delete tasks, determine:
    1. Whether all tasks should be deleted
    2. Or which specific tasks should be deleted

    Response must be a JSON object with:
    - "deleteAll": Boolean indicating if all tasks should be deleted
    - "specificTasks": Array of task titles if not deleting all

    Example format: {
      "deleteAll": false,
      "specificTasks": ["Setup database", "Create API"]
    }
    
    Respond with ONLY the JSON, no other text.`,
  },
  [PROVIDERS.CLAUDE]: {
    taskGeneration: `Analyze this request and create specific, actionable tasks.
    Respond ONLY with a JSON array where each task has:
    - "title": Clear, concise task title (max 50 chars)
    - "description": Detailed explanation (max 200 chars)
    - "priority": "high", "medium", or "low"
    - "estimatedTime": estimated completion time in minutes
    - "status": "todo"
    
    Format: [{"title": "...", "description": "...", "priority": "...", "estimatedTime": N, "status": "todo"}]
    
    Ensure response is pure JSON array. No additional text or explanation.`,

    taskAssignment: `Parse this request and identify:
    1. Who should be assigned tasks
    2. Whether all tasks or specific ones should be assigned

    Return a JSON object with:
    - "assigneeName": Full name of assignee
    - "assignAll": true/false for all tasks
    - "specificTasks": Array of task titles if not all

    Format: {
      "assigneeName": "Carlos Romero",
      "assignAll": true,
      "specificTasks": []
    }
    
    Return pure JSON only, no additional text.`,

    taskDeletion: `Parse this request and identify:
    1. If all tasks should be deleted
    2. Or which specific tasks to delete

    Return a JSON object with:
    - "deleteAll": true/false for all tasks
    - "specificTasks": Array of task titles if not deleting all

    Format: {
      "deleteAll": false,
      "specificTasks": ["Task 1", "Task 2"]
    }
    
    Return pure JSON only, no additional text.`,
  },
};

// Helper functions and main functionality

const extractJsonFromResponse = (content) => {
  try {
    return JSON.parse(content);
  } catch (e) {
    console.log("Direct parsing failed, attempting to extract from markdown");

    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      const jsonContent = jsonMatch[1].trim();
      console.log("Extracted JSON content:", jsonContent);
      return JSON.parse(jsonContent);
    }

    const arrayMatch = content.match(/\[([\s\S]*)\]/);
    if (arrayMatch) {
      const arrayContent = `[${arrayMatch[1]}]`;
      console.log("Extracted array content:", arrayContent);
      return JSON.parse(arrayContent);
    }

    throw new Error("Could not extract valid JSON from response");
  }
};

// Function to find user by name
async function findUserByName(name) {
  try {
    const response = await fetch("/api/users");
    const data = await response.json();
    if (!data.success) throw new Error("Failed to fetch users");

    const user = data.users.find(
      (user) =>
        user.name.toLowerCase() === name.toLowerCase() ||
        user.name.toLowerCase().includes(name.toLowerCase())
    );

    return user;
  } catch (error) {
    console.error("Error finding user:", error);
    return null;
  }
}

// Function to get all tasks
async function getAllTasks() {
  try {
    const response = await fetch("/api/tasks");
    const data = await response.json();
    if (!data.success) throw new Error("Failed to fetch tasks");
    return data.tasks;
  } catch (error) {
    console.error("Error fetching tasks:", error);
    return [];
  }
}

// Generate tasks using AI
async function generateTasks(
  prompt,
  provider = PROVIDERS.OPENAI,
  customPrompt = null
) {
  console.log("generateTasks called with provider:", provider);
  try {
    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      throw new Error("Invalid prompt: Please provide a non-empty text prompt");
    }

    const hasOpenAI = !!import.meta.env.VITE_OPENAI_API_KEY;
    const hasClaude = !!import.meta.env.VITE_ANTHROPIC_API_KEY;

    if (provider === PROVIDERS.OPENAI && !hasOpenAI) {
      throw new Error("OpenAI API key not configured");
    }
    if (provider === PROVIDERS.CLAUDE && !hasClaude) {
      throw new Error("Claude API key not configured");
    }

    let response;
    if (provider === PROVIDERS.OPENAI) {
      response = await fetch(API_ENDPOINTS[PROVIDERS.OPENAI], {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4-turbo-preview",
          messages: [
            {
              role: "system",
              content:
                "You are a task management assistant. Always respond with plain JSON only.",
            },
            {
              role: "user",
              content: `${
                customPrompt || PROMPTS[PROVIDERS.OPENAI].taskGeneration
              }\n\nRequest: ${prompt}`,
            },
          ],
          max_tokens: 1000,
          temperature: 0.7,
        }),
      });
    } else if (provider === PROVIDERS.CLAUDE) {
      response = await fetch(API_ENDPOINTS[PROVIDERS.CLAUDE], {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": import.meta.env.VITE_ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content: `${
                customPrompt || PROMPTS[PROVIDERS.CLAUDE].taskGeneration
              }\n\nRequest: ${prompt}`,
            },
          ],
          model: "claude-3-opus-20240229",
          max_tokens: 1024,
        }),
      });
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("API Error:", errorData);
      throw new Error(
        `API request failed with status ${response.status}: ${
          errorData.error?.message || "Unknown error"
        }`
      );
    }

    const data = await response.json();
    const content =
      provider === PROVIDERS.OPENAI
        ? data.choices[0].message.content
        : data.content[0].text;

    const parsedData = extractJsonFromResponse(content);
    return { success: true, data: parsedData };
  } catch (error) {
    console.error("Error in generateTasks:", error);
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    };
  }
}

// Process task assignments
async function processTaskAssignments(prompt, provider = PROVIDERS.OPENAI) {
  try {
    const aiResult = await generateTasks(
      prompt,
      provider,
      PROMPTS[provider].taskAssignment
    );

    if (!aiResult.success) {
      throw new Error(aiResult.error || "Failed to process assignment request");
    }

    const assignmentData = aiResult.data;

    const user = await findUserByName(assignmentData.assigneeName);
    if (!user) {
      throw new Error(`Could not find user "${assignmentData.assigneeName}"`);
    }

    const allTasks = await getAllTasks();
    let tasksToAssign = [];

    if (assignmentData.assignAll) {
      tasksToAssign = allTasks;
    } else if (assignmentData.specificTasks?.length > 0) {
      tasksToAssign = allTasks.filter((task) =>
        assignmentData.specificTasks.some((title) =>
          task.title.toLowerCase().includes(title.toLowerCase())
        )
      );
    }

    if (tasksToAssign.length === 0) {
      throw new Error("No matching tasks found to assign");
    }

    const results = await Promise.all(
      tasksToAssign.map((task) =>
        fetch(`/api/tasks/${task.id}/assign`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ assigneeId: user.id }),
        }).then((res) => res.json())
      )
    );

    const successCount = results.filter((r) => r.success).length;

    return {
      success: true,
      data: {
        assignedCount: successCount,
        assigneeName: user.name,
        message: `Assigned ${successCount} task${
          successCount !== 1 ? "s" : ""
        } to ${user.name}`,
        tasksUpdated: true,
      },
    };
  } catch (error) {
    console.error("Error in processTaskAssignments:", error);
    return {
      success: false,
      error: error.message,
      tasksUpdated: false,
    };
  }
}

// Process task deletions
async function processTaskDeletions(prompt, provider = PROVIDERS.OPENAI) {
  try {
    const aiResult = await generateTasks(
      prompt,
      provider,
      PROMPTS[provider].taskDeletion
    );

    if (!aiResult.success) {
      throw new Error(aiResult.error || "Failed to process deletion request");
    }

    const deleteData = aiResult.data || {};
    const allTasks = await getAllTasks();
    let tasksToDelete = [];

    if (deleteData.deleteAll) {
      tasksToDelete = allTasks;
    } else if (deleteData.specificTasks?.length > 0) {
      tasksToDelete = allTasks.filter((task) =>
        deleteData.specificTasks.some((title) =>
          task.title.toLowerCase().includes(title.toLowerCase())
        )
      );
    }

    if (tasksToDelete.length === 0) {
      throw new Error("No matching tasks found to delete");
    }

    // Delete tasks
    const response = await fetch("/api/tasks/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskIds: tasksToDelete.map((t) => t.id) }),
    });

    const result = await response.json();
    if (!result || !result.success) {
      throw new Error(result?.error || "Failed to delete tasks");
    }

    const deletedCount = result.tasks?.length || 0;

    return {
      success: true,
      data: {
        deletedCount,
        message: `Deleted ${deletedCount} task${deletedCount !== 1 ? "s" : ""}`,
        tasksUpdated: true,
      },
    };
  } catch (error) {
    console.error("Error in processTaskDeletions:", error);
    return {
      success: false,
      error: error.message,
      tasksUpdated: false,
    };
  }
}

export {
  generateTasks,
  processTaskAssignments,
  processTaskDeletions,
  PROVIDERS,
};
