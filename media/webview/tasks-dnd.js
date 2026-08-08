function cleanupDragState() {
    document.querySelectorAll('.drag-indicator').forEach(el => el.remove());
    document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
    document.querySelectorAll('.dragging').forEach(el => el.classList.remove('dragging'));
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
