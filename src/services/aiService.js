// src/services/aiService.js

// Configuration constants for each provider
const PROVIDERS = {
  OPENAI: "openai",
  CLAUDE: "claude",
};

// Function to convert image to base64
const imageToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64String = reader.result.split(',')[1];
      resolve(base64String);
    };
    reader.onerror = (error) => reject(error);
  });
};

// API endpoints
const API_ENDPOINTS = {
  [PROVIDERS.OPENAI]: "https://api.openai.com/v1/chat/completions",
  [PROVIDERS.CLAUDE]: "https://api.anthropic.com/v1/messages",
};

// Provider-specific prompts
const PROMPTS = {
  [PROVIDERS.OPENAI]: {
    taskGeneration: `Analyze the following request to create tasks, assign them if specified, and place them in the correct column. 
    Response must be a plain JSON array (no markdown, no code blocks) where each object has:
    - "title": A clear, concise task title (max 50 chars)
    - "description": Detailed explanation (max 200 chars)
    - "priority": "high", "medium", or "low"
    - "estimatedTime": estimated completion time in minutes
    - "status": The column where the task should be placed, e.g., "todo", "inProgress", "done"
    - "assigneeName": (optional) The full name of the person to assign tasks to
    
    Respond with ONLY the JSON array, no other text or formatting. If tasks are to be assigned, include "assigneeName" in each task object. Ensure tasks are placed in the specified column if mentioned.`,

    taskAssignment: `Given the request to assign tasks, determine:
    1. If the request specifies "all tasks" in a particular column
    1. The assignee name from the request
    2. Which tasks should be assigned
    3. The column (status) of the tasks to be assigned

    Response must be a JSON object with:
    - "assigneeName": The full name of the person to assign tasks to
    - "assignAll": Boolean indicating if all tasks should be assigned
    - "specificTasks": Array of task titles if not assigning all tasks
    - "column": The column (status) of the tasks to be assigned, e.g., "todo"

    Example format: {
      "assigneeName": "Carlos Romero",
      "assignAll": true,
      "specificTasks": [],
      "column": "todo"
    },
      "column": "inProgress"
    
    Or for specific tasks:
    {
      "assigneeName": "Carlos Romero",
      "assignAll": false,
      "specificTasks": ["Setup database", "Create API"],
      "column": "inProgress"
    }
    
    Respond with ONLY the JSON, no other text.`,

    taskDeletion: `Given the request to delete tasks, determine:
    1. Whether all tasks should be deleted
    2. Or which specific tasks should be deleted
    3. The column (status) of the tasks to be deleted, e.g., "todo", "inProgress", "done"

    Response must be a JSON object with:
    - "deleteAll": Boolean indicating if all tasks should be deleted
    - "specificTasks": Array of task titles if not deleting all
    - "deleteLastN": Number of last tasks to delete if specified
    - "column": The column (status) of the tasks to be deleted, e.g., "todo", "inProgress", "done"

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
  customPrompt = null,
  image = null
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
      const messages = [
        {
          role: "system",
          content: "You are a task management assistant. Always respond with plain JSON only.",
        }
      ];

      if (image) {
        const base64Image = await imageToBase64(image);
        messages.push({
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`,
              },
            },
            {
              type: "text",
              text: `${customPrompt || PROMPTS[PROVIDERS.OPENAI].taskGeneration}\n\nAnalyze this image and ${prompt}`,
            },
          ],
        });
      } else {
        messages.push({
          role: "user",
          content: `${customPrompt || PROMPTS[PROVIDERS.OPENAI].taskGeneration}\n\nRequest: ${prompt}`,
        });
      }

      response = await fetch(API_ENDPOINTS[PROVIDERS.OPENAI], {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4-vision-preview-1106",
          messages: messages,
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
    let tasksToAssign;

    if (assignmentData.assignAll) {
      // Assign all tasks from the specified column or all columns if none specified
      tasksToAssign = assignmentData.column
        ? allTasks.filter(task => task.status.toLowerCase() === assignmentData.column.toLowerCase().replace(/\s+/g, ''))
        : allTasks;
    } else if (assignmentData.specificTasks?.length > 0) {
      tasksToAssign = allTasks.filter((task) =>
        assignmentData.specificTasks.some((title) =>
          task.title.toLowerCase().includes(title.toLowerCase())
        )
      );
    } else {
      // Default to assigning all tasks in the specified column or "todo" if none specified
      const column = assignmentData.column || "todo";
      tasksToAssign = allTasks.filter(task => task.status.toLowerCase() === column.toLowerCase().replace(/\s+/g, ''));
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

    if (deleteData.deleteAll && deleteData.column) {
      tasksToDelete = allTasks.filter(task => task.status === deleteData.column);
    } else if (deleteData.deleteAll) {
      tasksToDelete = allTasks;
    } else if (deleteData.specificTasks?.length > 0 && deleteData.column) {
      tasksToDelete = allTasks.filter(task => 
        task.status === deleteData.column &&
        deleteData.specificTasks.some((title) =>
          task.title.toLowerCase().includes(title.toLowerCase())
        )
      );
      tasksToDelete = allTasks.filter((task) =>
        deleteData.specificTasks.some((title) =>
          task.title.toLowerCase().includes(title.toLowerCase())
        )
      );
    } else if (deleteData.deleteLastN) {
      tasksToDelete = allTasks.slice(-deleteData.deleteLastN);
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

    const deletedCount = tasksToDelete.length;

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
  findUserByName,
  generateTasks,
  processTaskAssignments,
  processTaskDeletions,
  PROVIDERS,
};
