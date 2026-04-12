function openTaskModal(taskId) {
    const task = currentTasks.find(t => t.id === taskId);
    if (!task) return;

    modalTaskId = taskId;
    modalStatus = task.status;
    modalPriority = task.priority === "Won't" ? 'Wont' : task.priority;
    modalTags = normalizeTags(task.tags || []);
    modalDueDate = task.dueDate;
    modalReminders = task.reminders || [];

    const modal = document.getElementById('taskModal');
    const titleInput = document.getElementById('modalTaskTitle');
    const descInput = document.getElementById('modalTaskDesc');
    const statusLabel = document.getElementById('modalStatusLabel');
    const taskCheckbox = document.getElementById('modalTaskCheckbox');

    if (titleInput) titleInput.value = task.text;
    if (descInput) descInput.value = task.description || '';
    if (statusLabel) statusLabel.innerText = task.status;

    // Checkbox de tarea principal
    if (taskCheckbox) {
        if (task.status === 'Done') {
            taskCheckbox.classList.add('completed');
        } else {
            taskCheckbox.classList.remove('completed');
        }
    }

    if (datePicker) datePicker.setDate(task.dueDate || '', false);
    if (reminderPicker) {
        const r = (task.reminders && task.reminders.length > 0) ? task.reminders[0] : '';
        reminderPicker.setDate(r, false);
    }

    updateModalUI();

    modal.classList.add('active');
    modal.classList.remove('hidden');

    // Auto-resize textareas
    const autoResize = (el, maxHeight) => {
        el.style.height = 'auto';
        let newHeight = el.scrollHeight;
        if (maxHeight && newHeight > maxHeight) {
            newHeight = maxHeight;
            el.style.overflowY = 'auto';
        } else {
            el.style.overflowY = 'hidden';
        }
        el.style.height = newHeight + 'px';
    };

    if (titleInput) {
        autoResize(titleInput, 80); // Aprox 3 líneas
        titleInput.oninput = () => autoResize(titleInput, 80);
    }
    if (descInput) {
        autoResize(descInput, 200);
        descInput.oninput = () => autoResize(descInput, 200);
    }

    renderSubtasks(task.subtasks || []);
}

function renderSubtasks(subtasks) {
    const list = document.getElementById('subtaskList');
    const progress = document.getElementById('subtaskProgress');
    const hideToggle = document.getElementById('hideCompletedSubtasks');
    const addSubtaskContainer = document.querySelector('.add-subtask-minimal');
    if (!list) return;

    list.innerHTML = '';
    
    const completedCount = subtasks.length > 0 ? subtasks.filter(s => s.completed).length : 0;
    if (progress) progress.innerText = `${completedCount}/${subtasks.length}`;

    // Update Toggle Text and Icon
    if (hideToggle) {
        const iconClass = hideCompletedSubtasksState ? 'codicon-eye' : 'codicon-eye-closed';
        const text = hideCompletedSubtasksState ? 'Show completed' : 'Hide completed';
        hideToggle.innerHTML = `<i class="codicon ${iconClass}"></i><span>${text}</span>`;
    }

    // Split into incomplete and completed
    const incomplete = subtasks.filter(s => !s.completed);
    const completed = subtasks.filter(s => s.completed);

    // 1. Render incomplete subtasks
    incomplete.forEach(s => {
        const item = createSubtaskElement(s);
        list.appendChild(item);
    });

    // 2. Render "Add Subtask" UI in the middle (after incomplete)
    if (addSubtaskContainer) {
        list.appendChild(addSubtaskContainer);
    }

    // 3. Render completed subtasks (if not hidden)
    if (!hideCompletedSubtasksState) {
        completed.forEach(s => {
            const item = createSubtaskElement(s);
            list.appendChild(item);
        });
    }

    list.querySelectorAll('.subtask-text-input').forEach((textarea) => {
        autoResizeSubtaskTextarea(textarea);
    });

    const newSubtaskInput = document.getElementById('newSubtaskInput');
    if (newSubtaskInput) {
        autoResizeSubtaskTextarea(newSubtaskInput);
    }
}

function createSubtaskElement(s) {
    const item = document.createElement('div');
    item.className = 'subtask-item';
    item.innerHTML = `
        <div class="subtask-checkbox ${s.completed ? 'completed' : ''}" onclick="toggleSubtask('${s.id}')"></div>
        <textarea class="subtask-text-input ${s.completed ? 'completed' : ''}" rows="1"
            oninput="autoResizeSubtaskTextarea(this)"
            onblur="updateSubtaskText('${s.id}', this.value)">${escapeHtml(asText(s.text))}</textarea>
        <button class="subtask-delete-btn" onclick="deleteSubtask('${s.id}')">
            <i class="codicon codicon-trash"></i>
        </button>
    `;
    return item;
}

function autoResizeSubtaskTextarea(textarea) {
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
}

function toggleHideCompletedSubtasks() {
    hideCompletedSubtasksState = !hideCompletedSubtasksState;
    saveState();
    
    const task = currentTasks.find(t => t.id === modalTaskId);
    if (task) {
        renderSubtasks(task.subtasks || []);
    }
}

function toggleSubtasksCollapse() {
    const header = document.querySelector('.subtasks-section-modern .modal-section-header');
    const container = document.getElementById('subtasksContainer');
    if (container && header) {
        container.classList.toggle('hidden');
        header.classList.toggle('collapsed');
    }
}

function focusSubtaskInput() {
    const input = document.getElementById('newSubtaskInput');
    if (input) {
        input.focus();
        autoResizeSubtaskTextarea(input);
    }
}

function handleNewSubtaskKeydown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        addSubtask();
    }
}

function toggleMainTaskCompletion() {
    if (!modalTaskId) return;
    const task = currentTasks.find(t => t.id === modalTaskId);
    if (!task) return;

    const newStatus = modalStatus === 'Done' ? 'Todo' : 'Done';
    setModalStatus(newStatus);
}

function addSubtask() {
    const input = document.getElementById('newSubtaskInput');
    const text = input.value.trim();
    if (!text || !modalTaskId) return;

    vscode.postMessage({ type: 'addSubtask', taskId: modalTaskId, text });
    input.value = '';
    autoResizeSubtaskTextarea(input);

    // Optimistic update
    const task = currentTasks.find(t => t.id === modalTaskId);
    if (task) {
        if (!task.subtasks) task.subtasks = [];
        const newSub = { id: 'temp-' + Date.now(), text, completed: false };
        task.subtasks.push(newSub);
        renderSubtasks(task.subtasks);
    }
}

function toggleSubtask(subtaskId) {
    if (!modalTaskId) return;
    vscode.postMessage({ type: 'toggleSubtask', taskId: modalTaskId, subtaskId });

    // Optimistic update
    const task = currentTasks.find(t => t.id === modalTaskId);
    if (task && task.subtasks) {
        const sub = task.subtasks.find(s => s.id === subtaskId);
        if (sub) {
            sub.completed = !sub.completed;
            renderSubtasks(task.subtasks);
        }
    }
}

function deleteSubtask(subtaskId) {
    if (!modalTaskId) return;
    vscode.postMessage({ type: 'deleteSubtask', taskId: modalTaskId, subtaskId });

    // Optimistic update
    const task = currentTasks.find(t => t.id === modalTaskId);
    if (task && task.subtasks) {
        task.subtasks = task.subtasks.filter(s => s.id !== subtaskId);
        renderSubtasks(task.subtasks);
    }
}

function updateSubtaskText(subtaskId, text) {
    if (!modalTaskId || !text.trim()) return;
    vscode.postMessage({ type: 'updateSubtaskText', taskId: modalTaskId, subtaskId, text: text.trim() });

    // Optimistic update
    const task = currentTasks.find(t => t.id === modalTaskId);
    if (task && task.subtasks) {
        const sub = task.subtasks.find(s => s.id === subtaskId);
        if (sub) {
            sub.text = text.trim();
        }
    }
}

function updateModalUI() {
    const dateVal = document.getElementById('modalDateValue');
    const reminderVal = document.getElementById('modalReminderValue');
    const priorityVal = document.getElementById('modalPriorityValue');
    const tagsVal = document.getElementById('modalTagsValue');
    const codeRefsContainer = document.getElementById('modalCodeRefsContainer');
    const codeRefChips = document.getElementById('modalCodeRefChips');
    const statusVal = document.getElementById('modalStatusValue');
    const statusLabel = document.getElementById('modalStatusLabel');
    const taskCheckbox = document.getElementById('modalTaskCheckbox');

    // Date
    if (dateVal) {
        dateVal.classList.remove('date-color-today', 'date-color-tomorrow', 'date-color-soon', 'date-color-weekend', 'date-color-custom');
        const clearBtn = dateVal.querySelector('.clear-date-btn');
        if (modalDueDate) {
            const d = new Date(modalDueDate);
            d.setHours(0, 0, 0, 0);
            const now = new Date();
            now.setHours(0, 0, 0, 0);
            const tomorrow = new Date(now);
            tomorrow.setDate(tomorrow.getDate() + 1);

            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            let label = `${months[d.getMonth()]} ${d.getDate()}`;
            
            if (d.getTime() === now.getTime()) label = 'Today';
            else if (d.getTime() === tomorrow.getTime()) label = 'Tomorrow';

            dateVal.querySelector('span').innerText = label;
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
        reminderVal.classList.remove('date-color-today', 'date-color-tomorrow', 'date-color-soon', 'date-color-weekend', 'date-color-custom');
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

    // Tags
    if (tagsVal) {
        const tagsChips = document.getElementById('modalTagsChips');
        const regularTags = [];
        const codeReferenceTags = [];

        for (const tag of modalTags) {
            if (parseCodeReferenceTag(tag)) {
                codeReferenceTags.push(tag);
            } else {
                regularTags.push(tag);
            }
        }

        if (tagsChips) {
            tagsChips.innerHTML = '';

            if (regularTags.length === 0) {
                const emptyLabel = document.createElement('span');
                emptyLabel.className = 'modal-tag-empty';
                emptyLabel.innerText = 'No tags';
                tagsChips.appendChild(emptyLabel);
            } else {
                const fragment = document.createDocumentFragment();
                regularTags.forEach(tag => {
                    const chip = document.createElement('span');
                    chip.className = 'modal-tag-chip';
                    chip.innerText = tag;
                    fragment.appendChild(chip);
                });
                tagsChips.appendChild(fragment);
            }
        }

        if (codeRefsContainer && codeRefChips) {
            codeRefChips.innerHTML = '';
            const normalizeCodePath = (value) => asText(value).replace(/\\/g, '/').toLowerCase();
            const parsedCodeRefs = codeReferenceTags
                .map((tag) => ({ tag, parsed: parseCodeReferenceTag(tag) }))
                .filter((entry) => entry.parsed);
            const pathsWithLineReference = new Set(
                parsedCodeRefs
                    .filter((entry) => entry.parsed.line && entry.parsed.line > 0)
                    .map((entry) => normalizeCodePath(entry.parsed.path))
            );
            const dedupedCodeReferenceTags = [];
            const seenCodeRefKeys = new Set();

            for (const entry of parsedCodeRefs) {
                const normalizedPath = normalizeCodePath(entry.parsed.path);
                const hasLine = Boolean(entry.parsed.line && entry.parsed.line > 0);
                if (!hasLine && pathsWithLineReference.has(normalizedPath)) {
                    continue;
                }

                const codeKey = `${normalizedPath}:${entry.parsed.line || 0}:${entry.parsed.column || 0}:${entry.parsed.endLine || 0}:${entry.parsed.endColumn || 0}`;
                if (seenCodeRefKeys.has(codeKey)) {
                    continue;
                }
                seenCodeRefKeys.add(codeKey);
                dedupedCodeReferenceTags.push(entry.tag);
            }

            if (dedupedCodeReferenceTags.length === 0) {
                codeRefsContainer.classList.add('hidden');
            } else {
                const fragment = document.createDocumentFragment();
                dedupedCodeReferenceTags.forEach((tag) => {
                    const chip = document.createElement('button');
                    chip.type = 'button';
                    chip.className = 'modal-code-ref-chip';
                    chip.title = `Open ${tag}`;
                    chip.innerHTML = `
                        <i class="codicon codicon-go-to-file"></i>
                        <span>${escapeHtml(getCodeReferenceDisplayLabel(tag))}</span>
                    `;
                    chip.addEventListener('click', (event) => {
                        openCodeTagFromBadge(event, encodeURIComponent(tag));
                    });
                    fragment.appendChild(chip);
                });
                codeRefChips.appendChild(fragment);
                codeRefsContainer.classList.remove('hidden');
            }
        }
    }
    if (taskCheckbox) {
        taskCheckbox.style.color = PRIORITY_COLORS[modalPriority] || '#8e8e93';
        const cleanStatus = modalStatus.toLowerCase().replace(' ', '-');
        taskCheckbox.className = `priority-indicator is-${cleanStatus}`;
        taskCheckbox.innerHTML = modalStatus === 'Done' ? '<i class="codicon codicon-check"></i>' : '';
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

    const titleInput = document.getElementById('modalTaskTitle');
    const descInput = document.getElementById('modalTaskDesc');
    const subtaskInput = document.getElementById('newSubtaskInput');
    
    if (!titleInput) {
        console.error('Modal title input not found');
        return;
    }

    const title = titleInput.value.trim();
    const description = descInput ? descInput.value.trim() : '';

    if (!title) {
        titleInput.focus();
        titleInput.style.borderColor = 'var(--vscode-inputValidation-errorBorder)';
        setTimeout(() => {
            if (titleInput) titleInput.style.borderColor = '';
        }, 2000);
        return;
    }

    try {
        if (subtaskInput && subtaskInput.value.trim()) {
            const subtaskText = subtaskInput.value.trim();
            vscode.postMessage({ type: 'addSubtask', taskId: modalTaskId, text: subtaskText });
            subtaskInput.value = '';
        }
        
        vscode.postMessage({ type: 'updateTaskText', id: modalTaskId, text: title });
        vscode.postMessage({ type: 'updateDescription', id: modalTaskId, description: description });
        vscode.postMessage({ type: 'updateTags', id: modalTaskId, tags: modalTags });
        closeTaskModal();
    } catch (error) {
        console.error('Error saving task:', error);
    }
}

function deleteTaskFromModal() {
    if (modalTaskId) {
        vscode.postMessage({ type: 'deleteTask', id: modalTaskId });
        closeTaskModal();
    }
}
