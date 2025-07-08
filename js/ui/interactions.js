import { dom } from '../config.js';
import { activeInlineEdit } from '../state.js';

// --- ICONS, CONTEXT MENU, TIME PICKER, TOAST, INLINE EDIT ---
export function showContextMenu(event, menuItems) {
  dom.contextMenu.innerHTML = '';
  menuItems.forEach((item) => {
    if (item.type === 'divider') {
      dom.contextMenu.appendChild(document.createElement('div')).className =
        'context-menu-divider';
      return;
    }
    const menuItemEl = document.createElement('div');
    menuItemEl.className = `context-menu-item ${item.class || ''}`;
    menuItemEl.innerHTML = item.icon
      ? `${item.icon} <span>${item.label}</span>`
      : item.label;
    menuItemEl.addEventListener('click', (e) => {
      e.stopPropagation();
      item.action();
      hideContextMenu();
    });
    dom.contextMenu.appendChild(menuItemEl);
  });
  dom.contextMenu.style.top = `${event.clientY}px`;
  dom.contextMenu.style.left = `${event.clientX}px`;
  dom.contextMenu.classList.remove('hidden');
}

export function hideContextMenu() {
  dom.contextMenu.classList.add('hidden');
}

let activeTimePickerTarget = null;
export function initTimePicker() {
  const { container, hours, minutes, period } = dom.timePicker;
  for (let i = 1; i <= 12; i++)
    hours.innerHTML += `<div class="time-picker-option" data-value="${String(
      i
    ).padStart(2, '0')}">${String(i).padStart(2, '0')}</div>`;
  for (let i = 0; i < 60; i += 5)
    minutes.innerHTML += `<div class="time-picker-option" data-value="${String(
      i
    ).padStart(2, '0')}">${String(i).padStart(2, '0')}</div>`;
  period.innerHTML += `<div class="time-picker-option" data-value="AM">AM</div><div class="time-picker-option" data-value="PM">PM</div>`;
  container.addEventListener('click', (e) => {
    e.stopPropagation();
    if (e.target.closest('.time-picker-option') && activeTimePickerTarget) {
      e.target.parentElement
        .querySelectorAll('.selected')
        .forEach((el) => el.classList.remove('selected'));
      e.target.classList.add('selected');
      updateTimeFromPicker();
    }
  });
}
export function openTimePicker(targetButton) {
  const { container, hours, minutes, period } = dom.timePicker;
  activeTimePickerTarget = targetButton;
  const hiddenInput =
    targetButton.id === 'start-time-display'
      ? dom.eventModal.startTimeInput
      : dom.eventModal.endTimeInput;
  const [currentHour24, currentMinute] = hiddenInput.value
    .split(':')
    .map(Number);
  let currentHour12 = currentHour24 % 12 || 12;
  const currentPeriod = currentHour24 >= 12 ? 'PM' : 'AM';
  [hours, minutes, period].forEach((col) =>
    col
      .querySelectorAll('.selected')
      .forEach((el) => el.classList.remove('selected'))
  );
  const hourEl = hours.querySelector(
    `[data-value="${String(currentHour12).padStart(2, '0')}"]`
  );
  const minuteEl = minutes.querySelector(
    `[data-value="${String(Math.round(currentMinute / 5) * 5).padStart(
      2,
      '0'
    )}"]`
  );
  const periodEl = period.querySelector(`[data-value="${currentPeriod}"]`);
  if (hourEl) {
    hourEl.classList.add('selected');
    hourEl.scrollIntoView({ block: 'center' });
  }
  if (minuteEl) {
    minuteEl.classList.add('selected');
    minuteEl.scrollIntoView({ block: 'center' });
  }
  if (periodEl) periodEl.classList.add('selected');
  const rect = targetButton.getBoundingClientRect();
  container.style.top = `${rect.bottom + 5}px`;
  container.style.left = `${rect.left}px`;
  container.classList.remove('hidden');
  document.addEventListener('click', closeTimePickerOnClickOutside, {
    once: true,
  });
}
function closeTimePickerOnClickOutside(e) {
  if (!dom.timePicker.container.contains(e.target)) closeTimePicker();
  else
    document.addEventListener('click', closeTimePickerOnClickOutside, {
      once: true,
    });
}
function closeTimePicker() {
  if (!dom.timePicker.container.classList.contains('hidden')) {
    dom.timePicker.container.classList.add('hidden');
    activeTimePickerTarget = null;
  }
}
function updateTimeFromPicker() {
  if (!activeTimePickerTarget) return;
  const { hours, minutes, period } = dom.timePicker;
  const hour12 = hours.querySelector('.selected')?.dataset.value || '12';
  const minute = minutes.querySelector('.selected')?.dataset.value || '00';
  const periodVal = period.querySelector('.selected')?.dataset.value || 'AM';
  let hour24 = parseInt(hour12, 10);
  if (periodVal === 'PM' && hour24 < 12) hour24 += 12;
  else if (periodVal === 'AM' && hour24 === 12) hour24 = 0;
  const time24h = `${String(hour24).padStart(2, '0')}:${minute}`;
  const hiddenInput =
    activeTimePickerTarget.id === 'start-time-display'
      ? dom.eventModal.startTimeInput
      : dom.eventModal.endTimeInput;
  hiddenInput.value = time24h;
  activeTimePickerTarget.textContent = formatTimeForDisplay(time24h);
}

export function formatTimeForDisplay(time24h) {
  if (!time24h) return '12:00 AM';
  const [h, m] = time24h.split(':');
  const date = new Date();
  date.setHours(parseInt(h, 10), parseInt(m, 10));
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

export function showToast(message, type = 'info', duration = 3000) {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  dom.toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('exiting');
    toast.addEventListener('animationend', () => toast.remove());
  }, duration);
}

export function startInlineEdit(element, onSave) {
  if (activeInlineEdit.cleanup) activeInlineEdit.cleanup();
  element.style.display = 'none';
  const input = document.createElement('input');
  input.type = 'text';
  input.value = element.textContent.trim();
  input.className = 'inline-edit-input';
  element.parentNode.insertBefore(input, element.nextSibling);
  input.focus();
  input.select();
  const cleanup = () => {
    input.removeEventListener('blur', saveChanges);
    input.removeEventListener('keydown', handleKey);
    if (document.body.contains(input)) input.remove();
    element.style.display = '';
    activeInlineEdit.cleanup = null;
  };
  activeInlineEdit.cleanup = cleanup;
  const saveChanges = () => {
    const newValue = input.value.trim();
    if (newValue) {
      onSave(newValue);
      element.textContent = newValue;
    }
    cleanup();
  };
  const handleKey = (e) => {
    if (e.key === 'Enter') saveChanges();
    else if (e.key === 'Escape') cleanup();
  };
  input.addEventListener('blur', saveChanges);
  input.addEventListener('keydown', handleKey);
}

export function highlightTask(taskId) {
  const taskEl = document.querySelector(`li[data-id="${taskId}"]`);
  if (taskEl) {
    taskEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    taskEl.classList.add('highlighted');
    setTimeout(() => taskEl.classList.remove('highlighted'), 1500);
  }
}
