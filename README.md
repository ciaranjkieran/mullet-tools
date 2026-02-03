# Mullet

A hierarchical productivity platform that combines task management, time tracking, and analytics in one cohesive system.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/React-18.x-61dafb.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6.svg)
![Django](https://img.shields.io/badge/Django-4.x-092e20.svg)

## Overview

Mullet helps you organize work across custom contexts (Modes), break down high-level goals into actionable hierarchies, and track exactly where your time goes. Whether you're managing client projects, personal goals, or fitness routines, Mullet adapts to your workflow.

### Key Features

- **🗂️ Hierarchical Planning** – Organize tasks in a four-level structure: Mode → Goal → Project/Milestone → Task
- **⏱️ Integrated Timer** – Built-in stopwatch and countdown timer with session persistence and resume-from-entry
- **📊 Analytics Dashboard** – Visual time breakdown with drill-down, date filtering, and hierarchical attribution
- **🤝 Collaboration Tools** – Comments, notes, and file attachments per entity
- **📅 Dual Views** – List-based dashboard with collapsible trees and calendar view with drag-and-drop
- **📋 Templates** – Reusable project and milestone templates for repeatable workflows
- **⚡ Batch Operations** – Multi-select and bulk-edit tasks, projects, milestones, and goals
- **📱 Responsive Design** – Mobile-first UI with touch-optimized interactions

## Architecture

### Frontend
- **Framework:** React 18 + Next.js 14 (App Router)
- **Language:** TypeScript 
- **State Management:** Zustand (global state), React Query (server state)
- **Styling:** Tailwind CSS
- **UI Components:** Radix UI primitives
- **Drag & Drop:** DnD Kit
- **Charts:** Recharts
- **Date Handling:** date-fns

### Backend
- **Framework:** Django REST Framework
- **Database:** PostgreSQL
- **Authentication:** Token-based auth

## Core Concepts

### Modes
Contexts for your work (e.g., Work, Personal, Fitness). Each mode has its own color and contains all other entities.

### Goals
High-level objectives within a mode. Goals can contain projects, milestones, and tasks.

### Projects
Major initiatives that can contain milestones and tasks. Projects support nesting (sub-projects).

### Milestones
Significant waypoints within projects or goals. Milestones support nesting and can contain tasks.

### Tasks
Actionable items. Tasks can be standalone or nested under milestones, projects, or goals.

## Key Technical Features

### Hierarchical Data Model
- **Transitive Lineage Resolution:** Automatic parent-child relationship inference
- **Effective Lineage Helpers:** Climb ancestry chains to derive missing parents
- **Smart Cascading:** Forms automatically validate and reconcile parent-child selections

### Timer System
- **Dual Modes:** Stopwatch (open-ended) and Timer (countdown with alert)
- **Session Persistence:** Timer state survives page refresh via localStorage
- **Per-Mode Snapshots:** Each mode remembers its last timer selection
- **Resume-from-Entry:** Click any past session to resume with remaining time
- **Live Retargeting:** Switch what you're timing mid-session without stopping

### State Management
- **Optimistic Updates:** UI updates immediately, syncs in background
- **Granular Stores:** Separate Zustand stores for entities, UI state, timer, batch editor
- **React Query Integration:** Server state caching with automatic invalidation
- **Offline-First:** Local mutations persist and sync when connection returns

### Drag & Drop
- **Multi-Context:** Separate DnD implementations for dashboard and calendar
- **Entity-Specific Constraints:** Tasks can't be dragged if scheduled, milestones validate parent relationships
- **Visual Feedback:** Drag overlays show entity type and color

### Stats & Analytics
- **Hierarchical Breakdown:** Time rolls up from tasks → milestones → projects → goals → modes
- **Chain-Up Functionality:** Reassign direct time from child to parent entities
- **Date Filtering:** Today, This Week, This Month, All Time, or custom range
- **Drill-Down Views:** Click any entity to see its time breakdown

## Getting Started

### Prerequisites
- Node.js 18+
- Python 3.10+
- PostgreSQL 14+

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/ciaranjkieran/mullet.git
cd mullet
```

2. **Install frontend dependencies**
```bash
npm install
```

3. **Set up backend** (Django)
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser
```

4. **Configure environment variables**
```bash
# Frontend (.env.local)
NEXT_PUBLIC_API_URL=http://localhost:8000

# Backend (.env)
DATABASE_URL=postgresql://user:password@localhost:5432/mullet
SECRET_KEY=your-secret-key
DEBUG=True
```

5. **Run the development servers**
```bash
# Frontend (in project root)
npm run dev

# Backend (in backend/)
python manage.py runserver
```

Visit `http://localhost:3000` to see the app.

## Usage Examples

### Creating a Hierarchy
1. Create a Mode (e.g., "Client Work")
2. Add a Goal (e.g., "Launch Product")
3. Add a Project under that Goal (e.g., "Website Redesign")
4. Add Milestones to the Project (e.g., "Design Phase", "Development Phase")
5. Add Tasks to each Milestone

### Tracking Time
1. Navigate to the Timer view
2. Select your Mode, Goal, Project, Milestone, or Task
3. Click Start to begin timing
4. When finished, click Stop (or click Complete if done with the entity)
5. View your stats in the Stats view

### Using Templates
1. Create a project or milestone structure you want to reuse
2. Go to Templates view
3. Click "Create Template" and define the structure
4. Later, click "Use Template" to instantiate it with one click

## Development

### Code Quality
- **TypeScript:** Strict mode enabled
- **Linting:** ESLint with React and TypeScript rules
- **Formatting:** Prettier (2-space indent, single quotes, trailing commas)

### Testing
```bash
# Run tests
npm test

# Run with coverage
npm run test:coverage
```

### Building for Production
```bash
# Frontend
npm run build
npm start

# Backend
python manage.py collectstatic
gunicorn config.wsgi:application
```

## Known Issues & Roadmap

### Current Limitations
- Timer controller complexity (~1400 lines) needs refactoring
- Type system has gaps (Task type missing parent ID fields)
- Duplicate Build/Edit form components across entity types
- "All" mode inconsistently supported across views

### Planned Improvements
- [ ] Consolidate Build/Edit forms to single components
- [ ] Decompose timer controller into focused hooks
- [ ] Fix Task type to include goalId, projectId, milestoneId
- [ ] Standardize store interfaces (consistent byId vs tasksById)
- [ ] Add keyboard shortcuts for power users
- [ ] Implement recurring tasks
- [ ] Add subtasks
- [ ] Mobile app (React Native)

See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines.

## Tech Debt & Refactoring Notes

This project grew organically and has some areas that need cleanup:

1. **Timer System:** `useTimerController` is 1440 lines and manages too many concerns
2. **Form Duplication:** BuildTaskForm and EditTaskForm are 80% identical (same for other entities)
3. **Type Safety:** 19 `as any` casts in timer code due to incomplete Task type
4. **Store Consistency:** BatchEditorWindow has defensive type casting due to inconsistent store shapes
5. **Data Flow:** Hybrid pattern of props drilling + direct store access across components

These are documented in detail in the codebase review (see `/docs/code-review.md` if available).

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Please ensure your code:
- Passes TypeScript compilation (`npm run type-check`)
- Follows the existing code style
- Includes tests for new features
- Updates documentation as needed

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built with [React](https://react.dev/) and [Next.js](https://nextjs.org/)
- UI components from [Radix UI](https://www.radix-ui.com/)
- Icons from [Lucide](https://lucide.dev/) and [Heroicons](https://heroicons.com/)
- Charts powered by [Recharts](https://recharts.org/)
- Drag and drop by [DnD Kit](https://dndkit.com/)

## Contact

Ciaran Kieran – [@ciaranjkieran](https://github.com/ciaranjkieran)

Project Link: [https://github.com/ciaranjkieran/mullet](https://github.com/ciaranjkieran/mullet)

---

**Note:** This is an active project under development. The codebase is functional but has architectural patterns that are being actively refined. See the Tech Debt section for known issues and the Roadmap for planned improvements.
