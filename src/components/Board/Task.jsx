import React, { useState } from "react";
import { UserCircle } from "lucide-react";

const Task = ({
  id,
  title,
  description,
  priority,
  estimatedTime,
  assignee_name,
  assignee_avatar,
  onDragStart,
  onAssignClick,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleClick = (e) => {
    setIsExpanded(!isExpanded);
  };

  const handleAssignClick = (e) => {
    e.stopPropagation();
    onAssignClick(id);
  };

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, id)}
      className="bg-white p-3 rounded shadow-sm cursor-move hover:shadow-md transition-shadow"
      onClick={handleClick}
    >
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h3 className="font-medium">{title}</h3>
          <div className="flex items-center gap-2 mt-1">
            <span
              className={`text-xs px-2 py-1 rounded-full ${
                priority === "high"
                  ? "bg-red-100 text-red-700"
                  : priority === "medium"
                  ? "bg-yellow-100 text-yellow-700"
                  : "bg-green-100 text-green-700"
              }`}
            >
              {priority}
            </span>
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
          {assignee_avatar ? (
            <img
              src={assignee_avatar}
              alt={assignee_name}
              className="w-6 h-6 rounded-full"
            />
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
