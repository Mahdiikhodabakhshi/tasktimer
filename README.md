# Task Timer

Track User Story task estimates and actual time directly inside Visual Studio Code.

Task Timer is a workspace-local time tracking extension for developers who want to compare estimated work with the time actually spent implementing tasks.

![Task Timer dashboard](https://raw.githubusercontent.com/Mahdiikhodabakhshi/tasktimer/main/docs/images/tasktimer-dashboard.png)

## Highlights

- Create User Stories with an optional external ID.
- Add tasks with estimates like `30m`, `1h`, `1h 30m`, or `2.5h`.
- Start, pause, resume, finish, and reopen task timers.
- Track multiple active tasks at the same time.
- Edit User Stories, tasks, estimates, and actual time.
- Collapse and expand User Stories in the dashboard.
- Delete User Stories or tasks with confirmation.
- Copy User Story and daily reports as Markdown.
- Switch UI text between English and Spanish.
- Store all data locally in the current workspace.

## Why Task Timer?

Estimates are useful only if you can compare them with real work.

Task Timer helps answer questions like:

```text
How long did this User Story actually take?
Which task was underestimated?
What did I work on today?
```

It keeps the workflow inside VS Code, so you do not need a separate timer app while coding.

## First Use

When no User Stories exist yet, Task Timer shows a focused empty state.

![Task Timer empty state](https://raw.githubusercontent.com/Mahdiikhodabakhshi/tasktimer/main/docs/images/tasktimer-empty-state.png)

Start with **Create User Story**, then add tasks and estimates.

## Daily Workflow

1. Open the **Task Timer** activity bar view.
2. Create a User Story.
3. Add tasks with estimates.
4. Start a task when you begin working.
5. Pause it when interrupted.
6. Finish it when done.
7. Copy a daily report or User Story report when needed.

You can also use the status bar or command palette for quick actions.

## Dashboard

The dashboard shows your active work at a glance:

- Active timer count
- Total estimated time
- Total actual time
- User Story progress
- Task status
- Actual vs estimated time per task
- Inline actions for start, pause, finish, edit, delete, and reports

![Task Timer active story](https://raw.githubusercontent.com/Mahdiikhodabakhshi/tasktimer/main/docs/images/tasktimer-active-story.png)

## User Stories

Each User Story can include:

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

Each task can include:

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

## Language

Task Timer supports:

- English
- Spanish

Use **Task Timer: Change Language** from the command palette, or update the setting:

```json
{
  "tasktimer.language": "es"
}
```

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

If your team wants to share time tracking data, remove that ignore rule. For personal tracking, keeping it ignored is recommended.

## Privacy

Task Timer does not send your data anywhere.

All User Stories, tasks, estimates, sessions, and reports are stored locally in your workspace.

## Support

If Task Timer is useful for you, you can support its development here:

[Donate with PayPal](https://paypal.me/mahdikhodabakhshi)

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
Task Timer: Change Language
Task Timer: Quick Action
Task Timer: Refresh
```

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


## License

MIT
