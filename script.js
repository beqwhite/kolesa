document.addEventListener('DOMContentLoaded', () => {
  const calendarTop = document.getElementById('calendarTop');
  const calendarBottom = document.getElementById('calendarBottom');
  const monthTitleTop = document.getElementById('monthTitleTop');
  const monthTitleBottom = document.getElementById('monthTitleBottom');
  const daysLeftEl = document.getElementById('daysLeft');
  const mainContent = document.getElementById('mainContent');

  const leftBtn = document.getElementById('leftBtn');
  const rightBtn = document.getElementById('rightBtn');
  const leftMenu = document.getElementById('leftMenu');
  const rightMenu = document.getElementById('rightMenu');
  const resetMarksBtn = document.getElementById('resetMarksBtn');
  const resetCourseBtn = document.getElementById('resetCourseBtn');

  const daysOnInput = document.getElementById('daysOn');
  const daysOffInput = document.getElementById('daysOff');
  const startDateInput = document.getElementById('startDate');
  const notifyTimeInput = document.getElementById('notifyTime');

  const prevMonthBtn = document.getElementById('prevMonth');
  const nextMonthBtn = document.getElementById('nextMonth');
  const todayBtn = document.getElementById('todayBtn');

  const today = new Date();
  let currentYear = today.getFullYear();
  let currentMonth = today.getMonth();

  // Настройки и отмеченные дни
  let settings = JSON.parse(localStorage.getItem('settings')) || {
    daysOn: 21,
    daysOff: 7,
    startDate: null,
  };
  let markedDays = JSON.parse(localStorage.getItem('markedDays')) || {};

  daysOnInput.value = settings.daysOn;
  daysOffInput.value = settings.daysOff;
  if (settings.startDate) startDateInput.value = settings.startDate;
  notifyTimeInput.value = localStorage.getItem('notifyTime') || '00:00';

  // --- Меню ---
  function toggleMenu(menu) {
    const isHidden = menu.classList.toggle('hidden');
    mainContent.style.display = isHidden ? 'block' : 'none';
  }

  leftBtn.onclick = () => toggleMenu(leftMenu);
  rightBtn.onclick = () => toggleMenu(rightMenu);

  resetMarksBtn.onclick = () => {
    if (confirm('⚠️ Вы уверены, что хотите сбросить все отметки?')) {
      markedDays = {};
      localStorage.removeItem('markedDays');
      renderCalendars();
      updateDaysLeft();
    }
  };

  resetCourseBtn.onclick = () => {
    if (confirm('⚠️ Вы уверены, что хотите сбросить весь курс?')) {
      markedDays = {};
      settings.startDate = null;
      localStorage.removeItem('markedDays');
      localStorage.setItem('settings', JSON.stringify(settings));
      renderCalendars();
      updateDaysLeft();
    }
  };

  // --- Сохранение настроек ---
  function saveSettings() {
    settings.daysOn = Number(daysOnInput.value);
    settings.daysOff = Number(daysOffInput.value);
    settings.startDate = startDateInput.value;
    localStorage.setItem('settings', JSON.stringify(settings));
    localStorage.setItem('notifyTime', notifyTimeInput.value);
    updateDaysLeft();
    scheduleNotification();
    renderCalendars();
  }

  [daysOnInput, daysOffInput, startDateInput, notifyTimeInput].forEach((i) =>
    i.addEventListener('change', saveSettings),
  );

  // --- Индикатор дней ---
  function updateDaysLeft() {
    if (!settings.startDate) {
      daysLeftEl.textContent = '';
      daysLeftEl.style.color = '#fff';
      return;
    }
    const start = new Date(settings.startDate);
    start.setHours(0, 0, 0, 0);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const diff = Math.floor((now - start) / (1000 * 60 * 60 * 24));
    const totalCycle = settings.daysOn + settings.daysOff;
    const cycleDay = diff % totalCycle;

    if (cycleDay < settings.daysOn) {
      const remaining = settings.daysOn - cycleDay;
      daysLeftEl.textContent = `Осталось дней приёма: ${remaining}`;
      daysLeftEl.style.color = '#4cd964';
    } else {
      const remainingBreak = totalCycle - cycleDay;
      daysLeftEl.textContent = `Осталось дней перерыва: ${remainingBreak}`;
      daysLeftEl.style.color = 'rgba(255,50,50,0.8)';
    }
  }

  // --- Цикл приёма ---
  function isTakeDay(date) {
    if (!settings.startDate) return null;
    const start = new Date(settings.startDate);
    start.setHours(0, 0, 0, 0);
    const target = new Date(date);
    target.setHours(0, 0, 0, 0);
    const diff = Math.floor((target - start) / (1000 * 60 * 60 * 24));
    if (diff < 0) return null;
    return diff % (settings.daysOn + settings.daysOff) < settings.daysOn ? 'take' : 'break';
  }

  // --- Рендер календарей ---
  function renderCalendar(year, month, calendarEl, monthTitleEl) {
    calendarEl.innerHTML = '';
    const first = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayWeek = first.getDay() === 0 ? 6 : first.getDay() - 1;
    monthTitleEl.textContent = first.toLocaleString('ru', { month: 'long', year: 'numeric' });

    for (let i = 0; i < firstDayWeek; i++) {
      const empty = document.createElement('div');
      empty.className = 'day inactive';
      calendarEl.appendChild(empty);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dayEl = document.createElement('div');
      dayEl.className = 'day';
      const fullDate = new Date(year, month, d);
      const key = fullDate.toISOString().split('T')[0];
      if (fullDate.toDateString() === today.toDateString()) dayEl.classList.add('today');

      const cycleType = isTakeDay(fullDate);
      if (!markedDays[key]) {
        if (cycleType === 'take') dayEl.classList.add('take-day');
        if (cycleType === 'break') dayEl.classList.add('break-day');
      }
      if (markedDays[key] === 'take') {
        dayEl.classList.remove('take-day', 'break-day');
        dayEl.classList.add('active');
      }
      if (markedDays[key] === 'break') {
        dayEl.classList.remove('take-day', 'break-day');
        dayEl.classList.add('break-marked');
      }

      dayEl.textContent = d;
      dayEl.title = cycleType === 'take' ? 'День приёма' : 'День перерыва';
      dayEl.onclick = () => {
        if (!markedDays[key]) {
          markedDays[key] = cycleType;
          if (cycleType === 'break') alert('⚠️ День перерыва!');
        } else {
          if (confirm('Удалить отметку с этого дня?')) delete markedDays[key];
        }
        localStorage.setItem('markedDays', JSON.stringify(markedDays));
        updateDaysLeft();
        renderCalendars();
      };
      calendarEl.appendChild(dayEl);
    }
  }

  function renderCalendars() {
    renderCalendar(currentYear, currentMonth, calendarTop, monthTitleTop);
    const nextMonth = currentMonth + 1 > 11 ? 0 : currentMonth + 1;
    const nextYear = currentMonth + 1 > 11 ? currentYear + 1 : currentYear;
    renderCalendar(nextYear, nextMonth, calendarBottom, monthTitleBottom);
  }

  // --- Кнопки управления ---
  prevMonthBtn.onclick = () => {
    currentMonth--;
    if (currentMonth < 0) {
      currentMonth = 11;
      currentYear--;
    }
    renderCalendars();
  };
  nextMonthBtn.onclick = () => {
    currentMonth++;
    if (currentMonth > 11) {
      currentMonth = 0;
      currentYear++;
    }
    renderCalendars();
  };
  todayBtn.onclick = () => {
    currentYear = today.getFullYear();
    currentMonth = today.getMonth();
    renderCalendars();
  };

  // --- Уведомления ---
  function scheduleNotification() {
    if (!settings.startDate) return;
    const lastNotified = localStorage.getItem('lastNotifyDate') || '';
    const nowUTC = new Date();
    const nowMSK = new Date(nowUTC.getTime() + 3 * 60 * 60 * 1000);
    const [h, m] = notifyTimeInput.value.split(':').map(Number);
    const nextPill = new Date(nowMSK);
    nextPill.setHours(h, m, 0, 0);
    if (nowMSK > nextPill) nextPill.setDate(nextPill.getDate() + 1);
    const diffMs = nextPill - nowMSK;
    const diffH = Math.floor(diffMs / (1000 * 60 * 60));
    const diffM = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (nowMSK.getHours() >= 18) {
      daysLeftEl.textContent = `До следующей таблетки: ${diffH}ч ${diffM}м`;
    } else {
      updateDaysLeft();
    }

    if (
      nowMSK.getHours() === h &&
      nowMSK.getMinutes() === m &&
      lastNotified !== nowMSK.toISOString().split('T')[0]
    ) {
      new Notification('💊 Пора принять таблетку!');
      localStorage.setItem('lastNotifyDate', nowMSK.toISOString().split('T')[0]);
    }
  }

  document.getElementById('enableNotifications').onclick = async () => {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      alert('Разрешите уведомления');
      return;
    }
    localStorage.setItem('notifyTime', notifyTimeInput.value);
    alert('Напоминания включены. Работают пока сайт открыт.');
  };

  renderCalendars();
  scheduleNotification();
  setInterval(scheduleNotification, 60000);
});
