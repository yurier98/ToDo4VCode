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
