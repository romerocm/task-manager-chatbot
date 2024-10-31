import React, { useState, useEffect } from "react";
import { X, Search, UserPlus } from "lucide-react";

const TaskAssignmentModal = ({ isOpen, onClose, task, onAssign }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [users, setUsers] = useState([
    { id: 1, name: "John Doe", avatar: "/api/placeholder/32/32" },
    { id: 2, name: "Jane Smith", avatar: "/api/placeholder/32/32" },
    { id: 3, name: "Bob Johnson", avatar: "/api/placeholder/32/32" },
  ]);

  if (!isOpen) return null;

  const filteredUsers = users.filter((user) =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Assign Task</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={20} />
          </button>
        </div>

        <div className="relative mb-4">
          <Search
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
            size={20}
          />
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg"
          />
        </div>

        <div className="space-y-2 max-h-60 overflow-y-auto">
          {filteredUsers.map((user) => (
            <div
              key={user.id}
              onClick={() => onAssign(task.id, user)}
              className="flex items-center p-2 hover:bg-gray-50 rounded-lg cursor-pointer"
            >
              <img
                src={user.avatar}
                alt={user.name}
                className="w-8 h-8 rounded-full mr-3"
              />
              <span>{user.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
