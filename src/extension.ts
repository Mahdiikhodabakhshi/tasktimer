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
type Language = 'en' | 'es';

const translations = {
  en: {
    taskTimer: 'Task Timer',
    dashboardSubtitle: 'Story estimates and actuals',
    createUserStory: 'Create User Story',
    editUserStory: 'Edit User Story',
    deleteUserStory: 'Delete User Story',
    userStoryTitle: 'User Story title',
    userStoryId: 'User Story ID',
    optionalUserStoryId: 'Optional User Story ID',
    description: 'Description',
    optionalDescription: 'Optional short description',
    userStoryCreated: 'User Story created.',
    addTask: 'Add Task',
    editTask: 'Edit Task',
    deleteTask: 'Delete Task',
    taskTitle: 'Task title',
    taskEstimate: 'Task Estimate',
    estimatePrompt: 'Estimate, for example 30m, 1h, 1h 30m, or 2.5h',
    estimateValidation: 'Use a duration like 30m, 1h, 1h 30m, or 2.5h.',
    taskAdded: 'Task added.',
    startTimer: 'Start Timer',
    start: 'Start',
    pause: 'Pause',
    finish: 'Finish',
    reopen: 'Reopen',
    edit: 'Edit',
    time: 'Time',
    deleteShort: 'Del',
    copy: 'Copy',
    hide: 'Hide',
    open: 'Open',
    active: 'Active',
    estimate: 'Estimate',
    actual: 'Actual',
    est: 'est',
    done: 'done',
    noStoriesTitle: 'No stories yet',
    noStoriesBody: 'Create a User Story, add tasks, then start tracking actual time.',
    noTasksBody: 'No tasks in this story yet.',
    addTaskTitle: 'Add task',
    copyReportTitle: 'Copy report',
    editStoryTitle: 'Edit story',
    deleteStoryTitle: 'Delete story',
    collapseStory: 'Collapse story',
    expandStory: 'Expand story',
    delete: 'Delete',
    deleteStoryConfirm: 'Delete "{story}" and {count} {taskWord}?',
    taskSingular: 'task',
    taskPlural: 'tasks',
    deleteTaskConfirm: 'Delete "{task}"? Actual time {actual} will be removed.',
    startOrResumeTask: 'Start or Resume Task',
    pauseActiveTask: 'Pause Active Task',
    finishTask: 'Finish Task',
    copyDailyReport: 'Copy Daily Report',
    quickCreateStoryDesc: 'Start tracking a new story',
    quickAddTaskDesc: 'Add a task to an existing story',
    quickCreateStoryFirst: 'Create a story first',
    createStoryFirstMessage: 'Create a User Story first.',
    quickStartTaskDesc: 'Pick a todo or paused task',
    noTodoPaused: 'No todo or paused tasks',
    noStartableTasks: 'No todo or paused tasks are available to start.',
    activeCount: '{count} active',
    noActiveTimers: 'No active timers',
    noActiveTimersRunning: 'No active timers are running.',
    closeTaskDesc: 'Close a task and optionally add a note',
    noUnfinishedTasks: 'No unfinished tasks',
    noFinishableTasks: 'No unfinished tasks are available to finish.',
    copyTodayMarkdown: 'Copy today as Markdown',
    quickPlaceholder: 'What do you want to do now?',
    finishTaskTitle: 'Finish Task',
    optionalCompletionNote: 'Optional completion note',
    editActualTime: 'Edit Actual Time',
    editActualPrompt: 'Set total actual time, for example 45m, 1h 20m, or 2.5h',
    storyReportCopied: 'User Story report copied as Markdown.',
    dailyReportCopied: 'Daily report copied as Markdown.',
    noMatchingTasks: 'No matching tasks found.',
    selectTask: 'Select Task',
    selectUserStory: 'Select User Story',
    untitledUserStory: 'Untitled User Story',
    untitledTask: 'Untitled Task',
    timeReportFor: 'Time report for',
    estimated: 'Estimated',
    difference: 'Difference',
    tasks: 'Tasks',
    sessions: 'Sessions',
    note: 'Note',
    running: 'running',
    dailyWorkLog: 'Daily work log',
    noTrackedSessions: 'No tracked sessions today.',
    totalTrackedTaskTime: 'Total tracked task time',
    overlapNote: 'Note: if multiple timers overlap, task time can be higher than real clock time.',
    status: 'Status',
    statusTodo: 'Todo',
    statusActive: 'Active',
    statusPaused: 'Paused',
    statusFinished: 'Finished',
    notes: 'Notes',
    clickQuickActions: 'Task Timer: click for quick actions',
    changeLanguage: 'Change Language',
    languageChanged: 'Task Timer language changed.',
    english: 'English',
    spanish: 'Español'
  },
  es: {
    taskTimer: 'Task Timer',
    dashboardSubtitle: 'Estimaciones y tiempos reales',
    createUserStory: 'Crear historia de usuario',
    editUserStory: 'Editar historia de usuario',
    deleteUserStory: 'Eliminar historia de usuario',
    userStoryTitle: 'Título de la historia de usuario',
    userStoryId: 'ID de la historia',
    optionalUserStoryId: 'ID opcional de la historia',
    description: 'Descripción',
    optionalDescription: 'Descripción corta opcional',
    userStoryCreated: 'Historia de usuario creada.',
    addTask: 'Añadir tarea',
    editTask: 'Editar tarea',
    deleteTask: 'Eliminar tarea',
    taskTitle: 'Título de la tarea',
    taskEstimate: 'Estimación de la tarea',
    estimatePrompt: 'Estimación, por ejemplo 30m, 1h, 1h 30m o 2.5h',
    estimateValidation: 'Usa una duración como 30m, 1h, 1h 30m o 2.5h.',
    taskAdded: 'Tarea añadida.',
    startTimer: 'Iniciar temporizador',
    start: 'Iniciar',
    pause: 'Pausar',
    finish: 'Finalizar',
    reopen: 'Reabrir',
    edit: 'Editar',
    time: 'Tiempo',
    deleteShort: 'Borrar',
    copy: 'Copiar',
    hide: 'Ocultar',
    open: 'Abrir',
    active: 'Activas',
    estimate: 'Estimación',
    actual: 'Real',
    est: 'est',
    done: 'hechas',
    noStoriesTitle: 'No hay historias',
    noStoriesBody: 'Crea una historia, añade tareas y empieza a registrar tiempo real.',
    noTasksBody: 'Esta historia todavía no tiene tareas.',
    addTaskTitle: 'Añadir tarea',
    copyReportTitle: 'Copiar informe',
    editStoryTitle: 'Editar historia',
    deleteStoryTitle: 'Eliminar historia',
    collapseStory: 'Contraer historia',
    expandStory: 'Expandir historia',
    delete: 'Eliminar',
    deleteStoryConfirm: '¿Eliminar "{story}" y {count} {taskWord}?',
    taskSingular: 'tarea',
    taskPlural: 'tareas',
    deleteTaskConfirm: '¿Eliminar "{task}"? Se eliminará el tiempo real {actual}.',
    startOrResumeTask: 'Iniciar o reanudar tarea',
    pauseActiveTask: 'Pausar tarea activa',
    finishTask: 'Finalizar tarea',
    copyDailyReport: 'Copiar informe diario',
    quickCreateStoryDesc: 'Empieza a registrar una nueva historia',
    quickAddTaskDesc: 'Añade una tarea a una historia existente',
    quickCreateStoryFirst: 'Primero crea una historia',
    createStoryFirstMessage: 'Primero crea una historia de usuario.',
    quickStartTaskDesc: 'Elige una tarea pendiente o pausada',
    noTodoPaused: 'No hay tareas pendientes o pausadas',
    noStartableTasks: 'No hay tareas pendientes o pausadas para iniciar.',
    activeCount: '{count} activas',
    noActiveTimers: 'No hay temporizadores activos',
    noActiveTimersRunning: 'No hay temporizadores activos.',
    closeTaskDesc: 'Cierra una tarea y opcionalmente añade una nota',
    noUnfinishedTasks: 'No hay tareas sin finalizar',
    noFinishableTasks: 'No hay tareas sin finalizar para cerrar.',
    copyTodayMarkdown: 'Copia el día de hoy como Markdown',
    quickPlaceholder: '¿Qué quieres hacer ahora?',
    finishTaskTitle: 'Finalizar tarea',
    optionalCompletionNote: 'Nota de finalización opcional',
    editActualTime: 'Editar tiempo real',
    editActualPrompt: 'Define el tiempo real total, por ejemplo 45m, 1h 20m o 2.5h',
    storyReportCopied: 'Informe de historia copiado como Markdown.',
    dailyReportCopied: 'Informe diario copiado como Markdown.',
    noMatchingTasks: 'No se encontraron tareas.',
    selectTask: 'Seleccionar tarea',
    selectUserStory: 'Seleccionar historia de usuario',
    untitledUserStory: 'Historia sin título',
    untitledTask: 'Tarea sin título',
    timeReportFor: 'Informe de tiempo para',
    estimated: 'Estimado',
    difference: 'Diferencia',
    tasks: 'Tareas',
    sessions: 'Sesiones',
    note: 'Nota',
    running: 'en curso',
    dailyWorkLog: 'Registro diario de trabajo',
    noTrackedSessions: 'No hay sesiones registradas hoy.',
    totalTrackedTaskTime: 'Tiempo total registrado',
    overlapNote: 'Nota: si varios temporizadores se solapan, el tiempo de tareas puede ser mayor que el tiempo real.',
    status: 'Estado',
    statusTodo: 'Pendiente',
    statusActive: 'Activa',
    statusPaused: 'Pausada',
    statusFinished: 'Finalizada',
    notes: 'Notas',
    clickQuickActions: 'Task Timer: clic para acciones rápidas',
    changeLanguage: 'Cambiar idioma',
    languageChanged: 'Idioma de Task Timer cambiado.',
    english: 'English',
    spanish: 'Español'
  }
} as const;

type TranslationKey = keyof typeof translations.en;

export async function activate(context: vscode.ExtensionContext) {
  const store = new TaskTimerStore();
  const dashboard = new TaskTimerDashboardProvider(context.extensionUri, store);
  const status = new ActiveTimerStatus(store);

  context.subscriptions.push(
    store,
    store.onDidChangeData(() => {
      dashboard.refresh(true);
      status.update();
    }),
    vscode.window.registerWebviewViewProvider('tasktimer.stories', dashboard),
    vscode.commands.registerCommand('tasktimer.createUserStory', async () => {
      await createUserStory(store);
      dashboard.refresh();
      status.update();
    }),
    vscode.commands.registerCommand('tasktimer.editUserStory', async (node?: TreeNode) => {
      await editUserStory(store, node);
      dashboard.refresh();
      status.update();
    }),
    vscode.commands.registerCommand('tasktimer.deleteUserStory', async (node?: TreeNode) => {
      await deleteUserStory(store, node);
      dashboard.refresh();
      status.update();
    }),
    vscode.commands.registerCommand('tasktimer.addTask', async (node?: TreeNode) => {
      await addTask(store, node);
      dashboard.refresh();
      status.update();
    }),
    vscode.commands.registerCommand('tasktimer.editTask', async (node?: TreeNode) => {
      await editTask(store, node);
      dashboard.refresh();
      status.update();
    }),
    vscode.commands.registerCommand('tasktimer.deleteTask', async (node?: TreeNode) => {
      await deleteTask(store, node);
      dashboard.refresh();
      status.update();
    }),
    vscode.commands.registerCommand('tasktimer.startTask', async (node?: TreeNode) => {
      await startTask(store, node);
      dashboard.refresh();
      status.update();
    }),
    vscode.commands.registerCommand('tasktimer.pauseTask', async (node?: TreeNode) => {
      await pauseTask(store, node);
      dashboard.refresh();
      status.update();
    }),
    vscode.commands.registerCommand('tasktimer.finishTask', async (node?: TreeNode) => {
      await finishTask(store, node);
      dashboard.refresh();
      status.update();
    }),
    vscode.commands.registerCommand('tasktimer.reopenTask', async (node?: TreeNode) => {
      await reopenTask(store, node);
      dashboard.refresh();
      status.update();
    }),
    vscode.commands.registerCommand('tasktimer.editTaskTime', async (node?: TreeNode) => {
      await editTaskTime(store, node);
      dashboard.refresh();
      status.update();
    }),
    vscode.commands.registerCommand('tasktimer.copyUserStoryReport', async (node?: TreeNode) => {
      await copyUserStoryReport(store, node);
    }),
    vscode.commands.registerCommand('tasktimer.copyDailyReport', async () => {
      await copyDailyReport(store);
    }),
    vscode.commands.registerCommand('tasktimer.setLanguage', async () => {
      await setLanguage();
      dashboard.refresh(true);
      status.update();
    }),
    vscode.commands.registerCommand('tasktimer.quickAction', async () => {
      await showQuickAction(store);
      dashboard.refresh();
      status.update();
    }),
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration('tasktimer.language')) {
        dashboard.refresh(true);
        status.update();
      }
    }),
    vscode.commands.registerCommand('tasktimer.refresh', async () => {
      await store.reload();
      dashboard.refresh();
      status.update();
    }),
    dashboard,
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
        : [{ kind: 'empty', label: localize('createUserStory'), command: 'tasktimer.createUserStory' }];
    }

    if (node.kind === 'story') {
      return node.story.tasks.length > 0
        ? node.story.tasks.map((task) => ({ kind: 'task', story: node.story, task }))
        : [{ kind: 'empty', label: localize('addTask'), command: 'tasktimer.addTask' }];
    }

    return [];
  }
}

class TaskTimerDashboardProvider implements vscode.WebviewViewProvider, vscode.Disposable {
  private view: vscode.WebviewView | undefined;
  private readonly tickInterval: NodeJS.Timeout;

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly store: TaskTimerStore
  ) {
    this.tickInterval = setInterval(() => this.refresh(), 1000);
  }

  async resolveWebviewView(view: vscode.WebviewView): Promise<void> {
    this.view = view;
    view.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionUri]
    };
    view.webview.onDidReceiveMessage((message) => this.handleMessage(message));
    await this.refresh(true);
  }

  async refresh(forceHtml = false): Promise<void> {
    if (!this.view) {
      return;
    }

    const data = await this.store.getData();

    if (forceHtml) {
      this.view.webview.html = this.getHtml(this.view.webview, data);
      return;
    }

    const delivered = await this.view.webview.postMessage({
      type: 'data',
      data,
      now: Date.now(),
      labels: getWebviewLabels()
    });

    if (!delivered) {
      this.view.webview.html = this.getHtml(this.view.webview, data);
    }
  }

  dispose(): void {
    clearInterval(this.tickInterval);
  }

  private async handleMessage(message: { command?: string; storyId?: string; taskId?: string }): Promise<void> {
    if (!message.command) {
      return;
    }

    const data = await this.store.getData();
    const story = message.storyId ? findStory(data, message.storyId) : undefined;
    const task = story && message.taskId ? story.tasks.find((candidate) => candidate.id === message.taskId) : undefined;
    const storyNode: TreeNode | undefined = story ? { kind: 'story', story } : undefined;
    const taskNode: TreeNode | undefined = story && task ? { kind: 'task', story, task } : undefined;

    switch (message.command) {
      case 'createStory':
        await createUserStory(this.store);
        break;
      case 'editStory':
        await editUserStory(this.store, storyNode);
        break;
      case 'deleteStory':
        await deleteUserStory(this.store, storyNode);
        break;
      case 'addTask':
        await addTask(this.store, storyNode);
        break;
      case 'editTask':
        await editTask(this.store, taskNode);
        break;
      case 'deleteTask':
        await deleteTask(this.store, taskNode);
        break;
      case 'startTask':
        await startTask(this.store, taskNode);
        break;
      case 'pauseTask':
        await pauseTask(this.store, taskNode);
        break;
      case 'finishTask':
        await finishTask(this.store, taskNode);
        break;
      case 'reopenTask':
        await reopenTask(this.store, taskNode);
        break;
      case 'editTime':
        await editTaskTime(this.store, taskNode);
        break;
      case 'copyStoryReport':
        await copyUserStoryReport(this.store, storyNode);
        break;
      case 'copyDailyReport':
        await copyDailyReport(this.store);
        break;
      case 'quickAction':
        await showQuickAction(this.store);
        break;
    }

    await this.refresh(true);
  }

  private getHtml(webview: vscode.Webview, initialData: TaskTimerData): string {
    const nonce = createNonce();
    const initialJson = escapeJsonForHtml({
      data: initialData,
      now: Date.now(),
      labels: getWebviewLabels()
    });

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <title>Task Timer</title>
  <style>
    :root {
      color-scheme: dark;
      --bg: #111820;
      --panel: #17212b;
      --panel-2: #1d2934;
      --line: rgba(255,255,255,.1);
      --text: #eef4f7;
      --muted: #93a2ad;
      --teal: #48d6c4;
      --green: #62d180;
      --amber: #f4b942;
      --blue: #5f9cff;
      --red: #f06a6a;
      --radius: 8px;
    }

    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 12px;
      color: var(--text);
      background: linear-gradient(180deg, #101820 0%, #0c1218 100%);
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
    }

    button {
      border: 1px solid var(--line);
      border-radius: 6px;
      color: var(--text);
      background: #22303b;
      min-height: 28px;
      padding: 4px 8px;
      font: inherit;
      cursor: pointer;
    }

    button:hover { border-color: rgba(72,214,196,.65); background: #283946; }
    button.primary { background: rgba(72,214,196,.18); border-color: rgba(72,214,196,.55); color: #dffdf8; }
    button.danger:hover { border-color: rgba(240,106,106,.7); background: rgba(240,106,106,.15); }
    button.icon { width: 28px; padding: 0; display: inline-grid; place-items: center; }

    .topbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      margin-bottom: 12px;
    }

    .brand { display: flex; align-items: center; gap: 8px; min-width: 0; }
    .mark {
      width: 30px;
      height: 30px;
      border: 1px solid rgba(72,214,196,.6);
      border-radius: 50%;
      display: grid;
      place-items: center;
      color: var(--teal);
      background: rgba(72,214,196,.12);
      font-weight: 700;
    }
    .title { font-weight: 700; letter-spacing: .02em; }
    .subtitle { color: var(--muted); font-size: 11px; margin-top: 2px; }

    .summary {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 8px;
      margin-bottom: 12px;
    }

    .metric {
      border: 1px solid var(--line);
      border-radius: var(--radius);
      background: rgba(255,255,255,.035);
      padding: 8px;
      min-width: 0;
    }
    .metric .label { color: var(--muted); font-size: 10px; text-transform: uppercase; }
    .metric .value { margin-top: 3px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

    .empty {
      border: 1px dashed rgba(72,214,196,.4);
      border-radius: var(--radius);
      padding: 18px 12px;
      text-align: center;
      background: rgba(72,214,196,.06);
    }
    .empty h2 { margin: 0 0 8px; font-size: 16px; }
    .empty p { margin: 0 0 14px; color: var(--muted); line-height: 1.4; }

    .story {
      border: 1px solid var(--line);
      border-radius: var(--radius);
      background: linear-gradient(180deg, rgba(255,255,255,.055), rgba(255,255,255,.025));
      overflow: hidden;
      margin-bottom: 10px;
    }

    .story-header {
      padding: 10px;
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 8px;
      border-left: 3px solid var(--teal);
    }
    .story-title { font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .story-heading { min-width: 0; cursor: pointer; }
    .chevron { color: var(--muted); display: inline-block; width: 16px; }
    .story-id { color: var(--teal); margin-right: 4px; }
    .story-meta { color: var(--muted); margin-top: 4px; font-size: 11px; }
    .story-actions, .task-actions { display: flex; gap: 4px; flex-wrap: wrap; justify-content: flex-end; }

    .progress {
      height: 4px;
      background: rgba(255,255,255,.08);
      overflow: hidden;
    }
    .progress > span {
      display: block;
      height: 100%;
      background: linear-gradient(90deg, var(--teal), var(--green));
      width: 0;
    }

    .tasks { padding: 6px; }
    .task {
      display: grid;
      grid-template-columns: 22px minmax(0, 1fr);
      gap: 7px;
      padding: 8px 4px;
      border-radius: 6px;
      border-bottom: 1px solid rgba(255,255,255,.055);
    }
    .task:last-child { border-bottom: 0; }
    .task:hover { background: rgba(255,255,255,.035); }

    .status {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      border: 2px solid var(--muted);
      margin-top: 2px;
    }
    .status.active { border-color: var(--teal); box-shadow: 0 0 0 4px rgba(72,214,196,.1); }
    .status.finished { border-color: var(--green); background: rgba(98,209,128,.22); }
    .status.paused { border-color: var(--amber); }

    .task-main { min-width: 0; }
    .task-line { display: flex; justify-content: space-between; gap: 8px; }
    .task-title { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 600; }
    .task-stats { display: flex; gap: 8px; color: var(--muted); font-size: 11px; margin-top: 5px; flex-wrap: wrap; }
    .actual { color: var(--teal); }
    .over { color: var(--amber); }
    .task-actions { margin-top: 8px; justify-content: flex-start; }
    .small { min-height: 24px; padding: 2px 7px; font-size: 11px; }

    @media (max-width: 280px) {
      .summary { grid-template-columns: 1fr; }
      .story-header { grid-template-columns: 1fr; }
      .story-actions { justify-content: flex-start; }
      .task-line { display: block; }
    }
  </style>
</head>
<body>
  <div class="topbar">
    <div class="brand">
      <div class="mark">T</div>
      <div>
        <div class="title">${localize('taskTimer')}</div>
        <div class="subtitle">${localize('dashboardSubtitle')}</div>
      </div>
    </div>
    <button class="icon primary" title="${localize('createUserStory')}" data-command="createStory">+</button>
  </div>

  <div id="app"></div>

  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    const initial = ${initialJson};
    let state = initial.data || { userStories: [] };
    let labels = initial.labels || {};
    let serverNow = initial.now || Date.now();
    let receivedAt = Date.now();

    window.addEventListener('message', event => {
      if (event.data.type !== 'data') return;
      state = event.data.data || { userStories: [] };
      if (event.data.labels) labels = event.data.labels;
      serverNow = event.data.now || Date.now();
      receivedAt = Date.now();
      render();
    });

    document.addEventListener('click', event => {
      const button = event.target.closest('button[data-command]');
      if (!button) {
        const header = event.target.closest('[data-toggle-story]');
        if (header) toggleStory(header.dataset.toggleStory);
        return;
      }
      if (button.dataset.command === 'toggleStory') {
        toggleStory(button.dataset.storyId);
        return;
      }
      vscode.postMessage({
        command: button.dataset.command,
        storyId: button.dataset.storyId,
        taskId: button.dataset.taskId
      });
    });

    setInterval(renderTimesOnly, 1000);
    render();

    function now() {
      return serverNow + (Date.now() - receivedAt);
    }

    function render() {
      const stories = state.userStories || [];
      const app = document.getElementById('app');
      if (!stories.length) {
        app.innerHTML = '<section class="empty"><h2>' + escapeHtml(labels.noStoriesTitle) + '</h2><p>' + escapeHtml(labels.noStoriesBody) + '</p><button class="primary" data-command="createStory">' + escapeHtml(labels.createUserStory) + '</button></section>';
        return;
      }

      app.innerHTML = renderSummary(stories) + stories.map(renderStory).join('');
      renderTimesOnly();
    }

    function renderSummary(stories) {
      const tasks = stories.flatMap(story => story.tasks || []);
      const active = tasks.filter(task => task.status === 'active').length;
      const estimate = tasks.reduce((sum, task) => sum + (task.estimateMs || 0), 0);
      const actual = tasks.reduce((sum, task) => sum + actualMs(task), 0);
      return '<section class="summary">' +
        metric(labels.active, active) +
        metric(labels.estimate, formatDuration(estimate)) +
        metric(labels.actual, formatDuration(actual)) +
      '</section>';
    }

    function metric(label, value) {
      return '<div class="metric"><div class="label">' + escapeHtml(label) + '</div><div class="value">' + escapeHtml(String(value)) + '</div></div>';
    }

    function renderStory(story) {
      const tasks = story.tasks || [];
      const collapsed = isCollapsed(story.id);
      const finished = tasks.filter(task => task.status === 'finished').length;
      const estimate = tasks.reduce((sum, task) => sum + (task.estimateMs || 0), 0);
      const actual = tasks.reduce((sum, task) => sum + actualMs(task), 0);
      const progress = tasks.length ? Math.round((finished / tasks.length) * 100) : 0;
      const title = (story.externalId ? '<span class="story-id">' + escapeHtml(story.externalId) + '</span>' : '') + escapeHtml(story.title);
      const emptyTasks = '<div class="empty"><p>' + escapeHtml(labels.noTasksBody) + '</p><button class="small primary" data-command="addTask" data-story-id="' + story.id + '">' + escapeHtml(labels.addTask) + '</button></div>';
      return '<section class="story">' +
        '<div class="story-header">' +
          '<div class="story-heading" data-toggle-story="' + story.id + '" title="' + (collapsed ? escapeHtml(labels.expandStory) : escapeHtml(labels.collapseStory)) + '">' +
            '<div class="story-title"><span class="chevron">' + (collapsed ? '›' : '⌄') + '</span>' + title + '</div>' +
            '<div class="story-meta">' + finished + '/' + tasks.length + ' ' + escapeHtml(labels.done) + ' | ' + escapeHtml(labels.actual) + ' ' + formatDuration(actual) + ' | ' + escapeHtml(labels.est) + ' ' + formatDuration(estimate) + '</div>' +
          '</div>' +
          '<div class="story-actions">' +
            button('toggleStory', story.id, '', collapsed ? labels.open : labels.hide, collapsed ? labels.expandStory : labels.collapseStory) +
            button('addTask', story.id, '', '+', labels.addTaskTitle) +
            button('copyStoryReport', story.id, '', labels.copy, labels.copyReportTitle) +
            button('editStory', story.id, '', labels.edit, labels.editStoryTitle) +
            button('deleteStory', story.id, '', labels.deleteShort, labels.deleteStoryTitle, 'danger') +
          '</div>' +
        '</div>' +
        '<div class="progress"><span style="width:' + progress + '%"></span></div>' +
        (collapsed ? '' : '<div class="tasks">' + (tasks.length ? tasks.map(task => renderTask(story, task)).join('') : emptyTasks) + '</div>') +
      '</section>';
    }

    function renderTask(story, task) {
      const actual = actualMs(task);
      const estimate = task.estimateMs || 0;
      const overClass = estimate > 0 && actual > estimate ? ' over' : '';
      return '<div class="task" data-task-id="' + task.id + '">' +
        '<div class="status ' + escapeHtml(task.status) + '"></div>' +
        '<div class="task-main">' +
          '<div class="task-line"><div class="task-title">' + escapeHtml(task.title) + '</div></div>' +
          '<div class="task-stats">' +
            '<span>' + escapeHtml(localizedStatus(task.status)) + '</span>' +
            '<span class="actual' + overClass + '" data-time-task="' + task.id + '">' + escapeHtml(labels.actual) + ' ' + formatDuration(actual) + '</span>' +
            '<span>' + escapeHtml(labels.est) + ' ' + formatDuration(estimate) + '</span>' +
          '</div>' +
          '<div class="task-actions">' + renderTaskActions(story, task) + '</div>' +
        '</div>' +
      '</div>';
    }

    function renderTaskActions(story, task) {
      const parts = [];
      if (task.status === 'todo' || task.status === 'paused') parts.push(button('startTask', story.id, task.id, labels.start));
      if (task.status === 'active') parts.push(button('pauseTask', story.id, task.id, labels.pause));
      if (task.status !== 'finished') parts.push(button('finishTask', story.id, task.id, labels.finish));
      if (task.status === 'finished') parts.push(button('reopenTask', story.id, task.id, labels.reopen));
      parts.push(button('editTask', story.id, task.id, labels.edit));
      parts.push(button('editTime', story.id, task.id, labels.time));
      parts.push(button('deleteTask', story.id, task.id, labels.deleteShort, labels.deleteTask, 'danger'));
      return parts.join('');
    }

    function button(command, storyId, taskId, label, title, className) {
      return '<button class="small ' + (className || '') + '" title="' + escapeHtml(title || label) + '" data-command="' + command + '" data-story-id="' + (storyId || '') + '" data-task-id="' + (taskId || '') + '">' + escapeHtml(label) + '</button>';
    }

    function renderTimesOnly() {
      for (const story of state.userStories || []) {
        for (const task of story.tasks || []) {
          const target = document.querySelector('[data-time-task="' + task.id + '"]');
          if (!target) continue;
          const actual = actualMs(task);
          const over = task.estimateMs > 0 && actual > task.estimateMs;
          target.textContent = labels.actual + ' ' + formatDuration(actual);
          target.className = 'actual' + (over ? ' over' : '');
        }
      }
    }

    function toggleStory(storyId) {
      if (!storyId) return;
      const collapsed = new Set((vscode.getState() || {}).collapsedStories || []);
      if (collapsed.has(storyId)) collapsed.delete(storyId);
      else collapsed.add(storyId);
      vscode.setState({ collapsedStories: Array.from(collapsed) });
      render();
    }

    function isCollapsed(storyId) {
      return ((vscode.getState() || {}).collapsedStories || []).includes(storyId);
    }

    function actualMs(task) {
      const sessions = task.sessions || [];
      const sessionMs = sessions.reduce((total, session) => {
        const start = Date.parse(session.startedAt);
        const end = session.endedAt ? Date.parse(session.endedAt) : now();
        return Number.isFinite(start) && Number.isFinite(end) && end > start ? total + (end - start) : total;
      }, 0);
      return Math.max(0, sessionMs + (task.manualAdjustmentMs || 0));
    }

    function formatDuration(ms) {
      const totalMinutes = Math.round(ms / 60000);
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      if (hours === 0) return minutes + 'm';
      if (minutes === 0) return hours + 'h';
      return hours + 'h ' + minutes + 'm';
    }

    function capitalize(value) {
      return String(value || '').charAt(0).toUpperCase() + String(value || '').slice(1);
    }

    function localizedStatus(status) {
      if (status === 'active') return labels.statusActive;
      if (status === 'paused') return labels.statusPaused;
      if (status === 'finished') return labels.statusFinished;
      return labels.statusTodo;
    }

    function escapeHtml(value) {
      return String(value ?? '').replace(/[&<>"']/g, char => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      }[char]));
    }
  </script>
</body>
</html>`;
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
      this.item.text = `$(watch) ${localize('taskTimer')}`;
      this.item.tooltip = localize('clickQuickActions');
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
    this.item.text = `$(watch) ${localize('activeCount', { count: activeTasks.length })}: ${formatDuration(total)}`;
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
      label: `$(add) ${localize('createUserStory')}`,
      description: localize('quickCreateStoryDesc'),
      command: 'tasktimer.createUserStory'
    },
    {
      label: `$(checklist) ${localize('addTask')}`,
      description: data.userStories.length > 0 ? localize('quickAddTaskDesc') : localize('quickCreateStoryFirst'),
      command: 'tasktimer.addTask',
      unavailableMessage: data.userStories.length === 0 ? localize('createStoryFirstMessage') : undefined
    },
    {
      label: `$(play) ${localize('startOrResumeTask')}`,
      description: startableCount > 0 ? localize('quickStartTaskDesc') : localize('noTodoPaused'),
      command: 'tasktimer.startTask',
      unavailableMessage: startableCount === 0 ? localize('noStartableTasks') : undefined
    },
    {
      label: `$(debug-pause) ${localize('pauseActiveTask')}`,
      description: activeCount > 0 ? localize('activeCount', { count: activeCount }) : localize('noActiveTimers'),
      command: 'tasktimer.pauseTask',
      unavailableMessage: activeCount === 0 ? localize('noActiveTimersRunning') : undefined
    },
    {
      label: `$(pass) ${localize('finishTask')}`,
      description: finishableCount > 0 ? localize('closeTaskDesc') : localize('noUnfinishedTasks'),
      command: 'tasktimer.finishTask',
      unavailableMessage: finishableCount === 0 ? localize('noFinishableTasks') : undefined
    },
    {
      label: `$(calendar) ${localize('copyDailyReport')}`,
      description: localize('copyTodayMarkdown'),
      command: 'tasktimer.copyDailyReport'
    }
  ], {
    title: localize('taskTimer'),
    placeHolder: localize('quickPlaceholder'),
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
  const title = await vscode.window.showInputBox({ title: localize('createUserStory'), prompt: localize('userStoryTitle'), ignoreFocusOut: true });
  if (!title) {
    return;
  }

  const externalId = await vscode.window.showInputBox({ title: localize('userStoryId'), prompt: localize('optionalUserStoryId'), ignoreFocusOut: true });
  const description = await vscode.window.showInputBox({ title: localize('description'), prompt: localize('optionalDescription'), ignoreFocusOut: true });
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

  const addTaskLabel = localize('addTask');
  const next = await vscode.window.showInformationMessage(localize('userStoryCreated'), addTaskLabel);
  if (next === addTaskLabel) {
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
    title: localize('editUserStory'),
    prompt: localize('userStoryTitle'),
    value: story.title,
    ignoreFocusOut: true
  });
  if (!title) {
    return;
  }

  const externalId = await vscode.window.showInputBox({
    title: localize('userStoryId'),
    prompt: localize('optionalUserStoryId'),
    value: story.externalId ?? '',
    ignoreFocusOut: true
  });
  if (externalId === undefined) {
    return;
  }

  const description = await vscode.window.showInputBox({
    title: localize('description'),
    prompt: localize('optionalDescription'),
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
    localize('deleteStoryConfirm', {
      story: formatStoryLabel(story),
      count: taskCount,
      taskWord: taskCount === 1 ? localize('taskSingular') : localize('taskPlural')
    }),
    { modal: true },
    localize('delete')
  );
  if (confirmation !== localize('delete')) {
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

  const title = await vscode.window.showInputBox({ title: localize('addTask'), prompt: localize('taskTitle'), ignoreFocusOut: true });
  if (!title) {
    return;
  }

  const estimate = await vscode.window.showInputBox({
    title: localize('taskEstimate'),
    prompt: localize('estimatePrompt'),
    ignoreFocusOut: true,
    validateInput: (value) => parseDuration(value) === undefined ? localize('estimateValidation') : undefined
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

  const startTimerLabel = localize('startTimer');
  const next = await vscode.window.showInformationMessage(localize('taskAdded'), startTimerLabel);
  if (next === startTimerLabel) {
    await startTask(store, { kind: 'task', story, task });
  }
}

async function editTask(store: TaskTimerStore, node?: TreeNode): Promise<void> {
  const selected = await resolveTask(store, node);
  if (!selected) {
    return;
  }

  const title = await vscode.window.showInputBox({
    title: localize('editTask'),
    prompt: localize('taskTitle'),
    value: selected.task.title,
    ignoreFocusOut: true
  });
  if (!title) {
    return;
  }

  const estimate = await vscode.window.showInputBox({
    title: localize('taskEstimate'),
    prompt: localize('estimatePrompt'),
    value: formatDuration(selected.task.estimateMs),
    ignoreFocusOut: true,
    validateInput: (value) => parseDuration(value) === undefined ? localize('estimateValidation') : undefined
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
    localize('deleteTaskConfirm', { task: selected.task.title, actual: formatDuration(actual) }),
    { modal: true },
    localize('delete')
  );
  if (confirmation !== localize('delete')) {
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

  const note = await vscode.window.showInputBox({ title: localize('finishTaskTitle'), prompt: localize('optionalCompletionNote'), ignoreFocusOut: true });
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
    title: localize('editActualTime'),
    prompt: localize('editActualPrompt'),
    value: formatDuration(current),
    ignoreFocusOut: true,
    validateInput: (input) => parseDuration(input) === undefined ? localize('estimateValidation') : undefined
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
  vscode.window.showInformationMessage(localize('storyReportCopied'));
}

async function copyDailyReport(store: TaskTimerStore): Promise<void> {
  const data = await store.getData();
  await vscode.env.clipboard.writeText(createDailyReport(data, new Date()));
  vscode.window.showInformationMessage(localize('dailyReportCopied'));
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
    vscode.window.showInformationMessage(localize('noMatchingTasks'));
    return undefined;
  }

  const picked = await vscode.window.showQuickPick(
    candidates.map(({ story, task }) => ({
      label: task.title,
      description: `${shortStoryName(story)} | ${capitalize(task.status)} | ${formatDuration(getTaskActualMs(task))}`,
      storyId: story.id,
      taskId: task.id
    })),
    { title: localize('selectTask'), ignoreFocusOut: true }
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
    vscode.window.showInformationMessage(localize('createStoryFirstMessage'));
    return undefined;
  }

  const picked = await vscode.window.showQuickPick(
    data.userStories.map((story) => ({
      label: story.title,
      description: story.externalId ? `ID: ${story.externalId}` : undefined,
      id: story.id
    })),
    { title: localize('selectUserStory'), ignoreFocusOut: true }
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
      title: rawStory.title || localize('untitledUserStory'),
      externalId: rawStory.externalId ?? rawStory.azureWorkItemId,
      description: rawStory.description,
      createdAt: rawStory.createdAt || new Date().toISOString(),
      tasks: Array.isArray(rawStory.tasks) ? rawStory.tasks.map((task) => ({
        id: task.id || createId(),
        title: task.title || localize('untitledTask'),
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
    `# ${localize('timeReportFor')} ${story.externalId ? `${story.externalId} - ` : ''}${story.title}`,
    '',
    `${localize('estimated')}: ${formatDuration(estimate)}`,
    `${localize('actual')}: ${formatDuration(actual)}`,
    `${localize('difference')}: ${formatSignedDuration(diff)}`,
    `${localize('tasks')}: ${story.tasks.filter((task) => task.status === 'finished').length}/${story.tasks.length} ${localize('done')}`,
    '',
    `## ${localize('tasks')}`
  ];

  for (const task of story.tasks) {
    lines.push(`- ${task.title}: ${localize('estimated')} ${formatDuration(task.estimateMs)}, ${localize('actual')} ${formatDuration(getTaskActualMs(task))}, ${localize('status').toLowerCase()} ${localizedStatus(task.status)}`);
    for (const note of task.notes) {
      lines.push(`  - ${localize('note')}: ${note}`);
    }
  }

  lines.push('', `## ${localize('sessions')}`);
  for (const task of story.tasks) {
    for (const session of task.sessions) {
      lines.push(`- ${task.title}: ${formatDateTime(session.startedAt)} - ${session.endedAt ? formatDateTime(session.endedAt) : localize('running')}`);
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
    `# ${localize('dailyWorkLog')} - ${dayKey}`,
    '',
    ...entries.length > 0 ? entries : [localize('noTrackedSessions')],
    '',
    `${localize('totalTrackedTaskTime')}: ${formatDuration(total)}`,
    '',
    localize('overlapNote')
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
  return `${localizedStatus(task.status)} | ${localize('actual')} ${formatDuration(getTaskActualMs(task))} | ${localize('est')} ${formatDuration(task.estimateMs)}`;
}

function localizedStatus(status: TaskStatus): string {
  switch (status) {
    case 'active':
      return localize('statusActive');
    case 'paused':
      return localize('statusPaused');
    case 'finished':
      return localize('statusFinished');
    default:
      return localize('statusTodo');
  }
}

function createStoryTooltip(story: UserStory): string {
  return [
    formatStoryLabel(story),
    story.description,
    `${localize('estimated')}: ${formatDuration(getStoryEstimateMs(story))}`,
    `${localize('actual')}: ${formatDuration(getStoryActualMs(story))}`,
    `${localize('difference')}: ${formatSignedDuration(getStoryActualMs(story) - getStoryEstimateMs(story))}`
  ].filter(Boolean).join('\n');
}

function createTaskTooltip(task: TaskItem): string {
  return [
    task.title,
    `${localize('status')}: ${localizedStatus(task.status)}`,
    `${localize('estimated')}: ${formatDuration(task.estimateMs)}`,
    `${localize('actual')}: ${formatDuration(getTaskActualMs(task))}`,
    `${localize('difference')}: ${formatSignedDuration(getTaskActualMs(task) - task.estimateMs)}`,
    task.notes.length > 0 ? `${localize('notes')}: ${task.notes.join('; ')}` : undefined
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

function getLanguage(): Language {
  const value = vscode.workspace.getConfiguration('tasktimer').get<string>('language', 'en');
  return value === 'es' ? 'es' : 'en';
}

function localize(key: TranslationKey, values: Record<string, string | number> = {}): string {
  let template: string = translations[getLanguage()][key] ?? translations.en[key];
  for (const [name, value] of Object.entries(values)) {
    template = template.replace(new RegExp(`\\{${name}\\}`, 'g'), String(value));
  }
  return template;
}

function getWebviewLabels(): Record<TranslationKey, string> {
  return { ...translations[getLanguage()] };
}

async function setLanguage(): Promise<void> {
  const picked = await vscode.window.showQuickPick([
    { label: localize('english'), value: 'en' as Language },
    { label: localize('spanish'), value: 'es' as Language }
  ], {
    title: localize('changeLanguage'),
    ignoreFocusOut: true
  });

  if (!picked) {
    return;
  }

  await vscode.workspace.getConfiguration('tasktimer').update('language', picked.value, vscode.ConfigurationTarget.Global);
  vscode.window.showInformationMessage(localize('languageChanged'));
}

function createNonce(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let value = '';
  for (let index = 0; index < 32; index += 1) {
    value += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return value;
}

function escapeJsonForHtml(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function isFileNotFound(error: unknown): boolean {
  return error instanceof vscode.FileSystemError && error.code === 'FileNotFound';
}
