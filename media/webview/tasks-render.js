function renderListFallback(tasks) {
    const container = document.getElementById('listTasks');
    if (!container) return;

    const safeTasks = asTaskArray(tasks);
    container.innerHTML = `
        <div class="list-section">
            <div class="list-section-content">
                ${safeTasks.map((task) => `
                    <div class="list-task-row" data-id="${escapeHtml(asText(task?.id))}">
                        <div class="card-content">
                            <div class="card-title">${escapeHtml(asText(task?.text) || 'Untitled task')}</div>
                            ${asText(task?.description)
                                ? `<div class="card-desc">${escapeHtml(asText(task?.description))}</div>`
                                : `<div class="card-desc empty-desc">Add description...</div>`}
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
    if (t?.dueDate !== undefined && t?.dueDate !== null) {
        const date = new Date(t.dueDate);
        if (!Number.isNaN(date.getTime())) {
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
    }
    const subtasks = getTaskSubtasks(t);
    if (subtasks.length > 0) {
        const completedCount = subtasks.filter((s) => Boolean(s?.completed)).length;
        const totalCount = subtasks.length;
        html += `<div class="task-badge subtasks-badge"><i class="codicon codicon-tasklist"></i><span>${completedCount}/${totalCount}</span></div>`;
    }
    const reminders = getTaskReminders(t);
    if (reminders.length > 0) {
        const d = new Date(reminders[0]);
        if (!Number.isNaN(d.getTime())) {
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
    }
    const tags = getTaskTags(t);
    if (tags.length > 0) {
        const normalizeCodePath = (value) => asText(value).replace(/\\/g, '/').toLowerCase();
        const pathsWithLineReference = new Set(
            tags
                .map((tag) => parseCodeReferenceTag(tag))
                .filter((parsed) => parsed && parsed.line && parsed.line > 0)
                .map((parsed) => normalizeCodePath(parsed.path))
        );
        const renderedBadgeKeys = new Set();

        for (const tag of tags) {
            const codeRef = parseCodeReferenceTag(tag);
            if (codeRef) {
                const normalizedPath = normalizeCodePath(codeRef.path);
                const hasLine = Boolean(codeRef.line && codeRef.line > 0);

                // If we have both "file" and "file:line", show only the line reference.
                if (!hasLine && pathsWithLineReference.has(normalizedPath)) {
                    continue;
                }

                const codeKey = `code:${normalizedPath}:${codeRef.line || 0}:${codeRef.column || 0}:${codeRef.endLine || 0}:${codeRef.endColumn || 0}`;
                if (renderedBadgeKeys.has(codeKey)) {
                    continue;
                }
                renderedBadgeKeys.add(codeKey);

                const encodedTag = encodeURIComponent(tag);
                const displayLabel = getCodeReferenceDisplayLabel(tag);
                html += `<div class="task-badge tag-badge link-tag-badge" onclick="openCodeTagFromBadge(event, '${encodedTag}')" title="Open ${escapeHtml(tag)}"><i class="codicon codicon-go-to-file"></i><span>${escapeHtml(displayLabel)}</span></div>`;
            } else {
                const tagKey = `tag:${tag.toLowerCase()}`;
                if (renderedBadgeKeys.has(tagKey)) {
                    continue;
                }
                renderedBadgeKeys.add(tagKey);
                html += `<div class="task-badge tag-badge"><i class="codicon codicon-tag"></i><span>${escapeHtml(tag)}</span></div>`;
            }
        }
    }
    return html ? `<div class="task-badges">${html}</div>` : '';
}

function renderList(tasks) {
    const container = document.getElementById('listTasks');
    if (!container) return;
    container.innerHTML = '';

    // Always sort internally first
    const internalSorted = sortTasks(asTaskArray(tasks));

    if (groupBy === 'none') {
        container.innerHTML = `
            <div class="list-section">
                <div class="list-section-content" 
                     ondragover="handleDragOver(event)" 
                     ondrop="handleTaskDrop(event)">
                    ${internalSorted.map(t => {
                        const taskText = escapeHtml(asText(t?.text));
                        const taskDescription = asText(t?.description);
                        const descriptionHtml = taskDescription
                            ? `<div class="card-desc">${escapeHtml(taskDescription)}</div>`
                            : `<div class="card-desc empty-desc">Add description...</div>`;
                        return `
                        <div class="list-task-row ${t.status === 'Done' ? 'task-is-done' : ''}" 
                             data-id="${t.id}" 
                             draggable="true" 
                             ondragstart="event.dataTransfer.setData('text/plain', '${t.id}'); this.classList.add('dragging')" 
                             ondragend="cleanupDragState()"
                             onclick="openTaskModal('${t.id}')">
                            <div class="card-header-row">
                                ${getPriorityIndicatorHtml(t)}
                                <div class="card-title" ondblclick="makeEditable(this, '${t.id}')">${taskText}</div>
                                <div class="card-more" onclick="showContextMenu(event, '${t.id}')">
                                    <i class="codicon codicon-more"></i>
                                </div>
                            </div>
                            <div class="card-body">
                                ${descriptionHtml}
                                ${getTaskBadgesHtml(t)}
                            </div>
                        </div>
                        `;
                    }).join('')}
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

    let renderedGroups = 0;
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
                ${sTasks.map(t => {
                    const taskText = escapeHtml(asText(t?.text));
                    const taskDescription = asText(t?.description);
                    const descriptionHtml = taskDescription
                        ? `<div class="card-desc">${escapeHtml(taskDescription)}</div>`
                        : `<div class="card-desc empty-desc">Add description...</div>`;
                    return `
                    <div class="list-task-row ${t.status === 'Done' ? 'task-is-done' : ''}" 
                         data-id="${t.id}" 
                         draggable="true" 
                         ondragstart="event.dataTransfer.setData('text/plain', '${t.id}'); this.classList.add('dragging')" 
                         ondragend="cleanupDragState()"
                         onclick="openTaskModal('${t.id}')">
                        <div class="card-header-row">
                            ${getPriorityIndicatorHtml(t)}
                            <div class="card-title" ondblclick="makeEditable(this, '${t.id}')">${taskText}</div>
                            <div class="card-more" onclick="showContextMenu(event, '${t.id}')">
                                <i class="codicon codicon-more"></i>
                            </div>
                        </div>
                        <div class="card-body">
                            ${descriptionHtml}
                            ${getTaskBadgesHtml(t)}
                        </div>
                    </div>
                    `;
                }).join('')}
                <div class="list-add-row" data-status="${sVal}" data-priority="${pVal}" data-autoedit="true" onclick="handleAddTaskClick(this)">
                    <i class="codicon codicon-add"></i>
                    <span>Add task</span>
                </div>
            </div>
        `;
        container.appendChild(div);
        renderedGroups += 1;
    });

    if (renderedGroups === 0) {
        container.innerHTML = `
            <div class="list-section">
                <div class="list-section-content" ondragover="handleDragOver(event)" ondrop="handleTaskDrop(event)">
                    <div class="list-add-row" data-status="Todo" data-priority="null" data-autoedit="true" onclick="handleAddTaskClick(this)">
                        <i class="codicon codicon-add"></i>
                        <span>Add task</span>
                    </div>
                </div>
            </div>
        `;
    }
}

function renderKanban(tasks) {
    const board = document.getElementById('kanbanView');
    if (!board) return;
    board.innerHTML = '';

    const internalSorted = sortTasks(asTaskArray(tasks));

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
                ${cTasks.map(t => {
                    const taskText = escapeHtml(asText(t?.text));
                    const taskDescription = asText(t?.description);
                    const descriptionHtml = taskDescription
                        ? `<div class="card-desc">${escapeHtml(taskDescription)}</div>`
                        : `<div class="card-desc empty-desc">Add description...</div>`;
                    return `
                    <div class="task-card ${t.status === 'Done' ? 'task-is-done' : ''}" 
                         data-id="${t.id}" 
                         draggable="true" 
                         ondragstart="event.dataTransfer.setData('text/plain', '${t.id}'); this.classList.add('dragging')" 
                         ondragend="cleanupDragState()"
                         onclick="openTaskModal('${t.id}')">
                        <div class="card-header-row">
                            ${getPriorityIndicatorHtml(t)}
                            <div class="card-title" ondblclick="makeEditable(this, '${t.id}')">${taskText}</div>
                            <div class="card-more" onclick="showContextMenu(event, '${t.id}')">
                                <i class="codicon codicon-more"></i>
                            </div>
                        </div>
                        <div class="card-body">
                            ${descriptionHtml}
                            ${getTaskBadgesHtml(t)}
                        </div>
                    </div>
                    `;
                }).join('')}
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
    const tasksPool = asTaskArray(currentTasks);
    const baseTasks = hideCompleted ? tasksPool.filter((t) => t.status !== 'Done') : tasksPool;
    const tasks = applyAdvancedFilters(baseTasks);
    try {
        if (viewMode === 'list') {
            const kanbanPanel = document.getElementById('kanbanView');
            const calendarPanel = document.getElementById('calendarContent');
            if (kanbanPanel) kanbanPanel.innerHTML = '';
            if (calendarPanel) calendarPanel.innerHTML = '';
            renderList(tasks);
        } else if (viewMode === 'kanban') {
            const listPanel = document.getElementById('listTasks');
            const calendarPanel = document.getElementById('calendarContent');
            if (listPanel) listPanel.innerHTML = '';
            if (calendarPanel) calendarPanel.innerHTML = '';
            renderKanban(tasks);
        } else {
            const listPanel = document.getElementById('listTasks');
            const kanbanPanel = document.getElementById('kanbanView');
            if (listPanel) listPanel.innerHTML = '';
            if (kanbanPanel) kanbanPanel.innerHTML = '';
            renderCalendar(tasks, tasksPool);
        }
    } catch (error) {
        console.error('Render error, using list fallback', error);
        renderListFallback(tasksPool);
    }
    if (shouldAutoEditNewTask && baseTasks.length > 0) {
        shouldAutoEditNewTask = false;
        const newestTask = [...baseTasks].sort((a, b) => b.createdAt - a.createdAt)[0];
        if (newestTask && newestTask.text === 'New task...') {
            setTimeout(() => {
                const titleEl = document.querySelector(`[data-id="${newestTask.id}"] .card-title`);
                if (titleEl) makeEditable(titleEl, newestTask.id);
            }, 50);
        }
    }
}
