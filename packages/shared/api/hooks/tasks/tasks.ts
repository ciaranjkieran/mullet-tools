import api from "../../axios";
import { ensureCsrf } from "../auth/ensureCsrf";

export const fetchTasks = async () => {
  const res = await api.get("/tasks/");
  return res.data;
};

export const createTask = async (task: {
  title: string;
  description?: string;
  modeId: number;
  is_completed?: boolean;
}) => {
  await ensureCsrf();
  const res = await api.post("/tasks/", task);
  return res.data;
};
