import React, { useState } from "react";

const Task = ({ id, title, description, onDragStart }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, id)}
      className="bg-white p-3 rounded shadow-sm cursor-move hover:shadow-md transition-shadow"
      onClick={() => setIsExpanded(!isExpanded)}
    >
      <h3 className="font-medium">{title}</h3>
      {isExpanded && description && (
        <p className="text-sm text-gray-600 mt-2">{description}</p>
      )}
    </div>
  );
};

export default Task;
