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

// Helper function to extract JSON from various response formats
const extractJsonFromResponse = (content) => {
  try {
    // First try to parse the content directly
    return JSON.parse(content);
  } catch (e) {
    // If direct parsing fails, try to extract JSON from markdown
    console.log("Direct parsing failed, attempting to extract from markdown");

    // Remove markdown code blocks
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      const jsonContent = jsonMatch[1].trim();
      console.log("Extracted JSON content:", jsonContent);
      return JSON.parse(jsonContent);
    }

    // If no code blocks, try to find array directly
    const arrayMatch = content.match(/\[([\s\S]*)\]/);
    if (arrayMatch) {
      const arrayContent = `[${arrayMatch[1]}]`;
      console.log("Extracted array content:", arrayContent);
      return JSON.parse(arrayContent);
    }

    throw new Error("Could not extract valid JSON from response");
  }
};

// Provider-specific prompts optimized for each AI
const PROMPTS = {
  [PROVIDERS.OPENAI]: {
    taskGeneration: `Analyze the following request and create a list of specific, actionable tasks. 
    Response must be a plain JSON array (no markdown, no code blocks) where each object has:
    - "title": A clear, concise task title (max 50 chars)
    - "description": Detailed explanation (max 200 chars)
    - "priority": "high", "medium", or "low"
    - "estimatedTime": estimated completion time in minutes
    - "status": "todo"
    
    Respond with ONLY the JSON array, no other text or formatting.
    Example format: [{"title":"Task 1","description":"Description 1","priority":"high","estimatedTime":30,"status":"todo"}]`,
  },
  [PROVIDERS.CLAUDE]: {
    taskGeneration: `Analyze this request and create specific, actionable tasks.
    Respond ONLY with a JSON array where each task has:
    - "title": Clear, concise task title (max 50 chars)
    - "description": Detailed explanation (max 200 chars)
    - "priority": "high", "medium", or "low"
    - "estimatedTime": estimated completion time in minutes
    - "status": "todo"
    
    Format: [{"title": "...", "description": "...", "priority": "...", "estimatedTime": N, "status": "todo"}, ...]
    
    Ensure response is pure JSON array. No additional text or explanation.`,
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

// Generate tasks using OpenAI's API
const generateTasksWithChatGPT = async (prompt) => {
  console.log("Attempting to generate tasks with OpenAI");
  console.log("API Key present:", !!import.meta.env.VITE_OPENAI_API_KEY);
  console.log(
    "API Key starts with:",
    import.meta.env.VITE_OPENAI_API_KEY?.substring(0, 3)
  );

  try {
    if (!import.meta.env.VITE_OPENAI_API_KEY) {
      throw new Error("OpenAI API key not configured");
    }

    const response = await fetch(API_ENDPOINTS[PROVIDERS.OPENAI], {
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
              "You are a task generation assistant. Always respond with plain JSON arrays only, no markdown formatting or code blocks.",
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

    console.log("OpenAI API Response Status:", response.status);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("OpenAI API Error:", errorData);
      const error =
        API_ERRORS[PROVIDERS.OPENAI][response.status] ||
        API_ERRORS[PROVIDERS.OPENAI].default;
      throw new Error(`${error} (Status: ${response.status})`);
    }

    const data = await response.json();
    console.log("OpenAI API Response:", data);

    try {
      const content = data.choices[0].message.content;
      console.log("Raw content from OpenAI:", content);
      const tasks = extractJsonFromResponse(content);
      const validatedTasks = validateTasksResponse(tasks);
      return { success: true, data: validatedTasks };
    } catch (e) {
      console.error("Error parsing OpenAI response:", e);
      throw new Error(`Failed to parse OpenAI response: ${e.message}`);
    }
  } catch (error) {
    console.error("Error in generateTasksWithChatGPT:", error);
    return { success: false, error: error.message };
  }
};

// Generate tasks using Claude's API
const generateTasksWithClaude = async (prompt) => {
  console.log("Attempting to generate tasks with Claude");
  console.log("API Key present:", !!import.meta.env.VITE_ANTHROPIC_API_KEY);

  try {
    if (!import.meta.env.VITE_ANTHROPIC_API_KEY) {
      throw new Error("Claude API key not configured");
    }

    const response = await fetch(API_ENDPOINTS[PROVIDERS.CLAUDE], {
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

    console.log("Claude API Response Status:", response.status);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Claude API Error:", errorData);
      const error =
        API_ERRORS[PROVIDERS.CLAUDE][response.status] ||
        API_ERRORS[PROVIDERS.CLAUDE].default;
      throw new Error(`${error} (Status: ${response.status})`);
    }

    const data = await response.json();
    console.log("Claude API Response:", data);

    try {
      const tasks = extractJsonFromResponse(data.content[0].text);
      const validatedTasks = validateTasksResponse(tasks);
      return { success: true, data: validatedTasks };
    } catch (e) {
      console.error("Error parsing Claude response:", e);
      throw new Error(`Failed to parse Claude response: ${e.message}`);
    }
  } catch (error) {
    console.error("Error in generateTasksWithClaude:", error);
    return { success: false, error: error.message };
  }
};

// Main function to generate tasks
export async function generateTasks(prompt, provider = PROVIDERS.OPENAI) {
  console.log("generateTasks called with provider:", provider);
  try {
    // Input validation
    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      throw new Error("Invalid prompt: Please provide a non-empty text prompt");
    }

    const hasOpenAI = !!import.meta.env.VITE_OPENAI_API_KEY;
    const hasClaude = !!import.meta.env.VITE_ANTHROPIC_API_KEY;

    console.log("API Keys present:", { hasOpenAI, hasClaude });

    // Validate API key availability
    if (provider === PROVIDERS.OPENAI && !hasOpenAI) {
      throw new Error("OpenAI API key not configured");
    }
    if (provider === PROVIDERS.CLAUDE && !hasClaude) {
      throw new Error("Claude API key not configured");
    }

    // Use specified provider or fall back to available one
    if (provider === PROVIDERS.OPENAI && hasOpenAI) {
      return await generateTasksWithChatGPT(prompt);
    } else if (provider === PROVIDERS.CLAUDE && hasClaude) {
      return await generateTasksWithClaude(prompt);
    } else if (hasOpenAI) {
      return await generateTasksWithChatGPT(prompt);
    } else if (hasClaude) {
      return await generateTasksWithClaude(prompt);
    }

    throw new Error("No AI provider configured");
  } catch (error) {
    console.error("Error in generateTasks:", error);
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    };
  }
}

// Export constants for use in other components
export const AI_PROVIDERS = PROVIDERS;
