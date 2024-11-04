// src/components/Chat/ChatBot.jsx
import React, { useState, useEffect, useRef } from "react";
import { Send, Trash2 } from "lucide-react";
import {
  generateTasks,
  processTaskAssignments,
  processTaskDeletions,
} from "../../services/aiService";
import Message from "./Message";

const ChatBot = ({ onTasksGenerated, boardRef }) => {
  const [messages, setMessages] = useState(() => {
    const savedMessages = localStorage.getItem("chatMessages");
    return savedMessages ? JSON.parse(savedMessages) : [];
  });
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);

  // Check API configuration on component mount
  useEffect(() => {
    checkApiConfig();
  }, []);

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

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

  const parseAssignmentIntent = (input) => {
    const assignmentKeywords = [
      "assign",
      "give",
      "set assignee",
      "delegate",
      "put",
      "give to",
      "should be done by",
      "is responsible for",
      "assign all",
      "assign everything",
    ];

    return assignmentKeywords.some((keyword) =>
      input.toLowerCase().includes(keyword.toLowerCase())
    );
  };

  const parseDeletionIntent = (input) => {
    const deletionKeywords = [
      "delete",
      "remove",
      "clear",
      "erase",
      "get rid of",
    ];

    return deletionKeywords.some((keyword) =>
      input.toLowerCase().includes(keyword.toLowerCase())
    );
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

    setMessages((prev) => {
      const updatedMessages = [...prev, userMessage];
      localStorage.setItem("chatMessages", JSON.stringify(updatedMessages));
      return updatedMessages;
    });
    setInput("");

    try {
      const isAssignmentRequest = parseAssignmentIntent(input);
      const isDeletionRequest = parseDeletionIntent(input);

      if (isDeletionRequest) {
        console.log("Processing deletion request:", input);
        const result = await processTaskDeletions(input);

        if (!result || !result.success) {
          throw new Error(result?.error || "Failed to process deletions");
        }

        const deletionMessage = {
          id: Date.now() + 1,
          text: result.data?.message || "Tasks deleted successfully.",
          sender: "ai",
        };
        setMessages((prev) => {
          const updatedMessages = [...prev, deletionMessage];
          localStorage.setItem("chatMessages", JSON.stringify(updatedMessages));
          return updatedMessages;
        });

        if (result.data?.tasksUpdated && boardRef.current?.fetchTasks) {
          await boardRef.current.fetchTasks();
        }
      } else if (isAssignmentRequest) {
        console.log("Processing assignment request:", input);
        const result = await processTaskAssignments(input);

        if (!result.success) {
          throw new Error(result.error || "Failed to process assignments");
        }

        const assignmentMessage = {
          id: Date.now() + 1,
          text: result.data.message,
          sender: "ai",
        };
        setMessages((prev) => {
          const updatedMessages = [...prev, assignmentMessage];
          localStorage.setItem("chatMessages", JSON.stringify(updatedMessages));
          return updatedMessages;
        });

        if (result.data.tasksUpdated && boardRef.current?.fetchTasks) {
          await boardRef.current.fetchTasks();
        }
      } else {
        // Handle regular task generation
        const result = await generateTasks(input);

        if (!result.success) {
          throw new Error(result.error || "Failed to generate tasks");
        }

        const tasks = await Promise.all(result.data.map(async task => {
          if (task.assigneeName) {
            task.assignee = await findUserByName(task.assigneeName);
          }
          return task;
        }));
        const aiMessage = {
          id: Date.now() + 1,
          text: `I've created ${
            tasks.length
          } tasks based on your request:\n${tasks
            .map((t) => `- ${t.title}`)
            .join("\n")}`,
          sender: "ai",
        };

        setMessages((prev) => {
          const updatedMessages = [...prev, aiMessage];
          localStorage.setItem("chatMessages", JSON.stringify(updatedMessages));
          return updatedMessages;
        });

        const tasksToAssign = tasks.filter(task => task.assignee);
        if (tasksToAssign.length > 0) {
          await Promise.all(tasksToAssign.map(task => 
            fetch(`/api/tasks/${task.id}/assign`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ assigneeId: task.assignee.id }),
            })
          ));
        }
        if (tasks.length > 0) {
          onTasksGenerated(tasks);
        }
      }
    } catch (error) {
      console.error("Error in handleSend:", error);
      const errorMessage = {
        id: Date.now() + 1,
        text: `Error: ${
          error.message || "Something went wrong. Please try again."
        }`,
        sender: "ai",
      };
      setMessages((prev) => {
        const updatedMessages = [...prev, errorMessage];
        localStorage.setItem("chatMessages", JSON.stringify(updatedMessages));
        return updatedMessages;
      });
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getPlaceholderText = () => {
    if (error) return "Please configure API keys in settings...";
    if (isLoading) return "Processing...";
    return "Ask me to create tasks or assign them to team members...";
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b flex justify-between items-center">
        <div>
          <h2 className="font-semibold">AI Task Assistant</h2>
          <p className="text-sm text-gray-600">
            I can help create, assign, and manage tasks!
          </p>
          {error && <div className="mt-2 text-sm text-red-500">{error}</div>}
        </div>
        <button
          onClick={() => {
            setMessages([]);
            localStorage.removeItem("chatMessages");
          }}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          title="Clear Chat"
        >
          <Trash2 size={20} className="text-gray-600" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <Message key={message.id} {...message} />
        ))}
        {isLoading && (
          <div className="flex justify-center">
            <div className="text-gray-500 animate-pulse">Thinking...</div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t">
        <div className="flex items-center gap-2">
          <textarea
            rows="1"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={getPlaceholderText()}
            disabled={isLoading}
            className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            style={{ minHeight: "42px", maxHeight: "120px" }}
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className={`p-2 rounded-lg ${
              isLoading || !input.trim()
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

export default ChatBot;
