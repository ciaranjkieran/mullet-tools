# timers/services/stats_tree.py

from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Dict, List, Literal, Optional

import logging

from django.db.models import Min
from django.utils import timezone

from core.models import Goal, Project, Milestone, Task
from .models import TimeEntry

log = logging.getLogger("timer.stats")

Kind = Literal["goal", "project", "milestone", "task"]


@dataclass
class StatsNode:
    id: int
    title: str
    selfSeconds: int = 0        # time logged *directly* on this entity
    seconds: int = 0            # total time including children
    # children
    goals: List["StatsNode"] | None = None
    projects: List["StatsNode"] | None = None
    milestones: List["StatsNode"] | None = None
    tasks: List["StatsNode"] | None = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "title": self.title,
            "selfSeconds": self.selfSeconds,
            "seconds": self.seconds,
            "goals": [c.to_dict() for c in (self.goals or [])],
            "projects": [c.to_dict() for c in (self.projects or [])],
            "milestones": [c.to_dict() for c in (self.milestones or [])],
            "tasks": [c.to_dict() for c in (self.tasks or [])],
        }


def _title_for_goal(g: Goal) -> str:
    return g.title or ""


def _title_for_project(p: Project) -> str:
    return p.title or ""


def _title_for_milestone(m: Milestone) -> str:
    return m.title or ""


def _title_for_task(t: Task) -> str:
    return t.title or ""


def build_stats_tree(*, user, mode_id: int, from_dt: datetime, to_dt: datetime) -> Dict[str, Any]:
    """
    Core stats aggregator for a single Mode over a date range [from_dt, to_dt).

    (Only change vs original: TimeEntry queries are user-scoped.)
    """

    # --------------------------------------------------------------
    # -1) Compute all-time bounds for this mode (independent of window)
    # --------------------------------------------------------------
    bounds = TimeEntry.objects.filter(user=user, mode_id=mode_id).aggregate(  # ✅ changed
        first_started=Min("started_at")
    )
    first_started = bounds["first_started"]

    if first_started:
        first_date_iso = first_started.date().isoformat()
    else:
        # If no entries at all for this mode, fall back to "today"
        first_date_iso = timezone.localdate().isoformat()

    # "To present" – your spec is "first time collection to present"
    last_date_iso = timezone.localdate().isoformat()

    log.info(
        "[build_stats_tree] bounds mode_id=%s firstDate=%s lastDate=%s from_dt=%s to_dt=%s",
        mode_id,
        first_date_iso,
        last_date_iso,
        from_dt.isoformat(),
        to_dt.isoformat(),
    )

    # --------------------------------------------------------------
    # 0) Fetch entries in this mode & date window
    # --------------------------------------------------------------
    entries: List[TimeEntry] = list(
        TimeEntry.objects.filter(
            user=user,                 # ✅ changed
            mode_id=mode_id,
            started_at__gte=from_dt,
            started_at__lt=to_dt,
        ).only(
            "id",
            "seconds",
            "mode_id",
            "goal_id",
            "project_id",
            "milestone_id",
            "task_id",
        )
    )
    entry_ids = [e.id for e in entries]
    log.info(
        "[build_stats_tree] fetched %d entries for mode_id=%s (ids=%s)",
        len(entries),
        mode_id,
        entry_ids,
    )

    # If no entries for this *window*, still return bounds so "All time" works.
    if not entries:
        log.info(
            "[build_stats_tree] no entries in window → returning empty tree for mode_id=%s",
            mode_id,
        )
        return {
            "modeId": mode_id,
            "selfSeconds": 0,
            "seconds": 0,
            "goals": [],
            "projects": [],
            "milestones": [],
            "tasks": [],
            # 🔹 all-time bounds (for frontend All-time button)
            "firstDate": first_date_iso,
            "lastDate": last_date_iso,
        }

    # --------------------------------------------------------------
    # 1) Allocate raw selfSeconds to deepest entity in each path
    # --------------------------------------------------------------
    goal_self: Dict[int, int] = defaultdict(int)
    project_self: Dict[int, int] = defaultdict(int)
    milestone_self: Dict[int, int] = defaultdict(int)
    task_self: Dict[int, int] = defaultdict(int)
    mode_self: int = 0  # entries that only know about the Mode

    goal_ids: set[int] = set()
    project_ids: set[int] = set()
    milestone_ids: set[int] = set()
    task_ids: set[int] = set()

    skipped_zero = 0

    for e in entries:
        seconds = e.seconds or 0
        if seconds <= 0:
            skipped_zero += 1
            continue

        # deepest allocation
        if e.task_id:
            task_self[e.task_id] += seconds
            task_ids.add(e.task_id)
        elif e.milestone_id:
            milestone_self[e.milestone_id] += seconds
            milestone_ids.add(e.milestone_id)
        elif e.project_id:
            project_self[e.project_id] += seconds
            project_ids.add(e.project_id)
        elif e.goal_id:
            goal_self[e.goal_id] += seconds
            goal_ids.add(e.goal_id)
        else:
            mode_self += seconds

        # Also track any ancestors that appear on entries,
        # even if they aren't the deepest:
        if e.goal_id:
            goal_ids.add(e.goal_id)
        if e.project_id:
            project_ids.add(e.project_id)
        if e.milestone_id:
            milestone_ids.add(e.milestone_id)

    log.info(
        "[build_stats_tree] allocation summary: mode_self=%s "
        "goal_self_ids=%s project_self_ids=%s milestone_self_ids=%s "
        "task_self_ids=%s skipped_zero=%s",
        mode_self,
        sorted(goal_self.keys()),
        sorted(project_self.keys()),
        sorted(milestone_self.keys()),
        sorted(task_self.keys()),
        skipped_zero,
    )

    # --------------------------------------------------------------
    # 2) Fetch entities via .all_objects so archived still appear
    #    FIRST PASS – based only on ids we saw on entries
    # --------------------------------------------------------------
    goals_by_id: Dict[int, Goal] = {
        g.id: g
        for g in Goal.all_objects.filter(user=user, id__in=goal_ids, mode_id=mode_id)
    }

    projects_by_id: Dict[int, Project] = {
        p.id: p
        for p in Project.all_objects.filter(user=user, id__in=project_ids, mode_id=mode_id)
    }

    milestones_by_id: Dict[int, Milestone] = {
        m.id: m
        for m in Milestone.all_objects.filter(user=user, id__in=milestone_ids, mode_id=mode_id)
    }

    tasks_by_id: Dict[int, Task] = {
        t.id: t
        for t in Task.all_objects.filter(user=user, id__in=task_ids, mode_id=mode_id)
    }


    log.info(
        "[build_stats_tree] entity fetch (first pass): goals=%d projects=%d milestones=%d tasks=%d",
        len(goals_by_id),
        len(projects_by_id),
        len(milestones_by_id),
        len(tasks_by_id),
    )

    # --------------------------------------------------------------
    # 2b) Expand ancestor sets based on the entities we just loaded.
    # --------------------------------------------------------------
    changed = True
    while changed:
        changed = False

        goals_by_id = {
            g.id: g
            for g in Goal.all_objects.filter(user=user, id__in=goal_ids, mode_id=mode_id)
        }
        projects_by_id = {
            p.id: p
            for p in Project.all_objects.filter(user=user, id__in=project_ids, mode_id=mode_id)
        }
        milestones_by_id = {
            m.id: m
            for m in Milestone.all_objects.filter(user=user, id__in=milestone_ids, mode_id=mode_id)
        }


        for p in projects_by_id.values():
            if p.parent_id and p.parent_id not in project_ids:
                project_ids.add(p.parent_id)
                changed = True
            if p.goal_id and p.goal_id not in goal_ids:
                goal_ids.add(p.goal_id)
                changed = True

        for m in milestones_by_id.values():
            if m.parent_id and m.parent_id not in milestone_ids:
                milestone_ids.add(m.parent_id)
                changed = True
            if m.project_id and m.project_id not in project_ids:
                project_ids.add(m.project_id)
                changed = True
            if m.goal_id and m.goal_id not in goal_ids:
                goal_ids.add(m.goal_id)
                changed = True

    log.info(
        "[build_stats_tree] entity fetch (after expansion): goals=%d projects=%d milestones=%d tasks=%d",
        len(goals_by_id),
        len(projects_by_id),
        len(milestones_by_id),
        len(tasks_by_id),
    )

    # --------------------------------------------------------------
    # 3) Build adjacency maps: parent → [children ids]
    # --------------------------------------------------------------
    project_children_by_goal: Dict[int, List[int]] = defaultdict(list)
    project_children_by_project: Dict[int, List[int]] = defaultdict(list)
    project_top_level: List[int] = []

    for p in projects_by_id.values():
        if p.parent_id and p.parent_id in projects_by_id:
            project_children_by_project[p.parent_id].append(p.id)
        elif p.goal_id and p.goal_id in goals_by_id:
            project_children_by_goal[p.goal_id].append(p.id)
        else:
            project_top_level.append(p.id)

    milestone_children_by_goal: Dict[int, List[int]] = defaultdict(list)
    milestone_children_by_project: Dict[int, List[int]] = defaultdict(list)
    milestone_children_by_milestone: Dict[int, List[int]] = defaultdict(list)
    milestone_top_level: List[int] = []

    for m in milestones_by_id.values():
        if m.parent_id and m.parent_id in milestones_by_id:
            milestone_children_by_milestone[m.parent_id].append(m.id)
        elif m.project_id and m.project_id in projects_by_id:
            milestone_children_by_project[m.project_id].append(m.id)
        elif m.goal_id and m.goal_id in goals_by_id:
            milestone_children_by_goal[m.goal_id].append(m.id)
        else:
            milestone_top_level.append(m.id)

    task_children_by_milestone: Dict[int, List[int]] = defaultdict(list)
    task_children_by_project: Dict[int, List[int]] = defaultdict(list)
    task_children_by_goal: Dict[int, List[int]] = defaultdict(list)
    task_top_level: List[int] = []

    for t in tasks_by_id.values():
        if t.milestone_id and t.milestone_id in milestones_by_id:
            task_children_by_milestone[t.milestone_id].append(t.id)
        elif t.project_id and t.project_id in projects_by_id:
            task_children_by_project[t.project_id].append(t.id)
        elif t.goal_id and t.goal_id in goals_by_id:
            task_children_by_goal[t.goal_id].append(t.id)
        else:
            task_top_level.append(t.id)

    log.info(
        "[build_stats_tree] adjacency: project_top_level=%s "
        "milestone_top_level=%s task_top_level=%s",
        project_top_level,
        milestone_top_level,
        task_top_level,
    )

    # --------------------------------------------------------------
    # 4) Recursive builders
    # --------------------------------------------------------------
    def build_task_node(task_id: int) -> Optional[StatsNode]:
        t = tasks_by_id.get(task_id)
        if not t:
            return None
        self_sec = task_self.get(task_id, 0)
        if self_sec <= 0:
            return None
        return StatsNode(
            id=t.id,
            title=_title_for_task(t),
            selfSeconds=self_sec,
            seconds=self_sec,
            goals=[],
            projects=[],
            milestones=[],
            tasks=[],
        )

    def build_milestone_node(milestone_id: int) -> Optional[StatsNode]:
        m = milestones_by_id.get(milestone_id)
        if not m:
            return None

        self_sec = milestone_self.get(milestone_id, 0)
        node = StatsNode(
            id=m.id,
            title=_title_for_milestone(m),
            selfSeconds=self_sec,
            seconds=0,
            goals=[],
            projects=[],
            milestones=[],
            tasks=[],
        )

        children_milestones: List[StatsNode] = []
        for child_id in milestone_children_by_milestone.get(m.id, []):
            child_node = build_milestone_node(child_id)
            if child_node and child_node.seconds > 0:
                children_milestones.append(child_node)

        children_tasks: List[StatsNode] = []
        for task_id in task_children_by_milestone.get(m.id, []):
            task_node = build_task_node(task_id)
            if task_node and task_node.seconds > 0:
                children_tasks.append(task_node)

        node.milestones = children_milestones
        node.tasks = children_tasks

        total = self_sec
        total += sum(c.seconds for c in children_milestones)
        total += sum(c.seconds for c in children_tasks)
        node.seconds = total

        if total <= 0:
            return None
        return node

    def build_project_node(project_id: int) -> Optional[StatsNode]:
        p = projects_by_id.get(project_id)
        if not p:
            return None

        self_sec = project_self.get(project_id, 0)
        node = StatsNode(
            id=p.id,
            title=_title_for_project(p),
            selfSeconds=self_sec,
            seconds=0,
            goals=[],
            projects=[],
            milestones=[],
            tasks=[],
        )

        children_projects: List[StatsNode] = []
        for child_id in project_children_by_project.get(p.id, []):
            child_node = build_project_node(child_id)
            if child_node and child_node.seconds > 0:
                children_projects.append(child_node)

        children_milestones: List[StatsNode] = []
        for m_id in milestone_children_by_project.get(p.id, []):
            child_node = build_milestone_node(m_id)
            if child_node and child_node.seconds > 0:
                children_milestones.append(child_node)

        children_tasks: List[StatsNode] = []
        for t_id in task_children_by_project.get(p.id, []):
            child_node = build_task_node(t_id)
            if child_node and child_node.seconds > 0:
                children_tasks.append(child_node)

        node.projects = children_projects
        node.milestones = children_milestones
        node.tasks = children_tasks

        total = self_sec
        total += sum(c.seconds for c in children_projects)
        total += sum(c.seconds for c in children_milestones)
        total += sum(c.seconds for c in children_tasks)
        node.seconds = total

        if total <= 0:
            return None
        return node

    def build_goal_node(goal_id: int) -> Optional[StatsNode]:
        g = goals_by_id.get(goal_id)
        if not g:
            return None

        self_sec = goal_self.get(goal_id, 0)
        node = StatsNode(
            id=g.id,
            title=_title_for_goal(g),
            selfSeconds=self_sec,
            seconds=0,
            goals=[],
            projects=[],
            milestones=[],
            tasks=[],
        )

        children_projects: List[StatsNode] = []
        for p_id in project_children_by_goal.get(g.id, []):
            p_node = build_project_node(p_id)
            if p_node and p_node.seconds > 0:
                children_projects.append(p_node)

        children_milestones: List[StatsNode] = []
        for m_id in milestone_children_by_goal.get(g.id, []):
            m_node = build_milestone_node(m_id)
            if m_node and m_node.seconds > 0:
                children_milestones.append(m_node)

        children_tasks: List[StatsNode] = []
        for t_id in task_children_by_goal.get(g.id, []):
            t_node = build_task_node(t_id)
            if t_node and t_node.seconds > 0:
                children_tasks.append(t_node)

        node.projects = children_projects
        node.milestones = children_milestones
        node.tasks = children_tasks

        total = self_sec
        total += sum(c.seconds for c in children_projects)
        total += sum(c.seconds for c in children_milestones)
        total += sum(c.seconds for c in children_tasks)
        node.seconds = total

        if total <= 0:
            return None
        return node

    # --------------------------------------------------------------
    # 5) Build top-level collections for this mode
    # --------------------------------------------------------------
    goal_nodes: List[StatsNode] = []
    for g_id, g in goals_by_id.items():
        if g.mode_id != mode_id:
            continue
        node = build_goal_node(g_id)
        if node and node.seconds > 0:
            goal_nodes.append(node)

    top_level_project_nodes: List[StatsNode] = []
    for p_id in project_top_level:
        node = build_project_node(p_id)
        if node and node.seconds > 0:
            top_level_project_nodes.append(node)

    top_level_milestone_nodes: List[StatsNode] = []
    for m_id in milestone_top_level:
        node = build_milestone_node(m_id)
        if node and node.seconds > 0:
            top_level_milestone_nodes.append(node)

    top_level_task_nodes: List[StatsNode] = []
    for t_id in task_top_level:
        node = build_task_node(t_id)
        if node and node.seconds > 0:
            top_level_task_nodes.append(node)

    mode_total_seconds = mode_self
    mode_total_seconds += sum(g.seconds for g in goal_nodes)
    mode_total_seconds += sum(p.seconds for p in top_level_project_nodes)
    mode_total_seconds += sum(m.seconds for m in top_level_milestone_nodes)
    mode_total_seconds += sum(t.seconds for t in top_level_task_nodes)

    log.info(
        "[build_stats_tree] DONE mode_id=%s total_seconds=%s "
        "goals=%d top_projects=%d top_milestones=%d top_tasks=%d",
        mode_id,
        mode_total_seconds,
        len(goal_nodes),
        len(top_level_project_nodes),
        len(top_level_milestone_nodes),
        len(top_level_task_nodes),
    )

    return {
        "modeId": mode_id,
        "selfSeconds": mode_self,
        "seconds": mode_total_seconds,
        "goals": [g.to_dict() for g in goal_nodes],
        "projects": [p.to_dict() for p in top_level_project_nodes],
        "milestones": [m.to_dict() for m in top_level_milestone_nodes],
        "tasks": [t.to_dict() for t in top_level_task_nodes],
        "firstDate": first_date_iso,
        "lastDate": last_date_iso,
    }
