import React, {
  useState,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from "react";
import Task from "./Task";
import TaskAssignmentModal from "./TaskAssignmentModal";

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

    // Find source and target columns
    const sourceColumn = columns.find((col) => col.id === sourceColumnId);
    const targetColumn = columns.find((col) => col.id === targetColumnId);

    if (!sourceColumn || !targetColumn) return;

    const draggedTaskIndex = sourceColumn.tasks.findIndex(
      (t) => t.id === parseInt(taskId)
    );
    if (draggedTaskIndex === -1) return;

    // Get the dragged task
    const draggedTask = sourceColumn.tasks[draggedTaskIndex];

    // If dropping in the same column, reorder tasks
    if (sourceColumnId === targetColumnId) {
      const tasks = [...sourceColumn.tasks];
      // Remove the dragged task
      tasks.splice(draggedTaskIndex, 1);

      // Determine insert position
      let insertIndex;
      if (!dragOverTask || (typeof dragOverTask === "string" && dragOverTask.startsWith("column-end-"))) {
        // If dropping at the end of a column
        insertIndex = tasks.length;
      } else {
        // Find the target task index for dropping between tasks
        const targetIndex = tasks.findIndex(
          (t) => t.id === parseInt(dragOverTask)
        );
        if (targetIndex > -1) {
          // If dropping on top of a task, place before or after based on drop position
          insertIndex =
            dragPosition === "bottom" ? targetIndex + 1 : targetIndex;
        } else {
          // Fallback to end of list if target not found
          insertIndex = tasks.length;
        }
      }

      // Insert the task at the new position
      tasks.splice(insertIndex, 0, draggedTask);

      // Update local state immediately
      setColumns(
        columns.map((col) =>
          col.id === sourceColumnId ? { ...col, tasks } : col
        )
      );

      // Persist the new order
      await updateTaskPositions(targetColumnId, tasks);
    } else {
      // Moving between columns
      try {
        const sourceTasks = [...sourceColumn.tasks];
        const targetTasks = [...targetColumn.tasks];

        // Remove from source column
        sourceTasks.splice(draggedTaskIndex, 1);

        // Determine target insert position
        let insertIndex;
        if (!dragOverTask || (typeof dragOverTask === "string" && dragOverTask.startsWith("column-end-"))) {
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

        // Insert into target column
        targetTasks.splice(insertIndex, 0, draggedTask);

        // Update task status and position in database
        const response = await fetch(`/api/tasks/${taskId}/status`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: targetColumnId,
            position: insertIndex,
          }),
        });

        if (response.ok) {
          // Update positions in both columns
          await Promise.all([
            updateTaskPositions(sourceColumnId, sourceTasks),
            updateTaskPositions(targetColumnId, targetTasks),
          ]);

          // Update local state
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

  const handleAssignTask = async (taskId, user) => {
    try {
      const success = await ref.current.assignTask(taskId, user);
      if (success) {
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
      }
    } catch (error) {
      console.error("Error in handleAssignTask:", error);
    }
    setIsAssignmentModalOpen(false);
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
        // Find the column containing the deleted task
        const columnWithTask = columns.find((col) =>
          col.tasks.some((task) => task.id === taskId)
        );

        if (columnWithTask) {
          // Get remaining tasks in the column
          const remainingTasks = columnWithTask.tasks.filter(
            (task) => task.id !== taskId
          );
          // Update positions for remaining tasks
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

  return (
    <>
      <div className="flex gap-6">
        {columns.map((column) => (
          <div
            key={column.id}
            className="w-80 bg-gray-50 rounded-lg p-4"
            onDragOver={(e) => handleColumnDragOver(e, column.id)}
            onDrop={(e) => handleDrop(e, column.id)}
            onDragLeave={handleDragLeave}
          >
            <h2 className="font-semibold mb-4 text-gray-700">
              {column.title} ({column.tasks.length})
            </h2>
            <div className="space-y-2 min-h-[50px]">
              {column.tasks.map((task) => (
                <div
                  key={task.id}
                  className={`relative transition-transform duration-200 ease-in-out mb-2`}
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
    </>
  );
});

export default Board;
