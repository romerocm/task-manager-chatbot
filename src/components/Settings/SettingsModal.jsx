// src/components/Settings/SettingsModal.jsx
import React, { useState, useEffect } from "react";
import { Settings, X, Eye, EyeOff, Save } from "lucide-react";

const SettingsModal = ({ isOpen, onClose }) => {
  const [keys, setKeys] = useState({
    VITE_OPENAI_API_KEY: "",
    VITE_ANTHROPIC_API_KEY: "",
  });
  const [showKeys, setShowKeys] = useState({
    openai: false,
    anthropic: false,
  });
  const [status, setStatus] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchCurrentKeys();
    }
  }, [isOpen]);

  const fetchCurrentKeys = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/keys");
      const data = await response.json();

      if (data.success) {
        setKeys({
          VITE_OPENAI_API_KEY: data.keys.VITE_OPENAI_API_KEY || "",
          VITE_ANTHROPIC_API_KEY: data.keys.VITE_ANTHROPIC_API_KEY || "",
        });
      } else {
        setStatus("Error fetching current keys: " + data.error);
      }
    } catch (error) {
      console.error("Error fetching keys:", error);
      setStatus("Error fetching current keys");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("Saving...");
    setIsLoading(true);

    try {
      const response = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(keys),
      });

      const data = await response.json();

      if (data.success) {
        setStatus("Keys saved successfully!");
        setTimeout(() => {
          onClose();
          window.location.reload();
        }, 1500);
      } else {
        setStatus("Error saving keys: " + (data.error || "Unknown error"));
      }
    } catch (error) {
      console.error("Error saving keys:", error);
      setStatus("Error saving keys: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md relative">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-500 hover:text-gray-700"
          disabled={isLoading}
        >
          <X size={20} />
        </button>

        <div className="flex items-center gap-2 mb-4">
          <Settings size={24} className="text-blue-500" />
          <h2 className="text-xl font-semibold">API Configuration</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              OpenAI API Key
            </label>
            <div className="relative">
              <input
                type={showKeys.openai ? "text" : "password"}
                value={keys.VITE_OPENAI_API_KEY}
                onChange={(e) =>
                  setKeys((prev) => ({
                    ...prev,
                    VITE_OPENAI_API_KEY: e.target.value,
                  }))
                }
                className="w-full px-4 py-2 border rounded-lg pr-10"
                placeholder="Enter OpenAI API key"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() =>
                  setShowKeys((prev) => ({
                    ...prev,
                    openai: !prev.openai,
                  }))
                }
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500"
                disabled={isLoading}
              >
                {showKeys.openai ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Anthropic API Key
            </label>
            <div className="relative">
              <input
                type={showKeys.anthropic ? "text" : "password"}
                value={keys.VITE_ANTHROPIC_API_KEY}
                onChange={(e) =>
                  setKeys((prev) => ({
                    ...prev,
                    VITE_ANTHROPIC_API_KEY: e.target.value,
                  }))
                }
                className="w-full px-4 py-2 border rounded-lg pr-10"
                placeholder="Enter Anthropic API key"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() =>
                  setShowKeys((prev) => ({
                    ...prev,
                    anthropic: !prev.anthropic,
                  }))
                }
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500"
                disabled={isLoading}
              >
                {showKeys.anthropic ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {status && (
            <div
              className={`text-sm ${
                status.includes("Error") ? "text-red-500" : "text-green-500"
              }`}
            >
              {status}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2 ${
                isLoading ? "opacity-50 cursor-not-allowed" : ""
              }`}
              disabled={isLoading}
            >
              <Save size={20} />
              {isLoading ? "Saving..." : "Save Keys"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SettingsModal;
