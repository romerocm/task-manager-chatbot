import React, { useState } from "react";
import Board from "../Board/Board";
import logo from "../../assets/images/logo.svg";
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
    <div className="flex h-screen bg-gradient-to-r from-blue-100 to-purple-100 bg-noise">
      <div className="flex-1 p-6 overflow-auto">
        <div className="flex justify-between items-center mb-6 shadow-lg p-4 bg-white rounded-lg">
          <div className="flex items-center justify-between w-full pr-4">
            <img src={logo} alt="Logo" className="h-8 mr-2" />
            <h1 className="text-2xl font-bold text-gray-800">Task Manager</h1>
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
      <div className="w-96 border-l border-gray-200 bg-white shadow-lg">
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
