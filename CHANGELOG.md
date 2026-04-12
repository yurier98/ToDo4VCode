# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.3.0] - 2026-04-12

### Added
- **Calendar view across sidebar and full screen**:
  - Compact monthly calendar in sidebar with month navigation and **Today** action
  - Selected-day highlight and priority indicator dots (MoSCoW colors)
  - Full-screen planning workflow with drag-and-drop matrix:
    - `No date -> day`
    - `day -> day`
    - `day -> No date`
- **No-date planning lane in full calendar**:
  - Collapsible section (expanded by default)
  - Counter badge and dedicated scrollable list
  - Drop zone to clear due dates directly by drag-and-drop
- **Task filtering and tagging enhancements**:
  - Search and tag filters integrated into task workflows
  - Improved tag handling for better planning and grouping
- **Code-aware tasking features**:
  - Create a task from selected code
  - Attach selected code to an existing task
  - Code reference links with support for single lines and ranges
- **Shared tasks for team workflows via Git**:
  - Optional workspace-backed task storage in `.todo4vcode/shared-tasks.json`
  - Automatic sync/refresh behavior for shared task updates
- **Automatic comment-scan import**:
  - Import `TODO`, `FIXME`, and `NOTE` comments as tasks from workspace files

### Improved
- Webview architecture modularization for better maintainability of rendering, interactions, and styles.
- Import/export flow with better file dialog behavior and logging consistency.
- Subtask input UX with textarea auto-resize and improved keyboard handling.
- UI/visual polish:
  - Flatpickr calendar styling refresh
  - Icon sizing consistency in list layout
  - Optimized preview assets using WEBP images
- Documentation updates for VS Code-compatible editors and full-calendar planning showcase.

### Fixed
- Selected-day panel now renders from filtered task sources consistently.
- Build/test reliability improved by cleaning stale `out/` artifacts before TypeScript compile, preventing outdated test files from affecting release validation.

## [1.2.0] - 2026-01-25

### Added
- **Configuration Panel**: Comprehensive settings management panel accessible from the sidebar with sections for:
  - General preferences (Hide Completed Tasks, Default Priority)
  - Statistics display configuration
  - Notification settings (Reminder sounds)
  - Data Management (Import/Export, Clear All Data)
- **Import/Export Workspace Data**: 
  - Export all tasks, settings, and configurations to JSON file
  - Import previously exported data to restore workspace state
  - JSON format compatible with coding tools and AI agents for task planning
  - Default export location set to Downloads folder
- **Clear All Data**: Option to delete all tasks with safety confirmation dialog
  - Destructive action clearly marked with error-colored button
  - Confirmation dialog defaults to "No" for safety
- **Automatic Settings Synchronization**: 
  - "Hide Completed Tasks" setting now automatically syncs across all views (sidebar and full screen)
  - Changes in configuration panel immediately reflect in active task views

### Fixed
- **Subtask Auto-Save**: Subtasks typed in the input field are now automatically saved when saving the task modal, preventing data loss
- **Settings Synchronization**: Configuration settings now properly sync between settings panel and task views

### Improved
- Enhanced UI for configuration panel with modern card-based layout
- Better button styling with error state indicators for destructive actions
- Improved visual feedback for configuration toggles and actions
- Export functionality defaults to Downloads folder for better user experience

## [1.1.0] - Previous Release

### Added
- Enhanced task statistics and UI updates
- Independent state persistence for sidebar and full-screen views
- Improved date colors and modal enhancements
- Badge redesign for better visual clarity
- Entire task card/row clickable to open modal
- Full view with task modal from reminder notifications

### Fixed
- Activation events updated to specify view trigger
- Multiple full-screen panels prevention
- Date color updates for better consistency

## [1.0.1] - Previous Release

Initial stable release with core task management features.

## [1.0.0] - Initial Release

First public release of ToDo4VCode with:
- MoSCoW priority system
- List and Kanban views
- Task management with due dates and reminders
- Subtasks support
- StatusBar statistics
- Full theme support
