// src/components/Chat/ChatBot.jsx
import React, { useState, useEffect, useRef } from "react";
import { Send, Trash2 } from "lucide-react";
import {
  findUserByName,
  generateTasks,
  processTaskAssignments,
  processTaskDeletions,
  PROVIDERS,
} from "../../services/aiService";
import Message from "./Message";

const ChatBot = ({ onTasksGenerated, boardRef }) => {
  const [pastedImage, setPastedImage] = useState(null); // { file: File, url: string }
  const [messages, setMessages] = useState(() => {
    const savedMessages = localStorage.getItem("chatMessages");
    return savedMessages ? JSON.parse(savedMessages) : [];
  });
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastDeletedTasks, setLastDeletedTasks] = useState([]);
  const messagesEndRef = useRef(null);
  const [lastCreatedTasks, setLastCreatedTasks] = useState([]);

  // Check API configuration on component mount
  useEffect(() => {
    checkApiConfig();
    
    // Cleanup function to revoke any object URLs when component unmounts
    return () => {
      messages.forEach(message => {
        if (message.imageUrl) {
          URL.revokeObjectURL(message.imageUrl);
        }
      });
    };
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
      "allocate",
      "distribute",
      "hand over",
      "entrust",
      "task to",
      "assign tasks to",
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
      "discard",
      "eliminate",
      "wipe out",
      "purge",
    ];

    const columnKeywords = {
      "in progress": "inprogress",
      inprogress: "inprogress",
      "to do": "todo",
      todo: "todo",
      done: "done",
      completed: "done",
      finished: "done",
    };

    const isDeletion = deletionKeywords.some((keyword) =>
      input.toLowerCase().includes(keyword.toLowerCase())
    );

    const column = Object.keys(columnKeywords).find((col) =>
      input.toLowerCase().includes(col)
    );

    return { isDeletion, column: column ? columnKeywords[column] : null };
  };

  const handlePaste = async (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.indexOf('image') !== -1) {
        const file = item.getAsFile();
        setPastedImage({ file });
        break;
      }
    }
  };

  const handleSend = async () => {
    if ((!input.trim() && !pastedImage) || isLoading) return;

    setIsLoading(true);
    setError(null);

    let userMessage = {
      id: Date.now(),
      text: input,
      sender: "user",
      imageUrl: null
    };

    if (pastedImage?.file) {
      const reader = new FileReader();
      await new Promise((resolve) => {
        reader.onload = () => {
          userMessage.imageUrl = reader.result;
          resolve();
        };
        reader.readAsDataURL(pastedImage.file);
      });
    }

    setMessages((prev) => {
      const updatedMessages = [...prev, userMessage];
      localStorage.setItem("chatMessages", JSON.stringify(updatedMessages));
      return updatedMessages;
    });
    setInput("");

    try {
      const isAssignmentRequest = parseAssignmentIntent(input);
      const { isDeletion, column } = parseDeletionIntent(input);

      if (isDeletion) {
        console.log("Processing deletion request:", input);
        let result;
        if (column) {
          // Fetch tasks in the specified column
          const response = await fetch("/api/tasks");
          const data = await response.json();
          if (!data.success) throw new Error("Failed to fetch tasks");

          const tasksToDelete = data.tasks
            .filter((task) => task.status.toLowerCase() === column)
            .map((task) => task.id);

          if (tasksToDelete.length > 0) {
            result = await fetch("/api/tasks/delete", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ taskIds: tasksToDelete }),
            }).then((res) => res.json());

            if (!result.success) {
              throw new Error(result.error || "Failed to delete tasks");
            }

            setLastDeletedTasks(tasksToDelete);
          } else {
            throw new Error(`No tasks found in the "${column}" column`);
          }
        } else {
          result = await processTaskDeletions(input);
          setLastDeletedTasks(result.data?.deletedTasks || []);
        }

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

        if (boardRef.current?.fetchTasks) {
          await boardRef.current.fetchTasks();
        }
      } else if (isAssignmentRequest) {
        console.log("Processing assignment request:", input);
        let result;
        if (
          input.toLowerCase().includes("those") &&
          lastCreatedTasks.length > 0
        ) {
          const taskTitles = lastCreatedTasks.map((task) => task.title);
          result = await processTaskAssignments(
            `assign ${taskTitles.join(", ")} to ${input.split("to")[1].trim()}`
          );
        } else {
          result = await processTaskAssignments(input);
        }

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
      } else if (input.toLowerCase().includes("undo")) {
        if (lastDeletedTasks.length > 0) {
          console.log("Restoring last deleted tasks");
          const response = await fetch("/api/tasks/restore", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tasks: lastDeletedTasks }),
          });

          const result = await response.json();
          if (!result || !result.success) {
            throw new Error(result?.error || "Failed to restore tasks");
          }

          const restoreMessage = {
            id: Date.now() + 1,
            text: `Restored ${lastDeletedTasks.length} task${
              lastDeletedTasks.length !== 1 ? "s" : ""
            } successfully.`,
            sender: "ai",
          };
          setMessages((prev) => {
            const updatedMessages = [...prev, restoreMessage];
            localStorage.setItem(
              "chatMessages",
              JSON.stringify(updatedMessages)
            );
            return updatedMessages;
          });

          if (boardRef.current?.fetchTasks) {
            await boardRef.current.fetchTasks();
          }
          setLastDeletedTasks([]);
        } else {
          const noTasksMessage = {
            id: Date.now() + 1,
            text: "No tasks to restore.",
            sender: "ai",
          };
          setMessages((prev) => {
            const updatedMessages = [...prev, noTasksMessage];
            localStorage.setItem(
              "chatMessages",
              JSON.stringify(updatedMessages)
            );
            return updatedMessages;
          });
        }
      } else {
        // Handle regular task generation
        const result = await generateTasks(input, PROVIDERS.OPENAI, null, pastedImage?.file);
        if (pastedImage) {
          URL.revokeObjectURL(pastedImage.url);
          setPastedImage(null);
        }

        if (!result.success) {
          throw new Error(result.error || "Failed to generate tasks");
        }

        const tasks = await Promise.all(
          result.data.map(async (task) => {
            if (task.assigneeName) {
              task.assignee = await findUserByName(task.assigneeName);
            }
            return task;
          })
        );

        // Fetch the newly created tasks to ensure we have their IDs
        const updatedTasks = await fetch("/api/tasks")
          .then((res) => res.json())
          .then((data) => data.tasks);

        const tasksWithIds = tasks.map((task) => {
          const matchedTask = updatedTasks.find((t) => t.title === task.title);
          return { ...task, id: matchedTask ? matchedTask.id : undefined };
        });

        const aiMessage = {
          id: Date.now() + 1,
          text: `I've created ${
            tasksWithIds.length
          } tasks based on your request:\n${tasksWithIds
            .map((t) => `- ${t.title}`)
            .join("\n")}`,
          sender: "ai",
        };

        setMessages((prev) => {
          const updatedMessages = [...prev, aiMessage];
          localStorage.setItem("chatMessages", JSON.stringify(updatedMessages));
          return updatedMessages;
        });

        setLastCreatedTasks(tasksWithIds);

        const tasksToAssign = tasksWithIds.filter(
          (task) => task.assigneeName && task.id
        );
        if (tasksToAssign.length > 0) {
          await Promise.all(
            tasksToAssign.map(async (task) => {
              const assignee = await findUserByName(task.assigneeName);
              if (assignee) {
                await fetch(`/api/tasks/${task.id}/assign`, {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ assigneeId: assignee.id }),
                });
              }
            })
          );
        }
        if (tasksWithIds.length > 0) {
          onTasksGenerated(tasksWithIds);
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
            // Clean up any existing image URLs before clearing messages
            messages.forEach(message => {
              if (message.imageUrl) {
                URL.revokeObjectURL(message.imageUrl);
              }
            });
            setMessages([]);
            localStorage.removeItem("chatMessages");
          }}
          className="p-2 rounded-lg hover:bg-red-100 transition-colors shadow-md"
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
        {pastedImage && (
          <div className="mb-2 p-2 border rounded-lg flex items-center gap-2 bg-gray-50">
            <img 
              src={URL.createObjectURL(pastedImage.file)} 
              alt="Attachment preview" 
              className="h-12 w-12 object-cover rounded"
            />
            <span className="text-sm text-gray-600 flex-1">Image attached</span>
            <button
              onClick={() => setPastedImage(null)}
              className="p-1 hover:bg-gray-200 rounded"
            >
              <Trash2 size={16} className="text-gray-500" />
            </button>
          </div>
        )}
        <div className="flex items-center gap-2">
          <textarea
            rows="1"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            onPaste={handlePaste}
            placeholder={pastedImage ? "Tell me what to do with this image..." : getPlaceholderText()}
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
                : "bg-gradient-to-r from-blue-100 to-purple-100 hover:from-blue-200 hover:to-purple-200 text-indigo-500"
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
