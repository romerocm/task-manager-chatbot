import React, { useState, forwardRef, useImperativeHandle } from "react";
import Task from "./Task";

const Board = forwardRef((props, ref) => {
  const [columns, setColumns] = useState([
    { id: "todo", title: "To Do", tasks: [] },
    { id: "inProgress", title: "In Progress", tasks: [] },
    { id: "done", title: "Done", tasks: [] },
  ]);

  useImperativeHandle(ref, () => ({
    addTasks: (newTasks) => {
      setColumns(
        columns.map((column) => {
          if (column.id === "todo") {
            return {
              ...column,
              tasks: [
                ...column.tasks,
                ...newTasks.map((task) => ({
                  ...task,
                  id: Date.now() + Math.random(),
                  status: "todo",
                })),
              ],
            };
          }
          return column;
        })
      );
    },
  }));

  const handleDragStart = (e, taskId) => {
    e.dataTransfer.setData("taskId", taskId);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e, columnId) => {
    const taskId = e.dataTransfer.getData("taskId");

    let task;
    let sourceColumnId;

    columns.forEach((column) => {
      const foundTask = column.tasks.find((t) => t.id.toString() === taskId);
      if (foundTask) {
        task = foundTask;
        sourceColumnId = column.id;
      }
    });

    if (task && sourceColumnId !== columnId) {
      setColumns(
        columns.map((column) => {
          if (column.id === sourceColumnId) {
            return {
              ...column,
              tasks: column.tasks.filter((t) => t.id.toString() !== taskId),
            };
          }
          if (column.id === columnId) {
            return {
              ...column,
              tasks: [...column.tasks, { ...task, status: columnId }],
            };
          }
          return column;
        })
      );
    }
  };

  return (
    <div className="flex gap-6">
      {columns.map((column) => (
        <div
          key={column.id}
          className="w-80 bg-gray-50 rounded-lg p-4"
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, column.id)}
        >
          <h2 className="font-semibold mb-4 text-gray-700">{column.title}</h2>
          <div className="space-y-2">
            {column.tasks.map((task) => (
              <Task key={task.id} {...task} onDragStart={handleDragStart} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
});

export default Board;
