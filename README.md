# ToDo4VCode

[![Marketplace Version](https://img.shields.io/visual-studio-marketplace/v/yurierherrera.todo4vcode?style=flat-square)](https://marketplace.visualstudio.com/items?itemName=yurierherrera.todo4vcode)
[![Installs](https://img.shields.io/visual-studio-marketplace/i/yurierherrera.todo4vcode?style=flat-square)](https://marketplace.visualstudio.com/items?itemName=yurierherrera.todo4vcode)
[![Open VSX Version](https://img.shields.io/open-vsx/v/YurierHerrera/todo4vcode?style=flat-square)](https://open-vsx.org/extension/YurierHerrera/todo4vcode)
[![Open VSX Downloads](https://img.shields.io/open-vsx/dt/YurierHerrera/todo4vcode?style=flat-square)](https://open-vsx.org/extension/YurierHerrera/todo4vcode)

Stop drowning in endless todo lists. **ToDo4VCode** is a professional task management extension for VS Code that helps you organize project tasks by their true impact, ensuring you always focus on what matters most.

## 🚀 Smart Prioritization

This extension uses the proven MoSCoW technique to help you categorize tasks effectively:

- **Must (M)**: Critical tasks that are non-negotiable for the current milestone.
- **Should (S)**: Important tasks that should be done, but aren't vital.
- **Could (C)**: "Nice to have" tasks that add value if time permits.
- **Won't (W)**: Tasks acknowledged as not being a priority for now.

## ✨ Key Features

- 🎯 **Impact-Driven Organization**: Categorize tasks by priority to maintain focus.
- 📁 **Workspace-Specific Lists**: Keep your project tasks isolated and relevant to your current work.
- 📊 **Multiple Views**: Switch between a clean **List View** and a productive **Kanban Board**, or open tasks in **Full Screen** mode for focused work.
- 📈 **StatusBar Statistics**: Real-time task statistics displayed in VS Code's status bar with detailed tooltip on hover.
- ✅ **Subtasks Support**: Break down complex tasks into manageable subtasks with progress tracking.
- 🔔 **Smart Reminders**: Integrated VS Code notifications for upcoming deadlines.
- 🧹 **Zero Clutter**: Data is stored securely in VS Code's internal storage.
- 🌓 **Native Integration**: Fully supports VS Code themes and Codicons for a seamless experience.
- ⚡ **Auto-Activation**: Extension activates automatically when VS Code starts, no manual setup required.

## 📊 StatusBar Statistics

ToDo4VCode automatically displays task statistics in VS Code's status bar (bottom-right corner). The status bar item shows a quick summary of your most critical tasks:

- **Display**: Shows count of "Must" priority tasks and tasks "In Progress"
- **Tooltip**: Hover over the status bar item to see detailed statistics including:
  - Total number of tasks
  - Completed tasks count
  - Must priority tasks count
  - Tasks in progress
  - Overdue tasks count

The statistics update in real-time as you manage your tasks. You can customize which statistics appear in the tooltip through VS Code settings.

## 📸 Features in Action

### 1. Main Interface (Hero Shot)
The extension integrates perfectly into your VS Code sidebar, providing a clean and professional look.
![ToDo4VCode - Main Interface](./media/preview/preview-1-hero-shot.png)

### 2. Organized List View
Manage your tasks with clear priorities and due dates. The UI highlights urgent tasks so you never miss a deadline.
![ToDo4VCode - List View](./media/preview/preview-2-list-view.png)

### 3. Productive Kanban Board
Visualize your workflow and move tasks between states with our intuitive Kanban board.
![ToDo4VCode - Kanban View](./media/preview/preview-3-kanban-view.png)

### 4. Smart Calendar & Reminders
Set due dates with a clean, integrated calendar. Get notified when tasks are due.
![ToDo4VCode - Calendar & Reminders](./media/preview/preview-4-calendar-reminders.png)

### 5. Detailed Task Management
Edit every detail of your tasks, including descriptions and specific priorities, in a focused modal.
![ToDo4VCode - Task Details](./media/preview/preview-5-modal-details.png)

### 6. Full Theme Support
Whether you prefer Dark or Light themes, ToDo4VCode adapts beautifully to your workspace.
![ToDo4VCode - Light Theme Support](./media/preview/preview-6-light-theme.png)

## 🛠 How to Use

1. **StatusBar**: The extension activates automatically when VS Code starts. Check the status bar (bottom-right) to see your task summary at a glance. Hover over it for detailed statistics.

2. **Open the Sidebar**: Click the Priority Tasks icon in the Activity Bar to access the full task management interface.

3. **Add a Task**: Type your task name, set a priority, and add an optional description or due date. You can also add reminders for important deadlines.

4. **Manage Tasks**: 
   - **Drag and Drop**: Move tasks between columns in Kanban mode or reorder them in List view
   - **Context Menu**: Right-click any task to quickly update status, priority, or add dates/reminders
   - **Task Modal**: Click on a task to open detailed view where you can edit all properties

5. **Subtasks**: Open a task's detail modal to add subtasks. Track progress with the completion counter (X/Y completed).

6. **Full Screen Mode**: Click the "Open in full screen" button in the sidebar header for a distraction-free task management experience.

7. **Focus**: See your pending high-priority tasks at a glance in the status bar and sidebar.

## ✅ Subtasks

Break down complex tasks into smaller, manageable subtasks:

1. **Add Subtasks**: Open any task's detail modal and scroll to the "Subtasks" section. Click "Add subtask" and type your subtask name.

2. **Manage Subtasks**: 
   - **Complete**: Click the checkbox next to a subtask to mark it as done
   - **Edit**: Click on the subtask text to edit it inline
   - **Delete**: Click the trash icon to remove a subtask

3. **Track Progress**: The subtasks section header shows completion progress (e.g., "3/5" means 3 out of 5 subtasks completed).

4. **Hide Completed**: Toggle the "Hide completed" button to focus only on remaining subtasks.

Subtasks help you track detailed progress within larger tasks and maintain clarity on what needs to be done.

## ⚙️ Configuration

You can customize the extension behavior in your VS Code settings:

### Task Management
- `todo4vcode.hideCompleted`: Toggle to hide or show completed tasks in your list.
- `todo4vcode.defaultPriority`: Set the default priority for newly created tasks (Must, Should, Could, Wont).

### Statistics Display
Configure which statistics appear in the StatusBar tooltip:

- `todo4vcode.stats.showTotal`: Show total number of tasks (default: `true`)
- `todo4vcode.stats.showDone`: Show number of completed tasks (default: `true`)
- `todo4vcode.stats.showMust`: Show number of Must priority tasks (default: `true`)
- `todo4vcode.stats.showInProgress`: Show number of tasks in progress (default: `true`)
- `todo4vcode.stats.showOverdue`: Show number of overdue tasks (default: `true`)

To configure these settings, open VS Code Settings (Cmd/Ctrl + ,) and search for "todo4vcode".

## 💻 Development & Installation

### Development Mode
1. Clone the repository.
2. Run `npm install`.
3. Press `F5` to open the **Extension Development Host**.

### Permanent Installation (VSIX)
1. Install `vsce`: `npm install -g @vscode/vsce`.
2. Package: `vsce package`.
3. Install the generated `.vsix` file via the Extensions view.


## 🤝 Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for detailed guidelines on:
- Setting up your development environment
- Code style guidelines
- Pull request process

---
*Built with ❤️ for developers who value their time.*
