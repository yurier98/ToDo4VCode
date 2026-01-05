const vscode = acquireVsCodeApi();
let currentTasks = [];

// Restore state from VS Code state
const previousState = vscode.getState();
let viewMode = previousState?.viewMode || 'list';
let groupBy = previousState?.groupBy || 'status';
let hideCompleted = previousState?.hideCompleted || false;
let sortBy = previousState?.sortBy || 'priority';

let activeTaskId = null;
let editingTaskId = null;
let modalTaskId = null;
let collapsedSections = new Set(previousState?.collapsedSections || []);
let shouldAutoEditNewTask = false;

// Initialize UI from previous state
window.addEventListener('DOMContentLoaded', () => {
    updateViewModeUI();
    updateGroupByUI();
});

const SORT_PRIORITY = ['Must', 'Should', 'Could', "Wont"];

// Save state to VS Code
function saveState() {
    const state = {
        viewMode,
        groupBy,
        hideCompleted,
        sortBy,
        collapsedSections: Array.from(collapsedSections)
    };
    vscode.setState(state);
    vscode.postMessage({ 
        type: 'updateSettings', 
        settings: state,
        viewType: window.viewType || 'sidebar'
    });
}

// Modal States
let modalStatus = 'Todo';
let modalPriority = 'Wont';
let modalDueDate = null;
let modalReminders = [];

// Premium States
let currentPremiumStatus = 'Todo';
let currentPremiumPriority = 'Wont';
let currentPremiumReminders = [];
let currentPremiumDate = null;

const PRIORITY_COLORS = {
    'Must': '#FF3B30',
    'Should': '#FF9500',
    'Could': '#007AFF',
    'Wont': '#8E8E93'
};

const STATUS_ICONS = {
    'Todo': 'codicon-layers anim-slow-float',
    'Ready': 'codicon-layers-active anim-pulse',
    'In Progress': 'codicon-loading codicon-modifier-spin',
    'Testing': 'codicon-beaker anim-float',
    'Done': 'codicon-pass anim-slow-pulse'
};

// --- Modal Management ---

function openTaskModal(taskId) {
    const task = currentTasks.find(t => t.id === taskId);
    if (!task) return;

    modalTaskId = taskId;
    modalStatus = task.status;
    modalPriority = task.priority === "Won't" ? 'Wont' : task.priority;
    modalDueDate = task.dueDate;
    modalReminders = task.reminders || [];

    const modal = document.getElementById('taskModal');
    const titleInput = document.getElementById('modalTaskTitle');
    const descInput = document.getElementById('modalTaskDesc');
    const statusLabel = document.getElementById('modalStatusLabel');
    const priorityIndicator = document.getElementById('modalPriorityIndicator');

    if (titleInput) titleInput.value = task.text;
    if (descInput) descInput.value = task.description || '';
    if (statusLabel) statusLabel.innerText = task.status;

    if (datePicker) datePicker.setDate(task.dueDate || '', false);
    if (reminderPicker) {
        const r = (task.reminders && task.reminders.length > 0) ? task.reminders[0].time : '';
        reminderPicker.setDate(r, false);
    }

    updateModalUI();

    modal.classList.add('active');
    modal.classList.remove('hidden');

    // Auto-resize textareas
    const autoResize = (el) => {
        el.style.height = 'auto';
        el.style.height = el.scrollHeight + 'px';
    };

    if (titleInput) {
        autoResize(titleInput);
        titleInput.oninput = () => autoResize(titleInput);
    }
    if (descInput) {
        autoResize(descInput);
        descInput.oninput = () => autoResize(descInput);
    }
}

function updateModalUI() {
    const dateVal = document.getElementById('modalDateValue');
    const reminderVal = document.getElementById('modalReminderValue');
    const priorityVal = document.getElementById('modalPriorityValue');
    const statusVal = document.getElementById('modalStatusValue');
    const statusLabel = document.getElementById('modalStatusLabel');
    const priorityIndicator = document.getElementById('modalPriorityIndicator');

    // Date
    if (dateVal) {
        dateVal.classList.remove('date-color-today', 'date-color-tomorrow', 'date-color-soon', 'date-color-custom');
        const clearBtn = dateVal.querySelector('.clear-date-btn');
        if (modalDueDate) {
            const d = new Date(modalDueDate);
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            dateVal.querySelector('span').innerText = `${months[d.getMonth()]} ${d.getDate()}`;
            dateVal.classList.add('has-value', getDateColorClass(d));
            if (clearBtn) clearBtn.classList.remove('hidden');
        } else {
            dateVal.querySelector('span').innerText = 'No date';
            dateVal.classList.remove('has-value');
            if (clearBtn) clearBtn.classList.add('hidden');
        }
    }

    // Reminder
    if (reminderVal) {
        reminderVal.classList.remove('date-color-today', 'date-color-tomorrow', 'date-color-soon', 'date-color-custom');
        const clearBtn = reminderVal.querySelector('.clear-date-btn');
        if (modalReminders.length > 0) {
            const d = new Date(modalReminders[0]);
            const now = new Date();
            const isToday = d.toDateString() === now.toDateString();
            const h = d.getHours().toString().padStart(2, '0');
            const m = d.getMinutes().toString().padStart(2, '0');

            if (isToday) {
                reminderVal.querySelector('span').innerText = `Today, ${h}:${m}`;
            } else {
                const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                reminderVal.querySelector('span').innerText = `${d.getDate()} ${months[d.getMonth()]}, ${h}:${m}`;
            }
            reminderVal.classList.add('has-value', getDateColorClass(d));
            if (clearBtn) clearBtn.classList.remove('hidden');
        } else {
            reminderVal.querySelector('span').innerText = 'No reminder';
            reminderVal.classList.remove('has-value');
            if (clearBtn) clearBtn.classList.add('hidden');
        }
    }

    // Priority
    if (priorityVal) {
        priorityVal.querySelector('span').innerText = modalPriority === 'Wont' ? "Won't" : modalPriority;
        priorityVal.querySelector('i').style.color = PRIORITY_COLORS[modalPriority];
    }
    if (priorityIndicator) {
        priorityIndicator.style.color = PRIORITY_COLORS[modalPriority];
        priorityIndicator.className = `priority-indicator is-${modalStatus.toLowerCase().replace(' ', '-')}`;
    }

    // Status
    if (statusVal) {
        statusVal.querySelector('span').innerText = modalStatus;
        const icon = statusVal.querySelector('i');
        const iconClass = STATUS_ICONS[modalStatus].replace(/anim-\S+/g, '').trim();
        icon.className = `codicon ${iconClass}`;
    }
    if (statusLabel) statusLabel.innerText = modalStatus;
}

function closeTaskModal() {
    const modal = document.getElementById('taskModal');
    if (modal) {
        modal.classList.remove('active');
        modal.classList.add('hidden');
    }
    modalTaskId = null;
    closeAllPopovers();
}

async function saveTaskModal() {
    if (!modalTaskId) return;

    const title = document.getElementById('modalTaskTitle').value.trim();
    const description = document.getElementById('modalTaskDesc').value.trim();

    if (!title) return;

    vscode.postMessage({ type: 'updateTaskText', id: modalTaskId, text: title });
    vscode.postMessage({ type: 'updateDescription', id: modalTaskId, description: description });

    closeTaskModal();
}

function deleteTaskFromModal() {
    if (modalTaskId) {
        vscode.postMessage({ type: 'deleteTask', id: modalTaskId });
        closeTaskModal();
    }
}

function toggleStatusPicker(e) {
    if (e) e.stopPropagation();
    const pop = document.getElementById('statusPopover');
    if (!pop) return;

    const isShow = pop.classList.contains('show');
    closeAllPopovers(true);

    if (!isShow) {
        pop.classList.add('show');
        const rect = e.currentTarget.getBoundingClientRect();
        const popRect = pop.getBoundingClientRect();

        pop.style.position = 'fixed';

        let left = rect.left;
        if (left + popRect.width > window.innerWidth) {
            left = window.innerWidth - popRect.width - 10;
        }
        if (left < 10) left = 10;
        pop.style.left = `${left}px`;
        pop.style.right = 'auto';

        if (rect.bottom + popRect.height > window.innerHeight) {
            pop.style.top = 'auto';
            pop.style.bottom = `${window.innerHeight - rect.top + 5}px`;
        } else {
            pop.style.top = `${rect.bottom + 5}px`;
            pop.style.bottom = 'auto';
        }
    }
}

function setModalStatus(s) {
    modalStatus = s;
    if (modalTaskId) {
        vscode.postMessage({ type: 'updateStatus', id: modalTaskId, status: s });
    }
    updateModalUI();
    closeAllPopovers();
}

// --- Popover Management ---

function closeAllPopovers(keepEditingId = false) {
    document.querySelectorAll('.premium-popover, .popover').forEach(p => p.classList.remove('show'));
    hideContextMenu();
    if (datePicker) datePicker.close();
    if (reminderPicker) reminderPicker.close();
    if (!keepEditingId) editingTaskId = null;
}

function toggleConfigPopover(e) {
    if (e) e.stopPropagation();
    const popover = document.getElementById('configPopover');
    if (!popover) return;
    const isShow = popover.classList.contains('show');
    closeAllPopovers();
    if (!isShow) {
        popover.classList.add('show');
        const toggle = document.getElementById('completedToggle');
        if (toggle) {
            toggle.parentElement.classList.toggle('active', !hideCompleted);
        }
        const popoverBtnList = document.getElementById('popoverBtnList');
        const popoverBtnKanban = document.getElementById('popoverBtnKanban');
        if (popoverBtnList) popoverBtnList.classList.toggle('active', viewMode === 'list');
        if (popoverBtnKanban) popoverBtnKanban.classList.toggle('active', viewMode === 'kanban');

        // Update Sort Chks
        const sortPriorityCheck = document.getElementById('sortPriorityCheck');
        const sortDueDateCheck = document.getElementById('sortDueDateCheck');
        const sortTitleCheck = document.getElementById('sortTitleCheck');
        const sortCustomCheck = document.getElementById('sortCustomCheck');
        if (sortPriorityCheck) sortPriorityCheck.classList.toggle('hidden', sortBy !== 'priority');
        if (sortDueDateCheck) sortDueDateCheck.classList.toggle('hidden', sortBy !== 'dueDate');
        if (sortTitleCheck) sortTitleCheck.classList.toggle('hidden', sortBy !== 'title');
        if (sortCustomCheck) sortCustomCheck.classList.toggle('hidden', sortBy !== 'custom');
    }
}

function toggleDatePicker(e, fromModal = false) {
    if (e) e.stopPropagation();
    const pop = document.getElementById('datePopover');
    if (!pop) return;

    const isShow = pop.classList.contains('show');
    closeAllPopovers(!!editingTaskId || !!modalTaskId);

    if (!isShow) {
        pop.classList.add('show');
        const rect = e.currentTarget.getBoundingClientRect();
        const popRect = pop.getBoundingClientRect();

        pop.style.position = 'fixed';

        let left = rect.left;
        if (left + popRect.width > window.innerWidth) {
            left = window.innerWidth - popRect.width - 10;
        }
        if (left < 10) left = 10;
        pop.style.left = `${left}px`;
        pop.style.right = 'auto';

        if (rect.bottom + popRect.height > window.innerHeight) {
            pop.style.top = 'auto';
            pop.style.bottom = `${window.innerHeight - rect.top + 5}px`;
        } else {
            pop.style.top = `${rect.bottom + 5}px`;
            pop.style.bottom = 'auto';
        }
    }
}

function togglePriorityPicker(e, fromModal = false) {
    if (e) e.stopPropagation();
    const pop = document.getElementById('priorityPopover');
    if (!pop) return;

    const isShow = pop.classList.contains('show');
    closeAllPopovers(!!modalTaskId);

    if (!isShow) {
        pop.classList.add('show');
        const rect = e.currentTarget.getBoundingClientRect();
        const popRect = pop.getBoundingClientRect();

        pop.style.position = 'fixed';

        let left = rect.left;
        if (left + popRect.width > window.innerWidth) {
            left = window.innerWidth - popRect.width - 10;
        }
        if (left < 10) left = 10;
        pop.style.left = `${left}px`;
        pop.style.right = 'auto';

        if (rect.bottom + popRect.height > window.innerHeight) {
            pop.style.top = 'auto';
            pop.style.bottom = `${window.innerHeight - rect.top + 5}px`;
        } else {
            pop.style.top = `${rect.bottom + 5}px`;
            pop.style.bottom = 'auto';
        }
    }
}

function toggleReminderPicker(e, fromModal = false) {
    if (e) e.stopPropagation();
    const pop = document.getElementById('reminderPopover');
    if (!pop) return;

    const isShow = pop.classList.contains('show');
    closeAllPopovers(!!editingTaskId || !!modalTaskId);

    if (!isShow) {
        pop.classList.add('show');
        const rect = e.currentTarget.getBoundingClientRect();
        const popRect = pop.getBoundingClientRect();

        pop.style.position = 'fixed';

        let left = rect.left;
        if (left + popRect.width > window.innerWidth) {
            left = window.innerWidth - popRect.width - 10;
        }
        if (left < 10) left = 10;
        pop.style.left = `${left}px`;
        pop.style.right = 'auto';

        if (rect.bottom + popRect.height > window.innerHeight) {
            pop.style.top = 'auto';
            pop.style.bottom = `${window.innerHeight - rect.top + 5}px`;
        } else {
            pop.style.top = `${rect.bottom + 5}px`;
            pop.style.bottom = 'auto';
        }
    }
}

function clearDate() {
    if (modalTaskId) {
        modalDueDate = null;
        vscode.postMessage({ type: 'updateDueDate', id: modalTaskId, dueDate: null });
        updateModalUI();
        return;
    }

    currentPremiumDate = null;
    const tag = document.getElementById('selectedDateTag');
    const label = document.getElementById('dateLabel');
    const btn = document.getElementById('dateBtn');
    const clearBtn = document.querySelector('.clear-date-btn');
    const icon = document.querySelector('#dateBtn i:first-child');

    if (tag) { tag.classList.add('hidden'); tag.innerText = ''; }
    if (label) label.innerText = 'Date';
    if (btn) {
        btn.classList.remove('has-value', 'date-color-today', 'date-color-tomorrow', 'date-color-soon', 'date-color-weekend', 'date-color-custom');
    }
    if (clearBtn) clearBtn.classList.add('hidden');
    if (icon) icon.className = 'codicon codicon-calendar';

    const dateInput = document.getElementById('taskDueDate');
    if (dateInput) {
        dateInput.value = '';
        dateInput.classList.remove('date-color-today', 'date-color-tomorrow', 'date-color-soon', 'date-color-weekend', 'date-color-custom');
        dateInput.classList.add('date-color-custom');
    }
    if (datePicker) datePicker.clear();
}

function getDateColorClass(date) {
    if (!date || isNaN(date.getTime())) return '';
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);

    const diffTime = d.getTime() - now.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'date-color-today';
    if (diffDays === 1) return 'date-color-tomorrow';
    if (diffDays > 1 && diffDays <= 3) return 'date-color-soon';

    // Check if it's weekend (Saturday or Sunday)
    const day = d.getDay();
    if (day === 0 || day === 6) return 'date-color-weekend';

    return 'date-color-custom';
}

function setPremiumDate(val, isCustom = false) {
    if (!val) return;
    let date;
    let iconClass = 'codicon-calendar';

    if (val === 'today') {
        date = new Date();
        date.setHours(0, 0, 0, 0);
    } else if (val === 'tomorrow') {
        date = new Date();
        date.setDate(date.getDate() + 1);
        date.setHours(0, 0, 0, 0);
    } else if (val === 'weekend') {
        date = new Date();
        date.setHours(0, 0, 0, 0);
        const day = date.getDay();
        const diff = (6 - day + 7) % 7 || 7;
        date.setDate(date.getDate() + diff);
    } else {
        // Handle YYYY-MM-DD or other formats
        const parts = val.split(/[- :]/);
        if (parts.length >= 3) {
            date = new Date(parts[0], parts[1] - 1, parts[2]);
        } else {
            date = new Date(val);
        }
    }

    const colorClass = getDateColorClass(date);

    if (!isNaN(date.getTime())) {
        // Update custom input color if it exists
        const dateInput = document.getElementById('taskDueDate');
        if (dateInput) {
            dateInput.classList.remove('date-color-today', 'date-color-tomorrow', 'date-color-soon', 'date-color-weekend', 'date-color-custom');
            dateInput.classList.add(colorClass);
        }

        if (modalTaskId) {
            vscode.postMessage({ type: 'updateDueDate', id: modalTaskId, dueDate: date.getTime() });
            modalDueDate = date.getTime();
            updateModalUI();
            if (!isCustom) closeAllPopovers();
            return;
        }
        if (editingTaskId) {
            vscode.postMessage({ type: 'updateDueDate', id: editingTaskId, dueDate: date.getTime() });
            editingTaskId = null;
            if (!isCustom) closeAllPopovers();
            return;
        }

        currentPremiumDate = date.getTime();
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const formattedDate = `${months[date.getMonth()]} ${date.getDate()} ${date.getFullYear()}`;
        const chipLabel = `${months[date.getMonth()]} ${date.getDate()}`;

        const tag = document.getElementById('selectedDateTag');
        if (tag) {
            tag.innerText = formattedDate;
            tag.classList.remove('hidden');
        }

        const btn = document.getElementById('dateBtn');
        const label = document.getElementById('dateLabel');
        const icon = document.querySelector('#dateBtn i:first-child');
        const clearBtn = document.querySelector('.clear-date-btn');

        if (btn) {
            btn.className = 'action-btn has-value ' + colorClass;
        }
        if (label) label.innerText = chipLabel;
        if (icon) icon.className = `codicon ${iconClass}`;
        if (clearBtn) clearBtn.classList.remove('hidden');
    }
    if (!isCustom) closeAllPopovers();
}

function setPremiumPriority(p) {
    if (modalTaskId) {
        vscode.postMessage({ type: 'updatePriority', id: modalTaskId, priority: p === 'Wont' ? "Won't" : p });
        modalPriority = p;
        updateModalUI();
        closeAllPopovers();
        return;
    }
    currentPremiumPriority = p;
    const label = document.getElementById('priorityLabel');
    const icon = document.querySelector('#priorityFlagBtn i');
    if (label) label.innerText = p === 'Wont' ? "Won't" : p;
    if (icon) icon.style.color = PRIORITY_COLORS[p];
    closeAllPopovers();
}

function clearReminder() {
    if (modalTaskId) {
        modalReminders = [];
        vscode.postMessage({ type: 'updateReminders', id: modalTaskId, reminders: [] });
        updateModalUI();
        return;
    }

    currentPremiumReminders = [];
    const btn = document.getElementById('reminderBtn');
    const label = document.getElementById('reminderLabel');
    const clearBtn = document.getElementById('clearReminderBtn');
    const icon = document.querySelector('#reminderBtn i:first-child');

    if (btn) btn.classList.remove('has-value', 'date-color-today', 'date-color-tomorrow', 'date-color-soon', 'date-color-weekend', 'date-color-custom');
    if (label) label.innerText = 'Reminder';
    if (clearBtn) clearBtn.classList.add('hidden');
    if (icon) icon.style.color = '';

    const reminderInput = document.getElementById('taskReminderTime');
    if (reminderInput) {
        reminderInput.value = '';
        reminderInput.classList.remove('date-color-today', 'date-color-tomorrow', 'date-color-soon', 'date-color-weekend', 'date-color-custom');
        reminderInput.classList.add('date-color-custom');
    }
    if (reminderPicker) reminderPicker.clear();
}

function setPremiumReminder(m, labelText, isCustom = false) {
    if (!m) return;
    let ts;
    if (m === 'tomorrow') {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        d.setHours(9, 0, 0, 0);
        ts = d.getTime();
        labelText = 'Tomorrow, 09:00';
    } else if (typeof m === 'string' && (m.includes('T') || m.includes(' ') || m.includes('-'))) {
        // Handle formats like "2023-10-27 14:30" or ISO
        const dateObj = new Date(m.replace(' ', 'T'));
        dateObj.setSeconds(0, 0); // Normalize to hh:mm:00
        ts = dateObj.getTime();
        if (isNaN(ts)) {
            const altDate = new Date(m);
            altDate.setSeconds(0, 0);
            ts = altDate.getTime();
        }

        const d = new Date(ts);
        const now = new Date();
        const isToday = d.toDateString() === now.toDateString();
        const hours = d.getHours().toString().padStart(2, '0');
        const minutes = d.getMinutes().toString().padStart(2, '0');

        if (isToday) {
            labelText = `Today, ${hours}:${minutes}`;
        } else {
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            labelText = `${d.getDate()} ${months[d.getMonth()]}, ${hours}:${minutes}`;
        }
    } else {
        const d = new Date();
        d.setMinutes(d.getMinutes() + m);
        d.setSeconds(0, 0); // Normalize to hh:mm:00
        ts = d.getTime();
    }

    const colorClass = getDateColorClass(new Date(ts));

    // Update custom input color if it exists
    const reminderInput = document.getElementById('taskReminderTime');
    if (reminderInput) {
        reminderInput.classList.remove('date-color-today', 'date-color-tomorrow', 'date-color-soon', 'date-color-weekend', 'date-color-custom');
        reminderInput.classList.add(colorClass);
    }

    if (modalTaskId) {
        vscode.postMessage({ type: 'updateReminders', id: modalTaskId, reminders: [ts] });
        modalReminders = [ts];
        updateModalUI();
        if (!isCustom) closeAllPopovers();
        return;
    }

    if (editingTaskId) {
        vscode.postMessage({ type: 'updateReminders', id: editingTaskId, reminders: [ts] });
        editingTaskId = null;
        if (!isCustom) closeAllPopovers();
        return;
    }

    currentPremiumReminders = [ts];
    const btn = document.getElementById('reminderBtn');
    const label = document.getElementById('reminderLabel');
    const clearBtn = document.getElementById('clearReminderBtn');
    if (btn) {
        btn.className = 'action-btn has-value ' + colorClass;
    }
    if (label) label.innerText = labelText;
    if (clearBtn) clearBtn.classList.remove('hidden');
    if (!isCustom) closeAllPopovers();
}

function submitPremiumTask() {
    const titleEl = document.getElementById('taskTitle');
    const descEl = document.getElementById('taskDesc');
    if (titleEl && titleEl.value.trim()) {
        vscode.postMessage({
            type: 'addTask',
            value: {
                text: titleEl.value.trim(),
                description: descEl ? descEl.value.trim() : '',
                priority: currentPremiumPriority,
                status: currentPremiumStatus,
                dueDate: currentPremiumDate,
                reminders: currentPremiumReminders
            }
        });
        clearInput();
    }
}

function clearInput() {
    const t = document.getElementById('taskTitle');
    const d = document.getElementById('taskDesc');
    if (t) t.value = '';
    if (d) { d.value = ''; d.style.height = 'auto'; }
    clearDate();
    clearReminder();
    const pIcon = document.querySelector('#priorityFlagBtn i');
    if (pIcon) pIcon.style.color = PRIORITY_COLORS[currentPremiumPriority];
}

function submitTask(text, priority, status, autoEdit = false) {
    shouldAutoEditNewTask = autoEdit;
    vscode.postMessage({
        type: 'addTask',
        value: { text, priority: priority || 'Wont', status: status || 'Todo', description: '' }
    });
}

function setViewMode(mode) {
    viewMode = mode;
    saveState();
    updateViewModeUI();
    render();
}

function updateViewModeUI() {
    const popoverBtnList = document.getElementById('popoverBtnList');
    const popoverBtnKanban = document.getElementById('popoverBtnKanban');
    const listPanel = document.getElementById('listView');
    const kanbanPanel = document.getElementById('kanbanView');
    if (popoverBtnList) popoverBtnList.classList.toggle('active', viewMode === 'list');
    if (popoverBtnKanban) popoverBtnKanban.classList.toggle('active', viewMode === 'kanban');
    if (listPanel) listPanel.classList.toggle('hidden', viewMode !== 'list');
    if (kanbanPanel) kanbanPanel.classList.toggle('hidden', viewMode !== 'kanban');
}

function setGroupBy(mode) {
    groupBy = mode;
    saveState();
    updateGroupByUI();
    closeAllPopovers();
    render();
}

function updateGroupByUI() {
    const statusCheck = document.getElementById('statusCheck');
    const priorityCheck = document.getElementById('priorityCheck');
    const noneCheck = document.getElementById('noneCheck');
    if (statusCheck) statusCheck.classList.toggle('hidden', groupBy !== 'status');
    if (priorityCheck) priorityCheck.classList.toggle('hidden', groupBy !== 'priority');
    if (noneCheck) noneCheck.classList.toggle('hidden', groupBy !== 'none');
}

function setSortBy(val) {
    sortBy = val;
    closeAllPopovers();
    saveState();
    render();
}

function sortTasks(tasks) {
    return [...tasks].sort((a, b) => {
        if (sortBy === 'custom') {
            const oA = a.order || 0;
            const oB = b.order || 0;
            if (oA !== oB) return oA - oB;
            return b.createdAt - a.createdAt;
        }
        if (sortBy === 'priority') {
            const pA = a.priority === "Won't" ? 'Wont' : a.priority;
            const pB = b.priority === "Won't" ? 'Wont' : b.priority;
            const res = SORT_PRIORITY.indexOf(pA) - SORT_PRIORITY.indexOf(pB);
            if (res !== 0) return res;
        } else if (sortBy === 'dueDate') {
            if (a.dueDate || b.dueDate) {
                if (!a.dueDate) return 1;
                if (!b.dueDate) return -1;
                if (a.dueDate !== b.dueDate) return a.dueDate - b.dueDate;
            }
        } else if (sortBy === 'title') {
            const res = a.text.localeCompare(b.text);
            if (res !== 0) return res;
        }
        // Fallback to order or createdAt
        const oA = a.order || 0;
        const oB = b.order || 0;
        if (oA !== oB) return oA - oB;
        return b.createdAt - a.createdAt;
    });
}

function cleanupDragState() {
    document.querySelectorAll('.drag-indicator').forEach(el => el.remove());
    document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
    document.querySelectorAll('.dragging').forEach(el => el.classList.remove('dragging'));
}

function handleDragOver(e) {
    e.preventDefault();
    const container = e.target.closest('.list-section-content, .tasks-scroll');
    if (!container) return;

    const dragging = document.querySelector('.dragging');
    const cards = Array.from(container.querySelectorAll('.list-task-row, .task-card')).filter(c => c !== dragging);
    
    let indicator = document.querySelector('.drag-indicator');
    if (!indicator) {
        indicator = document.createElement('div');
        indicator.className = 'drag-indicator';
    }

    let afterElement = null;
    let minDistance = Number.POSITIVE_INFINITY;

    for (const card of cards) {
        const box = card.getBoundingClientRect();
        const offset = e.clientY - (box.top + box.height / 2);
        if (offset < 0 && offset > -minDistance) {
            minDistance = -offset;
            afterElement = card;
        }
    }

    if (afterElement) {
        if (afterElement.previousElementSibling !== indicator) {
            afterElement.before(indicator);
        }
    } else {
        const addRow = container.querySelector('.list-add-row, .col-add-task');
        if (addRow) {
            if (addRow.previousElementSibling !== indicator) {
                addRow.before(indicator);
            }
        } else {
            if (container.lastElementChild !== indicator) {
                container.appendChild(indicator);
            }
        }
    }
}

function handleTaskDrop(e, targetStatus = null, targetPriority = null) {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain');
    if (!taskId) return;

    const indicator = document.querySelector('.drag-indicator');
    const container = indicator ? indicator.parentElement : e.target.closest('.list-section-content, .tasks-scroll');
    
    if (!container) {
        cleanupDragState();
        return;
    }

    // 1. Handle Group Transitions
    if (groupBy === 'status' && targetStatus) {
        vscode.postMessage({ type: 'updateStatus', id: taskId, status: targetStatus });
    } else if (groupBy === 'priority' && targetPriority) {
        const pVal = targetPriority === 'Wont' ? "Won't" : targetPriority;
        vscode.postMessage({ type: 'updatePriority', id: taskId, priority: pVal });
    }

    // 2. Handle Reordering
    const fullTasksSorted = sortTasks(currentTasks);
    let newOrder = null;

    if (indicator) {
        const afterElement = indicator.nextElementSibling;
        if (afterElement && (afterElement.classList.contains('list-task-row') || afterElement.classList.contains('task-card'))) {
            const targetId = afterElement.dataset.id;
            const targetIndex = fullTasksSorted.findIndex(t => t.id === targetId);
            
            if (targetIndex !== -1) {
                const targetTask = fullTasksSorted[targetIndex];
                let prevTask = null;
                for (let i = targetIndex - 1; i >= 0; i--) {
                    if (fullTasksSorted[i].id !== taskId) {
                        prevTask = fullTasksSorted[i];
                        break;
                    }
                }
                
                if (prevTask) {
                    newOrder = (prevTask.order + targetTask.order) / 2;
                } else {
                    newOrder = targetTask.order - 1000;
                }
            }
        } else {
            const tasksInGroup = fullTasksSorted.filter(t => {
                if (groupBy === 'status') return t.status === (targetStatus || 'Todo');
                if (groupBy === 'priority') {
                    const p = targetPriority === 'Wont' ? "Won't" : targetPriority;
                    return t.priority === (p || 'Should');
                }
                return true;
            }).filter(t => t.id !== taskId);

            if (tasksInGroup.length > 0) {
                newOrder = tasksInGroup[tasksInGroup.length - 1].order + 1000;
            } else {
                newOrder = 1000;
            }
        }
    }

    if (newOrder !== null) {
        if (sortBy !== 'custom') sortBy = 'custom';
        vscode.postMessage({ type: 'updateOrders', orders: [{ id: taskId, order: newOrder }] });
    }

    cleanupDragState();
}

function toggleCompletedVisibility() {
    hideCompleted = !hideCompleted;
    const toggle = document.getElementById('completedToggle');
    if (toggle) toggle.parentElement.classList.toggle('active', !hideCompleted);
    saveState();
    render();
}

function toggleSection(s) {
    if (collapsedSections.has(s)) collapsedSections.delete(s);
    else collapsedSections.add(s);
    saveState();
    render();
}

function handleAddTaskClick(el) {
    const text = el.dataset.text || 'New task...';
    const priority = el.dataset.priority === 'null' ? null : el.dataset.priority;
    const status = el.dataset.status || 'Todo';
    const autoEdit = el.dataset.autoedit === 'true';
    submitTask(text, priority, status, autoEdit);
}

function showContextMenu(e, taskId) {
    e.preventDefault();
    e.stopPropagation();
    closeAllPopovers();
    activeTaskId = taskId;
    const menu = document.getElementById('taskContextMenu');
    if (!menu) return;
    const task = currentTasks.find(t => t.id === taskId);
    if (task) {
        const clearDateBtn = document.getElementById('ctxClearDate');
        const clearReminderBtn = document.getElementById('ctxClearReminder');
        if (clearDateBtn) clearDateBtn.style.display = task.dueDate ? 'flex' : 'none';
        if (clearReminderBtn) clearReminderBtn.style.display = (task.reminders && task.reminders.length > 0) ? 'flex' : 'none';
    }
    
    // Mostrar temporalmente para medir
    menu.hidden = false;
    menu.style.visibility = 'hidden';
    menu.style.display = 'flex';
    
    const menuWidth = menu.offsetWidth || 180;
    const menuHeight = menu.offsetHeight || 280;
    
    menu.style.visibility = 'visible';
    
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    let left = e.clientX;
    let top = e.clientY;
    
    if (left + menuWidth > windowWidth) left = windowWidth - menuWidth - 10;
    if (top + menuHeight > windowHeight) top = windowHeight - menuHeight - 10;
    if (left < 10) left = 10;
    if (top < 10) top = 10;

    menu.style.top = `${top}px`;
    menu.style.left = `${left}px`;
    menu.style.right = 'auto';
}

function hideContextMenu() {
    const menu = document.getElementById('taskContextMenu');
    if (menu) menu.hidden = true;
    activeTaskId = null;
}

function handleMenuAction(action) {
    if (!activeTaskId) return;
    const menu = document.getElementById('taskContextMenu');
    const menuRect = menu ? menu.getBoundingClientRect() : { top: 0, left: 0 };
    if (action === 'delete') {
        vscode.postMessage({ type: 'deleteTask', id: activeTaskId });
    } else if (action === 'sendToChat') {
        const task = currentTasks.find(t => t.id === activeTaskId);
        if (task) {
            vscode.postMessage({ type: 'sendToChat', text: task.text });
        }
    } else if (action === 'edit' || action === 'editDesc') {
        openTaskModal(activeTaskId);
    } else if (action === 'date') {
        editingTaskId = activeTaskId;
        const pop = document.getElementById('datePopover');
        if (pop) {
            pop.style.position = 'fixed';
            pop.style.top = `${menuRect.top}px`;
            pop.style.left = `${menuRect.left}px`;
            pop.style.right = 'auto';
        }
        toggleDatePicker();
    } else if (action === 'reminder') {
        editingTaskId = activeTaskId;
        const pop = document.getElementById('reminderPopover');
        if (pop) {
            pop.style.position = 'fixed';
            pop.style.top = `${menuRect.top}px`;
            pop.style.left = `${menuRect.left}px`;
            pop.style.right = 'auto';
        }
        toggleReminderPicker();
    } else if (action === 'clearDate') {
        vscode.postMessage({ type: 'updateDueDate', id: activeTaskId, dueDate: null });
    } else if (action === 'clearReminder') {
        vscode.postMessage({ type: 'updateReminders', id: activeTaskId, reminders: [] });
    }
    hideContextMenu();
}

function updatePriorityFromMenu(p) {
    if (activeTaskId) vscode.postMessage({ type: 'updatePriority', id: activeTaskId, priority: p });
    hideContextMenu();
}

function updateStatusFromMenu(s) {
    if (activeTaskId) vscode.postMessage({ type: 'updateStatus', id: activeTaskId, status: s });
    hideContextMenu();
}

function toggleTaskDone(e, id, currentStatus) {
    if (e) e.stopPropagation();
    const newStatus = currentStatus === 'Done' ? 'Todo' : 'Done';
    vscode.postMessage({ type: 'updateStatus', id, status: newStatus });
}

function getPriorityIndicatorHtml(t) {
    const isDone = t.status === 'Done';
    const isInProgress = t.status === 'In Progress';
    const isReady = t.status === 'Ready';
    const isTesting = t.status === 'Testing';
    let statusClass = '';
    if (isDone) statusClass = 'is-done';
    else if (isInProgress) statusClass = 'is-in-progress';
    else if (isReady) statusClass = 'is-ready';
    else if (isTesting) statusClass = 'is-testing';
    const icon = isDone ? '<i class="codicon codicon-check"></i>' : '';
    return `
        <div class="priority-indicator ${statusClass}" 
             style="color: ${PRIORITY_COLORS[t.priority] || '#8e8e93'}"
             title="${t.priority}"
             onclick="toggleTaskDone(event, '${t.id}', '${t.status}')">
             ${icon}
        </div>
    `;
}

function getTaskBadgesHtml(t) {
    let html = '';
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    if (t.dueDate) {
        const date = new Date(t.dueDate);
        date.setHours(0, 0, 0, 0);
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const in3Days = new Date(now);
        in3Days.setDate(in3Days.getDate() + 3);
        let label = `${months[date.getMonth()]} ${date.getDate()}`;
        let colorClass = 'date-color-custom';
        if (date.getTime() === now.getTime()) { label = 'Today'; colorClass = 'date-color-today'; }
        else if (date.getTime() === tomorrow.getTime()) { label = 'Tomorrow'; colorClass = 'date-color-tomorrow'; }
        else if (date.getTime() > tomorrow.getTime() && date.getTime() <= in3Days.getTime()) colorClass = 'date-color-soon';
        html += `<div class="task-badge ${colorClass}"><i class="codicon codicon-calendar"></i><span>${label}</span></div>`;
    }
    if (t.reminders && t.reminders.length > 0) {
        const d = new Date(t.reminders[0]);
        const now = new Date();
        const isToday = d.toDateString() === now.toDateString();
        const h = d.getHours().toString().padStart(2, '0');
        const m = d.getMinutes().toString().padStart(2, '0');
        let label = `${h}:${m}`;
        if (isToday) {
            label = `Today, ${h}:${m}`;
        } else {
            label = `${d.getDate()} ${months[d.getMonth()]}, ${h}:${m}`;
        }
        html += `<div class="task-badge reminder-badge"><i class="codicon codicon-bell"></i><span>${label}</span></div>`;
    }
    return html ? `<div class="task-badges">${html}</div>` : '';
}

function renderList(tasks) {
    const container = document.getElementById('listTasks');
    if (!container) return;
    container.innerHTML = '';

    // Always sort internally first
    const internalSorted = sortTasks(tasks);

    if (groupBy === 'none') {
        container.innerHTML = `
            <div class="list-section">
                <div class="list-section-content" 
                     ondragover="handleDragOver(event)" 
                     ondrop="handleTaskDrop(event)">
                    ${internalSorted.map(t => `
                        <div class="list-task-row ${t.status === 'Done' ? 'task-is-done' : ''}" 
                             data-id="${t.id}" 
                             draggable="true" 
                             ondragstart="event.dataTransfer.setData('text/plain', '${t.id}'); this.classList.add('dragging')" 
                             ondragend="cleanupDragState()"
                             onclick="openTaskModal('${t.id}')">
                             ${getPriorityIndicatorHtml(t)}
                             <div class="card-content">
                                <div class="card-title" ondblclick="makeEditable(this, '${t.id}')">${t.text}</div>
                                ${t.description ? `<div class="card-desc">${t.description}</div>` : `<div class="card-desc empty-desc">Add description...</div>`}
                                ${getTaskBadgesHtml(t)}
                            </div>
                            <div class="card-more" onclick="showContextMenu(event, '${t.id}')">
                                <i class="codicon codicon-more"></i>
                            </div>
                        </div>
                    `).join('')}
                    <div class="list-add-row" data-status="Todo" data-priority="null" data-autoedit="true" onclick="handleAddTaskClick(this)">
                        <i class="codicon codicon-add"></i>
                        <span>Add task</span>
                    </div>
                </div>
            </div>
        `;
        return;
    }
    const groups = groupBy === 'status' ? ['Todo', 'Ready', 'In Progress', 'Testing', 'Done'] : ['Must', 'Should', 'Could', 'Wont'];

    groups.forEach(group => {
        const sTasks = internalSorted.filter(t => {
            const val = groupBy === 'status' ? t.status : (t.priority === "Won't" ? 'Wont' : t.priority);
            return val === group;
        });
        if (sTasks.length === 0 && (groupBy !== 'status' || group !== 'Todo')) return;
        const collapsed = collapsedSections.has(group);
        const div = document.createElement('div');
        div.className = `list-section ${collapsed ? 'section-collapsed' : ''}`;
        const pVal = groupBy === 'status' ? 'null' : (group === 'Wont' ? "Won't" : group);
        const sVal = groupBy === 'status' ? group : 'Todo';
        div.innerHTML = `
            <div class="list-section-header" onclick="toggleSection('${group}')">
                <i class="codicon codicon-chevron-down section-caret"></i>
                ${groupBy === 'status' ? `<i class="codicon ${STATUS_ICONS[group]} status-icon-header"></i>` : ''}
                <span class="section-title">${group}</span>
                <span class="section-count">${sTasks.length}</span>
            </div>
            <div class="list-section-content" 
                 ondragover="handleDragOver(event)" 
                 ondrop="handleTaskDrop(event, '${sVal}', '${group === "Wont" ? "Wont" : group}')">
                ${sTasks.map(t => `
                    <div class="list-task-row ${t.status === 'Done' ? 'task-is-done' : ''}" 
                         data-id="${t.id}" 
                         draggable="true" 
                         ondragstart="event.dataTransfer.setData('text/plain', '${t.id}'); this.classList.add('dragging')" 
                         ondragend="cleanupDragState()"
                         onclick="openTaskModal('${t.id}')">
                        ${getPriorityIndicatorHtml(t)}
                        <div class="card-content">
                            <div class="card-title" ondblclick="makeEditable(this, '${t.id}')">${t.text}</div>
                            ${t.description ? `<div class="card-desc">${t.description}</div>` : `<div class="card-desc empty-desc">Add description...</div>`}
                            ${getTaskBadgesHtml(t)}
                        </div>
                        <div class="card-more" onclick="showContextMenu(event, '${t.id}')">
                            <i class="codicon codicon-more"></i>
                        </div>
                    </div>
                `).join('')}
                <div class="list-add-row" data-status="${sVal}" data-priority="${pVal}" data-autoedit="true" onclick="handleAddTaskClick(this)">
                    <i class="codicon codicon-add"></i>
                    <span>Add task</span>
                </div>
            </div>
        `;
        container.appendChild(div);
    });
}

function renderKanban(tasks) {
    const board = document.getElementById('kanbanView');
    if (!board) return;
    board.innerHTML = '';

    const internalSorted = sortTasks(tasks);

    const cols = groupBy === 'none' ? ['Tareas'] : (groupBy === 'status' ? ['Todo', 'Ready', 'In Progress', 'Testing', 'Done'] : ['Must', 'Should', 'Could', 'Wont']);
    cols.forEach(col => {
        const div = document.createElement('div');
        div.className = 'board-column';
        div.dataset.column = col;
        const cTasks = internalSorted.filter(t => {
            if (groupBy === 'none') return true;
            const val = groupBy === 'status' ? t.status : (t.priority === "Won't" ? 'Wont' : t.priority);
            return val === col;
        });
        const pVal = groupBy === 'status' ? 'null' : (col === 'Wont' ? "Won't" : (groupBy === 'none' ? 'null' : col));
        const sVal = groupBy === 'status' ? col : 'Todo';
        div.ondragover = (e) => { e.preventDefault(); div.classList.add('drag-over'); };
        div.ondragleave = (e) => {
            if (!e.currentTarget.contains(e.relatedTarget)) {
                cleanupDragState();
            }
        };
        div.ondrop = (e) => handleTaskDrop(e, col, col);
        div.innerHTML = `
            <div class="col-header">
                <div class="col-title-wrapper">
                    ${groupBy === 'status' ? `<i class="codicon ${STATUS_ICONS[col]} status-icon-header"></i>` : ''}
                    <span>${col}</span>
                </div>
                <span class="col-count">${cTasks.length}</span>
            </div>
            <div class="tasks-scroll" ondragover="handleDragOver(event)">
                ${cTasks.map(t => `
                    <div class="task-card ${t.status === 'Done' ? 'task-is-done' : ''}" 
                         data-id="${t.id}" 
                         draggable="true" 
                         ondragstart="event.dataTransfer.setData('text/plain', '${t.id}'); this.classList.add('dragging')" 
                         ondragend="cleanupDragState()"
                         onclick="openTaskModal('${t.id}')">
                        ${getPriorityIndicatorHtml(t)}
                        <div class="card-content">
                            <div class="card-title" ondblclick="makeEditable(this, '${t.id}')">${t.text}</div>
                            ${t.description ? `<div class="card-desc">${t.description}</div>` : `<div class="card-desc empty-desc">Add description...</div>`}
                            ${getTaskBadgesHtml(t)}
                        </div>
                        <div class="card-more" onclick="showContextMenu(event, '${t.id}')">
                            <i class="codicon codicon-more"></i>
                        </div>
                    </div>
                `).join('')}
            </div>
            <button class="col-add-task" data-priority="${pVal}" data-status="${sVal}" data-autoedit="true" onclick="handleAddTaskClick(this)">
                <i class="codicon codicon-add"></i>
                <span>Add task</span>
            </button>
        `;
        board.appendChild(div);
    });
}

function render() {
    const tasks = hideCompleted ? currentTasks.filter(t => t.status !== 'Done') : currentTasks;
    if (viewMode === 'list') {
        const kanbanPanel = document.getElementById('kanbanView');
        if (kanbanPanel) kanbanPanel.innerHTML = '';
        renderList(tasks);
    } else {
        const listPanel = document.getElementById('listTasks');
        if (listPanel) listPanel.innerHTML = '';
        renderKanban(tasks);
    }
    if (shouldAutoEditNewTask && tasks.length > 0) {
        shouldAutoEditNewTask = false;
        const newestTask = [...tasks].sort((a, b) => b.createdAt - a.createdAt)[0];
        if (newestTask && newestTask.text === 'New task...') {
            setTimeout(() => {
                const titleEl = document.querySelector(`[data-id="${newestTask.id}"] .card-title`);
                if (titleEl) makeEditable(titleEl, newestTask.id);
            }, 50);
        }
    }
}

function makeEditable(el, id, field = 'text') {
    if (el.dataset.editing === 'true') return;
    el.dataset.editing = 'true';
    let oldText = el.innerText;
    const isNew = field === 'text' && oldText === 'New task...';
    if (isNew) oldText = '';
    el.innerHTML = `<textarea class="edit-input" id="active-edit" placeholder="${field === 'text' ? 'Task' : 'Description'}">${oldText}</textarea>`;
    const input = document.getElementById('active-edit');
    if (!input) return;
    const autoResize = () => { input.style.height = 'auto'; input.style.height = input.scrollHeight + 'px'; };
    input.addEventListener('input', autoResize);
    autoResize();
    input.focus();
    if (!isNew) input.select();
    const save = () => {
        const val = input.value.trim();
        if (val !== (isNew ? '' : oldText)) {
            if (field === 'text') {
                if (val) vscode.postMessage({ type: 'updateTaskText', id, text: val });
                else el.innerText = isNew ? 'New task...' : oldText;
            } else vscode.postMessage({ type: 'updateDescription', id, description: val });
        } else el.innerText = isNew ? 'New task...' : oldText;
        delete el.dataset.editing;
    };
    input.onblur = save;
    input.onkeydown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); input.blur(); }
        if (e.key === 'Escape') { input.value = oldText; input.blur(); }
    };
}

document.addEventListener('click', (e) => {
    const isPopover = e.target.closest('.popover') || 
                      e.target.closest('.premium-popover') || 
                      e.target.closest('.ctx-menu') || 
                      e.target.closest('.flatpickr-calendar');
                      
    const isTrigger = e.target.closest('.popover-wrapper') || 
                      e.target.closest('.format-btn') || 
                      e.target.closest('.action-btn') ||
                      e.target.closest('.card-more') ||
                      e.target.closest('.modal-grid-item');

    if (!isPopover && !isTrigger) {
        closeAllPopovers();
    }
});

let datePicker, reminderPicker;

document.addEventListener('DOMContentLoaded', () => {
    const pIcon = document.querySelector('#priorityFlagBtn i');
    if (pIcon) pIcon.style.color = PRIORITY_COLORS[currentPremiumPriority];
    const titleInput = document.getElementById('taskTitle');
    if (titleInput) {
        titleInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitPremiumTask(); }
        });
    }

    // Initialize Flatpickr
    if (typeof flatpickr !== 'undefined') {
        datePicker = flatpickr("#taskDueDate", {
            disableMobile: true,
            dateFormat: "Y-m-d",
            onChange: function (selectedDates, dateStr) {
                setPremiumDate(dateStr, true);
            }
        });

        reminderPicker = flatpickr("#taskReminderTime", {
            disableMobile: true,
            enableTime: true,
            noCalendar: false,
            dateFormat: "Y-m-d H:i",
            time_24hr: true,
            onChange: function (selectedDates, dateStr) {
                setPremiumReminder(dateStr, 'Personalizado', true);
            }
        });

        // Focus input when clicking wrapper
        document.querySelectorAll('.custom-date-wrapper').forEach(wrapper => {
            wrapper.addEventListener('click', () => {
                const input = wrapper.querySelector('input');
                if (input) input.focus();
            });
        });
    }
});

window.addEventListener('message', e => {
    if (e.data.type === 'updateTasks') {
        currentTasks = e.data.tasks;

        if (e.data.settings) {
            const s = e.data.settings;
            viewMode = s.viewMode || viewMode;
            groupBy = s.groupBy || groupBy;
            hideCompleted = s.hideCompleted !== undefined ? s.hideCompleted : hideCompleted;
            sortBy = s.sortBy || sortBy;
            if (s.collapsedSections) {
                collapsedSections = new Set(s.collapsedSections);
            }
            
            // Update UI elements to match settings
            updateViewModeUI();
            updateGroupByUI();
            const toggle = document.getElementById('completedToggle');
            if (toggle) toggle.parentElement.classList.toggle('active', !hideCompleted);
            
            // Save to local state as well
            vscode.setState(s);
        }

        render();
        if (modalTaskId) {
            const task = currentTasks.find(t => t.id === modalTaskId);
            if (task) {
                modalStatus = task.status;
                modalPriority = task.priority === "Won't" ? 'Wont' : task.priority;
                modalDueDate = task.dueDate;
                modalReminders = task.reminders || [];
                updateModalUI();
            } else closeTaskModal();
        }
    }
});

window.setViewMode = setViewMode;
window.setGroupBy = setGroupBy;
window.toggleConfigPopover = toggleConfigPopover;
window.toggleCompletedVisibility = toggleCompletedVisibility;
window.toggleDatePicker = toggleDatePicker;
window.setPremiumDate = setPremiumDate;
window.togglePriorityPicker = togglePriorityPicker;
window.setPremiumPriority = setPremiumPriority;
window.toggleReminderPicker = toggleReminderPicker;
window.setPremiumReminder = setPremiumReminder;
window.submitPremiumTask = submitPremiumTask;
window.handleMenuAction = handleMenuAction;
window.handleAddTaskClick = handleAddTaskClick;
window.updatePriorityFromMenu = updatePriorityFromMenu;
window.updateStatusFromMenu = updateStatusFromMenu;
window.showContextMenu = showContextMenu;
window.toggleSection = toggleSection;
window.makeEditable = makeEditable;
window.submitTask = submitTask;
window.clearDate = clearDate;
window.clearReminder = clearReminder;
window.openTaskModal = openTaskModal;
window.closeTaskModal = closeTaskModal;
window.saveTaskModal = saveTaskModal;
window.deleteTaskFromModal = deleteTaskFromModal;
window.toggleStatusPicker = toggleStatusPicker;
window.setModalStatus = setModalStatus;

vscode.postMessage({ 
    type: 'ready',
    viewType: window.viewType || 'sidebar'
});
