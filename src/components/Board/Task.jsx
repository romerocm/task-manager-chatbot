import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  UserCircle,
  ChevronDown,
  Trash2,
  Edit2,
  X,
  Check,
  Keyboard,
} from "lucide-react";
import Avatar from "../ui/Avatar";

const PRIORITY_COLORS = {
  high: "bg-red-100 text-red-700 hover:bg-red-200",
  medium: "bg-yellow-100 text-yellow-700 hover:bg-yellow-200",
  low: "bg-green-100 text-green-700 hover:bg-green-200",
};

const TOOLTIP_STORAGE_KEY = "task-edit-tooltip-dismissed";

const isMobileDevice = () => {
  return (
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    ) || window.matchMedia("(max-width: 768px)").matches
  );
};

const Task = ({
  id,
  title,
  description,
  priority,
  estimatedTime,
  assignee_name,
  onDragStart,
  onDragEnd,
  onAssignClick,
  onPriorityChange,
  onDelete,
  onUpdate,
  className,
  isTopCard,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showPriorityMenu, setShowPriorityMenu] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(title);
  const [editedDescription, setEditedDescription] = useState(description);
  const [showTooltip, setShowTooltip] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const titleInputRef = useRef(null);

  useEffect(() => {
    if (isEditing) {
      titleInputRef.current?.focus();

      if (!isMobileDevice()) {
        const tooltipDismissed = localStorage.getItem(TOOLTIP_STORAGE_KEY);
        if (!tooltipDismissed) {
          setShowTooltip(true);
        }
      }
    }
  }, [isEditing]);

  // Update local state when props change
  useEffect(() => {
    setEditedTitle(title);
    setEditedDescription(description);
  }, [title, description]);

  const dismissTooltip = (e) => {
    e.stopPropagation();
    setShowTooltip(false);
    localStorage.setItem(TOOLTIP_STORAGE_KEY, "true");
  };

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

  const handleDragStart = (e) => {
    if (!isEditing) {
      setIsDragging(true);
      if (showPriorityMenu) {
        setShowPriorityMenu(false);
      }
      onDragStart(e);

      // Set ghost drag image
      const dragImage = e.currentTarget.cloneNode(true);
      dragImage.style.position = "absolute";
      dragImage.style.top = "-9999px";
      dragImage.style.opacity = "0.8";
      document.body.appendChild(dragImage);
      e.dataTransfer.setDragImage(dragImage, 0, 0);

      // Clean up ghost element after drag starts
      setTimeout(() => {
        document.body.removeChild(dragImage);
      }, 0);
    } else {
      e.preventDefault();
    }
  };

  const handleDragEnd = (e) => {
    setIsDragging(false);
    onDragEnd?.(e);
  };

  const handleEditClick = (e) => {
    e.stopPropagation();
    setIsEditing(true);
    setIsExpanded(true);
  };

  const handleCancelEdit = (e) => {
    e?.stopPropagation();
    setIsEditing(false);
    setEditedTitle(title);
    setEditedDescription(description);
    setShowTooltip(false);
  };

  const handleSaveEdit = async (e) => {
    e?.stopPropagation();
    if (editedTitle.trim()) {
      try {
        const success = await onUpdate(id, {
          title: editedTitle.trim(),
          description: editedDescription.trim(),
        });
        if (success) {
          setIsEditing(false);
          setShowTooltip(false);
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

  const dropdownRef = useRef(null);

  const handleClickOutside = useCallback((event) => {
    if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
      setShowPriorityMenu(false);
    }
  }, []);

  useEffect(() => {
    if (showPriorityMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showPriorityMenu, handleClickOutside]);

  const handlePriorityClick = (e) => {
    e.stopPropagation();
    setShowPriorityMenu((prev) => !prev);
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
    if (e.key === "Enter" && e.shiftKey) {
      e.preventDefault();
      handleSaveEdit(e);
    } else if (e.key === "Escape") {
      handleCancelEdit(e);
    }
  };

  return (
    <div
      draggable={!isEditing}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className={`group bg-white p-3 rounded shadow-sm 
        ${isEditing ? "cursor-default" : "cursor-move"} 
        ${isDragging ? "opacity-50" : "opacity-100"}
        hover:shadow-md transition-all duration-200
        ${className || ""}`}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
    >
      {/* Keyboard Shortcuts Tooltip */}
      {showTooltip && isEditing && isTopCard && (
        <div className="absolute -top-16 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-4 py-2 rounded shadow-lg z-20 w-64">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Keyboard size={16} />
              <span className="text-sm">
                Press{" "}
                <kbd className="px-1 py-0.5 bg-gray-700 rounded">
                  Shift + Enter
                </kbd>{" "}
                to save
              </span>
            </div>
            <button
              onClick={dismissTooltip}
              className="text-gray-400 hover:text-white"
            >
              <X size={16} />
            </button>
          </div>
          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2">
            <div className="w-3 h-3 bg-gray-800 transform rotate-45"></div>
          </div>
        </div>
      )}

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
              className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 ${PRIORITY_COLORS[priority]} z-50 relative`}
            >
              {priority}
              <ChevronDown size={12} />
            </button>

            {showPriorityMenu && (
              <div ref={dropdownRef} className="absolute bg-white rounded-lg shadow-lg border p-1 z-50 mt-1" style={{ zIndex: 2000 }}>
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
                  title="Save changes (Shift + Enter)"
                >
                  <Check size={16} />
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="p-1.5 rounded hover:bg-gray-100 text-gray-600"
                  title="Cancel editing (Esc)"
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
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{description}</p>
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
