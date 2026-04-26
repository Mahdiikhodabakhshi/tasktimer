# Task Timer

Task Timer is a Visual Studio Code extension for tracking the real time spent on User Story tasks directly inside your workspace.

It is built for developers who estimate work before starting, but later need a clear answer to: “How much time did this User Story actually take?”

## Features

- Create User Stories with an optional external ID.
- Add tasks under each User Story.
- Set task estimates using values like `30m`, `1h`, `1h 30m`, or `2.5h`.
- Start, pause, resume, finish, and reopen tasks.
- Run multiple active task timers at the same time.
- Edit User Story title, ID, and description.
- Edit task title and estimate.
- Manually edit actual tracked time.
- Delete User Stories or tasks with confirmation.
- See active timers in the VS Code status bar.
- Use a quick action menu for daily workflow.
- Copy User Story reports as Markdown.
- Copy daily work logs as Markdown.
- Store data locally in the current workspace.

## Why Use It?

Many teams estimate tasks before implementation, but actual work often gets split across interruptions, debugging sessions, meetings, and context switches.

Task Timer keeps the tracking close to where the work happens: your editor.

Example:

```text
User Story: Login flow

Tasks:
- Create API: estimated 2h, actual 2h 40m
- Create UI: estimated 1h, actual 1h 20m

Total estimated: 3h
Total actual: 4h
Difference: +1h
```

## Daily Workflow

1. Open the **Task Timer** activity bar view.
2. Create a User Story.
3. Add tasks with estimates.
4. Start a task when you begin working.
5. Pause it when interrupted.
6. Finish it when done.
7. Copy a daily report or User Story report when needed.

You can also click the **Task Timer** status bar item to open the quick action menu.

## User Stories

Each User Story can have:

- Title
- Optional ID
- Optional description
- Tasks
- Total estimated time
- Total actual time
- Progress summary

The optional ID is generic. You can use it for Jira, Azure DevOps, GitHub Issues, Linear, an internal tracker, or any other system.

Examples:

```text
PROJ-123
AB#4567
#89
US-2024-15
```

## Tasks

Each task can have:

- Title
- Estimate
- Status
- Actual tracked time
- Timer sessions
- Notes

Task statuses:

```text
todo
active
paused
finished
```

Finished tasks can be reopened without losing previous tracked time.

## Multiple Active Timers

Task Timer allows multiple tasks to be active at the same time.

This is useful when related tasks overlap, but it also means tracked task time can be higher than real clock time.

Example:

```text
09:00 - 10:00
Task A active
Task B active

Real elapsed time: 1h
Tracked task time: 2h
```

Reports include a note about overlapping timers.

## Reports

Task Timer can copy reports to your clipboard as Markdown.

### User Story Report

Includes:

- User Story title and ID
- Total estimate
- Total actual time
- Difference
- Finished task count
- Task breakdown
- Timer sessions
- Notes

### Daily Report

Includes:

- Sessions tracked today
- Task names
- Story IDs or titles
- Start and end times
- Total tracked task time

## Storage

Task Timer stores data inside the current workspace:

```text
.tasktimer/tasktimer.json
```

This keeps tracking data tied to the project you are working on.

By default, the generated `.gitignore` ignores this folder:

```text
.tasktimer/
```

If your team wants to share time tracking data, you can remove that ignore rule. For personal tracking, keeping it ignored is recommended.

## Privacy

Task Timer does not send your data anywhere.

All User Stories, tasks, estimates, sessions, and reports are stored locally in your workspace.

## Commands

Available commands:

```text
Task Timer: Create User Story
Task Timer: Edit User Story
Task Timer: Delete User Story
Task Timer: Add Task
Task Timer: Edit Task
Task Timer: Delete Task
Task Timer: Start Task
Task Timer: Pause Task
Task Timer: Finish Task
Task Timer: Reopen Task
Task Timer: Edit Actual Time
Task Timer: Copy User Story Report
Task Timer: Copy Daily Report
Task Timer: Quick Action
Task Timer: Refresh
```

Most commands are also available from the Task Timer sidebar context menu.

## Estimate Format

Supported estimate and actual-time formats:

```text
30m
1h
1h 30m
2.5h
90
```

Plain numbers are treated as minutes.

## Current Limitations

- No automatic integration with Jira, Azure DevOps, GitHub Issues, or other trackers yet.
- No cloud sync.
- No idle detection yet.
- No calendar view yet.
- No chart or analytics dashboard yet.

## Roadmap

Planned or possible future improvements:

- Idle time detection.
- Better report views inside VS Code.
- Weekly and monthly summaries.
- CSV export.
- Import/export commands.
- Optional integrations with issue trackers.
- Configurable storage location.
- Team-friendly shared reports.

## Development

Install dependencies:

```bash
npm install
```

Compile:

```bash
npm run compile
```

Run locally:

1. Open this extension folder in VS Code.
2. Press `F5`.
3. Use the Extension Development Host window.

## License

MIT
