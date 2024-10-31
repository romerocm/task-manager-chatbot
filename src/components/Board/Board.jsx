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

  useEffect(() => {
    fetchTasks();
  }, []);

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
    addTasks: async (newTasks) => {
      try {
        const response = await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newTasks),
        });

        const data = await response.json();
        if (data.success) {
          await fetchTasks(); // Refresh all tasks
        }
      } catch (error) {
        console.error("Error adding tasks:", error);
      }
    },
    assignTask: async (taskId, assignee) => {
      try {
        const response = await fetch(`/api/tasks/${taskId}/assign`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ assigneeId: assignee.id }),
        });

        const data = await response.json();
        if (data.success) {
          await fetchTasks(); // Refresh all tasks
        }
      } catch (error) {
        console.error("Error assigning task:", error);
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
        await fetchTasks(); // Refresh tasks after status update
      }
    } catch (error) {
      console.error("Error updating task status:", error);
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
        onAssign={async (taskId, assignee) => {
          await ref.current.assignTask(taskId, assignee);
          setIsAssignmentModalOpen(false);
        }}
      />
    </>
  );
});

export default Board;
