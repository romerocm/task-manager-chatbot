import React, { useState } from "react";
import { UserCircle } from "lucide-react";

const Task = ({
  id,
  title,
  description,
  assignee,
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
        <h3 className="font-medium">{title}</h3>
        <button
          onClick={handleAssignClick}
          className="p-1 hover:bg-gray-100 rounded"
        >
          {assignee ? (
            <img
              src={assignee.avatar}
              alt={assignee.name}
              title={assignee.name}
              className="w-6 h-6 rounded-full"
            />
          ) : (
            <UserCircle size={20} className="text-gray-400" />
          )}
        </button>
      </div>
      {isExpanded && (
        <div className="mt-2 space-y-2">
          <p className="text-sm text-gray-600">{description}</p>
          {assignee && (
            <div className="text-sm text-gray-500">
              Assigned to: {assignee.name}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Task;
