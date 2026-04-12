function setViewMode(mode) {
    viewMode = normalizeViewMode(mode);
    saveState();
    updateViewModeUI();
    if (viewMode === 'calendar') {
        const scrollContainer = document.getElementById('scroll-container');
        if (scrollContainer) scrollContainer.scrollTop = 0;
    }
    render();
}

function updateViewModeUI() {
    const popoverBtnList = document.getElementById('popoverBtnList');
    const popoverBtnKanban = document.getElementById('popoverBtnKanban');
    const popoverBtnCalendar = document.getElementById('popoverBtnCalendar');
    const listPanel = document.getElementById('listView');
    const kanbanPanel = document.getElementById('kanbanView');
    const calendarPanel = document.getElementById('calendarView');
    const scrollContainer = document.getElementById('scroll-container');
    if (popoverBtnList) popoverBtnList.classList.toggle('active', viewMode === 'list');
    if (popoverBtnKanban) popoverBtnKanban.classList.toggle('active', viewMode === 'kanban');
    if (popoverBtnCalendar) popoverBtnCalendar.classList.toggle('active', viewMode === 'calendar');
    if (listPanel) listPanel.classList.toggle('hidden', viewMode !== 'list');
    if (kanbanPanel) kanbanPanel.classList.toggle('hidden', viewMode !== 'kanban');
    if (calendarPanel) calendarPanel.classList.toggle('hidden', viewMode !== 'calendar');
    if (scrollContainer) scrollContainer.classList.toggle('calendar-scroll-locked', viewMode === 'calendar');
    document.body.classList.toggle('is-calendar-view', viewMode === 'calendar');
}

function setGroupBy(mode) {
    groupBy = normalizeGroupBy(mode);
    saveState();
    updateGroupByUI();
    closeAllPopovers();
    render();
}

function updateGroupByUI() {
    const statusCheck = document.getElementById('statusCheck');
    const priorityCheck = document.getElementById('priorityCheck');
    const noneCheck = document.getElementById('noneCheck');
    if (statusCheck) statusCheck.classList.toggle('hidden', groupBy !== 'status');
    if (priorityCheck) priorityCheck.classList.toggle('hidden', groupBy !== 'priority');
    if (noneCheck) noneCheck.classList.toggle('hidden', groupBy !== 'none');
}

function setSortBy(val) {
    sortBy = normalizeSortBy(val);
    closeAllPopovers();
    saveState();
    render();
}

function sortTasks(tasks) {
    return [...asTaskArray(tasks)].sort((a, b) => {
        if (sortBy === 'custom') {
            const oA = a.order || 0;
            const oB = b.order || 0;
            if (oA !== oB) return oA - oB;
            return b.createdAt - a.createdAt;
        }
        if (sortBy === 'priority') {
            const pA = a.priority === "Won't" ? 'Wont' : a.priority;
            const pB = b.priority === "Won't" ? 'Wont' : b.priority;
            const res = SORT_PRIORITY.indexOf(pA) - SORT_PRIORITY.indexOf(pB);
            if (res !== 0) return res;
        } else if (sortBy === 'dueDate') {
            if (a.dueDate || b.dueDate) {
                if (!a.dueDate) return 1;
                if (!b.dueDate) return -1;
                if (a.dueDate !== b.dueDate) return a.dueDate - b.dueDate;
            }
        } else if (sortBy === 'title') {
            const res = asText(a?.text).localeCompare(asText(b?.text));
            if (res !== 0) return res;
        }
        // Fallback to order or createdAt
        const oA = a.order || 0;
        const oB = b.order || 0;
        if (oA !== oB) return oA - oB;
        return b.createdAt - a.createdAt;
    });
}

function getTagUsageMap(tasks) {
    const usage = new Map();
    for (const task of asTaskArray(tasks)) {
        const tags = getTaskTags(task).filter((tag) => isTagFilterCandidate(tag));
        for (const tag of tags) {
            usage.set(tag, (usage.get(tag) || 0) + 1);
        }
    }
    return usage;
}

function renderTagFiltersInPopover() {
    const container = document.getElementById('tagFiltersContainer');
    if (!container) return;

    activeTagFilters = normalizeTags(activeTagFilters).filter((tag) => isTagFilterCandidate(tag));
    const usage = getTagUsageMap(currentTasks);
    const allTags = Array.from(new Set([...usage.keys(), ...activeTagFilters])).sort((a, b) => a.localeCompare(b));

    if (allTags.length === 0) {
        container.innerHTML = `<div class="popover-empty">No tags available</div>`;
        return;
    }

    container.innerHTML = allTags.map((tag) => {
        const isActive = activeTagFilters.includes(tag);
        const count = usage.get(tag) || 0;
        return `
            <button class="tag-filter-chip ${isActive ? 'active' : ''}" onclick='event.stopPropagation(); toggleTagFilter(${JSON.stringify(tag)})'>
                <span>${escapeHtml(tag)}</span>
                <span class="tag-filter-count">${count}</span>
            </button>
        `;
    }).join('');
}

function toggleTagFilter(tag) {
    const normalizedTag = normalizeTags([tag])[0];
    if (!normalizedTag || !isTagFilterCandidate(normalizedTag)) return;

    if (activeTagFilters.includes(normalizedTag)) {
        activeTagFilters = activeTagFilters.filter((item) => item !== normalizedTag);
    } else {
        activeTagFilters = normalizeTags([...activeTagFilters, normalizedTag]);
    }

    renderTagFiltersInPopover();
    saveState();
    render();
}

function setSearchQuery(value) {
    searchQuery = typeof value === 'string' ? value : '';
    saveState();
    render();
}

function clearAdvancedFilters() {
    searchQuery = '';
    activeTagFilters = [];

    const searchInput = document.getElementById('searchFilterInput');
    if (searchInput) searchInput.value = '';

    renderTagFiltersInPopover();
    saveState();
    render();
}

function applyAdvancedFilters(tasks) {
    const normalizedSearch = (searchQuery || '').trim().toLowerCase();
    const normalizedTagFilters = normalizeTags(activeTagFilters)
        .filter((tag) => isTagFilterCandidate(tag))
        .map((tag) => tag.toLowerCase());

    return asTaskArray(tasks).filter((task) => {
        if (normalizedSearch) {
            const taskText = asText(task?.text).toLowerCase();
            const taskDescription = asText(task?.description).toLowerCase();
            const taskTagsText = getTaskTags(task).join(' ').toLowerCase();
            const subtaskText = getTaskSubtasks(task).map((subtask) => asText(subtask?.text)).join(' ').toLowerCase();
            const matchesSearch =
                taskText.includes(normalizedSearch) ||
                taskDescription.includes(normalizedSearch) ||
                taskTagsText.includes(normalizedSearch) ||
                subtaskText.includes(normalizedSearch);

            if (!matchesSearch) return false;
        }

        if (normalizedTagFilters.length > 0) {
            const taskTagSet = new Set(getTaskTags(task).map((tag) => tag.toLowerCase()));
            const matchesAnyTag = normalizedTagFilters.some((tag) => taskTagSet.has(tag));
            if (!matchesAnyTag) return false;
        }

        return true;
    });
}

function toggleCompletedVisibility() {
    hideCompleted = !hideCompleted;
    const toggle = document.getElementById('completedToggle');
    if (toggle) toggle.parentElement.classList.toggle('active', !hideCompleted);
    saveState();
    render();
}

function toggleSection(s) {
    if (collapsedSections.has(s)) collapsedSections.delete(s);
    else collapsedSections.add(s);
    saveState();
    render();
}
