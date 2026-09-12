function cleanupDragState() {
    document.querySelectorAll('.drag-indicator').forEach(el => el.remove());
    document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
    document.querySelectorAll('.dragging').forEach(el => el.classList.remove('dragging'));
}

// VS Code webviews run inside a sandboxed iframe where
// event.dataTransfer.getData() can return empty during `drop`, even though
// the same data was set on `dragstart`. Mirror the calendar pattern: keep a
// module-level fallback of the dragged task id and use it when the transfer
// is unavailable.
let draggedTaskId = null;

function getDraggedTaskId(event) {
    const transferId = event?.dataTransfer?.getData('text/plain');
    if (typeof transferId === 'string' && transferId) return transferId;
    return draggedTaskId;
}

function startTaskDrag(event, taskId) {
    draggedTaskId = typeof taskId === 'string' ? taskId : null;
    if (event?.dataTransfer) {
        event.dataTransfer.setData('text/plain', draggedTaskId || '');
        event.dataTransfer.dropEffect = 'move';
        event.dataTransfer.effectAllowed = 'move';
    }
    if (event?.currentTarget) {
        event.currentTarget.classList.add('dragging');
    }
}

function endTaskDrag() {
    draggedTaskId = null;
    cleanupDragState();
}

function toggleTaskDone(event, taskId, currentStatus) {
    event.stopPropagation();
    event.preventDefault();
    const newStatus = currentStatus === 'Done' ? 'Todo' : 'Done';
    vscode.postMessage({ type: 'updateStatus', id: taskId, status: newStatus });
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

function findDropInsertionIndex(container, indicator, visibleIds) {
    const afterElement = indicator ? indicator.nextElementSibling : null;
    if (afterElement && (afterElement.classList.contains('list-task-row') || afterElement.classList.contains('task-card'))) {
        const targetIndex = visibleIds.indexOf(afterElement.dataset.id);
        if (targetIndex !== -1) return targetIndex;
    }
    return visibleIds.length;
}

function getVisibleTaskIds(container, excludeId) {
    return Array.from(container.querySelectorAll('.list-task-row, .task-card'))
        .map((el) => el.dataset.id)
        .filter((id) => Boolean(id) && id !== excludeId);
}

// Computes the `order` updates for a drop. With custom sorting the visible
// sequence already follows `order`, so a midpoint between neighbours is
// enough. With any other sort the visible sequence is NOT monotonic in
// `order`, so a midpoint lands the card somewhere unrelated to the indicator
// and flipping to custom reshuffles every column. In that case we snapshot
// the whole visible board (all containers, document order) with the dragged
// card inserted at the indicator, so "custom" starts from exactly what the
// user sees.
function computeDropOrders(taskId, container, indicator) {
    const taskById = new Map(asTaskArray(currentTasks).map((t) => [t.id, t]));
    if (!taskById.has(taskId)) return [];

    const visibleIds = getVisibleTaskIds(container, taskId);
    const insertIndex = findDropInsertionIndex(container, indicator, visibleIds);

    if (sortBy === 'custom') {
        const targetTask = insertIndex < visibleIds.length ? taskById.get(visibleIds[insertIndex]) : undefined;
        const prevTask = insertIndex > 0 ? taskById.get(visibleIds[insertIndex - 1]) : undefined;
        let newOrder;
        if (prevTask && targetTask) {
            newOrder = (prevTask.order + targetTask.order) / 2;
        } else if (targetTask) {
            newOrder = targetTask.order - 1000;
        } else if (prevTask) {
            newOrder = prevTask.order + 1000;
        } else {
            newOrder = 1000;
        }
        return [{ id: taskId, order: newOrder }];
    }

    const sequence = [];
    document.querySelectorAll('.list-section-content, .tasks-scroll').forEach((section) => {
        const ids = getVisibleTaskIds(section, taskId);
        if (section === container) {
            ids.splice(insertIndex, 0, taskId);
        }
        sequence.push(...ids);
    });
    if (!sequence.includes(taskId)) {
        sequence.splice(insertIndex, 0, taskId);
    }

    return sequence
        .filter((id) => taskById.has(id))
        .map((id, index) => ({ id, order: (index + 1) * 1000 }));
}

function handleTaskDrop(e, targetStatus = null, targetPriority = null) {
    e.preventDefault();
    const taskId = getDraggedTaskId(e);
    if (!taskId) {
        cleanupDragState();
        return;
    }

    // One atomic message for the whole drop. Sending updateStatus/updatePriority
    // and updateOrders separately let two concurrent read-modify-write handlers
    // in the extension overwrite each other (lost update, card snapping back).
    const move = { type: 'moveTask', id: taskId };

    if (groupBy === 'status' && targetStatus) {
        move.status = targetStatus;
    } else if (groupBy === 'priority' && targetPriority) {
        // The extension only accepts 'Wont' (never "Won't").
        move.priority = normalizePriority(targetPriority);
    }

    const indicator = document.querySelector('.drag-indicator');
    const container = indicator
        ? indicator.parentElement
        : e.target.closest('.list-section-content, .tasks-scroll');

    // The column change must apply even when no reorder position could be
    // resolved (e.g. drop on the column header without an indicator).
    if (container) {
        const orders = computeDropOrders(taskId, container, indicator);
        if (orders.length > 0) {
            move.orders = orders;
            // Reordering only takes visual effect with custom ordering. Persist
            // the flip through saveState() so the extension's stored settings
            // stop resetting sortBy back to the default on the next updateTasks
            // broadcast (bridge.js re-applies settings.sortBy on every message).
            if (sortBy !== 'custom') {
                sortBy = 'custom';
                saveState();
            }
        }
    }

    if (move.status !== undefined || move.priority !== undefined || move.orders !== undefined) {
        vscode.postMessage(move);
    }

    cleanupDragState();
}
