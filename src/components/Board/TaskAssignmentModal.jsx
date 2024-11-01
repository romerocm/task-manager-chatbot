// src/components/Board/TaskAssignmentModal.jsx
import React, { useState, useEffect } from "react";
import { X, Search } from "lucide-react";
import Avatar from "../ui/Avatar";

const TaskAssignmentModal = ({ isOpen, onClose, task, onAssign }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
    } else {
      // Reset state when modal closes
      setSearchTerm("");
      setError(null);
    }
  }, [isOpen]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/users");
      const data = await response.json();

      if (data.success) {
        setUsers(data.users);
      } else {
        throw new Error(data.error || "Failed to fetch users");
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      setError("Failed to load users. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAssign = (user) => {
    onAssign(task.id, user);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Assign Task</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {task && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <h3 className="font-medium">{task.title}</h3>
            {task.description && (
              <p className="text-sm text-gray-600 mt-1">{task.description}</p>
            )}
          </div>
        )}

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search users by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {error && (
          <div className="text-red-500 text-sm mb-4 p-3 bg-red-50 rounded-lg">
            {error}
          </div>
        )}

        <div className="space-y-2 max-h-60 overflow-y-auto">
          {loading ? (
            <div className="text-center py-4 text-gray-500">
              Loading users...
            </div>
          ) : filteredUsers.length > 0 ? (
            filteredUsers.map((user) => (
              <button
                key={user.id}
                onClick={() => handleAssign(user)}
                className="w-full flex items-center p-2 hover:bg-gray-50 rounded-lg transition-colors text-left"
              >
                <Avatar
                  name={user.name}
                  size={32}
                  className="flex-shrink-0 mr-3"
                />
                <div>
                  <div className="font-medium">{user.name}</div>
                  {user.email && (
                    <div className="text-sm text-gray-500">{user.email}</div>
                  )}
                </div>
              </button>
            ))
          ) : (
            <div className="text-center py-4 text-gray-500">
              {searchTerm
                ? "No users found matching your search"
                : "No users available"}
            </div>
          )}
        </div>

        <div className="mt-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaskAssignmentModal;
