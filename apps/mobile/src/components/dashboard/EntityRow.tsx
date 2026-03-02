import React from "react";
import type { DashboardRow } from "../../hooks/useBuildDashboardRows";
import SectionHeader from "./rows/SectionHeader";
import GoalRow from "./rows/GoalRow";
import ProjectRow from "./rows/ProjectRow";
import MilestoneRow from "./rows/MilestoneRow";
import TaskRow from "./rows/TaskRow";

type Props = { row: DashboardRow };

function EntityRow({ row }: Props) {
  switch (row.entityType) {
    case "section-header":
      return <SectionHeader row={row} />;
    case "goal":
      return <GoalRow row={row} />;
    case "project":
      return <ProjectRow row={row} />;
    case "milestone":
      return <MilestoneRow row={row} />;
    case "task":
      return <TaskRow row={row} />;
    default:
      return null;
  }
}

export default React.memo(EntityRow);
