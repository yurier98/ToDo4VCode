// --- Subtask reordering engine (Pointer Events + keyboard) ---
const DRAG_THRESHOLD = 4;
const AUTO_SCROLL_ZONE = 36;
const AUTO_SCROLL_SPEED = 8;

const subtaskReorder = {
    // Pointer session
    active: false,
    pointerId: null,
    handleEl: null,
    itemEl: null,
    subtaskId: null,
    completedState: null,
    startX: 0,
    startY: 0,
    ghostEl: null,
    ghostOffsetX: 0,
    ghostOffsetY: 0,
    lastPointerX: 0,
    lastPointerY: 0,
    rafId: null,
    autoScrollRaf: null,
    scrollDir: 0,
    // Keyboard session
    kbGrabbed: false,
    kbSubtaskId: null,
    kbCompletedState: null,
    kbOriginalOrder: null
};

let subtaskReorderInitDone = false;

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

function initSubtaskReorderOnce() {
    if (subtaskReorderInitDone) return;
    const container = document.getElementById('subtasksContainer');
    if (!container) return;
    if (!document.getElementById('subtaskReorderLive')) {
        const live = document.createElement('div');
        live.id = 'subtaskReorderLive';
        live.className = 'visually-hidden';
        live.setAttribute('role', 'status');
        live.setAttribute('aria-live', 'polite');
        live.setAttribute('aria-atomic', 'true');
        container.appendChild(live);
    }
    subtaskReorderInitDone = true;
}

function renderSubtasks(subtasks) {
    const list = document.getElementById('subtaskList');
    const progress = document.getElementById('subtaskProgress');
    const hideToggle = document.getElementById('hideCompletedSubtasks');
    const addSubtaskContainer = document.querySelector('.add-subtask-minimal');
    if (!list) return;

    // Abort any active pointer drag before wiping the list (abort-on-render).
    if (subtaskReorder.active) {
        endPointerDrag();
    }

    initSubtaskReorderOnce();

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
    item.draggable = false;
    item.dataset.subtaskId = s.id;
    item.dataset.completed = s.completed ? 'true' : 'false';
    item.innerHTML = `
        <div class="subtask-drag-handle" tabindex="0" role="button" aria-roledescription="draggable subtask handle" title="Drag to reorder" aria-label="Drag to reorder">
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
        const completedState = String(Boolean(s.completed));
        dragHandle.addEventListener('pointerdown', (event) => onHandlePointerDown(event, s.id, completedState));
        dragHandle.addEventListener('keydown', (event) => onHandleKeyDown(event, s.id, completedState));
    }

    return item;
}

// --- ARIA live announcements ---

function announceReorder(message) {
    const live = document.getElementById('subtaskReorderLive');
    if (!live) return;
    live.textContent = '';
    requestAnimationFrame(() => {
        const region = document.getElementById('subtaskReorderLive');
        if (region) region.textContent = message;
    });
}

// --- Pointer flow ---

function onHandlePointerDown(event, subtaskId, completedState) {
    // Ignore non-primary mouse buttons (allow touch/pen where button is 0/-1).
    if (event.pointerType === 'mouse' && event.button !== 0) return;

    const handle = event.currentTarget;
    const item = handle.closest('.subtask-item');
    if (!item) return;

    event.preventDefault();

    subtaskReorder.active = false;
    subtaskReorder.pointerId = event.pointerId;
    subtaskReorder.handleEl = handle;
    subtaskReorder.itemEl = item;
    subtaskReorder.subtaskId = subtaskId;
    subtaskReorder.completedState = completedState;
    subtaskReorder.startX = event.clientX;
    subtaskReorder.startY = event.clientY;
    subtaskReorder.lastPointerX = event.clientX;
    subtaskReorder.lastPointerY = event.clientY;

    try {
        handle.setPointerCapture(event.pointerId);
    } catch {
        // setPointerCapture can throw if the pointer is already gone; ignore.
    }

    handle.addEventListener('pointermove', onHandlePointerMove);
    handle.addEventListener('pointerup', onHandlePointerUp);
    handle.addEventListener('pointercancel', onHandlePointerCancel);
    handle.addEventListener('lostpointercapture', onHandlePointerCancel);
}

function onHandlePointerMove(event) {
    if (event.pointerId !== subtaskReorder.pointerId) return;

    subtaskReorder.lastPointerX = event.clientX;
    subtaskReorder.lastPointerY = event.clientY;

    if (!subtaskReorder.active) {
        const dx = event.clientX - subtaskReorder.startX;
        const dy = event.clientY - subtaskReorder.startY;
        if (Math.hypot(dx, dy) > DRAG_THRESHOLD) {
            beginPointerDrag(event);
        }
        return;
    }

    if (subtaskReorder.rafId === null) {
        subtaskReorder.rafId = requestAnimationFrame(onReorderFrame);
    }
}

function beginPointerDrag(event) {
    const item = subtaskReorder.itemEl;
    const list = document.getElementById('subtaskList');
    if (!item || !list) return;

    subtaskReorder.active = true;
    item.classList.add('is-dragging');
    list.classList.add('is-subtask-dragging');

    const ghost = createDragGhost(item);
    subtaskReorder.ghostEl = ghost;
    const box = item.getBoundingClientRect();
    subtaskReorder.ghostOffsetX = event.clientX - box.left;
    subtaskReorder.ghostOffsetY = event.clientY - box.top;

    document.body.style.userSelect = 'none';

    const task = currentTasks.find(t => t.id === modalTaskId);
    const groupIds = task ? getGroupSubtaskIds(task, subtaskReorder.completedState) : [];
    const total = groupIds.length;
    const index = groupIds.indexOf(subtaskReorder.subtaskId) + 1;
    const label = item.querySelector('.subtask-text-input')?.value || 'subtask';
    announceReorder(`Grabbed ${label}, position ${index} of ${total}`);

    subtaskReorder.rafId = requestAnimationFrame(onReorderFrame);
    startAutoScrollLoop();
}

function onReorderFrame() {
    subtaskReorder.rafId = null;
    if (!subtaskReorder.active) return;

    const ghost = subtaskReorder.ghostEl;
    if (ghost) {
        const x = subtaskReorder.lastPointerX - subtaskReorder.ghostOffsetX;
        const y = subtaskReorder.lastPointerY - subtaskReorder.ghostOffsetY;
        ghost.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    }

    updateDropIndicator();
    evaluateAutoScrollZone();
}

function updateDropIndicator() {
    const list = document.getElementById('subtaskList');
    if (!list) return;

    let indicator = list.querySelector('.subtask-drag-indicator');
    if (!indicator) {
        indicator = document.createElement('div');
        indicator.className = 'subtask-drag-indicator';
    }

    const completedState = subtaskReorder.completedState;
    const afterElement = getSubtaskDragAfterElement(list, subtaskReorder.lastPointerY, completedState);

    if (afterElement) {
        if (afterElement.previousElementSibling !== indicator) {
            afterElement.before(indicator);
        }
        return;
    }

    // Parking: pending group parks before the add-subtask row; completed group at list end.
    const addSubtaskContainer = list.querySelector('.add-subtask-minimal');
    if (completedState === 'false' && addSubtaskContainer) {
        if (addSubtaskContainer.previousElementSibling !== indicator) {
            addSubtaskContainer.before(indicator);
        }
        return;
    }

    if (list.lastElementChild !== indicator) {
        list.appendChild(indicator);
    }
}

function evaluateAutoScrollZone() {
    const scroller = document.querySelector('.modal-scrollable-area');
    if (!scroller) {
        subtaskReorder.scrollDir = 0;
        return;
    }

    const rect = scroller.getBoundingClientRect();
    const y = subtaskReorder.lastPointerY;
    if (y < rect.top + AUTO_SCROLL_ZONE) {
        subtaskReorder.scrollDir = -1;
    } else if (y > rect.bottom - AUTO_SCROLL_ZONE) {
        subtaskReorder.scrollDir = 1;
    } else {
        subtaskReorder.scrollDir = 0;
    }
}

function startAutoScrollLoop() {
    if (subtaskReorder.autoScrollRaf !== null) return;

    const step = () => {
        if (!subtaskReorder.active) {
            subtaskReorder.autoScrollRaf = null;
            return;
        }
        const scroller = document.querySelector('.modal-scrollable-area');
        if (scroller && subtaskReorder.scrollDir !== 0) {
            scroller.scrollTop += subtaskReorder.scrollDir * AUTO_SCROLL_SPEED;
            updateDropIndicator();
        }
        subtaskReorder.autoScrollRaf = requestAnimationFrame(step);
    };

    subtaskReorder.autoScrollRaf = requestAnimationFrame(step);
}

function onHandlePointerUp(event) {
    if (event.pointerId !== subtaskReorder.pointerId) return;

    if (subtaskReorder.active) {
        finalizeReorder();
        endPointerDrag();
    } else {
        // Sub-threshold: treat as a click no-op.
        endPointerDrag();
    }
}

function onHandlePointerCancel(event) {
    if (event.pointerId !== subtaskReorder.pointerId) return;
    // Clean abort, no message emitted.
    endPointerDrag();
}

function finalizeReorder() {
    const list = document.getElementById('subtaskList');
    if (!list) return;
    const completedState = subtaskReorder.completedState;
    const nextSubtaskIds = computeGroupIdsFromDom(list, completedState, subtaskReorder.subtaskId);
    commitGroupReorder(nextSubtaskIds, completedState);
}

function endPointerDrag() {
    const handle = subtaskReorder.handleEl;
    const pointerId = subtaskReorder.pointerId;

    if (handle) {
        handle.removeEventListener('pointermove', onHandlePointerMove);
        handle.removeEventListener('pointerup', onHandlePointerUp);
        handle.removeEventListener('pointercancel', onHandlePointerCancel);
        handle.removeEventListener('lostpointercapture', onHandlePointerCancel);
        if (pointerId !== null) {
            try {
                handle.releasePointerCapture(pointerId);
            } catch {
                // Ignore if capture was already released.
            }
        }
    }

    if (subtaskReorder.ghostEl) {
        subtaskReorder.ghostEl.remove();
    }
    document.querySelectorAll('.subtask-drag-indicator').forEach((indicator) => indicator.remove());
    document.querySelectorAll('.subtask-item.is-dragging').forEach((item) => item.classList.remove('is-dragging'));
    document.getElementById('subtaskList')?.classList.remove('is-subtask-dragging');
    document.body.style.userSelect = '';

    if (subtaskReorder.rafId !== null) {
        cancelAnimationFrame(subtaskReorder.rafId);
        subtaskReorder.rafId = null;
    }
    if (subtaskReorder.autoScrollRaf !== null) {
        cancelAnimationFrame(subtaskReorder.autoScrollRaf);
        subtaskReorder.autoScrollRaf = null;
    }

    subtaskReorder.active = false;
    subtaskReorder.pointerId = null;
    subtaskReorder.handleEl = null;
    subtaskReorder.itemEl = null;
    subtaskReorder.subtaskId = null;
    subtaskReorder.completedState = null;
    subtaskReorder.ghostEl = null;
    subtaskReorder.scrollDir = 0;
}

function createDragGhost(itemEl) {
    // Ghost wrapper: positioned + followed by the inline translate3d from the
    // RAF loop. Rotate/scale live on the inner element so the JS never
    // overwrites them.
    const ghost = document.createElement('div');
    ghost.classList.add('subtask-drag-ghost');

    const itemBox = itemEl.getBoundingClientRect();
    const ghostWidth = Math.min(Math.max(itemBox.width, 320), 460);
    ghost.style.width = `${ghostWidth}px`;
    ghost.style.position = 'fixed';
    ghost.style.left = '0';
    ghost.style.top = '0';
    ghost.style.zIndex = '10000';
    ghost.style.pointerEvents = 'none';
    ghost.style.willChange = 'transform';

    // Clone the real subtask DOM (handle, checkbox, text, delete button) so the
    // ghost looks exactly like the source row instead of a reduced preview.
    const inner = itemEl.cloneNode(true);
    inner.classList.remove('subtask-item');
    inner.classList.add('subtask-drag-ghost-inner');

    // Strip interaction so the clone is purely visual:
    // - the live value is read from the source row, then the textarea becomes a
    //   plain <div> with the same text (no caret, focus, or edit affordance),
    // - inline onclick/oninput/onblur handlers are removed,
    // - the handle is not tab-focusable while the ghost is detached.
    const sourceText = itemEl.querySelector('.subtask-text-input')?.value || '';
    const textInput = inner.querySelector('.subtask-text-input');
    if (textInput) {
        const textDiv = document.createElement('div');
        textDiv.className = 'subtask-text-input' + (textInput.classList.contains('completed') ? ' completed' : '');
        textDiv.textContent = sourceText;
        textInput.replaceWith(textDiv);
    }
    inner.querySelectorAll('[onclick]').forEach((el) => el.removeAttribute('onclick'));
    inner.querySelectorAll('[oninput], [onblur]').forEach((el) => {
        el.removeAttribute('oninput');
        el.removeAttribute('onblur');
    });
    inner.querySelectorAll('[tabindex]').forEach((el) => el.removeAttribute('tabindex'));

    ghost.appendChild(inner);
    document.body.appendChild(ghost);
    return ghost;
}

// --- Keyboard flow (grab-mode) ---

function onHandleKeyDown(event, subtaskId, completedState) {
    const key = event.key;

    if (key === ' ' || key === 'Spacebar' || key === 'Enter') {
        event.preventDefault();
        if (subtaskReorder.kbGrabbed && subtaskReorder.kbSubtaskId === subtaskId) {
            // Drop
            const label = getSubtaskLabel(subtaskId);
            clearKeyboardGrab();
            announceReorder(`Dropped ${label}`);
        } else {
            pickUpKeyboardItem(subtaskId, completedState);
        }
        return;
    }

    if (!subtaskReorder.kbGrabbed || subtaskReorder.kbSubtaskId !== subtaskId) {
        return;
    }

    if (key === 'ArrowUp') {
        event.preventDefault();
        moveKeyboardItem(-1);
    } else if (key === 'ArrowDown') {
        event.preventDefault();
        moveKeyboardItem(1);
    } else if (key === 'Home') {
        event.preventDefault();
        moveKeyboardItemToEdge('first');
    } else if (key === 'End') {
        event.preventDefault();
        moveKeyboardItemToEdge('last');
    } else if (key === 'Escape') {
        event.preventDefault();
        if (subtaskReorder.kbOriginalOrder) {
            commitGroupReorder(subtaskReorder.kbOriginalOrder, subtaskReorder.kbCompletedState);
        }
        clearKeyboardGrab();
        announceReorder('Reorder cancelled');
    }
}

function pickUpKeyboardItem(subtaskId, completedState) {
    const task = currentTasks.find(t => t.id === modalTaskId);
    if (!task) return;

    const groupIds = getGroupSubtaskIds(task, completedState);
    subtaskReorder.kbGrabbed = true;
    subtaskReorder.kbSubtaskId = subtaskId;
    subtaskReorder.kbCompletedState = completedState;
    subtaskReorder.kbOriginalOrder = groupIds.slice();

    const item = getSubtaskItemById(subtaskId);
    if (item) item.classList.add('is-kb-grabbed');

    const total = groupIds.length;
    const index = groupIds.indexOf(subtaskId) + 1;
    announceReorder(`Grabbed ${getSubtaskLabel(subtaskId)}, position ${index} of ${total}`);
}

function moveKeyboardItem(delta) {
    const task = currentTasks.find(t => t.id === modalTaskId);
    if (!task) return;

    const completedState = subtaskReorder.kbCompletedState;
    const groupIds = getGroupSubtaskIds(task, completedState);
    const fromIndex = groupIds.indexOf(subtaskReorder.kbSubtaskId);
    if (fromIndex === -1) return;

    const toIndex = fromIndex + delta;
    // Clamp so items never cross groups.
    if (toIndex < 0 || toIndex > groupIds.length - 1) return;

    const nextIds = computeReorderedIds(groupIds, fromIndex, toIndex);
    commitGroupReorder(nextIds, completedState);
    refocusGrabbedHandle(subtaskReorder.kbSubtaskId);
    announceReorder(`Moved to position ${toIndex + 1} of ${nextIds.length}`);
}

function moveKeyboardItemToEdge(edge) {
    const task = currentTasks.find(t => t.id === modalTaskId);
    if (!task) return;

    const completedState = subtaskReorder.kbCompletedState;
    const groupIds = getGroupSubtaskIds(task, completedState);
    const fromIndex = groupIds.indexOf(subtaskReorder.kbSubtaskId);
    if (fromIndex === -1) return;

    const toIndex = edge === 'first' ? 0 : groupIds.length - 1;
    if (toIndex === fromIndex) return;

    const nextIds = computeReorderedIds(groupIds, fromIndex, toIndex);
    commitGroupReorder(nextIds, completedState);
    refocusGrabbedHandle(subtaskReorder.kbSubtaskId);
    announceReorder(`Moved to position ${toIndex + 1} of ${nextIds.length}`);
}

function refocusGrabbedHandle(subtaskId) {
    // Re-render replaced the DOM; re-query and restore focus + grabbed state.
    const item = getSubtaskItemById(subtaskId);
    if (!item) return;
    item.classList.add('is-kb-grabbed');
    const handle = item.querySelector('.subtask-drag-handle');
    if (handle) handle.focus();
}

function clearKeyboardGrab() {
    document.querySelectorAll('.subtask-item.is-kb-grabbed').forEach((item) => item.classList.remove('is-kb-grabbed'));
    subtaskReorder.kbGrabbed = false;
    subtaskReorder.kbSubtaskId = null;
    subtaskReorder.kbCompletedState = null;
    subtaskReorder.kbOriginalOrder = null;
}

function getSubtaskItemById(subtaskId) {
    const list = document.getElementById('subtaskList');
    if (!list) return null;
    return list.querySelector(`.subtask-item[data-subtask-id="${subtaskId}"]`);
}

function getSubtaskLabel(subtaskId) {
    const item = getSubtaskItemById(subtaskId);
    return item?.querySelector('.subtask-text-input')?.value || 'subtask';
}

// --- Shared helpers ---

function getGroupSubtaskIds(task, completedState) {
    if (!task || !Array.isArray(task.subtasks)) return [];
    return task.subtasks
        .filter((subtask) => String(Boolean(subtask.completed)) === completedState)
        .map((subtask) => subtask.id);
}

// Pure helper: clamped splice moving an item from fromIndex to toIndex.
function computeReorderedIds(groupIds, fromIndex, toIndex) {
    const ids = groupIds.slice();
    if (fromIndex < 0 || fromIndex >= ids.length) return ids;
    const clampedTo = Math.max(0, Math.min(toIndex, ids.length - 1));
    const [moved] = ids.splice(fromIndex, 1);
    ids.splice(clampedTo, 0, moved);
    return ids;
}

// Indicator-based DOM read (replaces old getDroppedSubtaskIds).
function computeGroupIdsFromDom(list, completedState, draggedId) {
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

// Single reorder path: the ONLY site that mutates + emits.
function commitGroupReorder(nextSubtaskIds, completedState) {
    const task = currentTasks.find(t => t.id === modalTaskId);
    if (!task || !Array.isArray(task.subtasks)) return false;

    const currentSubtaskIds = task.subtasks
        .filter((subtask) => String(Boolean(subtask.completed)) === completedState)
        .map((subtask) => subtask.id);

    if (nextSubtaskIds.length < 2 || nextSubtaskIds.join('|') === currentSubtaskIds.join('|')) {
        return false;
    }

    applySubtaskGroupOrder(task, nextSubtaskIds, completedState === 'true');
    renderSubtasks(task.subtasks);
    vscode.postMessage({ type: 'reorderSubtasks', taskId: modalTaskId, subtaskIds: nextSubtaskIds });
    return true;
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
