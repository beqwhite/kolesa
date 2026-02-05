document.addEventListener('DOMContentLoaded', () => {
  // --- ЭЛЕМЕНТЫ ИНТЕРФЕЙСА ---
  const calendarEl = document.getElementById('calendar');
  const monthTitleEl = document.getElementById('monthTitle');
  const daysLeftEl = document.getElementById('daysLeft');
  const overlay = document.getElementById('overlay');

  const leftBtn = document.getElementById('leftBtn');
  const rightBtn = document.getElementById('rightBtn');
  const leftMenu = document.getElementById('leftMenu');
  const rightMenu = document.getElementById('rightMenu');

  const daysOnInput = document.getElementById('daysOn');
  const daysOffInput = document.getElementById('daysOff');
  const startDateInput = document.getElementById('startDate');

  const prevMonthBtn = document.getElementById('prevMonth');
  const nextMonthBtn = document.getElementById('nextMonth');
  const todayBtn = document.getElementById('todayBtn');

  // --- СОСТОЯНИЕ ---
  const today = new Date();
  let currentYear = today.getFullYear();
  let currentMonth = today.getMonth();

  let settings = JSON.parse(localStorage.getItem('settings')) || {
    daysOn: 21,
    daysOff: 7,
    startDate: null,
  };
  let markedDays = JSON.parse(localStorage.getItem('markedDays')) || {};

  // Инициализация значений
  daysOnInput.value = settings.daysOn;
  daysOffInput.value = settings.daysOff;
  if (settings.startDate) startDateInput.value = settings.startDate;

  // --- ФУНКЦИИ ---
  function hapticFeedback(type) {
    if (!window.navigator || !window.navigator.vibrate) return;

    if (type === 'success') {
      window.navigator.vibrate(10); // Короткий мягкий клик
    } else if (type === 'warning') {
      window.navigator.vibrate([15, 30, 15]); // Двойной прерывистый (для удаления)
    } else if (type === 'heavy') {
      window.navigator.vibrate(50); // Уверенная вибрация (для меню/сброса)
    }
  }

  function toggleMenu(menu) {
    menu.classList.toggle('active');
    overlay.classList.toggle('active');
  }

  leftBtn.onclick = () => toggleMenu(leftMenu);
  rightBtn.onclick = () => toggleMenu(rightMenu);

  overlay.onclick = () => {
    leftMenu.classList.remove('active');
    rightMenu.classList.remove('active');
    overlay.classList.remove('active');
  };

  // --- УПРАВЛЕНИЕ ДАННЫМИ ---
  document.getElementById('leftBtn').onclick = () => {
    hapticFeedback('heavy');
    toggleMenu(leftMenu);
  };
  document.getElementById('rightBtn').onclick = () => {
    hapticFeedback('heavy');
    toggleMenu(rightMenu);
  };

  document.getElementById('resetMarksBtn').onclick = () => {
    hapticFeedback('heavy');
    if (confirm('⚠️ Сбросить только отметки?')) {
      markedDays = {};
      localStorage.removeItem('markedDays');
      refresh();
    }
  };

  document.getElementById('resetCourseBtn').onclick = () => {
    if (confirm('⚠️ Сбросить весь курс?')) {
      localStorage.clear();
      location.reload();
    }
  };

  document.getElementById('exportBtn').onclick = async () => {
    const data = btoa(JSON.stringify({ settings, markedDays }));
    if (navigator.share) {
      await navigator.share({
        title: 'Бэкап Календаря',
        text: data,
      });
    } else {
      // запасной вариант с буфером
      navigator.clipboard.writeText(data);
      alert('Скопировано!');
    }
  };

  document.getElementById('importBtn').onclick = () => {
    const code = prompt('Вставь код бекапа сюда:');
    if (code) {
      try {
        const decoded = JSON.parse(atob(code));
        localStorage.setItem('settings', JSON.stringify(decoded.settings));
        localStorage.setItem('markedDays', JSON.stringify(decoded.markedDays));
        location.reload();
      } catch (e) {
        alert('❌ Ошибка кода');
      }
    }
  };

  function saveSettings() {
    settings.daysOn = Number(daysOnInput.value);
    settings.daysOff = Number(daysOffInput.value);
    settings.startDate = startDateInput.value;
    localStorage.setItem('settings', JSON.stringify(settings));
    refresh();
  }

  [daysOnInput, daysOffInput, startDateInput].forEach((i) =>
    i.addEventListener('change', saveSettings),
  );

  // --- ЛОГИКА БЛИСТЕРА И СЛЕДУЮЩЕЙ ПАЧКИ ---
  function updateBlisterAndNextPack() {
    const nextPackEl = document.getElementById('nextPackInfo');
    const blisterCont = document.getElementById('blisterContainer');

    if (!settings.startDate) {
      nextPackEl.style.display = 'none';
      if (blisterCont) blisterCont.style.display = 'none';
      return;
    }

    const start = new Date(settings.startDate);
    start.setHours(0, 0, 0, 0);
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const diff = Math.floor((now - start) / 86400000);
    const cycle = settings.daysOn + settings.daysOff;

    if (diff >= 0) {
      const currentCycleNum = Math.floor(diff / cycle);
      const nextPackDate = new Date(start);
      nextPackDate.setDate(nextPackDate.getDate() + (currentCycleNum + 1) * cycle);

      const dateStr = nextPackDate.toLocaleDateString('ru', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      });
      nextPackEl.innerHTML = `Следующая пачка: <b>${dateStr}</b>`;
      nextPackEl.style.display = 'block';

      // Часть с блистером просто игнорируем, она не сработает, так как контейнер скрыт в HTML
      if (blisterCont) blisterCont.style.display = 'none';
    } else {
      nextPackEl.style.display = 'none';
      if (blisterCont) blisterCont.style.display = 'none';
    }
  }

  function updateDaysLeft() {
    if (!settings.startDate) {
      daysLeftEl.textContent = 'Укажите дату старта';
      daysLeftEl.style.color = '#8e8e93';
      return;
    }
    const start = new Date(settings.startDate);
    start.setHours(0, 0, 0, 0);
    const diff = Math.floor((today - start) / 86400000);

    if (diff < 0) {
      daysLeftEl.textContent = 'Курс еще не начался';
      return;
    }

    const totalCycle = settings.daysOn + settings.daysOff;
    const cycleDay = diff % totalCycle;

    if (cycleDay < settings.daysOn) {
      daysLeftEl.textContent = `Приём: ещё ${settings.daysOn - cycleDay} дн.`;
      daysLeftEl.style.color = '#4cd964';
    } else {
      daysLeftEl.textContent = `Пауза: ещё ${totalCycle - cycleDay} дн.`;
      daysLeftEl.style.color = '#ff453a';
    }
  }

  function isTakeDay(date) {
    if (!settings.startDate) return null;
    const start = new Date(settings.startDate);
    start.setHours(0, 0, 0, 0);
    const diff = Math.floor((new Date(date).setHours(0, 0, 0, 0) - start) / 86400000);
    if (diff < 0) return null;
    return diff % (settings.daysOn + settings.daysOff) < settings.daysOn ? 'take' : 'break';
  }

  function renderCalendar(year, month) {
    calendarEl.innerHTML = '';
    const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
    weekDays.forEach((d) => {
      const h = document.createElement('div');
      h.className = 'weekday-header';
      h.textContent = d;
      calendarEl.appendChild(h);
    });

    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0).getDate();
    let startDay = first.getDay();
    startDay = startDay === 0 ? 6 : startDay - 1;

    monthTitleEl.textContent = first.toLocaleString('ru', { month: 'long', year: 'numeric' });

    for (let i = 0; i < startDay; i++) {
      const empty = document.createElement('div');
      empty.className = 'day inactive';
      calendarEl.appendChild(empty);
    }

    for (let d = 1; d <= last; d++) {
      const dayEl = document.createElement('div');
      dayEl.className = 'day';
      const fullDate = new Date(year, month, d);
      const key = fullDate.toISOString().split('T')[0];

      if (fullDate.toDateString() === today.toDateString()) dayEl.classList.add('today');

      const cycleType = isTakeDay(fullDate);
      if (!markedDays[key]) {
        if (cycleType === 'take') dayEl.classList.add('take-day');
        if (cycleType === 'break') dayEl.classList.add('break-day');
      } else {
        dayEl.classList.add(markedDays[key] === 'take' ? 'active' : 'break-marked');
      }

      dayEl.textContent = d;
      dayEl.onclick = () => {
        if (!markedDays[key]) {
          // СТАВИМ ОТМЕТКУ
          hapticFeedback('success'); // Мягкий клик
          markedDays[key] = cycleType || 'take';
          localStorage.setItem('markedDays', JSON.stringify(markedDays));
          refresh();
        } else {
          // УДАЛЯЕМ ОТМЕТКУ
          hapticFeedback('warning'); // Ощутимый двойной отклик
          dayEl.classList.add('shake');
          setTimeout(() => {
            delete markedDays[key];
            localStorage.setItem('markedDays', JSON.stringify(markedDays));
            refresh();
          }, 200);
        }
      };
      calendarEl.appendChild(dayEl);
    }
  }

  function refresh() {
    updateDaysLeft();
    renderCalendar(currentYear, currentMonth);
    updateBlisterAndNextPack(); // ТЕПЕРЬ ОНО ВЫЗЫВАЕТСЯ ЗДЕСЬ
  }

  prevMonthBtn.onclick = () => {
    currentMonth--;
    if (currentMonth < 0) {
      currentMonth = 11;
      currentYear--;
    }
    refresh();
  };
  nextMonthBtn.onclick = () => {
    currentMonth++;
    if (currentMonth > 11) {
      currentMonth = 0;
      currentYear++;
    }
    refresh();
  };
  todayBtn.onclick = () => {
    currentYear = today.getFullYear();
    currentMonth = today.getMonth();
    refresh();
  };

  refresh(); // Запуск при старте
});
