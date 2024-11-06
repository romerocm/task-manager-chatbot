// src/components/Board/Board.jsx - Part 1
import React, {
  useState,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from "react";
import Task from "./Task";
import confetti from "canvas-confetti";
import TaskAssignmentModal from "./TaskAssignmentModal";
import ComboEffect from "./ComboEffect";

const RippleEffect = ({ x, y, onAnimationEnd }) => {
  return (
    <div
      className="absolute w-2 h-2 rounded-full bg-blue-400/20 pointer-events-none"
      style={{
        left: x - 8, // Center the ripple (half of width)
        top: y - 8, // Center the ripple (half of height)
        animation: "ripple 0.6s ease-out forwards",
      }}
      onAnimationEnd={onAnimationEnd}
    />
  );
};

const Board = forwardRef((props, ref) => {
  const [columns, setColumns] = useState([
    { id: "todo", title: "To Do", tasks: [] },
    { id: "inProgress", title: "In Progress", tasks: [] },
    { id: "done", title: "Done", tasks: [] },
  ]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
  const [draggedTask, setDraggedTask] = useState(null);
  const [dragOverTask, setDragOverTask] = useState(null);
  const [dragPosition, setDragPosition] = useState(null);
  const [ripples, setRipples] = useState([]);

  const [isFreshBoard, setIsFreshBoard] = useState(() => {
    const storedValue = localStorage.getItem("tasksAdded");
    return storedValue !== "true";
  });

  const fetchTasks = async () => {
    try {
      const response = await fetch("/api/tasks");
      const data = await response.json();
      if (data.success) {
        const organizedTasks = organizeTasksByStatus(data.tasks);
        setColumns(
          columns.map((col) => ({
            ...col,
            tasks: organizedTasks[col.id] || [],
          }))
        );
        if (data.tasks.length > 0) {
          localStorage.setItem("tasksAdded", "true");
          setIsFreshBoard(false);
        }
        // Ensure each card in a column is stacked above the one below it
        setColumns((prevColumns) =>
          prevColumns.map((col) => ({
            ...col,
            tasks: col.tasks.map((task, index) => ({
              ...task,
              zIndex: col.tasks.length - index,
            })),
          }))
        );
      }
    } catch (error) {
      console.error("Error fetching tasks:", error);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const organizeTasksByStatus = (tasks) => {
    return tasks.reduce((acc, task) => {
      if (!acc[task.status]) {
        acc[task.status] = [];
      }
      acc[task.status].push(task);
      return acc;
    }, {});
  };

  const updateTaskPositions = async (columnId, tasks) => {
    try {
      const positions = tasks.map((task, index) => ({
        id: task.id,
        position: index,
      }));

      const response = await fetch("/api/tasks/positions", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: columnId,
          positions: positions,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update task positions");
      }
    } catch (error) {
      console.error("Error updating task positions:", error);
      await fetchTasks();
    }
  };

  useImperativeHandle(ref, () => ({
    fetchTasks,
    addTasks: async (newTasks) => {
      try {
        const response = await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newTasks),
        });

        const data = await response.json();
        if (data.success) {
          await fetchTasks();
          // Trigger confetti when a task is moved to the "Done" column
          if (newTasks.some((task) => task.status === "done")) {
            confetti({
              particleCount: 100,
              spread: 70,
              origin: { y: 0.6 },
            });
          }
        }
      } catch (error) {
        console.error("Error adding tasks:", error);
      }
    },
    assignTask: async (taskId, user) => {
      try {
        const response = await fetch(`/api/tasks/${taskId}/assign`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ assigneeId: user.id }),
        });

        const data = await response.json();
        if (data.success) {
          await fetchTasks();
        }
        return data.success;
      } catch (error) {
        console.error("Error assigning task:", error);
        return false;
      }
    },
  }));

  // src/components/Board/Board.jsx - Part 2

  const handleColumnDoubleClick = (e, columnId) => {
    // Only create ripple if clicking the column background (not on tasks)
    if (e.target.closest(".task-card")) return;

    // Get position relative to the column
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Add new ripple with unique ID
    const newRipple = {
      id: Date.now(),
      x,
      y,
      columnId,
    };

    setRipples((prev) => [...prev, newRipple]);
  };

  const removeRipple = (rippleId) => {
    setRipples((prev) => prev.filter((r) => r.id !== rippleId));
  };

  const handleDragStart = (e, taskId, columnId) => {
    e.dataTransfer.setData("taskId", taskId);
    e.dataTransfer.setData("sourceColumnId", columnId);
    setDraggedTask(taskId);
  };

  const handleDragOver = (e, taskId) => {
    e.preventDefault();
    e.stopPropagation();
    if (taskId === draggedTask) return;

    const taskElement = e.currentTarget;
    const rect = taskElement.getBoundingClientRect();
    const mouseY = e.clientY;
    const threshold = rect.top + rect.height / 2;

    const position = mouseY < threshold ? "top" : "bottom";

    setDragOverTask(taskId);
    setDragPosition(position);
  };

  const handleColumnDragOver = (e, columnId) => {
    e.preventDefault();
    if (!dragOverTask) {
      setDragOverTask(`column-end-${columnId}`);
      setDragPosition("bottom");
    }
  };

  const handleDragLeave = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragOverTask(null);
      setDragPosition(null);
    }
  };

  const handleDragEnd = () => {
    setDraggedTask(null);
    setDragOverTask(null);
    setDragPosition(null);
  };

  const handleDrop = async (e, targetColumnId) => {
    e.preventDefault();
    e.stopPropagation();

    const taskId = e.dataTransfer.getData("taskId");
    const sourceColumnId = e.dataTransfer.getData("sourceColumnId");

    const sourceColumn = columns.find((col) => col.id === sourceColumnId);
    const targetColumn = columns.find((col) => col.id === targetColumnId);

    if (!sourceColumn || !targetColumn) return;

    const draggedTaskIndex = sourceColumn.tasks.findIndex(
      (t) => t.id === parseInt(taskId)
    );
    if (draggedTaskIndex === -1) return;

    const draggedTask = sourceColumn.tasks[draggedTaskIndex];

    if (sourceColumnId === targetColumnId) {
      const tasks = [...sourceColumn.tasks];
      tasks.splice(draggedTaskIndex, 1);

      let insertIndex;
      if (
        !dragOverTask ||
        (typeof dragOverTask === "string" &&
          dragOverTask.startsWith("column-end-"))
      ) {
        insertIndex = tasks.length;
      } else {
        const targetIndex = tasks.findIndex(
          (t) => t.id === parseInt(dragOverTask)
        );
        insertIndex =
          targetIndex > -1
            ? dragPosition === "bottom"
              ? targetIndex + 1
              : targetIndex
            : tasks.length;
      }

      tasks.splice(insertIndex, 0, draggedTask);

      setColumns(
        columns.map((col) =>
          col.id === sourceColumnId ? { ...col, tasks } : col
        )
      );

      await updateTaskPositions(targetColumnId, tasks);
    } else {
      try {
        const sourceTasks = [...sourceColumn.tasks];
        const targetTasks = [...targetColumn.tasks];

        sourceTasks.splice(draggedTaskIndex, 1);

        let insertIndex;
        if (
          !dragOverTask ||
          (typeof dragOverTask === "string" &&
            dragOverTask.startsWith("column-end-"))
        ) {
          insertIndex = targetTasks.length;
        } else {
          const targetIndex = targetTasks.findIndex(
            (t) => t.id === parseInt(dragOverTask)
          );
          insertIndex =
            targetIndex > -1
              ? dragPosition === "bottom"
                ? targetIndex + 1
                : targetIndex
              : targetTasks.length;
        }

        targetTasks.splice(insertIndex, 0, draggedTask);

        const response = await fetch(`/api/tasks/${taskId}/status`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: targetColumnId,
            position: insertIndex,
          }),
        });

        if (response.ok) {
          await Promise.all([
            updateTaskPositions(sourceColumnId, sourceTasks),
            updateTaskPositions(targetColumnId, targetTasks),
          ]);

          setColumns((prevColumns) =>
            prevColumns.map((col) => {
              if (col.id === sourceColumnId) {
                return { ...col, tasks: sourceTasks };
              }
              if (col.id === targetColumnId) {
                return { ...col, tasks: targetTasks };
              }
              return col;
            })
          );

          // Find ComboEffect component's DOM element and call its triggerCombo method
          const comboEffect = document.querySelector('[data-combo-effect]');
          if (targetColumnId === "done") {
            // Using custom event to communicate with ComboEffect component
            window.dispatchEvent(new CustomEvent('taskCompletedCombo'));
          }
        }
      } catch (error) {
        console.error("Error moving task between columns:", error);
        await fetchTasks();
      }
    }

    handleDragEnd();
  };

  const handlePriorityChange = async (taskId, newPriority) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/priority`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ priority: newPriority }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setColumns(
            columns.map((col) => ({
              ...col,
              tasks: col.tasks.map((task) =>
                task.id === taskId ? { ...task, priority: newPriority } : task
              ),
            }))
          );
        }
      }
    } catch (error) {
      console.error("Error updating priority:", error);
    }
  };

  const handleTaskUpdate = async (taskId, updates) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Failed to update task:", errorText);
        return false;
      }

      const data = await response.json();
      if (data.success) {
        setColumns((prevColumns) =>
          prevColumns.map((column) => ({
            ...column,
            tasks: column.tasks.map((task) =>
              task.id === taskId ? { ...task, ...updates, ...data.task } : task
            ),
          }))
        );
        return true;
      } else {
        console.error("Failed to update task:", data.error);
        return false;
      }
    } catch (error) {
      console.error("Error updating task:", error);
      return false;
    }
  };

  const handleDeleteTask = async (taskId) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();
      if (data.success) {
        const columnWithTask = columns.find((col) =>
          col.tasks.some((task) => task.id === taskId)
        );

        if (columnWithTask) {
          const remainingTasks = columnWithTask.tasks.filter(
            (task) => task.id !== taskId
          );
          await updateTaskPositions(columnWithTask.id, remainingTasks);
        }

        setColumns((prevColumns) =>
          prevColumns.map((column) => ({
            ...column,
            tasks: column.tasks.filter((task) => task.id !== taskId),
          }))
        );
        return true;
      } else {
        console.error("Failed to delete task:", data.error);
        return false;
      }
    } catch (error) {
      console.error("Error deleting task:", error);
      return false;
    }
  };

  const handleAssignTask = async (taskId, user) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/assign`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assigneeId: user.id }),
      });

      const data = await response.json();
      if (data.success) {
        setColumns(
          columns.map((col) => ({
            ...col,
            tasks: col.tasks.map((task) =>
              task.id === taskId
                ? {
                    ...task,
                    assignee_id: user.id,
                    assignee_name: user.name,
                    assignee_email: user.email,
                    assignee_avatar: user.avatar_url,
                  }
                : task
            ),
          }))
        );
        return true;
      }
    } catch (error) {
      console.error("Error in handleAssignTask:", error);
      return false;
    }
    setIsAssignmentModalOpen(false);
  };

  return (
    <>
      <style>
        {`
          @keyframes ripple {
            0% {
              transform: scale(0);
              opacity: 1;
            }
            100% {
              transform: scale(20);
              opacity: 0;
            }
          }

          .shadow-neumorphism {
            box-shadow: 8px 8px 16px #d1d9e6, -8px -8px 16px #ffffff;
          }
        `}
      </style>
      <div className="flex gap-6">
        {columns.map((column) => (
          <div
            key={column.id}
            className="relative w-80 bg-gray-50 rounded-lg p-4 overflow-hidden"
            onDragOver={(e) => handleColumnDragOver(e, column.id)}
            onDrop={(e) => handleDrop(e, column.id)}
            onDragLeave={handleDragLeave}
            onDoubleClick={(e) => handleColumnDoubleClick(e, column.id)}
          >
            {/* Render ripples for this column */}
            {ripples
              .filter((r) => r.columnId === column.id)
              .map((ripple) => (
                <RippleEffect
                  key={ripple.id}
                  x={ripple.x}
                  y={ripple.y}
                  onAnimationEnd={() => removeRipple(ripple.id)}
                />
              ))}

            <h2 className="font-semibold mb-4 text-gray-700">
              {column.title} ({column.tasks.length})
            </h2>

            <div className="space-y-2 min-h-[50px]">
              {isFreshBoard && column.tasks.length === 0 && (
                <div className="text-center text-gray-500 py-4">
                  No tasks yet. Start by adding a new task!
                </div>
              )}
              {column.tasks.map((task, index) => (
                <div
                  key={task.id}
                  className={`relative transition-transform duration-200 ease-in-out mb-2`}
                  style={{ zIndex: column.tasks.length - index }}
                  onDragOver={(e) => handleDragOver(e, task.id)}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleDrop(e, column.id);
                  }}
                  onDragLeave={handleDragLeave}
                >
                  {dragOverTask === task.id && dragPosition === "top" && (
                    <div className="absolute -top-2 left-0 right-0 h-1 bg-blue-500 rounded-full" />
                  )}
                  <Task
                    {...task}
                    onDragStart={(e) => handleDragStart(e, task.id, column.id)}
                    onDragEnd={handleDragEnd}
                    onAssignClick={() => {
                      setSelectedTask(task);
                      setIsAssignmentModalOpen(true);
                    }}
                    onPriorityChange={handlePriorityChange}
                    onDelete={handleDeleteTask}
                    onUpdate={handleTaskUpdate}
                    className={`transform ${
                      dragOverTask === task.id
                        ? dragPosition === "top"
                          ? "translate-y-3"
                          : "-translate-y-3"
                        : ""
                    }`}
                    isTopCard={index === 0}
                  />
                  {dragOverTask === task.id && dragPosition === "bottom" && (
                    <div className="absolute -bottom-2 left-0 right-0 h-1 bg-blue-500 rounded-full" />
                  )}
                </div>
              ))}
              {dragOverTask === `column-end-${column.id}` && (
                <div
                  className="h-20 border-2 border-blue-500 border-dashed rounded-lg bg-blue-50 transition-all duration-200"
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleDrop(e, column.id);
                  }}
                />
              )}
            </div>
          </div>
        ))}
      </div>

      <TaskAssignmentModal
        isOpen={isAssignmentModalOpen}
        onClose={() => setIsAssignmentModalOpen(false)}
        task={selectedTask}
        onAssign={handleAssignTask}
      />
      <ComboEffect 
        onComboEnd={(comboCount) => {
          if (comboCount >= 5) {
            confetti({
              particleCount: 200,
              spread: 100,
              origin: { y: 0.6 },
            });
          }
        }}
      />
    </>
  );
});

export default Board;
