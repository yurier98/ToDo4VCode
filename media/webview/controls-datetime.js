function clearTagsFromInput() {
    const tagsInput = document.getElementById('taskTagsInput');
    if (tagsInput) tagsInput.value = '';

    if (modalTaskId) {
        const { codeReferenceTags } = splitTagsByType(modalTags);
        modalTags = normalizeTags(codeReferenceTags);
        vscode.postMessage({ type: 'updateTags', id: modalTaskId, tags: modalTags });
        updateModalUI();
    } else {
        const { codeReferenceTags } = splitTagsByType(currentPremiumTags);
        currentPremiumTags = normalizeTags(codeReferenceTags);
        syncPremiumTagsUI();
    }

    closeAllPopovers();
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
    const normalizedPriority = normalizePriority(p);

    if (modalTaskId) {
        vscode.postMessage({ type: 'updatePriority', id: modalTaskId, priority: normalizedPriority === 'Wont' ? "Won't" : normalizedPriority });
        modalPriority = normalizedPriority;
        updateModalUI();
        closeAllPopovers();
        return;
    }
    currentPremiumPriority = normalizedPriority;
    syncPremiumPriorityUI();
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
