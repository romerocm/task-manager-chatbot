// src/components/Board/Task.jsx
import React, { useState } from "react";
import { UserCircle, ChevronDown } from "lucide-react";
import Avatar from "../ui/Avatar";

const PRIORITY_COLORS = {
  high: "bg-red-100 text-red-700 hover:bg-red-200",
  medium: "bg-yellow-100 text-yellow-700 hover:bg-yellow-200",
  low: "bg-green-100 text-green-700 hover:bg-green-200",
};

const Task = ({
  id,
  title,
  description,
  priority,
  estimatedTime,
  assignee_name,
  onDragStart,
  onAssignClick,
  onPriorityChange,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showPriorityMenu, setShowPriorityMenu] = useState(false);

  const handleClick = (e) => {
    setIsExpanded(!isExpanded);
  };

  const handleAssignClick = (e) => {
    e.stopPropagation();
    onAssignClick(id);
  };

  const handlePriorityClick = (e) => {
    e.stopPropagation();
    setShowPriorityMenu(!showPriorityMenu);
  };

  const handlePrioritySelect = (newPriority) => (e) => {
    e.stopPropagation();
    onPriorityChange(id, newPriority);
    setShowPriorityMenu(false);
  };

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, id)}
      className="bg-white p-3 rounded shadow-sm cursor-move hover:shadow-md transition-shadow relative"
      onClick={handleClick}
    >
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h3 className="font-medium">{title}</h3>
          <div className="flex items-center gap-2 mt-1">
            <div className="relative">
              <button
                onClick={handlePriorityClick}
                className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 ${PRIORITY_COLORS[priority]}`}
              >
                {priority}
                <ChevronDown size={12} />
              </button>

              {showPriorityMenu && (
                <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-lg border p-1 z-10">
                  {Object.keys(PRIORITY_COLORS).map((p) => (
                    <button
                      key={p}
                      onClick={handlePrioritySelect(p)}
                      className={`block w-full text-left px-3 py-1 text-xs rounded ${
                        p === priority
                          ? PRIORITY_COLORS[p]
                          : "hover:bg-gray-100"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {estimatedTime && (
              <span className="text-xs text-gray-500">{estimatedTime}m</span>
            )}
          </div>
        </div>
        <button
          onClick={handleAssignClick}
          className="p-1 hover:bg-gray-100 rounded ml-2"
          title={assignee_name || "Assign task"}
        >
          {assignee_name ? (
            <Avatar name={assignee_name} size={24} />
          ) : (
            <UserCircle className="w-6 h-6 text-gray-400" />
          )}
        </button>
      </div>

      {isExpanded && description && (
        <div className="mt-2">
          <p className="text-sm text-gray-600">{description}</p>
          {assignee_name && (
            <p className="text-xs text-gray-500 mt-2">
              Assigned to: {assignee_name}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default Task;
