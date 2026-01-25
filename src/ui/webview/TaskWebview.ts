import * as vscode from 'vscode';
import { TodoItem } from '../../core/models/task';
import { UI, PRIORITIES, STATUSES } from '../../constants';
import { MEDIA_PATHS } from '../../core/constants/media-paths';

export class TaskWebview {
    public static getHtml(webview: vscode.Webview, extensionUri: vscode.Uri, tasks: TodoItem[], viewType: 'sidebar' | 'full'): string {
        const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, MEDIA_PATHS.STYLES_MAIN_CSS));
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, MEDIA_PATHS.SCRIPT_MAIN_JS));
        const flatpickrCssUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, MEDIA_PATHS.FLATPICKR_CSS));
        const flatpickrDarkCssUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, MEDIA_PATHS.FLATPICKR_DARK_CSS));
        const flatpickrJsUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, MEDIA_PATHS.FLATPICKR_JS));
        const codiconsUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, MEDIA_PATHS.CODICONS_CSS));

        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>${UI.APP_TITLE}</title>
                <link rel="stylesheet" href="${codiconsUri}">
                <link rel="stylesheet" href="${flatpickrCssUri}">
                <link rel="stylesheet" href="${flatpickrDarkCssUri}">
                <link rel="stylesheet" href="${styleUri}">
                <script>
                    window.viewType = '${viewType}';
                </script>
            </head>
            <body>
                <div class="app-container">
                    <div class="top-bar">
                        <div class="app-title">${UI.APP_TITLE}</div>
                        <div class="flex-spacer"></div>
                        <div class="popover-wrapper">
                            <button id="formatBtn" class="format-btn format-btn-inline" onclick="toggleConfigPopover(event)" title="${UI.VIEW_CONFIG}">
                                <i class="codicon codicon-settings"></i>
                                <span>${UI.FORMAT}</span>
                            </button>

                            <div id="configPopover" class="popover">
                                <div class="popover-content">
                                        <div class="popover-section-title">${UI.VIEW}</div>
                                        <div class="view-mode-selector">
                                            <div class="view-mode-btn active" id="popoverBtnList" onclick="setViewMode('list')">
                                                <i class="codicon codicon-list-unordered"></i>
                                                <span>${UI.LIST}</span>
                                            </div>
                                            <div class="view-mode-btn" id="popoverBtnKanban" onclick="setViewMode('kanban')">
                                                <i class="codicon codicon-layout"></i>
                                                <span>${UI.BOARD}</span>
                                            </div>
                                            <div class="view-mode-btn disabled" title="${UI.COMING_SOON}">
                                                <i class="codicon codicon-calendar"></i>
                                                <span>${UI.CALENDAR}</span>
                                            </div>
                                        </div>

                                        <div class="popover-row toggle-row" onclick="toggleCompletedVisibility()">
                                            <span class="row-label">${UI.SHOW_COMPLETED}</span>
                                            <div class="toggle-switch">
                                                <div id="completedToggle" class="toggle-slider"></div>
                                            </div>
                                        </div>

                                        <div class="popover-divider"></div>

                                        <div class="popover-section-title">${UI.GROUP_BY}</div>
                                        <div class="popover-row" onclick="setGroupBy('status')">
                                            <i class="codicon codicon-issues"></i> 
                                            <span class="row-label">${UI.STATUS}</span>
                                            <i id="statusCheck" class="codicon codicon-check check-mark"></i>
                                        </div>
                                        <div class="popover-row" onclick="setGroupBy('priority')">
                                            <i class="codicon codicon-flag"></i> 
                                            <span class="row-label">${UI.PRIORITY}</span>
                                            <i id="priorityCheck" class="codicon codicon-check check-mark hidden"></i>
                                        </div>
                                        <div class="popover-row" onclick="setGroupBy('none')">
                                            <i class="codicon codicon-list-selection"></i> 
                                            <span class="row-label">${UI.NONE}</span>
                                            <i id="noneCheck" class="codicon codicon-check check-mark hidden"></i>
                                        </div>

                                        <div class="popover-divider"></div>

                                        <div class="popover-section-title">${UI.ORDER_BY}</div>
                                        <div class="popover-row" onclick="setSortBy('priority')">
                                            <i class="codicon codicon-flag"></i> 
                                            <span class="row-label">${UI.PRIORITY}</span>
                                            <i id="sortPriorityCheck" class="codicon codicon-check check-mark"></i>
                                        </div>
                                        <div class="popover-row" onclick="setSortBy('dueDate')">
                                            <i class="codicon codicon-calendar"></i> 
                                            <span class="row-label">${UI.DUE_DATE}</span>
                                            <i id="sortDueDateCheck" class="codicon codicon-check check-mark hidden"></i>
                                        </div>
                                        <div class="popover-row" onclick="setSortBy('title')">
                                            <i class="codicon codicon-whole-word"></i> 
                                            <span class="row-label">${UI.TITLE}</span>
                                            <i id="sortTitleCheck" class="codicon codicon-check check-mark hidden"></i>
                                        </div>
                                        <div class="popover-row" onclick="setSortBy('custom')">
                                            <i class="codicon codicon-move"></i> 
                                            <span class="row-label">${UI.CUSTOM}</span>
                                            <i id="sortCustomCheck" class="codicon codicon-check check-mark hidden"></i>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="input-sticky-container">
                            <div id="premiumInput" class="premium-input-card">
                                <div class="input-header-row">
                                    <span id="selectedDateTag" class="selected-date-tag hidden"></span>
                                    <input type="text" id="taskTitle" class="title-field" placeholder="${UI.TASK_NAME_PLACEHOLDER}">
                                </div>
                                <textarea id="taskDesc" class="desc-field" placeholder="${UI.DESCRIPTION_PLACEHOLDER}" rows="1" oninput="this.style.height = '';this.style.height = this.scrollHeight + 'px'"></textarea>
                                
                                <div class="input-footer">
                                    <div class="action-buttons-row">
                                        <div class="popover-wrapper">
                                            <button class="action-btn" id="dateBtn" title="${UI.DATE}" onclick="toggleDatePicker(event)">
                                                <i class="codicon codicon-calendar"></i>
                                                <span id="dateLabel">${UI.DATE}</span>
                                                <i class="codicon codicon-close clear-date-btn hidden" onclick="event.stopPropagation(); clearDate()"></i>
                                            </button>
                                        </div>

                                        <div class="popover-wrapper">
                                            <button class="action-btn" id="priorityFlagBtn" onclick="togglePriorityPicker(event)">
                                                <i class="codicon codicon-flag"></i>
                                                <span id="priorityLabel">${PRIORITIES.WONT}</span>
                                            </button>
                                        </div>

                                        <div class="popover-wrapper">
                                            <button class="action-btn" id="reminderBtn" title="${UI.REMINDER}" onclick="toggleReminderPicker(event)">
                                                <i class="codicon codicon-bell"></i>
                                                <span id="reminderLabel">${UI.REMINDER}</span>
                                                <i class="codicon codicon-close clear-date-btn hidden" id="clearReminderBtn" onclick="event.stopPropagation(); clearReminder()"></i>
                                            </button>
                                        </div>
                                    </div>
                                    <button class="btn-submit circle-btn" onclick="submitPremiumTask()" title="${UI.ADD_TASK}">
                                        <i class="codicon codicon-arrow-right"></i>
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div id="scroll-container">
                        <div id="listView" class="view-panel">
                            <div id="listTasks" class="task-list"></div>
                        </div>
                        <div id="kanbanView" class="board-container view-panel hidden"></div>
                    </div>
                </div>

                <div id="taskModal" class="modal-overlay hidden" onclick="closeTaskModal()">
                    <div class="modal-container" onclick="if(!event.target.closest('.premium-popover')) closeAllPopovers(true); event.stopPropagation()">
                        <button class="modal-close-btn-global" onclick="closeTaskModal()" title="Close">
                            <i class="codicon codicon-close"></i>
                        </button>
                        
                        <div class="modal-content-wrapper">
                            <div class="modal-section title-section-modern">
                                <div class="task-completion-wrapper">
                                    <div id="modalTaskCheckbox" class="priority-indicator" onclick="toggleMainTaskCompletion()"></div>
                                    <textarea id="modalTaskTitle" class="modal-title-input" placeholder="${UI.TASK_NAME_PLACEHOLDER}" rows="1" oninput="this.style.height = '';this.style.height = this.scrollHeight + 'px'"></textarea>
                                </div>
                            </div>

                            <div class="modal-main-content">
                                <div class="modal-scrollable-area">
                                    <div class="modal-section description-section">
                                        <div class="modal-section-header no-border">
                                            <i class="codicon codicon-menu"></i>
                                            <span>${UI.DESCRIPTION}</span>
                                        </div>
                                        <textarea id="modalTaskDesc" class="modal-desc-input" placeholder="${UI.DESCRIPTION_PLACEHOLDER}" rows="3"></textarea>
                                    </div>

                                    <div class="modal-section subtasks-section-modern">
                                        <div class="modal-section-header collapsible" onclick="toggleSubtasksCollapse()">
                                            <div class="header-left">
                                                <i id="subtasksChevron" class="codicon codicon-chevron-down"></i>
                                                <span>${UI.SUBTASKS}</span>
                                                <span id="subtaskProgress" class="progress-count-simple">0/0</span>
                                            </div>
                                            <div class="header-right">
                                                <button id="hideCompletedSubtasks" class="hide-completed-btn" onclick="event.stopPropagation(); toggleHideCompletedSubtasks()">
                                                    <i class="codicon codicon-eye-closed"></i>
                                                    <span>${UI.HIDE_COMPLETED_SUBTASKS}</span>
                                                </button>
                                            </div>
                                        </div>
                                        <div id="subtasksContainer" class="subtasks-collapsible-content">
                                            <div id="subtaskList" class="subtask-list-modern"></div>
                                            <div class="add-subtask-minimal" onclick="focusSubtaskInput()">
                                                <i class="codicon codicon-add"></i>
                                                <input type="text" id="newSubtaskInput" placeholder="${UI.ADD_SUBTASK_PLACEHOLDER}" onkeydown="if(event.key === 'Enter') addSubtask()">
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div class="modal-sidebar">
                                <div class="sidebar-header-spacer"></div>

                                <div class="sidebar-content">
                                    <div class="modal-grid">
                                        <div class="modal-grid-item" onclick="toggleStatusPicker(event)">
                                            <div class="grid-item-label">${UI.STATUS}</div>
                                            <div id="modalStatusValue" class="grid-item-value">
                                                <i class="codicon codicon-layers"></i>
                                                <span id="modalStatusLabel">${STATUSES.TODO}</span>
                                            </div>
                                        </div>
                                        <div class="modal-grid-item" onclick="togglePriorityPicker(event, true)">
                                            <div class="grid-item-label">${UI.PRIORITY}</div>
                                            <div id="modalPriorityValue" class="grid-item-value">
                                                <i class="codicon codicon-flag"></i>
                                                <span>${PRIORITIES.WONT}</span>
                                            </div>
                                        </div>
                                        <div class="modal-grid-item" onclick="toggleDatePicker(event, true)">
                                            <div class="grid-item-label">Due Date</div>
                                            <div id="modalDateValue" class="grid-item-value">
                                                <i class="codicon codicon-calendar"></i>
                                                <span>No date</span>
                                                <i class="codicon codicon-close clear-date-btn hidden" onclick="event.stopPropagation(); clearDate()"></i>
                                            </div>
                                        </div>
                                        <div class="modal-grid-item" onclick="toggleReminderPicker(event, true)">
                                            <div class="grid-item-label">${UI.REMINDER}</div>
                                            <div id="modalReminderValue" class="grid-item-value">
                                                <i class="codicon codicon-bell"></i>
                                                <span>No reminder</span>
                                                <i class="codicon codicon-close clear-date-btn hidden" onclick="event.stopPropagation(); clearReminder()"></i>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div class="sidebar-footer">
                                    <button class="modal-btn delete-btn" onclick="deleteTaskFromModal()">
                                        <span>${UI.DELETE}</span>
                                    </button>
                                    <button class="modal-btn primary-btn" onclick="saveTaskModal()">
                                        <span>${UI.SAVE}</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div id="statusPopover" class="premium-popover">
                    <div class="popover-item" onclick="setModalStatus('Todo')"><i class="codicon codicon-layers"></i> ${STATUSES.TODO}</div>
                    <div class="popover-item" onclick="setModalStatus('Ready')"><i class="codicon codicon-layers-active"></i> ${STATUSES.READY}</div>
                    <div class="popover-item" onclick="setModalStatus('In Progress')"><i class="codicon codicon-loading"></i> ${STATUSES.IN_PROGRESS}</div>
                    <div class="popover-item" onclick="setModalStatus('Testing')"><i class="codicon codicon-beaker"></i> ${STATUSES.TESTING}</div>
                    <div class="popover-item" onclick="setModalStatus('Done')"><i class="codicon codicon-pass"></i> ${STATUSES.DONE}</div>
                </div>

                <div id="datePopover" class="premium-popover date-picker-popover">
                    <div class="popover-item date-opt-today date-color-today" onclick="setPremiumDate('today')"><i class="codicon codicon-calendar"></i> Today</div>
                    <div class="popover-item date-opt-tomorrow date-color-tomorrow" onclick="setPremiumDate('tomorrow')"><i class="codicon codicon-calendar"></i> Tomorrow</div>
                    <div class="popover-item date-opt-weekend date-color-weekend" onclick="setPremiumDate('weekend')"><i class="codicon codicon-calendar"></i> This weekend</div>
                    <div class="popover-divider"></div>
                    <div class="popover-section-title">Custom</div>
                    <div class="popover-custom-date">
                        <div class="custom-date-wrapper">
                            <i class="codicon codicon-calendar"></i>
                            <input type="text" id="taskDueDate" class="custom-date-input date-color-custom" placeholder="Select date...">
                            <button class="circle-btn" onclick="closeAllPopovers()" title="Confirm">
                                <i class="codicon codicon-check"></i>
                            </button>
                        </div>
                    </div>
                </div>

                <div id="priorityPopover" class="premium-popover">
                    <div class="popover-item" onclick="setPremiumPriority('Must')"><i class="codicon codicon-flag" style="color: #FF3B30"></i> ${PRIORITIES.MUST}</div>
                    <div class="popover-item" onclick="setPremiumPriority('Should')"><i class="codicon codicon-flag" style="color: #FF9500"></i> ${PRIORITIES.SHOULD}</div>
                    <div class="popover-item" onclick="setPremiumPriority('Could')"><i class="codicon codicon-flag" style="color: #007AFF"></i> ${PRIORITIES.COULD}</div>
                    <div class="popover-item" onclick="setPremiumPriority('Wont')"><i class="codicon codicon-flag" style="color: #8E8E93"></i> ${PRIORITIES.WONT}</div>
                </div>

                <div id="reminderPopover" class="premium-popover">
                    <div class="popover-item" onclick="setPremiumReminder(5, 'In 5 min')"><i class="codicon codicon-clockface"></i> In 5 min</div>
                    <div class="popover-item" onclick="setPremiumReminder(30, 'In 30 min')"><i class="codicon codicon-clockface"></i> In 30 min</div>
                    <div class="popover-item" onclick="setPremiumReminder(60, 'In 1 hour')"><i class="codicon codicon-clockface"></i> In 1 hour</div>
                    <div class="popover-item" onclick="setPremiumReminder('tomorrow', 'Tomorrow')"><i class="codicon codicon-clockface"></i> Tomorrow</div>
                    <div class="popover-divider"></div>
                    <div class="popover-section-title">Custom</div>
                    <div class="popover-custom-date">
                        <div class="custom-date-wrapper">
                            <i class="codicon codicon-calendar"></i>
                            <input type="text" id="taskReminderTime" class="custom-date-input" placeholder="Date and time...">
                            <button class="circle-btn" onclick="closeAllPopovers()" title="Confirm">
                                <i class="codicon codicon-check"></i>
                            </button>
                        </div>
                    </div>
                </div>

                <div id="taskContextMenu" class="ctx-menu" hidden>
                    <div class="ctx-section">
                        <div class="ctx-item" onclick="handleMenuAction('edit')">
                            <i class="codicon codicon-edit"></i>
                            <span>Edit</span>
                        </div>
                        <div class="ctx-item" onclick="handleMenuAction('sendToChat')">
                            <i class="codicon codicon-comment-discussion"></i>
                            <span>Send to Chat</span>
                        </div>
                        <div class="ctx-item" onclick="handleMenuAction('date')">
                            <i class="codicon codicon-calendar"></i>
                            <span>Date</span>
                        </div>
                        <div class="ctx-item" onclick="handleMenuAction('reminder')">
                            <i class="codicon codicon-bell"></i>
                            <span>Reminder</span>
                        </div>
                        <div id="ctxClearDate" class="ctx-item" onclick="handleMenuAction('clearDate')">
                            <i class="codicon codicon-discard"></i>
                            <span>Clear date</span>
                        </div>
                        <div id="ctxClearReminder" class="ctx-item" onclick="handleMenuAction('clearReminder')">
                            <i class="codicon codicon-bell-slash"></i>
                            <span>Clear reminder</span>
                        </div>
                    </div>
                    <div class="ctx-divider"></div>
                    <div class="ctx-section">
                        <span class="ctx-label">${UI.STATUS}</span>
                        <div class="ctx-status-list">
                            <div class="ctx-item" onclick="updateStatusFromMenu('Todo')">
                                <i class="codicon codicon-layers anim-slow-float"></i>
                                <span>${STATUSES.TODO}</span>
                            </div>
                            <div class="ctx-item" onclick="updateStatusFromMenu('Ready')">
                                <i class="codicon codicon-layers-active anim-pulse"></i>
                                <span>${STATUSES.READY}</span>
                            </div>
                            <div class="ctx-item" onclick="updateStatusFromMenu('In Progress')">
                                <i class="codicon codicon-loading codicon-modifier-spin"></i>
                                <span>${STATUSES.IN_PROGRESS}</span>
                            </div>
                            <div class="ctx-item" onclick="updateStatusFromMenu('Testing')">
                                <i class="codicon codicon-beaker anim-float"></i>
                                <span>${STATUSES.TESTING}</span>
                            </div>
                            <div class="ctx-item" onclick="updateStatusFromMenu('Done')">
                                <i class="codicon codicon-pass anim-slow-pulse"></i>
                                <span>${STATUSES.DONE}</span>
                            </div>
                        </div>
                    </div>
                    <div class="ctx-divider"></div>
                    <div class="ctx-section">
                        <span class="ctx-label">${UI.PRIORITY}</span>
                        <div class="ctx-priority-row">
                            <div class="flag-opt" onclick="updatePriorityFromMenu('Must')"><i class="codicon codicon-flag" style="color: #FF3B30" title="${PRIORITIES.MUST}"></i></div>
                            <div class="flag-opt" onclick="updatePriorityFromMenu('Should')"><i class="codicon codicon-flag" style="color: #FF9500" title="${PRIORITIES.SHOULD}"></i></div>
                            <div class="flag-opt" onclick="updatePriorityFromMenu('Could')"><i class="codicon codicon-flag" style="color: #007AFF" title="${PRIORITIES.COULD}"></i></div>
                            <div class="flag-opt" onclick="updatePriorityFromMenu('Wont')"><i class="codicon codicon-flag" style="color: #8E8E93" title="${PRIORITIES.WONT}"></i></div>
                        </div>
                    </div>
                    <div class="ctx-divider"></div>
                    <div class="ctx-section">
                        <div class="ctx-item delete-item" onclick="handleMenuAction('delete')">
                            <i class="codicon codicon-trash"></i>
                            <span>${UI.DELETE}</span>
                        </div>
                    </div>
                </div>

                <script src="${flatpickrJsUri}"></script>
                <script src="${scriptUri}"></script>
            </body>
            </html>`;
    }
}
