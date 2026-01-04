export const fetchTasks = async () => {
  // src/lib/api/tasks.ts

  const res = await fetch("http://127.0.0.1:8000/api/tasks/");

  if (!res.ok) throw new Error("Failed to fetch tasks");
  return res.json();
};

export const createTask = async (task: {
  title: string;
  description?: string;
  modeId: number;
  is_completed?: boolean;
}) => {
  const res = await fetch("http://127.0.0.1:8000/api/tasks/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(task),
  });
  if (!res.ok) throw new Error("Failed to create task");
  return res.json();
};
