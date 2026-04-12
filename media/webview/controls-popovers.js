function toggleStatusPicker(e) {
    if (e) e.stopPropagation();
    const pop = document.getElementById('statusPopover');
    if (!pop) return;

    const isShow = pop.classList.contains('show');
    closeAllPopovers(true);

    if (!isShow) {
        pop.classList.add('show');
        const rect = e.currentTarget.getBoundingClientRect();
        const popRect = pop.getBoundingClientRect();

        pop.style.position = 'fixed';

        let left = rect.left;
        if (left + popRect.width > window.innerWidth) {
            left = window.innerWidth - popRect.width - 10;
        }
        if (left < 10) left = 10;
        pop.style.left = `${left}px`;
        pop.style.right = 'auto';

        if (rect.bottom + popRect.height > window.innerHeight) {
            pop.style.top = 'auto';
            pop.style.bottom = `${window.innerHeight - rect.top + 5}px`;
        } else {
            pop.style.top = `${rect.bottom + 5}px`;
            pop.style.bottom = 'auto';
        }
    }
}

function setModalStatus(s) {
    modalStatus = s;
    if (modalTaskId) {
        vscode.postMessage({ type: 'updateStatus', id: modalTaskId, status: s });
    }
    updateModalUI();
    closeAllPopovers();
}

// --- Popover Management ---

function closeAllPopovers(keepEditingId = false) {
    document.querySelectorAll('.premium-popover, .popover').forEach(p => p.classList.remove('show'));
    hideContextMenu();
    if (datePicker) datePicker.close();
    if (reminderPicker) reminderPicker.close();
    if (!keepEditingId) editingTaskId = null;
}

function toggleConfigPopover(e) {
    if (e) e.stopPropagation();
    const popover = document.getElementById('configPopover');
    if (!popover) return;
    const isShow = popover.classList.contains('show');
    closeAllPopovers();
    if (!isShow) {
        popover.classList.add('show');
        try {
            const toggle = document.getElementById('completedToggle');
            if (toggle?.parentElement) {
                toggle.parentElement.classList.toggle('active', !hideCompleted);
            }
            const popoverBtnList = document.getElementById('popoverBtnList');
            const popoverBtnKanban = document.getElementById('popoverBtnKanban');
            const popoverBtnCalendar = document.getElementById('popoverBtnCalendar');
            if (popoverBtnList) popoverBtnList.classList.toggle('active', viewMode === 'list');
            if (popoverBtnKanban) popoverBtnKanban.classList.toggle('active', viewMode === 'kanban');
            if (popoverBtnCalendar) popoverBtnCalendar.classList.toggle('active', viewMode === 'calendar');

            const sortPriorityCheck = document.getElementById('sortPriorityCheck');
            const sortDueDateCheck = document.getElementById('sortDueDateCheck');
            const sortTitleCheck = document.getElementById('sortTitleCheck');
            const sortCustomCheck = document.getElementById('sortCustomCheck');
            if (sortPriorityCheck) sortPriorityCheck.classList.toggle('hidden', sortBy !== 'priority');
            if (sortDueDateCheck) sortDueDateCheck.classList.toggle('hidden', sortBy !== 'dueDate');
            if (sortTitleCheck) sortTitleCheck.classList.toggle('hidden', sortBy !== 'title');
            if (sortCustomCheck) sortCustomCheck.classList.toggle('hidden', sortBy !== 'custom');

            const searchInput = document.getElementById('searchFilterInput');
            if (searchInput) searchInput.value = searchQuery || '';
            renderTagFiltersInPopover();
        } catch (error) {
            console.error('Error opening format popover', error);
        }
    }
}

function toggleDatePicker(e, fromModal = false) {
    if (e) e.stopPropagation();
    const pop = document.getElementById('datePopover');
    if (!pop) return;

    const isShow = pop.classList.contains('show');
    closeAllPopovers(!!editingTaskId || !!modalTaskId);

    if (!isShow) {
        pop.classList.add('show');
        const rect = e.currentTarget.getBoundingClientRect();
        const popRect = pop.getBoundingClientRect();

        pop.style.position = 'fixed';

        let left = rect.left;
        if (left + popRect.width > window.innerWidth) {
            left = window.innerWidth - popRect.width - 10;
        }
        if (left < 10) left = 10;
        pop.style.left = `${left}px`;
        pop.style.right = 'auto';

        if (rect.bottom + popRect.height > window.innerHeight) {
            pop.style.top = 'auto';
            pop.style.bottom = `${window.innerHeight - rect.top + 5}px`;
        } else {
            pop.style.top = `${rect.bottom + 5}px`;
            pop.style.bottom = 'auto';
        }
    }
}

function togglePriorityPicker(e, fromModal = false) {
    if (e) e.stopPropagation();
    const pop = document.getElementById('priorityPopover');
    if (!pop) return;

    const isShow = pop.classList.contains('show');
    closeAllPopovers(!!modalTaskId);

    if (!isShow) {
        pop.classList.add('show');
        const rect = e.currentTarget.getBoundingClientRect();
        const popRect = pop.getBoundingClientRect();

        pop.style.position = 'fixed';

        let left = rect.left;
        if (left + popRect.width > window.innerWidth) {
            left = window.innerWidth - popRect.width - 10;
        }
        if (left < 10) left = 10;
        pop.style.left = `${left}px`;
        pop.style.right = 'auto';

        if (rect.bottom + popRect.height > window.innerHeight) {
            pop.style.top = 'auto';
            pop.style.bottom = `${window.innerHeight - rect.top + 5}px`;
        } else {
            pop.style.top = `${rect.bottom + 5}px`;
            pop.style.bottom = 'auto';
        }
    }
}

function toggleReminderPicker(e, fromModal = false) {
    if (e) e.stopPropagation();
    const pop = document.getElementById('reminderPopover');
    if (!pop) return;

    const isShow = pop.classList.contains('show');
    closeAllPopovers(!!editingTaskId || !!modalTaskId);

    if (!isShow) {
        pop.classList.add('show');
        const rect = e.currentTarget.getBoundingClientRect();
        const popRect = pop.getBoundingClientRect();

        pop.style.position = 'fixed';

        let left = rect.left;
        if (left + popRect.width > window.innerWidth) {
            left = window.innerWidth - popRect.width - 10;
        }
        if (left < 10) left = 10;
        pop.style.left = `${left}px`;
        pop.style.right = 'auto';

        if (rect.bottom + popRect.height > window.innerHeight) {
            pop.style.top = 'auto';
            pop.style.bottom = `${window.innerHeight - rect.top + 5}px`;
        } else {
            pop.style.top = `${rect.bottom + 5}px`;
            pop.style.bottom = 'auto';
        }
    }
}

function syncPremiumTagsUI() {
    const normalized = normalizeTags(currentPremiumTags);
    currentPremiumTags = normalized;
    const { categoryTags } = splitTagsByType(normalized);

    const btn = document.getElementById('tagsBtn');
    const label = document.getElementById('tagsLabel');
    if (!btn || !label) return;

    if (categoryTags.length === 0) {
        btn.classList.remove('has-value');
        label.innerText = 'Tags';
        return;
    }

    btn.classList.add('has-value');
    label.innerText = categoryTags.length === 1 ? categoryTags[0] : `${categoryTags.length} tags`;
}

function getActiveTagsForEditor() {
    if (modalTaskId) return splitTagsByType(modalTags).categoryTags;
    return splitTagsByType(currentPremiumTags).categoryTags;
}

function toggleTagsPicker(e, fromModal = false) {
    if (e) e.stopPropagation();
    const pop = document.getElementById('tagsPopover');
    if (!pop) return;

    const isShow = pop.classList.contains('show');
    closeAllPopovers(!!modalTaskId);

    if (!isShow) {
        pop.classList.add('show');
        const rect = e.currentTarget.getBoundingClientRect();
        const popRect = pop.getBoundingClientRect();

        pop.style.position = 'fixed';

        let left = rect.left;
        if (left + popRect.width > window.innerWidth) {
            left = window.innerWidth - popRect.width - 10;
        }
        if (left < 10) left = 10;
        pop.style.left = `${left}px`;
        pop.style.right = 'auto';

        if (rect.bottom + popRect.height > window.innerHeight) {
            pop.style.top = 'auto';
            pop.style.bottom = `${window.innerHeight - rect.top + 5}px`;
        } else {
            pop.style.top = `${rect.bottom + 5}px`;
            pop.style.bottom = 'auto';
        }

        const tagsInput = document.getElementById('taskTagsInput');
        if (tagsInput) {
            tagsInput.value = getActiveTagsForEditor().join(', ');
            tagsInput.focus();
            tagsInput.select();
        }
    }
}

function applyTagsFromInput() {
    const tagsInput = document.getElementById('taskTagsInput');
    if (!tagsInput) return;

    const tags = parseTagsInput(tagsInput.value);

    if (modalTaskId) {
        const { codeReferenceTags } = splitTagsByType(modalTags);
        modalTags = normalizeTags([...tags, ...codeReferenceTags]);
        vscode.postMessage({ type: 'updateTags', id: modalTaskId, tags: modalTags });
        updateModalUI();
    } else {
        const { codeReferenceTags } = splitTagsByType(currentPremiumTags);
        currentPremiumTags = normalizeTags([...tags, ...codeReferenceTags]);
        syncPremiumTagsUI();
    }

    closeAllPopovers();
}
