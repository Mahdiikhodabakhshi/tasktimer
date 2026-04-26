import * as vscode from 'vscode';

type TaskStatus = 'todo' | 'active' | 'paused' | 'finished';

interface TimerSession {
  id: string;
  startedAt: string;
  endedAt?: string;
  note?: string;
}

interface TaskItem {
  id: string;
  title: string;
  estimateMs: number;
  status: TaskStatus;
  sessions: TimerSession[];
  manualAdjustmentMs: number;
  notes: string[];
  createdAt: string;
  finishedAt?: string;
}

interface UserStory {
  id: string;
  title: string;
  externalId?: string;
  description?: string;
  createdAt: string;
  tasks: TaskItem[];
}

interface TaskTimerData {
  version: 1;
  userStories: UserStory[];
}

type TreeNode =
  | { kind: 'story'; story: UserStory }
  | { kind: 'task'; story: UserStory; task: TaskItem }
  | { kind: 'empty'; label: string; command?: string };

const emptyData: TaskTimerData = { version: 1, userStories: [] };

export async function activate(context: vscode.ExtensionContext) {
  const store = new TaskTimerStore();
  const tree = new TaskTimerTreeProvider(store);
  const status = new ActiveTimerStatus(store);

  context.subscriptions.push(
    store,
    store.onDidChangeData(() => {
      tree.refresh();
      status.update();
    }),
    vscode.window.registerTreeDataProvider('tasktimer.stories', tree),
    vscode.commands.registerCommand('tasktimer.createUserStory', async () => {
      await createUserStory(store);
      tree.refresh();
      status.update();
    }),
    vscode.commands.registerCommand('tasktimer.editUserStory', async (node?: TreeNode) => {
      await editUserStory(store, node);
      tree.refresh();
      status.update();
    }),
    vscode.commands.registerCommand('tasktimer.deleteUserStory', async (node?: TreeNode) => {
      await deleteUserStory(store, node);
      tree.refresh();
      status.update();
    }),
    vscode.commands.registerCommand('tasktimer.addTask', async (node?: TreeNode) => {
      await addTask(store, node);
      tree.refresh();
      status.update();
    }),
    vscode.commands.registerCommand('tasktimer.editTask', async (node?: TreeNode) => {
      await editTask(store, node);
      tree.refresh();
      status.update();
    }),
    vscode.commands.registerCommand('tasktimer.deleteTask', async (node?: TreeNode) => {
      await deleteTask(store, node);
      tree.refresh();
      status.update();
    }),
    vscode.commands.registerCommand('tasktimer.startTask', async (node?: TreeNode) => {
      await startTask(store, node);
      tree.refresh();
      status.update();
    }),
    vscode.commands.registerCommand('tasktimer.pauseTask', async (node?: TreeNode) => {
      await pauseTask(store, node);
      tree.refresh();
      status.update();
    }),
    vscode.commands.registerCommand('tasktimer.finishTask', async (node?: TreeNode) => {
      await finishTask(store, node);
      tree.refresh();
      status.update();
    }),
    vscode.commands.registerCommand('tasktimer.reopenTask', async (node?: TreeNode) => {
      await reopenTask(store, node);
      tree.refresh();
      status.update();
    }),
    vscode.commands.registerCommand('tasktimer.editTaskTime', async (node?: TreeNode) => {
      await editTaskTime(store, node);
      tree.refresh();
      status.update();
    }),
    vscode.commands.registerCommand('tasktimer.copyUserStoryReport', async (node?: TreeNode) => {
      await copyUserStoryReport(store, node);
    }),
    vscode.commands.registerCommand('tasktimer.copyDailyReport', async () => {
      await copyDailyReport(store);
    }),
    vscode.commands.registerCommand('tasktimer.quickAction', async () => {
      await showQuickAction(store);
      tree.refresh();
      status.update();
    }),
    vscode.commands.registerCommand('tasktimer.refresh', async () => {
      await store.reload();
      tree.refresh();
      status.update();
    }),
    status
  );

  status.update();
}

export function deactivate() {}

class TaskTimerStore {
  private data: TaskTimerData | undefined;
  private readonly changeEmitter = new vscode.EventEmitter<void>();
  readonly onDidChangeData = this.changeEmitter.event;

  async getData(): Promise<TaskTimerData> {
    if (!this.data) {
      await this.reload();
    }

    return this.data ?? emptyData;
  }

  async reload(): Promise<void> {
    const uri = this.dataUri();
    if (!uri) {
      this.data = emptyData;
      this.changeEmitter.fire();
      return;
    }

    try {
      const bytes = await vscode.workspace.fs.readFile(uri);
      this.data = normalizeData(JSON.parse(Buffer.from(bytes).toString('utf8')));
      this.changeEmitter.fire();
    } catch (error) {
      if (isFileNotFound(error)) {
        this.data = emptyData;
        this.changeEmitter.fire();
        return;
      }

      throw error;
    }
  }

  async save(data: TaskTimerData): Promise<void> {
    const uri = this.dataUri();
    const folder = this.storageFolderUri();

    if (!uri || !folder) {
      throw new Error('Open a workspace folder before using Task Timer.');
    }

    await ensureDirectory(folder);
    await vscode.workspace.fs.writeFile(uri, Buffer.from(`${JSON.stringify(data, null, 2)}\n`, 'utf8'));
    this.data = data;
    this.changeEmitter.fire();
  }

  dispose(): void {
    this.changeEmitter.dispose();
  }

  private dataUri(): vscode.Uri | undefined {
    const folder = this.workspaceFolder();
    return folder ? vscode.Uri.joinPath(folder.uri, '.tasktimer', 'tasktimer.json') : undefined;
  }

  private storageFolderUri(): vscode.Uri | undefined {
    const folder = this.workspaceFolder();
    return folder ? vscode.Uri.joinPath(folder.uri, '.tasktimer') : undefined;
  }

  private workspaceFolder(): vscode.WorkspaceFolder | undefined {
    return vscode.workspace.workspaceFolders?.[0];
  }
}

class TaskTimerTreeProvider implements vscode.TreeDataProvider<TreeNode> {
  private readonly changeEmitter = new vscode.EventEmitter<TreeNode | undefined | null | void>();
  readonly onDidChangeTreeData = this.changeEmitter.event;

  constructor(private readonly store: TaskTimerStore) {}

  refresh(): void {
    this.changeEmitter.fire();
  }

  getTreeItem(node: TreeNode): vscode.TreeItem {
    if (node.kind === 'empty') {
      const item = new vscode.TreeItem(node.label, vscode.TreeItemCollapsibleState.None);
      item.iconPath = new vscode.ThemeIcon('info');
      item.command = node.command ? { command: node.command, title: node.label } : undefined;
      return item;
    }

    if (node.kind === 'story') {
      const item = new vscode.TreeItem(formatStoryLabel(node.story), vscode.TreeItemCollapsibleState.Expanded);
      item.contextValue = 'userStory';
      item.description = formatStoryDescription(node.story);
      item.tooltip = createStoryTooltip(node.story);
      item.iconPath = new vscode.ThemeIcon('book');
      return item;
    }

    const item = new vscode.TreeItem(node.task.title, vscode.TreeItemCollapsibleState.None);
    item.contextValue = `task${capitalize(node.task.status)}`;
    item.description = formatTaskDescription(node.task);
    item.tooltip = createTaskTooltip(node.task);
    item.iconPath = taskIcon(node.task.status);
    return item;
  }

  async getChildren(node?: TreeNode): Promise<TreeNode[]> {
    const data = await this.store.getData();

    if (!node) {
      return data.userStories.length > 0
        ? data.userStories.map((story) => ({ kind: 'story', story }))
        : [{ kind: 'empty', label: 'Create your first User Story', command: 'tasktimer.createUserStory' }];
    }

    if (node.kind === 'story') {
      return node.story.tasks.length > 0
        ? node.story.tasks.map((task) => ({ kind: 'task', story: node.story, task }))
        : [{ kind: 'empty', label: 'Add the first task', command: 'tasktimer.addTask' }];
    }

    return [];
  }
}

class ActiveTimerStatus implements vscode.Disposable {
  private readonly item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  private readonly interval: NodeJS.Timeout;

  constructor(private readonly store: TaskTimerStore) {
    this.item.command = 'tasktimer.quickAction';
    this.interval = setInterval(() => this.update(), 1000);
  }

  async update(): Promise<void> {
    const data = await this.store.getData();
    const activeTasks = data.userStories.flatMap((story) =>
      story.tasks
        .filter((task) => task.status === 'active')
        .map((task) => ({ story, task }))
    );

    if (activeTasks.length === 0) {
      this.item.text = '$(watch) Task Timer';
      this.item.tooltip = 'Task Timer: click for quick actions';
      this.item.show();
      return;
    }

    if (activeTasks.length === 1) {
      const active = activeTasks[0];
      this.item.text = `$(watch) ${shortStoryName(active.story)} / ${active.task.title}: ${formatDuration(getTaskActualMs(active.task))}`;
      this.item.tooltip = createTaskTooltip(active.task);
      this.item.show();
      return;
    }

    const total = activeTasks.reduce((sum, active) => sum + getTaskActualMs(active.task), 0);
    this.item.text = `$(watch) ${activeTasks.length} active: ${formatDuration(total)}`;
    this.item.tooltip = activeTasks.map((active) => `${shortStoryName(active.story)} / ${active.task.title}: ${formatDuration(getTaskActualMs(active.task))}`).join('\n');
    this.item.show();
  }

  dispose(): void {
    clearInterval(this.interval);
    this.item.dispose();
  }
}

async function showQuickAction(store: TaskTimerStore): Promise<void> {
  const data = await store.getData();
  const activeCount = data.userStories.reduce((count, story) => count + story.tasks.filter((task) => task.status === 'active').length, 0);
  const startableCount = data.userStories.reduce((count, story) => count + story.tasks.filter((task) => task.status === 'todo' || task.status === 'paused').length, 0);
  const finishableCount = data.userStories.reduce((count, story) => count + story.tasks.filter((task) => task.status !== 'finished').length, 0);

  const action = await vscode.window.showQuickPick([
    {
      label: '$(add) Create User Story',
      description: 'Start tracking a new story',
      command: 'tasktimer.createUserStory'
    },
    {
      label: '$(checklist) Add Task',
      description: data.userStories.length > 0 ? 'Add a task to an existing story' : 'Create a story first',
      command: 'tasktimer.addTask',
      unavailableMessage: data.userStories.length === 0 ? 'Create a User Story first.' : undefined
    },
    {
      label: '$(play) Start or Resume Task',
      description: startableCount > 0 ? 'Pick a todo or paused task' : 'No todo or paused tasks',
      command: 'tasktimer.startTask',
      unavailableMessage: startableCount === 0 ? 'No todo or paused tasks are available to start.' : undefined
    },
    {
      label: '$(debug-pause) Pause Active Task',
      description: activeCount > 0 ? `${activeCount} active` : 'No active timers',
      command: 'tasktimer.pauseTask',
      unavailableMessage: activeCount === 0 ? 'No active timers are running.' : undefined
    },
    {
      label: '$(pass) Finish Task',
      description: finishableCount > 0 ? 'Close a task and optionally add a note' : 'No unfinished tasks',
      command: 'tasktimer.finishTask',
      unavailableMessage: finishableCount === 0 ? 'No unfinished tasks are available to finish.' : undefined
    },
    {
      label: '$(calendar) Copy Daily Report',
      description: 'Copy today as Markdown',
      command: 'tasktimer.copyDailyReport'
    }
  ], {
    title: 'Task Timer',
    placeHolder: 'What do you want to do now?',
    ignoreFocusOut: true
  });

  if (!action) {
    return;
  }

  if (action.unavailableMessage) {
    vscode.window.showInformationMessage(action.unavailableMessage);
    return;
  }

  await vscode.commands.executeCommand(action.command);
}

async function createUserStory(store: TaskTimerStore): Promise<void> {
  const title = await vscode.window.showInputBox({ title: 'Create User Story', prompt: 'User Story title', ignoreFocusOut: true });
  if (!title) {
    return;
  }

  const externalId = await vscode.window.showInputBox({ title: 'User Story ID', prompt: 'Optional User Story ID', ignoreFocusOut: true });
  const description = await vscode.window.showInputBox({ title: 'Description', prompt: 'Optional short description', ignoreFocusOut: true });
  const data = await store.getData();

  const story: UserStory = {
    id: createId(),
    title,
    externalId: externalId?.trim() || undefined,
    description: description?.trim() || undefined,
    createdAt: new Date().toISOString(),
    tasks: []
  };

  data.userStories.push(story);
  await store.save(data);

  const next = await vscode.window.showInformationMessage('User Story created.', 'Add Task');
  if (next === 'Add Task') {
    await addTask(store, { kind: 'story', story });
  }
}

async function editUserStory(store: TaskTimerStore, node?: TreeNode): Promise<void> {
  const data = await store.getData();
  const story = node?.kind === 'story' ? findStory(data, node.story.id) : await pickStory(data);
  if (!story) {
    return;
  }

  const title = await vscode.window.showInputBox({
    title: 'Edit User Story',
    prompt: 'User Story title',
    value: story.title,
    ignoreFocusOut: true
  });
  if (!title) {
    return;
  }

  const externalId = await vscode.window.showInputBox({
    title: 'User Story ID',
    prompt: 'Optional User Story ID',
    value: story.externalId ?? '',
    ignoreFocusOut: true
  });
  if (externalId === undefined) {
    return;
  }

  const description = await vscode.window.showInputBox({
    title: 'Description',
    prompt: 'Optional short description',
    value: story.description ?? '',
    ignoreFocusOut: true
  });
  if (description === undefined) {
    return;
  }

  story.title = title;
  story.externalId = externalId.trim() || undefined;
  story.description = description.trim() || undefined;
  await store.save(data);
}

async function deleteUserStory(store: TaskTimerStore, node?: TreeNode): Promise<void> {
  const data = await store.getData();
  const story = node?.kind === 'story' ? findStory(data, node.story.id) : await pickStory(data);
  if (!story) {
    return;
  }

  const taskCount = story.tasks.length;
  const confirmation = await vscode.window.showWarningMessage(
    `Delete "${formatStoryLabel(story)}" and ${taskCount} task${taskCount === 1 ? '' : 's'}?`,
    { modal: true },
    'Delete'
  );
  if (confirmation !== 'Delete') {
    return;
  }

  data.userStories = data.userStories.filter((candidate) => candidate.id !== story.id);
  await store.save(data);
}

async function addTask(store: TaskTimerStore, node?: TreeNode): Promise<void> {
  const data = await store.getData();
  const story = node?.kind === 'story' ? findStory(data, node.story.id) : await pickStory(data);
  if (!story) {
    return;
  }

  const title = await vscode.window.showInputBox({ title: 'Add Task', prompt: 'Task title', ignoreFocusOut: true });
  if (!title) {
    return;
  }

  const estimate = await vscode.window.showInputBox({
    title: 'Task Estimate',
    prompt: 'Estimate, for example 30m, 1h, 1h 30m, or 2.5h',
    ignoreFocusOut: true,
    validateInput: (value) => parseDuration(value) === undefined ? 'Use a duration like 30m, 1h, 1h 30m, or 2.5h.' : undefined
  });
  if (!estimate) {
    return;
  }

  const task: TaskItem = {
    id: createId(),
    title,
    estimateMs: parseDuration(estimate) ?? 0,
    status: 'todo',
    sessions: [],
    manualAdjustmentMs: 0,
    notes: [],
    createdAt: new Date().toISOString()
  };

  story.tasks.push(task);
  await store.save(data);

  const next = await vscode.window.showInformationMessage('Task added.', 'Start Timer');
  if (next === 'Start Timer') {
    await startTask(store, { kind: 'task', story, task });
  }
}

async function editTask(store: TaskTimerStore, node?: TreeNode): Promise<void> {
  const selected = await resolveTask(store, node);
  if (!selected) {
    return;
  }

  const title = await vscode.window.showInputBox({
    title: 'Edit Task',
    prompt: 'Task title',
    value: selected.task.title,
    ignoreFocusOut: true
  });
  if (!title) {
    return;
  }

  const estimate = await vscode.window.showInputBox({
    title: 'Task Estimate',
    prompt: 'Estimate, for example 30m, 1h, 1h 30m, or 2.5h',
    value: formatDuration(selected.task.estimateMs),
    ignoreFocusOut: true,
    validateInput: (value) => parseDuration(value) === undefined ? 'Use a duration like 30m, 1h, 1h 30m, or 2.5h.' : undefined
  });
  if (!estimate) {
    return;
  }

  selected.task.title = title;
  selected.task.estimateMs = parseDuration(estimate) ?? selected.task.estimateMs;
  await selected.store.save(selected.data);
}

async function deleteTask(store: TaskTimerStore, node?: TreeNode): Promise<void> {
  const selected = await resolveTask(store, node);
  if (!selected) {
    return;
  }

  const actual = getTaskActualMs(selected.task);
  const confirmation = await vscode.window.showWarningMessage(
    `Delete "${selected.task.title}"? Actual time ${formatDuration(actual)} will be removed.`,
    { modal: true },
    'Delete'
  );
  if (confirmation !== 'Delete') {
    return;
  }

  selected.story.tasks = selected.story.tasks.filter((task) => task.id !== selected.task.id);
  await selected.store.save(selected.data);
}

async function startTask(store: TaskTimerStore, node?: TreeNode): Promise<void> {
  const selected = await resolveTask(store, node, (task) => task.status === 'todo' || task.status === 'paused');
  if (!selected) {
    return;
  }

  const { data, task } = selected;
  task.sessions.push({ id: createId(), startedAt: new Date().toISOString() });
  task.status = 'active';
  await store.save(data);
}

async function pauseTask(store: TaskTimerStore, node?: TreeNode): Promise<void> {
  const selected = await resolveTask(store, node, (task) => task.status === 'active');
  if (!selected) {
    return;
  }

  const { data, task } = selected;
  closeOpenSession(task);
  task.status = 'paused';
  await store.save(data);
}

async function finishTask(store: TaskTimerStore, node?: TreeNode): Promise<void> {
  const selected = await resolveTask(store, node, (task) => task.status !== 'finished');
  if (!selected) {
    return;
  }

  const note = await vscode.window.showInputBox({ title: 'Finish Task', prompt: 'Optional completion note', ignoreFocusOut: true });
  const { data, task } = selected;

  closeOpenSession(task);
  task.status = 'finished';
  task.finishedAt = new Date().toISOString();
  if (note) {
    task.notes.push(note);
  }

  await store.save(data);
}

async function reopenTask(store: TaskTimerStore, node?: TreeNode): Promise<void> {
  const selected = await resolveTask(store, node, (task) => task.status === 'finished');
  if (!selected) {
    return;
  }

  selected.task.status = 'paused';
  selected.task.finishedAt = undefined;
  await selected.store.save(selected.data);
}

async function editTaskTime(store: TaskTimerStore, node?: TreeNode): Promise<void> {
  const selected = await resolveTask(store, node);
  if (!selected) {
    return;
  }

  const current = getTaskActualMs(selected.task);
  const value = await vscode.window.showInputBox({
    title: 'Edit Actual Time',
    prompt: 'Set total actual time, for example 45m, 1h 20m, or 2.5h',
    value: formatDuration(current),
    ignoreFocusOut: true,
    validateInput: (input) => parseDuration(input) === undefined ? 'Use a duration like 45m, 1h 20m, or 2.5h.' : undefined
  });
  if (!value) {
    return;
  }

  const target = parseDuration(value) ?? current;
  selected.task.manualAdjustmentMs += target - current;
  await selected.store.save(selected.data);
}

async function copyUserStoryReport(store: TaskTimerStore, node?: TreeNode): Promise<void> {
  const data = await store.getData();
  const story = node?.kind === 'story' ? findStory(data, node.story.id) : await pickStory(data);
  if (!story) {
    return;
  }

  await vscode.env.clipboard.writeText(createUserStoryReport(story));
  vscode.window.showInformationMessage('User Story report copied as Markdown.');
}

async function copyDailyReport(store: TaskTimerStore): Promise<void> {
  const data = await store.getData();
  await vscode.env.clipboard.writeText(createDailyReport(data, new Date()));
  vscode.window.showInformationMessage('Daily report copied as Markdown.');
}

async function resolveTask(
  store: TaskTimerStore,
  node?: TreeNode,
  predicate: (task: TaskItem) => boolean = () => true
): Promise<{ store: TaskTimerStore; data: TaskTimerData; story: UserStory; task: TaskItem } | undefined> {
  const data = await store.getData();

  if (node?.kind === 'task') {
    const story = findStory(data, node.story.id);
    const task = story?.tasks.find((candidate) => candidate.id === node.task.id);
    return story && task && predicate(task) ? { store, data, story, task } : undefined;
  }

  const candidates = data.userStories.flatMap((story) =>
    story.tasks.filter(predicate).map((task) => ({ story, task }))
  );

  if (candidates.length === 0) {
    vscode.window.showInformationMessage('No matching tasks found.');
    return undefined;
  }

  const picked = await vscode.window.showQuickPick(
    candidates.map(({ story, task }) => ({
      label: task.title,
      description: `${shortStoryName(story)} | ${capitalize(task.status)} | ${formatDuration(getTaskActualMs(task))}`,
      storyId: story.id,
      taskId: task.id
    })),
    { title: 'Select Task', ignoreFocusOut: true }
  );

  if (!picked) {
    return undefined;
  }

  const story = findStory(data, picked.storyId);
  const task = story?.tasks.find((candidate) => candidate.id === picked.taskId);
  return story && task ? { store, data, story, task } : undefined;
}

async function pickStory(data: TaskTimerData): Promise<UserStory | undefined> {
  if (data.userStories.length === 0) {
    vscode.window.showInformationMessage('Create a User Story first.');
    return undefined;
  }

  const picked = await vscode.window.showQuickPick(
    data.userStories.map((story) => ({
      label: story.title,
      description: story.externalId ? `ID: ${story.externalId}` : undefined,
      id: story.id
    })),
    { title: 'Select User Story', ignoreFocusOut: true }
  );

  return picked ? findStory(data, picked.id) : undefined;
}

function normalizeData(value: unknown): TaskTimerData {
  const candidate = value as Partial<TaskTimerData>;
  if (!candidate || !Array.isArray(candidate.userStories)) {
    return emptyData;
  }

  return {
    version: 1,
    userStories: candidate.userStories.map((story) => {
      const rawStory = story as Partial<UserStory> & { azureWorkItemId?: string };
      return {
      id: rawStory.id || createId(),
      title: rawStory.title || 'Untitled User Story',
      externalId: rawStory.externalId ?? rawStory.azureWorkItemId,
      description: rawStory.description,
      createdAt: rawStory.createdAt || new Date().toISOString(),
      tasks: Array.isArray(rawStory.tasks) ? rawStory.tasks.map((task) => ({
        id: task.id || createId(),
        title: task.title || 'Untitled Task',
        estimateMs: Number(task.estimateMs) || 0,
        status: task.status || 'todo',
        sessions: Array.isArray(task.sessions) ? task.sessions : [],
        manualAdjustmentMs: Number(task.manualAdjustmentMs) || 0,
        notes: Array.isArray(task.notes) ? task.notes : [],
        createdAt: task.createdAt || new Date().toISOString(),
        finishedAt: task.finishedAt
      })) : []
    };
    })
  };
}

function findStory(data: TaskTimerData, id: string): UserStory | undefined {
  return data.userStories.find((story) => story.id === id);
}

async function ensureDirectory(uri: vscode.Uri): Promise<void> {
  try {
    await vscode.workspace.fs.createDirectory(uri);
  } catch {
    // createDirectory is idempotent for existing folders in VS Code's file system provider.
  }
}

function closeOpenSession(task: TaskItem): void {
  for (let index = task.sessions.length - 1; index >= 0; index -= 1) {
    const session = task.sessions[index];
    if (!session.endedAt) {
      session.endedAt = new Date().toISOString();
      return;
    }
  }
}

function getTaskActualMs(task: TaskItem, now = Date.now()): number {
  const sessionMs = task.sessions.reduce((total, session) => {
    const start = Date.parse(session.startedAt);
    const end = session.endedAt ? Date.parse(session.endedAt) : now;
    return Number.isFinite(start) && Number.isFinite(end) && end > start ? total + (end - start) : total;
  }, 0);

  return Math.max(0, sessionMs + task.manualAdjustmentMs);
}

function getStoryEstimateMs(story: UserStory): number {
  return story.tasks.reduce((total, task) => total + task.estimateMs, 0);
}

function getStoryActualMs(story: UserStory): number {
  return story.tasks.reduce((total, task) => total + getTaskActualMs(task), 0);
}

function createUserStoryReport(story: UserStory): string {
  const estimate = getStoryEstimateMs(story);
  const actual = getStoryActualMs(story);
  const diff = actual - estimate;
  const lines = [
    `# Time report for ${story.externalId ? `${story.externalId} - ` : ''}${story.title}`,
    '',
    `Estimated: ${formatDuration(estimate)}`,
    `Actual: ${formatDuration(actual)}`,
    `Difference: ${formatSignedDuration(diff)}`,
    `Tasks: ${story.tasks.filter((task) => task.status === 'finished').length}/${story.tasks.length} finished`,
    '',
    '## Tasks'
  ];

  for (const task of story.tasks) {
    lines.push(`- ${task.title}: estimated ${formatDuration(task.estimateMs)}, actual ${formatDuration(getTaskActualMs(task))}, status ${task.status}`);
    for (const note of task.notes) {
      lines.push(`  - Note: ${note}`);
    }
  }

  lines.push('', '## Sessions');
  for (const task of story.tasks) {
    for (const session of task.sessions) {
      lines.push(`- ${task.title}: ${formatDateTime(session.startedAt)} - ${session.endedAt ? formatDateTime(session.endedAt) : 'running'}`);
    }
  }

  return lines.join('\n');
}

function createDailyReport(data: TaskTimerData, date: Date): string {
  const dayKey = formatDateKey(date);
  const entries: string[] = [];
  let total = 0;

  for (const story of data.userStories) {
    for (const task of story.tasks) {
      for (const session of task.sessions) {
        const start = new Date(session.startedAt);
        if (formatDateKey(start) !== dayKey) {
          continue;
        }

        const endMs = session.endedAt ? Date.parse(session.endedAt) : Date.now();
        const duration = Math.max(0, endMs - start.getTime());
        total += duration;
        entries.push(`- ${shortStoryName(story)} / ${task.title}: ${formatDuration(duration)} (${formatTime(session.startedAt)} - ${session.endedAt ? formatTime(session.endedAt) : 'running'})`);
      }
    }
  }

  return [
    `# Daily work log - ${dayKey}`,
    '',
    ...entries.length > 0 ? entries : ['No tracked sessions today.'],
    '',
    `Total tracked task time: ${formatDuration(total)}`,
    '',
    'Note: if multiple timers overlap, task time can be higher than real clock time.'
  ].join('\n');
}

function parseDuration(value: string): number | undefined {
  const input = value.trim().toLowerCase();
  if (!input) {
    return undefined;
  }

  const tokenPattern = /(\d+(?:\.\d+)?)\s*(h|hr|hrs|hour|hours|m|min|mins|minute|minutes)/g;
  let match: RegExpExecArray | null;
  let total = 0;
  let matched = false;

  while ((match = tokenPattern.exec(input))) {
    matched = true;
    const amount = Number(match[1]);
    const unit = match[2];
    total += unit.startsWith('h') ? amount * 60 * 60 * 1000 : amount * 60 * 1000;
  }

  if (matched) {
    return Math.round(total);
  }

  const minutes = Number(input);
  return Number.isFinite(minutes) && minutes >= 0 ? Math.round(minutes * 60 * 1000) : undefined;
}

function formatDuration(ms: number): string {
  const totalMinutes = Math.round(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${minutes}m`;
  }

  if (minutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${minutes}m`;
}

function formatSignedDuration(ms: number): string {
  if (ms === 0) {
    return '0m';
  }

  return `${ms > 0 ? '+' : '-'}${formatDuration(Math.abs(ms))}`;
}

function formatStoryLabel(story: UserStory): string {
  return story.externalId ? `${story.externalId} ${story.title}` : story.title;
}

function formatStoryDescription(story: UserStory): string {
  const finished = story.tasks.filter((task) => task.status === 'finished').length;
  const total = story.tasks.length;
  return `${finished}/${total} done | ${formatDuration(getStoryActualMs(story))} / ${formatDuration(getStoryEstimateMs(story))}`;
}

function formatTaskDescription(task: TaskItem): string {
  return `${capitalize(task.status)} | actual ${formatDuration(getTaskActualMs(task))} | est ${formatDuration(task.estimateMs)}`;
}

function createStoryTooltip(story: UserStory): string {
  return [
    formatStoryLabel(story),
    story.description,
    `Estimated: ${formatDuration(getStoryEstimateMs(story))}`,
    `Actual: ${formatDuration(getStoryActualMs(story))}`,
    `Difference: ${formatSignedDuration(getStoryActualMs(story) - getStoryEstimateMs(story))}`
  ].filter(Boolean).join('\n');
}

function createTaskTooltip(task: TaskItem): string {
  return [
    task.title,
    `Status: ${task.status}`,
    `Estimated: ${formatDuration(task.estimateMs)}`,
    `Actual: ${formatDuration(getTaskActualMs(task))}`,
    `Difference: ${formatSignedDuration(getTaskActualMs(task) - task.estimateMs)}`,
    task.notes.length > 0 ? `Notes: ${task.notes.join('; ')}` : undefined
  ].filter(Boolean).join('\n');
}

function taskIcon(status: TaskStatus): vscode.ThemeIcon {
  switch (status) {
    case 'active':
      return new vscode.ThemeIcon('debug-start');
    case 'paused':
      return new vscode.ThemeIcon('debug-pause');
    case 'finished':
      return new vscode.ThemeIcon('pass');
    default:
      return new vscode.ThemeIcon('circle-outline');
  }
}

function shortStoryName(story: UserStory): string {
  return story.externalId ?? story.title;
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString();
}

function formatTime(value: string): string {
  return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDateKey(value: Date): string {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, '0');
  const day = `${value.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function createId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function isFileNotFound(error: unknown): boolean {
  return error instanceof vscode.FileSystemError && error.code === 'FileNotFound';
}
