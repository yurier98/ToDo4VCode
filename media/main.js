const vscode = acquireVsCodeApi();
let currentTasks = [];
let viewMode = 'list';
let groupBy = 'status';
let hideCompleted = false;
let activeTaskId = null;
let editingTaskId = null;
let modalTaskId = null;
let collapsedSections = new Set();
let shouldAutoEditNewTask = false;

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
        icon.className = `codicon ${STATUS_ICONS[modalStatus]}`;
    }
    if (statusLabel) statusLabel.innerText = modalStatus;
}

function closeTaskModal() {
    const modal = document.getElementById('taskModal');
    if (modal) modal.classList.add('hidden');
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
        ts = new Date(m.replace(' ', 'T')).getTime();
        if (isNaN(ts)) ts = new Date(m).getTime();

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
        ts = Date.now() + (m * 60 * 1000);
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
    const popoverBtnList = document.getElementById('popoverBtnList');
    const popoverBtnKanban = document.getElementById('popoverBtnKanban');
    const listPanel = document.getElementById('listView');
    const kanbanPanel = document.getElementById('kanbanView');
    if (popoverBtnList) popoverBtnList.classList.toggle('active', mode === 'list');
    if (popoverBtnKanban) popoverBtnKanban.classList.toggle('active', mode === 'kanban');
    if (listPanel) listPanel.classList.toggle('hidden', mode !== 'list');
    if (kanbanPanel) kanbanPanel.classList.toggle('hidden', mode !== 'kanban');
    render();
}

function setGroupBy(mode) {
    groupBy = mode;
    const statusCheck = document.getElementById('statusCheck');
    const priorityCheck = document.getElementById('priorityCheck');
    const noneCheck = document.getElementById('noneCheck');
    if (statusCheck) statusCheck.classList.toggle('hidden', mode !== 'status');
    if (priorityCheck) priorityCheck.classList.toggle('hidden', mode !== 'priority');
    if (noneCheck) noneCheck.classList.toggle('hidden', mode !== 'none');
    closeAllPopovers();
    render();
}

function toggleCompletedVisibility() {
    hideCompleted = !hideCompleted;
    const toggle = document.getElementById('completedToggle');
    if (toggle) toggle.parentElement.classList.toggle('active', !hideCompleted);
    render();
}

function toggleSection(s) {
    if (collapsedSections.has(s)) collapsedSections.delete(s);
    else collapsedSections.add(s);
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
    menu.hidden = false;
    const menuWidth = menu.offsetWidth || 160;
    const menuHeight = menu.offsetHeight || 200;
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    let left = e.clientX;
    let top = e.clientY;
    if (left + menuWidth > windowWidth) left = windowWidth - menuWidth - 10;
    if (top + menuHeight > windowHeight) top = windowHeight - menuHeight - 10;
    menu.style.top = `${top}px`;
    menu.style.left = `${left}px`;
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

function toggleTaskDone(id, currentStatus) {
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
             onclick="event.stopPropagation(); toggleTaskDone('${t.id}', '${t.status}')">
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
    if (groupBy === 'none') {
        container.innerHTML = `
            <div class="list-section">
                <div class="list-section-content">
                    ${tasks.map(t => `
                        <div class="list-task-row ${t.status === 'Done' ? 'task-is-done' : ''}" data-id="${t.id}">
                            ${getPriorityIndicatorHtml(t)}
                            <div class="card-content">
                                <div class="card-title" ondblclick="event.stopPropagation(); makeEditable(this, '${t.id}')">${t.text}</div>
                                ${t.description ? `<div class="card-desc" onclick="event.stopPropagation(); openTaskModal('${t.id}')">${t.description}</div>` : `<div class="card-desc empty-desc" onclick="event.stopPropagation(); openTaskModal('${t.id}')">Add description...</div>`}
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
    const sortedTasks = [...tasks].sort((a, b) => {
        const valA = groupBy === 'status' ? a.status : (a.priority === "Won't" ? 'Wont' : a.priority);
        const valB = groupBy === 'status' ? b.status : (b.priority === "Won't" ? 'Wont' : b.priority);
        return groups.indexOf(valA) - groups.indexOf(valB);
    });
    groups.forEach(group => {
        const sTasks = sortedTasks.filter(t => {
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
            <div class="list-section-content">
                ${sTasks.map(t => `
                    <div class="list-task-row ${t.status === 'Done' ? 'task-is-done' : ''}" data-id="${t.id}">
                        ${getPriorityIndicatorHtml(t)}
                        <div class="card-content">
                            <div class="card-title" ondblclick="event.stopPropagation(); makeEditable(this, '${t.id}')">${t.text}</div>
                            ${t.description ? `<div class="card-desc" onclick="event.stopPropagation(); openTaskModal('${t.id}')">${t.description}</div>` : `<div class="card-desc empty-desc" onclick="event.stopPropagation(); openTaskModal('${t.id}')">Add description...</div>`}
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
    const cols = groupBy === 'none' ? ['Tareas'] : (groupBy === 'status' ? ['Todo', 'Ready', 'In Progress', 'Testing', 'Done'] : ['Must', 'Should', 'Could', 'Wont']);
    cols.forEach(col => {
        const div = document.createElement('div');
        div.className = 'board-column';
        div.dataset.column = col;
        const cTasks = tasks.filter(t => {
            if (groupBy === 'none') return true;
            const val = groupBy === 'status' ? t.status : (t.priority === "Won't" ? 'Wont' : t.priority);
            return val === col;
        });
        const pVal = groupBy === 'status' ? 'null' : (col === 'Wont' ? "Won't" : (groupBy === 'none' ? 'null' : col));
        const sVal = groupBy === 'status' ? col : 'Todo';
        div.ondragover = (e) => { e.preventDefault(); div.classList.add('drag-over'); };
        div.ondragleave = () => div.classList.remove('drag-over');
        div.ondrop = (e) => {
            e.preventDefault();
            div.classList.remove('drag-over');
            const taskId = e.dataTransfer.getData('text/plain');
            if (taskId) {
                if (groupBy === 'status') vscode.postMessage({ type: 'updateStatus', id: taskId, status: col });
                else if (groupBy === 'priority') vscode.postMessage({ type: 'updatePriority', id: taskId, priority: col === 'Wont' ? "Won't" : col });
            }
        };
        div.innerHTML = `
            <div class="col-header">
                <div class="col-title-wrapper">
                    ${groupBy === 'status' ? `<i class="codicon ${STATUS_ICONS[col]} status-icon-header"></i>` : ''}
                    <span>${col}</span>
                </div>
                <span class="col-count">${cTasks.length}</span>
            </div>
            <div class="tasks-scroll">
                ${cTasks.map(t => `
                    <div class="task-card ${t.status === 'Done' ? 'task-is-done' : ''}" data-id="${t.id}" draggable="true" ondragstart="event.dataTransfer.setData('text/plain', '${t.id}'); this.classList.add('dragging')" ondragend="this.classList.remove('dragging')">
                        ${getPriorityIndicatorHtml(t)}
                        <div class="card-content">
                            <div class="card-title" ondblclick="event.stopPropagation(); makeEditable(this, '${t.id}')">${t.text}</div>
                            ${t.description ? `<div class="card-desc" onclick="event.stopPropagation(); openTaskModal('${t.id}')">${t.description}</div>` : `<div class="card-desc empty-desc" onclick="event.stopPropagation(); openTaskModal('${t.id}')">Add description...</div>`}
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
    const isTrigger = e.target.closest('.popover-wrapper') || e.target.closest('.format-btn') || e.target.closest('.ctx-menu') || e.target.closest('.modal-grid-item');
    const isPopover = e.target.closest('.popover') || e.target.closest('.premium-popover') || e.target.closest('.flatpickr-calendar');
    if (!isTrigger && !isPopover) closeAllPopovers();
    const ctxMenu = document.getElementById('taskContextMenu');
    if (ctxMenu && !ctxMenu.contains(e.target)) hideContextMenu();
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

vscode.postMessage({ type: 'ready' });
