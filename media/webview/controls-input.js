function submitPremiumTask() {
    const titleEl = document.getElementById('taskTitle');
    const descEl = document.getElementById('taskDesc');
    if (titleEl && titleEl.value.trim()) {
        const taskData = {
            text: titleEl.value.trim(),
            description: descEl ? descEl.value.trim() : '',
            priority: currentPremiumPriority,
            status: currentPremiumStatus,
            tags: currentPremiumTags.length > 0 ? currentPremiumTags : undefined,
            reminders: currentPremiumReminders.length > 0 ? currentPremiumReminders : undefined
        };
        
        if (currentPremiumDate !== null && currentPremiumDate !== undefined) {
            taskData.dueDate = currentPremiumDate;
        }
        
        vscode.postMessage({
            type: 'addTask',
            value: taskData
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
    currentPremiumTags = [];
    syncPremiumTagsUI();
    syncPremiumPriorityUI();
}

function submitTask(text, priority, status, autoEdit = false) {
    shouldAutoEditNewTask = autoEdit;
    const effectivePriority = normalizePriority(priority || currentPremiumPriority || configuredDefaultPriority);
    const effectiveTags = activeTagFilters.length > 0 ? normalizeTags(activeTagFilters) : undefined;
    vscode.postMessage({
        type: 'addTask',
        value: { text, priority: effectivePriority, status: status || 'Todo', description: '', tags: effectiveTags }
    });
}

function syncPremiumPriorityUI() {
    const normalizedPriority = normalizePriority(currentPremiumPriority);
    currentPremiumPriority = normalizedPriority;

    const label = document.getElementById('priorityLabel');
    const icon = document.querySelector('#priorityFlagBtn i');
    if (label) label.innerText = normalizedPriority === 'Wont' ? "Won't" : normalizedPriority;
    if (icon) icon.style.color = PRIORITY_COLORS[normalizedPriority];
}
