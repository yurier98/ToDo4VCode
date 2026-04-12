const CALENDAR_PRIORITY_ORDER = ['Must', 'Should', 'Could', 'Wont'];
const CALENDAR_LOCALE = 'en-US';
const CALENDAR_MONTH_FORMATTER = new Intl.DateTimeFormat(CALENDAR_LOCALE, { month: 'long', year: 'numeric' });
const CALENDAR_DAY_TITLE_FORMATTER = new Intl.DateTimeFormat(CALENDAR_LOCALE, { month: 'long', day: 'numeric', year: 'numeric' });
const CALENDAR_META_DATE_FORMATTER = new Intl.DateTimeFormat(CALENDAR_LOCALE, { month: 'short', day: 'numeric' });
const CALENDAR_TIME_FORMATTER = new Intl.DateTimeFormat(CALENDAR_LOCALE, { hour: '2-digit', minute: '2-digit' });
const CALENDAR_WEEKDAY_LABELS = Array.from({ length: 7 }, (_, index) => (
    new Intl.DateTimeFormat(CALENDAR_LOCALE, { weekday: 'narrow' }).format(new Date(2024, 0, 7 + index))
));
const CALENDAR_TEXT = {
    today: 'Today',
    allDay: 'All day',
    selectDay: 'No day selected',
    noDaySelected: 'No day selected',
    noDaySelectedDescription: 'Select a day in the calendar to see related tasks.',
    noTasksForDay: 'No tasks for this day.',
    duePrefix: 'Due',
    reminderPrefix: 'Reminder',
    todoStatus: 'Todo'
};

function formatCalendarMonthTitle(monthDate) {
    return CALENDAR_MONTH_FORMATTER.format(monthDate);
}

function normalizeCalendarPriority(priority) {
    if (priority === "Won't") return 'Wont';
    return CALENDAR_PRIORITY_ORDER.includes(priority) ? priority : 'Should';
}

function moveCalendarMonth(delta) {
    const monthDate = cursorToMonthStart(calendarCursor);
    monthDate.setMonth(monthDate.getMonth() + delta);
    calendarCursor = toMonthCursor(monthDate);
    selectedDayKey = null;
    persistLocalState();
    render();
}

function setCalendarToToday() {
    const today = new Date();
    calendarCursor = toMonthCursor(today);
    selectedDayKey = toDayKey(today);
    persistLocalState();
    render();
}

function selectCalendarDay(dayKey) {
    if (typeof dayKey !== 'string') return;
    selectedDayKey = dayKey;
    persistLocalState();
    render();
}

function getCalendarDayPrioritySet(dayTasks) {
    const priorities = new Set();
    for (const task of dayTasks) {
        priorities.add(normalizeCalendarPriority(task?.priority));
    }
    return priorities;
}

function renderCalendarDayIndicators(dayTasks) {
    const prioritySet = getCalendarDayPrioritySet(dayTasks);
    const dots = CALENDAR_PRIORITY_ORDER
        .filter((priority) => prioritySet.has(priority))
        .map((priority) => `<span class="calendar-priority-dot priority-${priority.toLowerCase()}"></span>`)
        .join('');

    if (!dots) {
        return '<div class="calendar-priority-dots empty"></div>';
    }

    return `<div class="calendar-priority-dots">${dots}</div>`;
}

function formatSelectedDayTitle(dayKey) {
    const timestamp = dayKeyToTimestamp(dayKey);
    if (timestamp === null) return CALENDAR_TEXT.selectDay;
    return CALENDAR_DAY_TITLE_FORMATTER.format(new Date(timestamp));
}

function formatCalendarDateValue(timestamp) {
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return '';

    const hasTime = date.getHours() !== 0 || date.getMinutes() !== 0;
    const dateText = CALENDAR_META_DATE_FORMATTER.format(date);
    if (!hasTime) return dateText;
    return `${dateText} ${CALENDAR_TIME_FORMATTER.format(date)}`;
}

function formatTaskMeta(task) {
    const status = asText(task?.status) || CALENDAR_TEXT.todoStatus;
    const priority = normalizeCalendarPriority(task?.priority);
    const tags = getTaskTags(task).filter((tag) => isTagFilterCandidate(tag));
    const tagText = tags.length > 0 ? tags.slice(0, 2).join(', ') : '';
    const parts = [`${status}`, priority];

    const dueTimestamp = getTaskDueTimestamp(task);
    if (dueTimestamp !== null) {
        const dueText = formatCalendarDateValue(dueTimestamp);
        if (dueText) parts.push(`${CALENDAR_TEXT.duePrefix} ${dueText}`);
    }

    const reminders = getTaskReminders(task);
    if (reminders.length > 0) {
        const reminderText = formatCalendarDateValue(reminders[0]);
        if (reminderText) parts.push(`${CALENDAR_TEXT.reminderPrefix} ${reminderText}`);
    }

    if (tagText) parts.push(tagText);
    return parts.join(' • ');
}

function formatTaskTime(task) {
    const reminders = getTaskReminders(task);
    if (reminders.length > 0) {
        const reminderDate = new Date(reminders[0]);
        if (!Number.isNaN(reminderDate.getTime())) {
            return CALENDAR_TIME_FORMATTER.format(reminderDate);
        }
    }

    const dueTimestamp = getTaskDueTimestamp(task);
    if (dueTimestamp !== null) {
        const dueDate = new Date(dueTimestamp);
        if (!Number.isNaN(dueDate.getTime())) {
            const hasTime = dueDate.getHours() !== 0 || dueDate.getMinutes() !== 0;
            if (hasTime) {
                return CALENDAR_TIME_FORMATTER.format(dueDate);
            }
        }
    }

    return CALENDAR_TEXT.allDay;
}

function getSelectedDayTasks(tasksByDay) {
    if (!selectedDayKey) return [];
    const selectedTasks = tasksByDay.get(selectedDayKey) || [];
    return sortTasks(selectedTasks);
}

function renderSelectedDayTaskList(tasksByDay) {
    if (!selectedDayKey) {
        return `
            <div class="calendar-empty-state" role="status" aria-live="polite">
                <div class="calendar-empty-icon"><i class="codicon codicon-calendar"></i></div>
                <div class="calendar-empty-title">${CALENDAR_TEXT.noDaySelected}</div>
                <div class="calendar-empty-subtitle">${CALENDAR_TEXT.noDaySelectedDescription}</div>
            </div>
        `;
    }

    const selectedTasks = getSelectedDayTasks(tasksByDay);
    const dayTitle = formatSelectedDayTitle(selectedDayKey);
    if (selectedTasks.length === 0) {
        return `
            <div class="calendar-selected-day-header">${dayTitle}</div>
            <div class="calendar-empty-state" role="status" aria-live="polite">
                <div class="calendar-empty-icon"><i class="codicon codicon-inbox"></i></div>
                <div class="calendar-empty-title">${CALENDAR_TEXT.noTasksForDay}</div>
            </div>
        `;
    }

    const rowsHtml = selectedTasks
        .map((task) => {
            const taskId = asText(task?.id);
            const taskTitle = escapeHtml(asText(task?.text) || 'Untitled task');
            const metaText = escapeHtml(formatTaskMeta(task));
            const timeText = escapeHtml(formatTaskTime(task));
            const priorityKey = normalizeCalendarPriority(task?.priority).toLowerCase();

            return `
                <button class="calendar-selected-row priority-${priorityKey}" onclick="openTaskModal('${taskId}')">
                    <span class="calendar-selected-row-accent"></span>
                    <span class="calendar-selected-row-content">
                        <span class="calendar-selected-row-title">${taskTitle}</span>
                        <span class="calendar-selected-row-meta">${metaText}</span>
                    </span>
                    <span class="calendar-selected-row-time">${timeText}</span>
                </button>
            `;
        })
        .join('');

    return `
        <div class="calendar-selected-day-header">${dayTitle}</div>
        <div class="calendar-selected-day-list">${rowsHtml}</div>
    `;
}

function renderCalendar(tasks, selectedDayTasksSource = tasks) {
    const container = document.getElementById('calendarContent');
    if (!container) return;

    const monthDate = cursorToMonthStart(calendarCursor);
    const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
    const gridStart = new Date(monthStart);
    gridStart.setDate(monthStart.getDate() - monthStart.getDay());

    const tasksByDay = new Map();
    for (const task of asTaskArray(tasks)) {
        const dayKey = getTaskDueDayKey(task);
        if (!dayKey) continue;
        const existing = tasksByDay.get(dayKey) || [];
        existing.push(task);
        tasksByDay.set(dayKey, existing);
    }

    const selectedDayTasksByDay = new Map();
    for (const task of asTaskArray(selectedDayTasksSource)) {
        const dayKey = getTaskDueDayKey(task);
        if (!dayKey) continue;
        const existing = selectedDayTasksByDay.get(dayKey) || [];
        existing.push(task);
        selectedDayTasksByDay.set(dayKey, existing);
    }

    const todayKey = toDayKey(new Date());
    const monthLabel = formatCalendarMonthTitle(monthDate);
    const weekdayHeaders = CALENDAR_WEEKDAY_LABELS.map((label) => `<span class="calendar-weekday-label">${label}</span>`).join('');

    let cellsHtml = '';
    for (let dayIndex = 0; dayIndex < 42; dayIndex += 1) {
        const dayDate = new Date(gridStart);
        dayDate.setDate(gridStart.getDate() + dayIndex);
        const dayKey = toDayKey(dayDate);
        const dayTasks = tasksByDay.get(dayKey) || [];

        const isCurrentMonth = dayDate.getMonth() === monthDate.getMonth();
        const isToday = dayKey === todayKey;
        const isSelected = selectedDayKey === dayKey;
        const stateClass = [
            isCurrentMonth ? 'is-current-month' : 'is-other-month',
            isToday ? 'is-today' : '',
            isSelected ? 'is-selected' : ''
        ].join(' ');

        cellsHtml += `
            <button class="calendar-day-cell ${stateClass}" onclick="selectCalendarDay('${dayKey}')">
                <span class="calendar-day-number">${dayDate.getDate()}</span>
                ${renderCalendarDayIndicators(dayTasks)}
            </button>
        `;
    }

    container.innerHTML = `
        <section class="calendar-compact">
            <header class="calendar-compact-header">
                <div class="calendar-nav-group">
                    <button class="calendar-nav-button" onclick="moveCalendarMonth(-1)" title="Previous month">
                        <i class="codicon codicon-chevron-left"></i>
                    </button>
                    <button class="calendar-nav-button" onclick="moveCalendarMonth(1)" title="Next month">
                        <i class="codicon codicon-chevron-right"></i>
                    </button>
                    <button class="calendar-today-button" onclick="setCalendarToToday()">${CALENDAR_TEXT.today}</button>
                </div>
                <h3 class="calendar-month-title">${monthLabel}</h3>
            </header>

            <div class="calendar-weekday-row">${weekdayHeaders}</div>
            <div class="calendar-day-grid">${cellsHtml}</div>
        </section>

        <section class="calendar-selected-panel">
            ${renderSelectedDayTaskList(selectedDayTasksByDay)}
        </section>
    `;
}
