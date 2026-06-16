let draggedSubtaskId = null;
let draggedSubtaskCompletedState = null;
let subtaskDragCleanupTimer = null;

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
    list.ondragover = handleSubtaskDragOver;
    list.ondrop = handleSubtaskDrop;
    
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
    item.draggable = false;
    item.dataset.subtaskId = s.id;
    item.dataset.completed = s.completed ? 'true' : 'false';
    item.addEventListener('dragend', scheduleSubtaskDragCleanup);
    item.innerHTML = `
        <div class="subtask-drag-handle" draggable="true" title="Drag to reorder" aria-label="Drag to reorder">
            <i class="codicon codicon-gripper"></i>
        </div>
        <div class="subtask-checkbox ${s.completed ? 'completed' : ''}" onclick="toggleSubtask('${s.id}')"></div>
        <textarea class="subtask-text-input ${s.completed ? 'completed' : ''}" rows="1"
            oninput="autoResizeSubtaskTextarea(this)"
            onblur="updateSubtaskText('${s.id}', this.value)">${escapeHtml(asText(s.text))}</textarea>
        <button class="subtask-delete-btn" onclick="deleteSubtask('${s.id}')">
            <i class="codicon codicon-trash"></i>
        </button>
    `;

    const dragHandle = item.querySelector('.subtask-drag-handle');
    if (dragHandle) {
        dragHandle.addEventListener('dragstart', (event) => handleSubtaskDragStart(event, s.id, Boolean(s.completed)));
        dragHandle.addEventListener('dragend', scheduleSubtaskDragCleanup);
    }

    return item;
}

function cleanupSubtaskDragState() {
    if (subtaskDragCleanupTimer) {
        clearTimeout(subtaskDragCleanupTimer);
        subtaskDragCleanupTimer = null;
    }
    document.querySelectorAll('.subtask-drag-preview').forEach((preview) => preview.remove());
    document.querySelectorAll('.subtask-drag-indicator').forEach((indicator) => indicator.remove());
    document.querySelectorAll('.subtask-item.is-dragging').forEach((item) => {
        item.classList.remove('is-dragging');
        item.removeAttribute('aria-grabbed');
    });
    document.getElementById('subtaskList')?.classList.remove('is-subtask-dragging');
    draggedSubtaskId = null;
    draggedSubtaskCompletedState = null;
}

function scheduleSubtaskDragCleanup() {
    if (subtaskDragCleanupTimer) {
        clearTimeout(subtaskDragCleanupTimer);
    }

    subtaskDragCleanupTimer = setTimeout(() => {
        subtaskDragCleanupTimer = null;
        cleanupSubtaskDragState();
    }, 0);
}

function handleSubtaskDragStart(event, subtaskId, completed) {
    const item = event.target.closest('.subtask-item');

    if (!item) {
        event.preventDefault();
        return;
    }

    draggedSubtaskId = subtaskId;
    draggedSubtaskCompletedState = completed ? 'true' : 'false';
    if (subtaskDragCleanupTimer) {
        clearTimeout(subtaskDragCleanupTimer);
        subtaskDragCleanupTimer = null;
    }
    item.classList.add('is-dragging');
    item.setAttribute('aria-grabbed', 'true');
    document.getElementById('subtaskList')?.classList.add('is-subtask-dragging');
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', `subtask:${subtaskId}`);

    const dragPreview = createSubtaskDragPreview(item);
    event.dataTransfer.setDragImage(dragPreview, 18, 12);
}

function createSubtaskDragPreview(item) {
    const dragPreview = document.createElement('div');
    const itemBox = item.getBoundingClientRect();
    const previewWidth = Math.min(Math.max(itemBox.width * 0.72, 260), 460);
    dragPreview.classList.add('subtask-drag-preview');
    dragPreview.style.width = `${previewWidth}px`;

    const isCompleted = item.dataset.completed === 'true';
    const subtaskText = item.querySelector('.subtask-text-input')?.value || '';
    dragPreview.innerHTML = `
        <div class="subtask-preview-handle">
            <i class="codicon codicon-gripper"></i>
        </div>
        <div class="subtask-preview-checkbox ${isCompleted ? 'completed' : ''}"></div>
        <div class="subtask-preview-text ${isCompleted ? 'completed' : ''}">
            ${escapeHtml(asText(subtaskText))}
        </div>
    `;

    document.body.appendChild(dragPreview);
    return dragPreview;
}

function handleSubtaskDragOver(event) {
    if (!draggedSubtaskId || draggedSubtaskCompletedState === null) return;

    const list = document.getElementById('subtaskList');
    if (!list) return;

    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';

    let indicator = document.querySelector('.subtask-drag-indicator');
    if (!indicator) {
        indicator = document.createElement('div');
        indicator.className = 'subtask-drag-indicator';
    }

    const afterElement = getSubtaskDragAfterElement(list, event.clientY, draggedSubtaskCompletedState);
    if (afterElement) {
        if (afterElement.previousElementSibling !== indicator) {
            afterElement.before(indicator);
        }
        return;
    }

    const addSubtaskContainer = document.querySelector('.add-subtask-minimal');
    if (draggedSubtaskCompletedState === 'false' && addSubtaskContainer) {
        if (addSubtaskContainer.previousElementSibling !== indicator) {
            addSubtaskContainer.before(indicator);
        }
        return;
    }

    if (list.lastElementChild !== indicator) {
        list.appendChild(indicator);
    }
}

function getSubtaskDragAfterElement(container, pointerY, completedState) {
    const items = Array.from(container.querySelectorAll(`.subtask-item[data-completed="${completedState}"]`))
        .filter((item) => !item.classList.contains('is-dragging'));

    let afterElement = null;
    let minDistance = Number.POSITIVE_INFINITY;

    for (const item of items) {
        const box = item.getBoundingClientRect();
        const offset = pointerY - (box.top + box.height / 2);
        if (offset < 0 && -offset < minDistance) {
            minDistance = -offset;
            afterElement = item;
        }
    }

    return afterElement;
}

function handleSubtaskDrop(event) {
    if (!modalTaskId) {
        cleanupSubtaskDragState();
        return;
    }

    event.preventDefault();
    event.stopPropagation();

    const list = document.getElementById('subtaskList');
    const task = currentTasks.find(t => t.id === modalTaskId);
    if (!list || !task || !Array.isArray(task.subtasks)) {
        cleanupSubtaskDragState();
        return;
    }

    const transferSubtaskId = getSubtaskIdFromDragEvent(event);
    const activeDraggedSubtaskId = draggedSubtaskId || transferSubtaskId;
    const activeCompletedState = draggedSubtaskCompletedState || getSubtaskCompletedState(task, activeDraggedSubtaskId);

    if (!activeDraggedSubtaskId || activeCompletedState === null) {
        cleanupSubtaskDragState();
        return;
    }

    const nextSubtaskIds = getDroppedSubtaskIds(list, activeCompletedState, activeDraggedSubtaskId);
    const currentSubtaskIds = task.subtasks
        .filter((subtask) => String(Boolean(subtask.completed)) === activeCompletedState)
        .map((subtask) => subtask.id);
    const droppedCompletedState = activeCompletedState === 'true';

    cleanupSubtaskDragState();

    if (nextSubtaskIds.length < 2 || nextSubtaskIds.join('|') === currentSubtaskIds.join('|')) {
        return;
    }

    applySubtaskGroupOrder(task, nextSubtaskIds, droppedCompletedState);
    renderSubtasks(task.subtasks);
    vscode.postMessage({ type: 'reorderSubtasks', taskId: modalTaskId, subtaskIds: nextSubtaskIds });
}

function getDroppedSubtaskIds(list, completedState, draggedId) {
    const indicator = list.querySelector('.subtask-drag-indicator');
    const groupItems = Array.from(list.querySelectorAll(`.subtask-item[data-completed="${completedState}"]`))
        .filter((item) => item.dataset.subtaskId !== draggedId);
    const orderedIds = groupItems.map((item) => item.dataset.subtaskId).filter(Boolean);

    let insertIndex = orderedIds.length;
    if (indicator) {
        let nextSibling = indicator.nextElementSibling;
        while (nextSibling) {
            if (
                nextSibling.classList.contains('subtask-item') &&
                nextSibling.dataset.completed === completedState &&
                nextSibling.dataset.subtaskId !== draggedId
            ) {
                insertIndex = groupItems.indexOf(nextSibling);
                break;
            }
            nextSibling = nextSibling.nextElementSibling;
        }
    }

    orderedIds.splice(insertIndex, 0, draggedId);
    return orderedIds;
}

function getSubtaskIdFromDragEvent(event) {
    const rawValue = event.dataTransfer?.getData('text/plain') || '';
    return rawValue.startsWith('subtask:') ? rawValue.slice('subtask:'.length) : '';
}

function getSubtaskCompletedState(task, subtaskId) {
    const subtask = task.subtasks.find((item) => item.id === subtaskId);
    if (!subtask) return null;
    return subtask.completed ? 'true' : 'false';
}

function applySubtaskGroupOrder(task, subtaskIds, completed) {
    const reorderableSubtasks = task.subtasks.filter((subtask) => Boolean(subtask.completed) === completed);
    const orderedSubtasks = subtaskIds
        .map((subtaskId) => reorderableSubtasks.find((subtask) => subtask.id === subtaskId))
        .filter(Boolean);
    const orderedIds = new Set(orderedSubtasks.map((subtask) => subtask.id));
    const nextReorderableSubtasks = [
        ...orderedSubtasks,
        ...reorderableSubtasks.filter((subtask) => !orderedIds.has(subtask.id))
    ];
    const reorderableIds = new Set(reorderableSubtasks.map((subtask) => subtask.id));
    let replacementIndex = 0;

    task.subtasks = task.subtasks.map((subtask) => {
        if (!reorderableIds.has(subtask.id)) {
            return subtask;
        }

        return nextReorderableSubtasks[replacementIndex++];
    });
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
