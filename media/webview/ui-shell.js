function openTaskModalWhenAvailable(taskId) {
    if (typeof taskId !== 'string' || !taskId) return;

    const task = currentTasks.find((item) => item.id === taskId);
    if (!task) {
        pendingTaskModalId = taskId;
        return;
    }

    pendingTaskModalId = null;
    openTaskModal(taskId);
}

function makeEditable(el, id, field = 'text') {
    if (el.dataset.editing === 'true') return;
    el.dataset.editing = 'true';
    let oldText = el.innerText;
    const isNew = field === 'text' && oldText === 'New task...';
    if (isNew) oldText = '';
    el.innerHTML = `<textarea class="edit-input" id="active-edit" placeholder="${field === 'text' ? 'Task' : 'Description'}">${oldText}</textarea>`;
    const input = document.getElementById('active-edit');
    if (!input) return;
    const autoResize = () => { input.style.height = 'auto'; input.style.height = input.scrollHeight + 'px'; };
    input.addEventListener('input', autoResize);
    autoResize();
    input.focus();
    if (!isNew) input.select();
    const save = () => {
        const val = input.value.trim();
        if (val !== (isNew ? '' : oldText)) {
            if (field === 'text') {
                if (val) vscode.postMessage({ type: 'updateTaskText', id, text: val });
                else el.innerText = isNew ? 'New task...' : oldText;
            } else vscode.postMessage({ type: 'updateDescription', id, description: val });
        } else el.innerText = isNew ? 'New task...' : oldText;
        delete el.dataset.editing;
    };
    input.onblur = save;
    input.onkeydown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); input.blur(); }
        if (e.key === 'Escape') { input.value = oldText; input.blur(); }
    };
}

document.addEventListener('click', (e) => {
    const isPopover = e.target.closest('.popover') || 
                      e.target.closest('.premium-popover') || 
                      e.target.closest('.ctx-menu') || 
                      e.target.closest('.flatpickr-calendar');
                      
    const isTrigger = e.target.closest('.popover-wrapper') || 
                      e.target.closest('.format-btn') || 
                      e.target.closest('.action-btn') ||
                      e.target.closest('.card-more') ||
                      e.target.closest('.modal-grid-item');

    if (!isPopover && !isTrigger) {
        closeAllPopovers();
    }
});

let datePicker, reminderPicker;

document.addEventListener('DOMContentLoaded', () => {
    syncPremiumPriorityUI();
    syncPremiumTagsUI();
    const titleInput = document.getElementById('taskTitle');
    if (titleInput) {
        titleInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitPremiumTask(); }
        });
    }

    // Initialize Flatpickr
    if (typeof flatpickr !== 'undefined') {
        datePicker = flatpickr("#taskDueDate", {
            disableMobile: true,
            dateFormat: "Y-m-d",
            onChange: function (selectedDates, dateStr) {
                setPremiumDate(dateStr, true);
            }
        });

        reminderPicker = flatpickr("#taskReminderTime", {
            disableMobile: true,
            enableTime: true,
            noCalendar: false,
            dateFormat: "Y-m-d H:i",
            time_24hr: true,
            onChange: function (selectedDates, dateStr) {
                setPremiumReminder(dateStr, 'Personalizado', true);
            }
        });

        // Focus input when clicking wrapper
        document.querySelectorAll('.custom-date-wrapper').forEach(wrapper => {
            wrapper.addEventListener('click', () => {
                const input = wrapper.querySelector('input');
                if (input) input.focus();
            });
        });
    }
});
