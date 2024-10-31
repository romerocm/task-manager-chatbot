import React, { useState, useEffect } from "react";
import { Send } from "lucide-react";
import { generateTasks } from "../../services/aiService";
import Message from "./Message";

const ChatBox = ({ onTasksGenerated }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Check API configuration on component mount
  useEffect(() => {
    checkApiConfig();
  }, []);

  const checkApiConfig = async () => {
    try {
      const response = await fetch("/api/keys/test");
      const data = await response.json();

      if (!data.keysPresent.openai && !data.keysPresent.anthropic) {
        setError(
          "No API keys configured. Please set up your API keys in settings."
        );
      }
    } catch (err) {
      setError("Error checking API configuration");
      console.error("API config check error:", err);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    setIsLoading(true);
    setError(null);

    const userMessage = {
      id: Date.now(),
      text: input,
      sender: "user",
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    try {
      console.log("Generating tasks with input:", input);
      const result = await generateTasks(input);
      console.log("Generate tasks result:", result);

      if (!result.success) {
        throw new Error(result.error || "Failed to generate tasks");
      }

      const tasks = result.data;

      const aiMessage = {
        id: Date.now() + 1,
        text: `I've created ${tasks.length} tasks based on your request. Check the board to see them!`,
        sender: "ai",
      };

      setMessages((prev) => [...prev, aiMessage]);

      if (tasks.length > 0) {
        onTasksGenerated(tasks);
      }
    } catch (error) {
      console.error("Error in handleSend:", error);
      const errorMessage = {
        id: Date.now() + 1,
        text: `Error: ${
          error.message ||
          "Couldn't generate tasks. Please check your API configuration."
        }`,
        sender: "ai",
      };
      setMessages((prev) => [...prev, errorMessage]);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <h2 className="font-semibold">AI Task Assistant</h2>
        <p className="text-sm text-gray-600">
          Ask me to help you create tasks!
        </p>
        {error && <div className="mt-2 text-sm text-red-500">{error}</div>}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <Message key={message.id} {...message} />
        ))}
        {isLoading && (
          <div className="flex justify-center">
            <div className="animate-pulse text-gray-500">Thinking...</div>
          </div>
        )}
      </div>

      <div className="p-4 border-t">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Describe the tasks you need..."
            className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            onKeyPress={(e) => e.key === "Enter" && handleSend()}
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={isLoading}
            className={`p-2 rounded-lg ${
              isLoading
                ? "bg-gray-300 cursor-not-allowed"
                : "bg-blue-500 hover:bg-blue-600 text-white"
            }`}
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatBox;
