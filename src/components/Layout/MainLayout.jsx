import React, { useState } from "react";
import Board from "../Board/Board";
import ChatBot from "../Chat/ChatBot";
import SettingsModal from "../Settings/SettingsModal";
import { Settings } from "lucide-react";

const MainLayout = () => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const boardRef = React.useRef();

  const handleTasksGenerated = (tasks) => {
    if (boardRef.current) {
      boardRef.current.addTasks(tasks);
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <div className="flex-1 p-6 overflow-auto">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center">
            <img src="/src/assets/images/logo.svg" alt="Logo" className="h-8 w-8 mr-2" />
          </div>
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
            title="Settings"
          >
            <Settings size={24} className="text-gray-600" />
          </button>
        </div>
        <Board ref={boardRef} />
      </div>
      <div className="w-96 border-l border-gray-200 bg-white">
        <ChatBot onTasksGenerated={handleTasksGenerated} boardRef={boardRef} />
      </div>
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
};

export default MainLayout;
