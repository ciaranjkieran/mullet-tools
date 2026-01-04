"use client";

import CustomDateInput from "@/lib/utils/CustomDateInput";
import { startOfToday, addDays, parseISO, isBefore } from "date-fns";

type Props = {
  dueDate: string;
  setDueDate: (val: string) => void;
  showPostpone: boolean; // parent decides if "postpone" should be shown
};

export default function DueDateInput({
  dueDate,
  setDueDate,
  showPostpone = false,
}: Props) {
  const today = startOfToday();
  const todayStr = today.toLocaleDateString("en-CA");

  const getNextMonday = () => {
    const day = today.getDay();
    const daysUntilNextMonday = (8 - day) % 7 || 7;
    return addDays(today, daysUntilNextMonday).toLocaleDateString("en-CA");
  };

  const isOverdue = !!dueDate && isBefore(parseISO(dueDate), today); // due < today

  return (
    <div>
      <label className="block text-base font-medium mb-2">Due Date</label>
      <CustomDateInput value={dueDate} onChange={setDueDate} />
      <div className="mt-2 flex justify-between">
        {(!dueDate || isOverdue) && (
          <button
            type="button"
            onClick={() => setDueDate(todayStr)}
            className="text-sm font-semibold text-blue-700 hover:underline"
          >
            Set to today →
          </button>
        )}
        {showPostpone && (
          <button
            type="button"
            onClick={() => setDueDate(getNextMonday())}
            className="text-sm font-semibold text-blue-700 hover:underline"
          >
            Postpone to next week →
          </button>
        )}
      </div>
    </div>
  );
}
