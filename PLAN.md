# AI Entity Builder — Implementation Plan

## Overview

A modal that lets users describe what they want to build in natural language. Claude Sonnet generates a structured entity hierarchy (goals > projects > milestones > tasks) with optional dates and explanation comments. Users review, edit inline, and approve before committing to their mode.

---

## Phase 1: Backend — AI Django App + Build Endpoint

### 1.1 Create Django app

Create `backend/mulletbackend/ai/` with:
- `__init__.py`
- `views.py`
- `urls.py`
- `prompts.py` (system prompt kept separate for maintainability)

### 1.2 Install dependencies

Add to `backend/requirements.txt`:
```
anthropic>=0.40.0
```

### 1.3 Update settings.py

In `backend/mulletbackend/mulletbackend/settings.py`:
- Add `"ai"` to `INSTALLED_APPS`
- Add `ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")`

### 1.4 Register URLs

In `backend/mulletbackend/mulletbackend/urls.py`, add:
```python
path("api/ai/", include("ai.urls")),
```

### 1.5 Build endpoint — `POST /api/ai/build/`

**File: `ai/views.py`** — `AiBuildView(APIView)`

Input:
```json
{
  "prompt": "I need to redesign the landing page and launch by April 15th",
  "modeId": 5,
  "history": [
    { "role": "user", "content": "previous prompt..." },
    { "role": "assistant", "content": "{...previous JSON...}" }
  ]
}
```

Logic:
- Validate modeId belongs to user (or user is collaborator)
- Build messages array: system prompt + history + new user prompt
- Call `anthropic.Anthropic().messages.create()` with model `claude-sonnet-4-6`, max_tokens ~4096
- Parse the JSON from Claude's response
- Return it to the frontend

Output (the AI's JSON schema):
```json
{
  "summary": "Created a landing page redesign plan with 3 phases",
  "nodes": [
    {
      "tempId": "goal_1",
      "type": "goal",
      "title": "Landing Page Redesign",
      "description": "Redesign the company landing page for better conversion",
      "comment": "This goal covers the full redesign lifecycle from wireframes to deployment.",
      "dueDate": null,
      "parentTempId": null,
      "children": [
        {
          "tempId": "project_1",
          "type": "project",
          "title": "Design Phase",
          "description": null,
          "comment": "All design work before development begins.",
          "dueDate": null,
          "parentTempId": "goal_1",
          "children": [
            {
              "tempId": "milestone_1",
              "type": "milestone",
              "title": "Wireframes",
              "description": null,
              "comment": "Low-fidelity layouts to validate structure before visual design.",
              "dueDate": null,
              "parentTempId": "project_1",
              "children": [
                {
                  "tempId": "task_1",
                  "type": "task",
                  "title": "Audit current page",
                  "description": null,
                  "comment": null,
                  "dueDate": "2026-03-03",
                  "parentTempId": "milestone_1",
                  "children": []
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

Key rules for the JSON schema:
- `tempId`: string ID for referencing in the tree (e.g., "goal_1", "project_2")
- `type`: one of "goal", "project", "milestone", "task"
- `parentTempId`: references the parent node's tempId (null for top-level goals)
- `comment`: optional explanation of what this entity is for (created as a Comment on commit)
- `dueDate`: optional "YYYY-MM-DD" string
- `children`: nested array of child nodes
- Hierarchy must respect: goal > project > milestone > task (no skipping levels or invalid parent types)

### 1.6 System prompt

**File: `ai/prompts.py`**

The system prompt will:
- Define the role: "You are an entity builder for a productivity app"
- Specify the entity hierarchy rules (goal > project > milestone > task)
- Define the exact JSON schema with field descriptions
- Constrain: only generate entities, no conversation, no questions, no markdown — pure JSON
- Instruct on date handling: work backward from deadlines, use YYYY-MM-DD, omit dates if not mentioned
- Instruct on comments: brief explanations of purpose, not generic filler
- Include today's date for context

---

## Phase 2: Backend — Commit Endpoint

### 2.1 Commit endpoint — `POST /api/ai/commit/`

**File: `ai/views.py`** — `AiCommitView(APIView)`

Input:
```json
{
  "modeId": 5,
  "nodes": [ ...same tree structure as build output, possibly user-edited... ]
}
```

Logic (all in `transaction.atomic()`):
1. Validate modeId access
2. Flatten the tree into an ordered list (BFS/DFS — parents before children)
3. Create a `temp_id_map = {}` to track tempId → real database ID
4. For each node in order:
   - Determine the parent field based on type:
     - goal: no parent FK needed (just modeId)
     - project: set `goal_id` from parent's real ID (via temp_id_map)
     - milestone: set `project_id` or `goal_id` from parent
     - task: set `milestone_id`, `project_id`, or `goal_id` from parent
   - Create the entity using the existing model (Goal/Project/Milestone/Task)
   - Set `user=request.user`, `mode_id=modeId`, `is_completed=False`
   - Store `temp_id_map[node.tempId] = created_entity.id`
   - If node has a `comment`, create a Comment via GenericForeignKey:
     - `user=request.user`
     - `mode_id=modeId`
     - `content_type` = ContentType for the entity model
     - `object_id` = created entity ID
     - `body` = the comment text
5. Return `{ "created": { "goals": N, "projects": N, "milestones": N, "tasks": N } }`

### 2.2 URLs

**File: `ai/urls.py`**
```python
urlpatterns = [
    path("build/", AiBuildView.as_view(), name="ai-build"),
    path("commit/", AiCommitView.as_view(), name="ai-commit"),
]
```

---

## Phase 3: Frontend — Types & Hooks

### 3.1 Types

**New file: `packages/shared/types/AiBuilder.ts`**

```typescript
export type BuilderNodeType = "goal" | "project" | "milestone" | "task";

export type BuilderNode = {
  tempId: string;
  type: BuilderNodeType;
  title: string;
  description: string | null;
  comment: string | null;
  dueDate: string | null;
  parentTempId: string | null;
  children: BuilderNode[];
  included: boolean;  // frontend-only: checkbox state
};

export type AiBuildRequest = {
  prompt: string;
  modeId: number;
  history: { role: "user" | "assistant"; content: string }[];
};

export type AiBuildResponse = {
  summary: string;
  nodes: BuilderNode[];
};

export type AiCommitRequest = {
  modeId: number;
  nodes: BuilderNode[];
};

export type AiCommitResponse = {
  created: {
    goals: number;
    projects: number;
    milestones: number;
    tasks: number;
  };
};
```

### 3.2 Hooks

**New file: `packages/shared/api/hooks/ai/useAiBuild.ts`**

- `useMutation` calling `POST /ai/build/` via the shared axios instance
- Returns `AiBuildResponse`

**New file: `packages/shared/api/hooks/ai/useAiCommit.ts`**

- `useMutation` calling `POST /ai/commit/`
- On success: invalidate query keys `["goals"]`, `["projects"]`, `["milestones"]`, `["tasks"]`, `["comments"]`
- Returns `AiCommitResponse`

---

## Phase 4: Frontend — Dialog Integration

### 4.1 Update useDialogStore

**Modify: `apps/web/src/lib/dialogs/useDialogStore.ts`**

Add to the store:
```typescript
// AI Builder
isAiBuilderOpen: boolean;
setIsAiBuilderOpen: (open: boolean) => void;
```

### 4.2 Update DialogManager

**Modify: `apps/web/src/components/dialogs/DialogManager.tsx`**

Add conditional render for AiBuilderModal when `isAiBuilderOpen` is true.

### 4.3 Trigger button

**Modify: `apps/web/src/app/dashboard/DashboardPage.tsx`**

Add a sparkle/AI button (fixed position or in the mode header area) that calls `setIsAiBuilderOpen(true)`. Only visible when a specific mode is selected (not "All").

---

## Phase 5: Frontend — AI Builder Modal

### 5.1 Component structure

**New file: `apps/web/src/components/ai/AiBuilderModal.tsx`**

The modal contains:

**Header:**
- Title "AI Builder" + close button
- Styled with the active mode's colour

**Input area (top):**
- Text input with placeholder "Describe what you want to build..."
- Send button (or Enter to submit)
- Disabled while generating

**Command log (middle, compact):**
- Shows previous prompts and AI summaries as a scrollable list
- Each entry: user prompt text + AI summary text (one line each)
- Not a chat UI — more like a command history

**Entity tree (main area):**
- Rendered as an indented tree with connecting lines
- Each node shows:
  - Checkbox (include/exclude from commit)
  - Type icon (target for goal, folder for project, flag for milestone, check-square for task)
  - Title (click to edit inline)
  - Date chip (click to open date picker, X to remove)
  - Info icon (hover/click to see explanation comment in a tooltip/popover)
- Indentation based on depth
- Excluded nodes are greyed out, children auto-excluded

**Footer:**
- "Add to mode" button — calls useAiCommit with included nodes only
- Shows count: "Will create X goals, X projects, X milestones, X tasks"
- Disabled if nothing is included or while generating
- After commit: shows success message, closes modal

### 5.2 State management (local to component)

```typescript
const [prompt, setPrompt] = useState("");
const [nodes, setNodes] = useState<BuilderNode[]>([]);
const [history, setHistory] = useState<{role, content}[]>([]);
const [commandLog, setCommandLog] = useState<{prompt: string, summary: string}[]>([]);
```

Flow:
1. User types prompt, hits send
2. Call useAiBuild with { prompt, modeId, history }
3. On success: set nodes from response, append to history (user prompt + assistant JSON), append to commandLog
4. User edits tree (local state mutations)
5. User clicks "Add to mode"
6. Filter tree to included nodes only
7. Call useAiCommit with { modeId, nodes: filteredNodes }
8. On success: invalidate queries, close modal

### 5.3 Tree editing helpers

Utility functions for the tree (can live in a `useBuilderTree` hook or utils file):
- `toggleNode(tempId)` — toggle included state, cascade to children
- `renameNode(tempId, newTitle)` — update title
- `setNodeDate(tempId, date)` — set/clear dueDate
- `removeNode(tempId)` — remove from tree entirely
- `countIncluded(nodes)` — count by type for the footer summary

---

## File Summary

### New files (8):
1. `backend/mulletbackend/ai/__init__.py`
2. `backend/mulletbackend/ai/views.py` — AiBuildView + AiCommitView
3. `backend/mulletbackend/ai/urls.py` — URL patterns
4. `backend/mulletbackend/ai/prompts.py` — System prompt
5. `packages/shared/types/AiBuilder.ts` — TypeScript types
6. `packages/shared/api/hooks/ai/useAiBuild.ts` — Build mutation hook
7. `packages/shared/api/hooks/ai/useAiCommit.ts` — Commit mutation hook
8. `apps/web/src/components/ai/AiBuilderModal.tsx` — Modal component

### Modified files (4):
1. `backend/requirements.txt` — add anthropic
2. `backend/mulletbackend/mulletbackend/settings.py` — INSTALLED_APPS + API key
3. `backend/mulletbackend/mulletbackend/urls.py` — add ai URLs
4. `apps/web/src/lib/dialogs/useDialogStore.ts` — add AI builder state
5. `apps/web/src/components/dialogs/DialogManager.tsx` — render AI builder
6. `apps/web/src/app/dashboard/DashboardPage.tsx` — trigger button
