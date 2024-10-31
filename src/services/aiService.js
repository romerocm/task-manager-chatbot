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

    taskAssignment: `Analyze the following request to assign tasks and identify which tasks should be assigned to whom.
    Response must be a plain JSON array where each object has:
    - "taskTitle": The exact title of the task to be assigned
    - "assignee": The name of the person to assign the task to
    
    Example format: [{"taskTitle":"Setup database","assignee":"John Doe"}]
    Only include tasks that need assignment changes.
    
    Respond with ONLY the JSON array, no other text or formatting.`,
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

    taskAssignment: `Parse this request and identify task assignments.
    Return a JSON array where each object has:
    - "taskTitle": Exact title of the task to assign
    - "assignee": Name of person to assign to
    
    Format: [{"taskTitle": "...", "assignee": "..."}]
    Include only tasks needing assignment changes.
    
    Return pure JSON array only, no additional text.`,
  },
};

// Error messages for different API status codes
const API_ERRORS = {
  [PROVIDERS.OPENAI]: {
    400: "Invalid request to OpenAI API. Please check your input.",
    401: "Invalid OpenAI API key. Please check your credentials.",
    403: "OpenAI API access forbidden. Please check your subscription.",
    404: "OpenAI API endpoint not found.",
    429: "OpenAI API rate limit exceeded. Please try again later.",
    500: "OpenAI service error. Please try again later.",
    502: "OpenAI service is temporarily unavailable.",
    503: "OpenAI service is temporarily unavailable.",
    default: "An error occurred while connecting to OpenAI.",
  },
  [PROVIDERS.CLAUDE]: {
    400: "Invalid request to Claude API. Please check your input.",
    401: "Invalid Claude API key. Please check your credentials.",
    403: "Claude API access forbidden. Please check your subscription.",
    404: "Claude API endpoint not found.",
    429: "Claude API rate limit exceeded. Please try again later.",
    500: "Claude service error. Please try again later.",
    502: "Claude service is temporarily unavailable.",
    503: "Claude service is temporarily unavailable.",
    default: "An error occurred while connecting to Claude.",
  },
};

// Helper function to extract JSON from various response formats
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

// Validate JSON response from AI
const validateTasksResponse = (tasks) => {
  if (!Array.isArray(tasks)) {
    throw new Error("Invalid response format: not an array");
  }

  const requiredFields = [
    "title",
    "description",
    "priority",
    "estimatedTime",
    "status",
  ];
  const validPriorities = ["high", "medium", "low"];

  tasks.forEach((task, index) => {
    requiredFields.forEach((field) => {
      if (!task[field]) {
        throw new Error(
          `Task ${index + 1} is missing required field: ${field}`
        );
      }
    });

    if (!validPriorities.includes(task.priority)) {
      throw new Error(
        `Task ${index + 1} has invalid priority: ${task.priority}`
      );
    }

    if (typeof task.estimatedTime !== "number" || task.estimatedTime <= 0) {
      throw new Error(`Task ${index + 1} has invalid estimatedTime`);
    }
  });

  return tasks;
};

// Main function to generate tasks
async function generateTasks(prompt, provider = PROVIDERS.OPENAI) {
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
                "You are a task generation assistant. Always respond with plain JSON arrays only.",
            },
            {
              role: "user",
              content: `${
                PROMPTS[PROVIDERS.OPENAI].taskGeneration
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
                PROMPTS[PROVIDERS.CLAUDE].taskGeneration
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
      const error =
        API_ERRORS[provider][response.status] || API_ERRORS[provider].default;
      throw new Error(`${error} (Status: ${response.status})`);
    }

    const data = await response.json();
    let tasks;

    if (provider === PROVIDERS.OPENAI) {
      tasks = extractJsonFromResponse(data.choices[0].message.content);
    } else {
      tasks = extractJsonFromResponse(data.content[0].text);
    }

    const validatedTasks = validateTasksResponse(tasks);
    return { success: true, data: validatedTasks };
  } catch (error) {
    console.error("Error in generateTasks:", error);
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    };
  }
}

// Function to process task assignments
async function processTaskAssignments(prompt, provider = PROVIDERS.OPENAI) {
  console.log("Processing task assignment request:", prompt);

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
                "You are a task assignment assistant. Always respond with plain JSON arrays only.",
            },
            {
              role: "user",
              content: `${
                PROMPTS[PROVIDERS.OPENAI].taskAssignment
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
                PROMPTS[PROVIDERS.CLAUDE].taskAssignment
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
      const error =
        API_ERRORS[provider][response.status] || API_ERRORS[provider].default;
      throw new Error(`${error} (Status: ${response.status})`);
    }

    const data = await response.json();
    let assignments;

    if (provider === PROVIDERS.OPENAI) {
      assignments = extractJsonFromResponse(data.choices[0].message.content);
    } else {
      assignments = extractJsonFromResponse(data.content[0].text);
    }

    if (!Array.isArray(assignments)) {
      throw new Error("Invalid response format: not an array");
    }

    assignments.forEach((assignment, index) => {
      if (!assignment.taskTitle || !assignment.assignee) {
        throw new Error(`Assignment ${index + 1} is missing required fields`);
      }
    });

    return { success: true, data: assignments };
  } catch (error) {
    console.error("Error in processTaskAssignments:", error);
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    };
  }
}

// Export all necessary functions and constants
export { generateTasks, processTaskAssignments, PROVIDERS };
