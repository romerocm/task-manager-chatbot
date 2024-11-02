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

  const handleDragStart = (e, taskId) => {
    e.dataTransfer.setData("taskId", taskId);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = async (e, columnId) => {
    const taskId = e.dataTransfer.getData("taskId");

    try {
      const response = await fetch(`/api/tasks/${taskId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: columnId }),
      });

      if (response.ok) {
        await fetchTasks();
      }
    } catch (error) {
      console.error("Error updating task status:", error);
    }
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
          await fetchTasks();
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
        // Update the local state immediately for better UX
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
      await ref.current.assignTask(taskId, user);
    } catch (error) {
      console.error("Error in handleAssignTask:", error);
    }
    setIsAssignmentModalOpen(false);
  };

  // Handle task deletion
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
        // Update the local state immediately for better UX
        setColumns((prevColumns) =>
          prevColumns.map((column) => ({
            ...column,
            tasks: column.tasks.filter((task) => task.id !== taskId),
          }))
        );
        // Fetch the updated task list to ensure synchronization
        await fetchTasks();
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
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, column.id)}
          >
            <h2 className="font-semibold mb-4 text-gray-700">
              {column.title} ({column.tasks.length})
            </h2>
            <div className="space-y-2">
              {column.tasks.map((task) => (
                <Task
                  key={task.id}
                  {...task}
                  onDragStart={handleDragStart}
                  onAssignClick={() => {
                    setSelectedTask(task);
                    setIsAssignmentModalOpen(true);
                  }}
                  onPriorityChange={handlePriorityChange}
                  onDelete={handleDeleteTask}
                  onUpdate={handleTaskUpdate}
                />
              ))}
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
