window.addEventListener('message', e => {
    if (e.data.type === 'updateTasks') {
        currentTasks = asTaskArray(e.data.tasks);

        if (e.data.defaultPriority) {
            const nextDefaultPriority = normalizePriority(e.data.defaultPriority);
            const shouldSyncInputPriority = !currentPremiumPriority || currentPremiumPriority === configuredDefaultPriority;
            configuredDefaultPriority = nextDefaultPriority;
            if (shouldSyncInputPriority) {
                currentPremiumPriority = nextDefaultPriority;
                syncPremiumPriorityUI();
            }
        }

        if (e.data.settings) {
            const s = e.data.settings;
            viewMode = normalizeViewMode(s.viewMode || viewMode);
            groupBy = normalizeGroupBy(s.groupBy || groupBy);
            hideCompleted = s.hideCompleted !== undefined ? s.hideCompleted : hideCompleted;
            sortBy = normalizeSortBy(s.sortBy || sortBy);
            if (typeof s.searchQuery === 'string') {
                searchQuery = s.searchQuery;
            }
            if (Array.isArray(s.activeTagFilters)) {
                activeTagFilters = normalizeTags(s.activeTagFilters).filter((tag) => isTagFilterCandidate(tag));
            }
            if (Array.isArray(s.collapsedSections)) {
                collapsedSections = new Set(s.collapsedSections);
            }
            
            // Update UI elements to match settings
            updateViewModeUI();
            updateGroupByUI();
            const toggle = document.getElementById('completedToggle');
            if (toggle) toggle.parentElement.classList.toggle('active', !hideCompleted);
            
            // Keep local transient state in sync (calendar cursor included).
            persistLocalState();
        }

        const configPopover = document.getElementById('configPopover');
        if (configPopover && configPopover.classList.contains('show')) {
            renderTagFiltersInPopover();
            const searchInput = document.getElementById('searchFilterInput');
            if (searchInput) searchInput.value = searchQuery || '';
        }

        render();

        if (pendingTaskModalId) {
            openTaskModalWhenAvailable(pendingTaskModalId);
        }

        if (modalTaskId) {
            const task = currentTasks.find(t => t.id === modalTaskId);
            if (task) {
                modalStatus = task.status;
                modalPriority = task.priority === "Won't" ? 'Wont' : task.priority;
                modalTags = normalizeTags(task.tags || []);
                modalDueDate = task.dueDate;
                modalReminders = task.reminders || [];
                updateModalUI();
                renderSubtasks(task.subtasks || []);
            } else closeTaskModal();
        }
    } else if (e.data.type === 'openTaskModal') {
        const taskId = typeof e.data.taskId === 'string' ? e.data.taskId : '';
        openTaskModalWhenAvailable(taskId);
    }
});

window.setViewMode = setViewMode;
window.setGroupBy = setGroupBy;
window.toggleConfigPopover = toggleConfigPopover;
window.toggleCompletedVisibility = toggleCompletedVisibility;
window.toggleDatePicker = toggleDatePicker;
window.setPremiumDate = setPremiumDate;
window.togglePriorityPicker = togglePriorityPicker;
window.setPremiumPriority = setPremiumPriority;
window.toggleTagsPicker = toggleTagsPicker;
window.applyTagsFromInput = applyTagsFromInput;
window.clearTagsFromInput = clearTagsFromInput;
window.toggleReminderPicker = toggleReminderPicker;
window.setPremiumReminder = setPremiumReminder;
window.submitPremiumTask = submitPremiumTask;
window.handleMenuAction = handleMenuAction;
window.handleAddTaskClick = handleAddTaskClick;
window.updatePriorityFromMenu = updatePriorityFromMenu;
window.updateStatusFromMenu = updateStatusFromMenu;
window.showContextMenu = showContextMenu;
window.toggleSection = toggleSection;
window.makeEditable = makeEditable;
window.submitTask = submitTask;
window.setSearchQuery = setSearchQuery;
window.clearAdvancedFilters = clearAdvancedFilters;
window.toggleTagFilter = toggleTagFilter;
window.clearDate = clearDate;
window.clearReminder = clearReminder;
window.openCodeTagFromBadge = openCodeTagFromBadge;
window.moveCalendarMonth = moveCalendarMonth;
window.setCalendarToToday = setCalendarToToday;
window.selectCalendarDay = selectCalendarDay;
window.toggleCalendarNoDateSection = toggleCalendarNoDateSection;
window.onCalendarTaskDragStart = onCalendarTaskDragStart;
window.onCalendarTaskDragEnd = onCalendarTaskDragEnd;
window.onCalendarDayDragOver = onCalendarDayDragOver;
window.onCalendarDayDragLeave = onCalendarDayDragLeave;
window.onCalendarDayDrop = onCalendarDayDrop;
window.onCalendarNoDateDragOver = onCalendarNoDateDragOver;
window.onCalendarNoDateDragLeave = onCalendarNoDateDragLeave;
window.onCalendarNoDateDrop = onCalendarNoDateDrop;
window.openTaskModal = openTaskModal;
window.closeTaskModal = closeTaskModal;
window.saveTaskModal = saveTaskModal;
window.deleteTaskFromModal = deleteTaskFromModal;
window.toggleStatusPicker = toggleStatusPicker;
window.setModalStatus = setModalStatus;
window.addSubtask = addSubtask;
window.toggleSubtask = toggleSubtask;
window.deleteSubtask = deleteSubtask;
window.updateSubtaskText = updateSubtaskText;
window.autoResizeSubtaskTextarea = autoResizeSubtaskTextarea;
window.handleNewSubtaskKeydown = handleNewSubtaskKeydown;

vscode.postMessage({ 
    type: 'ready',
    viewType: window.viewType || 'sidebar'
});
