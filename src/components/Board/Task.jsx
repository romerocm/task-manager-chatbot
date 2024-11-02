import React, { useState, useEffect, useRef } from "react";
import { UserCircle, ChevronDown, Trash2, Edit2, X, Check } from "lucide-react";
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
  onDelete,
  onUpdate,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showPriorityMenu, setShowPriorityMenu] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(title);
  const [editedDescription, setEditedDescription] = useState(description);
  const titleInputRef = useRef(null);

  useEffect(() => {
    if (isEditing && titleInputRef.current) {
      titleInputRef.current.focus();
    }
  }, [isEditing]);

  const handleClick = (e) => {
    if (!isEditing) {
      setIsExpanded(!isExpanded);
    }
  };

  const handleDoubleClick = (e) => {
    if (!isEditing) {
      e.stopPropagation();
      setIsEditing(true);
      setIsExpanded(true);
    }
  };

  const handleEditClick = (e) => {
    e.stopPropagation();
    setIsEditing(true);
    setIsExpanded(true);
  };

  const handleCancelEdit = (e) => {
    e.stopPropagation();
    setIsEditing(false);
    setEditedTitle(title);
    setEditedDescription(description);
  };

  const handleSaveEdit = async (e) => {
    e.stopPropagation();
    if (editedTitle.trim()) {
      try {
        const success = await onUpdate(id, {
          title: editedTitle.trim(),
          description: editedDescription.trim(),
        });
        if (success) {
          setIsEditing(false);
        }
      } catch (error) {
        console.error("Error saving task:", error);
      }
    }
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

  const handleDeleteClick = async (e) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this task?")) {
      setIsDeleting(true);
      try {
        await onDelete(id);
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && e.ctrlKey) {
      handleSaveEdit(e);
    } else if (e.key === "Escape") {
      handleCancelEdit(e);
    }
  };

  return (
    <div
      draggable={!isEditing}
      onDragStart={(e) => onDragStart(e, id)}
      className={`group bg-white p-3 rounded shadow-sm ${
        isEditing ? "cursor-default" : "cursor-move"
      } hover:shadow-md transition-shadow relative`}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
    >
      <div className="flex flex-col gap-2">
        {/* First row: Title with Avatar */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <input
                ref={titleInputRef}
                type="text"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full px-2 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Task title"
              />
            ) : (
              <h3 className="font-medium">{title}</h3>
            )}
          </div>
          <button
            onClick={handleAssignClick}
            className="flex-shrink-0 p-1 hover:bg-gray-100 rounded"
            title={assignee_name || "Assign task"}
          >
            {assignee_name ? (
              <Avatar name={assignee_name} size={24} />
            ) : (
              <UserCircle className="w-6 h-6 text-gray-400" />
            )}
          </button>
        </div>

        {/* Second row: Priority, Time, and Action Buttons */}
        <div className="flex items-center gap-2">
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
                      p === priority ? PRIORITY_COLORS[p] : "hover:bg-gray-100"
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

          {/* Action Buttons */}
          <div className="flex items-center gap-1 ml-auto">
            {isEditing ? (
              <>
                <button
                  onClick={handleSaveEdit}
                  className="p-1.5 rounded hover:bg-green-100 text-green-600"
                  title="Save changes"
                >
                  <Check size={16} />
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="p-1.5 rounded hover:bg-gray-100 text-gray-600"
                  title="Cancel editing"
                >
                  <X size={16} />
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleEditClick}
                  className="p-1.5 rounded hover:bg-blue-100 text-blue-600 
                  opacity-0 group-hover:opacity-100 
                  transition-all duration-200 ease-in-out"
                  title="Edit task"
                >
                  <Edit2 size={16} />
                </button>
                <button
                  onClick={handleDeleteClick}
                  disabled={isDeleting}
                  className={`p-1.5 rounded hover:bg-red-100 text-red-500 
                    opacity-0 group-hover:opacity-100
                    transition-all duration-200 ease-in-out
                    ${isDeleting ? "cursor-not-allowed" : ""}`}
                  title="Delete task"
                >
                  <Trash2 size={16} />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Description Section */}
        {(isExpanded || isEditing) && (
          <div className="mt-2">
            {isEditing ? (
              <textarea
                value={editedDescription}
                onChange={(e) => setEditedDescription(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full px-2 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Task description"
                rows={3}
              />
            ) : (
              description && (
                <p className="text-sm text-gray-600">{description}</p>
              )
            )}
            {!isEditing && assignee_name && (
              <p className="text-xs text-gray-500 mt-2">
                Assigned to: {assignee_name}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Task;
