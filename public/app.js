/**
 * ========================================================================
 *   Chore Chart & Calendar Generator - Core Application Logic & Engine
 * ========================================================================
 */

// --- Constants & Config ---
const STORAGE_KEY = 'chore_chart_state';

// Pre-seeded User Colors (Premium harmonious palette)
const PALETTE = [
  '#f43f5e', // Rose
  '#3b82f6', // Indigo Blue
  '#10b981', // Emerald Green
  '#8b5cf6', // Violet Purple
  '#f59e0b', // Amber Orange
  '#06b6d4', // Cyan
  '#ec4899', // Pink
  '#14b8a6', // Teal
];

// --- Application State ---
let state = {
  users: {},          // id -> { id, name, color }
  chores: [],         // array of chore objects
  monthlyGroups: [],  // array of monthly group objects
  overrides: {},      // "YYYY-MM-DD_choreId" -> userId (or "YYYY-MM-DD_groupId_choreIndex" -> userId)
  completions: {}     // "YYYY-MM-DD_choreId" -> boolean (or "YYYY-MM-DD_groupId_choreIndex" -> boolean)
};

// --- Date Utilities ---
const dateUtils = {
  // Format Date as YYYY-MM-DD in local time
  formatLocalDate(date) {
    const d = new Date(date);
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const year = d.getFullYear();
    return `${year}-${month}-${day}`;
  },

  // Calculate days between two date strings (YYYY-MM-DD)
  daysBetween(startStr, endStr) {
    const start = new Date(startStr + 'T00:00:00');
    const end = new Date(endStr + 'T00:00:00');
    const diffTime = end - start;
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  },

  // Count occurrences of specific weekdays between two dates (inclusive)
  countWeekdayOccurrences(startDateStr, endDateStr, activeDays) {
    const start = new Date(startDateStr + 'T00:00:00');
    const end = new Date(endDateStr + 'T00:00:00');
    
    if (end < start) return 0;
    
    let count = 0;
    let current = new Date(start);
    
    while (current <= end) {
      const dayOfWeek = current.getDay(); // 0 = Sunday, 6 = Saturday
      if (activeDays.includes(dayOfWeek)) {
        count++;
      }
      current.setDate(current.getDate() + 1);
    }
    return count;
  },

  // Calculate months between "YYYY-MM" start and "YYYY-MM-DD" target
  monthsBetween(startMonthStr, targetDateStr) {
    const [startYear, startMonth] = startMonthStr.split('-').map(Number);
    const [targetYear, targetMonth] = targetDateStr.split('-').map(Number);
    return (targetYear - startYear) * 12 + (targetMonth - startMonth);
  },

  // Check if a specific date is the Xth DayOfWeek of its month
  isMonthlyGroupDate(group, date) {
    const d = new Date(date + 'T00:00:00');
    if (d.getDay() !== group.dayOfWeek) return false;

    const year = d.getFullYear();
    const month = d.getMonth();
    const day = d.getDate();

    // Find all matching days of the week in this month
    const matches = [];
    let current = new Date(year, month, 1);
    while (current.getMonth() === month) {
      if (current.getDay() === group.dayOfWeek) {
        matches.push(current.getDate());
      }
      current.setDate(current.getDate() + 1);
    }

    // group.weekIndex: 0 = 1st, 1 = 2nd, ..., 4 = Last
    if (group.weekIndex === 4) {
      // Last occurrence
      return matches[matches.length - 1] === day;
    } else {
      return matches[group.weekIndex] === day;
    }
  }
};

// --- Core Scheduling Engine ---
const scheduler = {
  // Get assignee for a specific chore on a specific date
  getAssigneeForChore(chore, dateStr) {
    const overrideKey = `${dateStr}_${chore.id}`;
    if (state.overrides[overrideKey]) {
      return state.users[state.overrides[overrideKey]] || null;
    }

    const pool = chore.rotationPool;
    if (!pool || pool.length === 0) return null;

    // Daily Chores
    if (chore.frequency === 'daily') {
      const daysElapsed = dateUtils.daysBetween(chore.startDate, dateStr);
      if (daysElapsed < 0) return null; // Chore hadn't started yet
      const index = (chore.startIndex + daysElapsed) % pool.length;
      return state.users[pool[index]] || null;
    }

    // Weekly Chores
    if (chore.frequency === 'weekly') {
      // Get count of scheduled occurrences between start and target date
      const occurrences = dateUtils.countWeekdayOccurrences(chore.startDate, dateStr, chore.daysOfWeek);
      if (occurrences === 0) return null; // No scheduled occurrences yet
      
      const index = (chore.startIndex + occurrences - 1) % pool.length;
      return state.users[pool[index]] || null;
    }

    return null;
  },

  // Get assignee for a monthly group chore on a specific date
  getAssigneeForGroupChore(group, choreIndex, dateStr) {
    const overrideKey = `${dateStr}_${group.id}_${choreIndex}`;
    if (state.overrides[overrideKey]) {
      return state.users[state.overrides[overrideKey]] || null;
    }

    const pool = group.rotationPool;
    if (!pool || pool.length === 0) return null;

    const monthsElapsed = dateUtils.monthsBetween(group.startMonth, dateStr);
    if (monthsElapsed < 0) return null; // Group hadn't started yet

    // Custom Shifting window formula: (months * chores_count + chore_index) % pool_count
    const index = (monthsElapsed * group.chores.length + choreIndex) % pool.length;
    return state.users[pool[index]] || null;
  }
};

// --- Storage & Seeding Operations ---
const store = {
  save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  },

  load() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        state = JSON.parse(raw);
        return true;
      } catch (e) {
        console.error("Failed to load state, seeding default data", e);
      }
    }
    this.seedDefaultData();
    return false;
  },

  seedDefaultData() {
    state = {
      users: {},
      chores: [],
      monthlyGroups: [],
      overrides: {},
      completions: {}
    };

    // 1. Add 5 Users from HLD
    const userNames = ['Mom', 'Dad', 'Collin', 'Sydney', 'Hayden'];
    userNames.forEach((name, idx) => {
      const id = `u_${idx + 1}`;
      state.users[id] = {
        id,
        name,
        color: PALETTE[idx % PALETTE.length]
      };
    });

    const u = {
      mom: 'u_1',
      dad: 'u_2',
      collin: 'u_3',
      sydney: 'u_4',
      hayden: 'u_5'
    };

    // Anchor Date: June 1, 2026 (Monday)
    const anchorDate = '2026-06-01';

    // 2. Add Daily Chores
    state.chores.push(
      {
        id: 'c_daily_load_dish',
        name: 'Load Dishwasher',
        frequency: 'daily',
        daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
        rotationPool: [u.mom, u.dad, u.collin, u.sydney, u.hayden],
        startIndex: 0, // Mom starts
        startDate: anchorDate
      },
      {
        id: 'c_daily_unload_dish',
        name: 'Unload Dishwasher',
        frequency: 'daily',
        daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
        rotationPool: [u.dad, u.collin, u.sydney, u.hayden, u.mom],
        startIndex: 0, // Dad starts
        startDate: anchorDate
      },
      {
        id: 'c_daily_trash',
        name: 'Take Kitchen Trash Out',
        frequency: 'daily',
        daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
        rotationPool: [u.collin, u.sydney, u.hayden, u.mom, u.dad],
        startIndex: 0, // Collin starts
        startDate: anchorDate
      },
      {
        id: 'c_daily_counters',
        name: 'Wipe Kitchen Counters',
        frequency: 'daily',
        daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
        rotationPool: [u.sydney, u.hayden, u.mom, u.dad, u.collin],
        startIndex: 0, // Sydney starts
        startDate: anchorDate
      },
      {
        id: 'c_daily_dinner',
        name: 'Make Dinner',
        frequency: 'daily',
        daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
        rotationPool: [u.mom, u.dad, u.collin],
        startIndex: 0, // Mom starts
        startDate: anchorDate
      }
    );

    // 3. Add Weekly Chores
    state.chores.push(
      {
        id: 'c_weekly_mow',
        name: 'Mow Lawn',
        frequency: 'weekly',
        daysOfWeek: [3, 6], // Wed & Sat
        rotationPool: [u.dad],
        startIndex: 0, // Dad only
        startDate: anchorDate
      },
      {
        id: 'c_weekly_poop',
        name: "Dixie's Poop",
        frequency: 'weekly',
        daysOfWeek: [3, 6], // Wed & Sat
        rotationPool: [u.hayden, u.mom, u.dad, u.collin, u.sydney],
        startIndex: 0, // Hayden starts
        startDate: anchorDate
      },
      {
        id: 'c_weekly_dumpster',
        name: 'Take Dumpster to Curb',
        frequency: 'weekly',
        daysOfWeek: [2], // Tuesday night (trash day Wed)
        rotationPool: [u.mom, u.dad, u.collin, u.sydney, u.hayden],
        startIndex: 0, // Mom starts
        startDate: anchorDate
      },
      {
        id: 'c_weekly_trashcans',
        name: 'Empty All Trashcans',
        frequency: 'weekly',
        daysOfWeek: [0], // Sunday
        rotationPool: [u.mom, u.dad, u.collin],
        startIndex: 0, // Mom starts
        startDate: anchorDate
      },
      {
        id: 'c_weekly_corners',
        name: 'Sweep / Vacuum Corners',
        frequency: 'weekly',
        daysOfWeek: [6], // Saturday
        rotationPool: [u.dad, u.collin, u.sydney, u.hayden, u.mom],
        startIndex: 0, // Dad starts
        startDate: anchorDate
      },
      {
        id: 'c_weekly_groom',
        name: 'Groom Dixie',
        frequency: 'weekly',
        daysOfWeek: [0], // Sunday
        rotationPool: [u.collin, u.sydney, u.hayden, u.mom, u.dad],
        startIndex: 0, // Collin starts
        startDate: anchorDate
      },
      {
        id: 'c_weekly_laundry',
        name: 'Laundry',
        frequency: 'weekly',
        daysOfWeek: [0], // Sunday
        rotationPool: [u.mom, u.dad],
        startIndex: 0, // Mom starts
        startDate: anchorDate
      }
    );

    // 4. Add Individual Personal Bedroom Chores (Saturday)
    state.chores.push(
      {
        id: 'c_weekly_room_collin',
        name: 'Clean Room (Collin)',
        frequency: 'weekly',
        daysOfWeek: [6],
        rotationPool: [u.collin],
        startIndex: 0,
        startDate: anchorDate
      },
      {
        id: 'c_weekly_room_sydney',
        name: 'Clean Room (Sydney)',
        frequency: 'weekly',
        daysOfWeek: [6],
        rotationPool: [u.sydney],
        startIndex: 0,
        startDate: anchorDate
      },
      {
        id: 'c_weekly_room_hayden',
        name: 'Clean Room (Hayden)',
        frequency: 'weekly',
        daysOfWeek: [6],
        rotationPool: [u.hayden],
        startIndex: 0,
        startDate: anchorDate
      },
      {
        id: 'c_weekly_room_parents',
        name: 'Clean Master Bedroom (Mom/Dad)',
        frequency: 'weekly',
        daysOfWeek: [6],
        rotationPool: [u.mom, u.dad], // Rotate or share
        startIndex: 0,
        startDate: anchorDate
      }
    );

    // 5. Add Monthly Deep Clean Weekend Group
    state.monthlyGroups.push({
      id: 'g_monthly_deep_clean',
      name: 'Monthly Deep Clean Weekend',
      chores: ['Clean Bathrooms', 'Vacuum Rugs', 'Vacuum Stairs'],
      rotationPool: [u.mom, u.dad, u.collin, u.sydney, u.hayden],
      startMonth: '2026-06', // Month 1
      weekIndex: 1,      // 2nd week (0 = 1st, 1 = 2nd)
      dayOfWeek: 6       // Saturday
    });

    this.save();
  }
};

// --- UI Coordinator / Controller ---
const ui = {
  currentDate: new Date(2026, 5, 8), // Defaulting to HLD scope month (June 2026)
  activeTab: 'calendar',
  calendarViewMode: 'month',   // 'month' | 'week' | 'day'
  selectedOverrideChore: null, // Tracks target chore for manual override modal
  selectedOverrideDate: null,   // Tracks target date for manual override modal
  
  init() {
    // 1. Load Data from Store
    store.load();

    // 2. Setup Year and Month select options
    this.populateCalendarSelectors();

    // 3. Navigation Click Handlers
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const tab = link.getAttribute('data-tab');
        this.switchTab(tab);
      });
    });

    // 3.5. Calendar View Toggle Segmented Buttons
    document.querySelectorAll('#calendarViewToggle button').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        document.querySelectorAll('#calendarViewToggle button').forEach(b => {
          b.classList.remove('active');
          b.setAttribute('aria-pressed', 'false');
        });
        btn.classList.add('active');
        btn.setAttribute('aria-pressed', 'true');
        this.calendarViewMode = btn.getAttribute('data-view');
        this.render();
      });
    });

    // 4. Bind Calendar Prev/Next Buttons
    document.getElementById('calPrevBtn').addEventListener('click', () => this.adjustPeriod(-1));
    document.getElementById('calNextBtn').addEventListener('click', () => this.adjustPeriod(1));
    document.getElementById('yearSelect').addEventListener('change', () => this.onSelectorChange());
    document.getElementById('monthSelect').addEventListener('change', () => this.onSelectorChange());

    // 5. Action Utility Buttons
    document.getElementById('printBtn').addEventListener('click', () => window.print());
    document.getElementById('icsBtn').addEventListener('click', () => this.triggerIcsExport());

    // 6. Generic Modal Close buttons
    document.querySelectorAll('.modal-close, .btn-close-modal').forEach(btn => {
      btn.addEventListener('click', () => this.closeAllModals());
    });

    // 7. Bind specific creation / override forms
    this.bindForms();

    // 8. Initial Rendering
    this.render();
  },

  // Switch Active Dashboard Views
  switchTab(tabId) {
    this.activeTab = tabId;
    document.querySelectorAll('.nav-link').forEach(link => {
      link.classList.toggle('active', link.getAttribute('data-tab') === tabId);
    });
    document.querySelectorAll('.content-section').forEach(section => {
      section.classList.toggle('active', section.id === `${tabId}Section`);
    });
    this.render();
  },

  // Set selectors dropdown data
  populateCalendarSelectors() {
    const yearSelect = document.getElementById('yearSelect');
    const monthSelect = document.getElementById('monthSelect');
    
    // Years range (Current to 5 years forward)
    yearSelect.innerHTML = '';
    const startYear = 2026;
    for (let y = startYear; y <= startYear + 5; y++) {
      const opt = document.createElement('option');
      opt.value = y;
      opt.textContent = y;
      yearSelect.appendChild(opt);
    }

    // Months List
    monthSelect.innerHTML = '';
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    months.forEach((m, idx) => {
      const opt = document.createElement('option');
      opt.value = idx;
      opt.textContent = m;
      monthSelect.appendChild(opt);
    });

    // Sync selectors with current active date
    yearSelect.value = this.currentDate.getFullYear();
    monthSelect.value = this.currentDate.getMonth();
  },

  onSelectorChange() {
    const year = parseInt(document.getElementById('yearSelect').value);
    const month = parseInt(document.getElementById('monthSelect').value);
    this.currentDate = new Date(year, month, 1);
    this.render();
  },

  adjustPeriod(delta) {
    if (this.calendarViewMode === 'month') {
      this.currentDate.setMonth(this.currentDate.getMonth() + delta);
    } else if (this.calendarViewMode === 'week') {
      this.currentDate.setDate(this.currentDate.getDate() + (delta * 7));
    } else if (this.calendarViewMode === 'day') {
      this.currentDate.setDate(this.currentDate.getDate() + delta);
    }
    document.getElementById('yearSelect').value = this.currentDate.getFullYear();
    document.getElementById('monthSelect').value = this.currentDate.getMonth();
    this.render();
  },

  closeAllModals() {
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.classList.remove('active');
    });
    this.selectedOverrideChore = null;
    this.selectedOverrideDate = null;
  },

  openModal(modalId) {
    this.closeAllModals();
    document.getElementById(modalId).classList.add('active');
  },

  // Compile all schedules & renders components
  render() {
    if (this.activeTab === 'calendar') {
      this.renderCalendar();
    } else if (this.activeTab === 'chores') {
      this.renderChores();
    } else if (this.activeTab === 'monthlyGroups') {
      this.renderMonthlyGroups();
    } else if (this.activeTab === 'users') {
      this.renderUsers();
    }
  },

  // --- Calendar Section Rendering ---
  renderCalendar() {
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    const dateStr = dateUtils.formatLocalDate(this.currentDate);

    const container = document.querySelector('.calendar-container');
    const grid = document.getElementById('calendarGrid');
    
    grid.innerHTML = '';
    
    // Reset view classes
    grid.className = 'calendar-grid';
    container.classList.remove('view-day-active');

    if (this.calendarViewMode === 'month') {
      grid.classList.add('view-month');
      this.renderMonthlyGrid(grid, year, month);
    } else if (this.calendarViewMode === 'week') {
      grid.classList.add('view-week');
      this.renderWeeklyGrid(grid);
    } else if (this.calendarViewMode === 'day') {
      grid.classList.add('view-day');
      container.classList.add('view-day-active');
      this.renderDailyFocus(grid, dateStr);
    }
  },

  renderMonthlyGrid(grid, year, month) {
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sun
    const totalDays = new Date(year, month + 1, 0).getDate();
    const prevMonthTotalDays = new Date(year, month, 0).getDate();

    const today = new Date();
    const todayStr = dateUtils.formatLocalDate(today);
    const totalSlots = 42;

    for (let i = 0; i < totalSlots; i++) {
      const cell = document.createElement('div');
      cell.className = 'calendar-day-cell';
      
      let dayNumber;
      let targetDate;
      let isOtherMonth = false;

      if (i < firstDayIndex) {
        dayNumber = prevMonthTotalDays - (firstDayIndex - i - 1);
        targetDate = new Date(year, month - 1, dayNumber);
        isOtherMonth = true;
      } else if (i >= firstDayIndex && i < firstDayIndex + totalDays) {
        dayNumber = i - firstDayIndex + 1;
        targetDate = new Date(year, month, dayNumber);
      } else {
        dayNumber = i - (firstDayIndex + totalDays) + 1;
        targetDate = new Date(year, month + 1, dayNumber);
        isOtherMonth = true;
      }

      const dateStr = dateUtils.formatLocalDate(targetDate);
      cell.setAttribute('data-date', dateStr);
      
      if (isOtherMonth) {
        cell.classList.add('other-month');
      }
      if (dateStr === todayStr) {
        cell.classList.add('today');
      }

      const dayNumHeader = document.createElement('div');
      dayNumHeader.className = 'day-number';
      
      if (dateStr === todayStr) {
        dayNumHeader.innerHTML = `<span>${dayNumber}</span><span class="day-number-badge">★</span>`;
      } else {
        dayNumHeader.textContent = dayNumber;
      }
      cell.appendChild(dayNumHeader);

      const choresContainer = document.createElement('div');
      choresContainer.className = 'day-chores-list';

      if (!isOtherMonth) {
        this.populateChoresForDay(choresContainer, dateStr, targetDate.getDay());
      }
      
      cell.appendChild(choresContainer);
      grid.appendChild(cell);
    }
  },

  renderWeeklyGrid(grid) {
    const today = new Date();
    const todayStr = dateUtils.formatLocalDate(today);

    // Calculate Sunday of the week containing this.currentDate
    const sun = new Date(this.currentDate);
    sun.setDate(this.currentDate.getDate() - this.currentDate.getDay());

    // Render 7 days
    for (let i = 0; i < 7; i++) {
      const targetDate = new Date(sun);
      targetDate.setDate(sun.getDate() + i);
      const dateStr = dateUtils.formatLocalDate(targetDate);

      const cell = document.createElement('div');
      cell.className = 'calendar-day-cell';
      cell.setAttribute('data-date', dateStr);

      if (dateStr === todayStr) {
        cell.classList.add('today');
      }

      const dayOfWeekName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][i];
      const dayNum = targetDate.getDate();
      const monthNum = targetDate.getMonth() + 1;

      const dayNumHeader = document.createElement('div');
      dayNumHeader.className = 'day-number';
      dayNumHeader.innerHTML = `
        <span>${dayOfWeekName} ${monthNum}/${dayNum}</span>
        ${dateStr === todayStr ? '<span class="day-number-badge">★</span>' : ''}
      `;
      cell.appendChild(dayNumHeader);

      const choresContainer = document.createElement('div');
      choresContainer.className = 'day-chores-list';

      this.populateChoresForDay(choresContainer, dateStr, i);

      cell.appendChild(choresContainer);
      grid.appendChild(cell);
    }
  },

  renderDailyFocus(grid, dateStr) {
    const today = new Date();
    const todayStr = dateUtils.formatLocalDate(today);
    const dayOfWeek = new Date(dateStr + 'T00:00:00').getDay();
    const formattedDate = new Date(dateStr + 'T00:00:00').toLocaleDateString(undefined, {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    // Outer Dashboard Card
    const card = document.createElement('div');
    card.className = 'glass-panel daily-focus-card';

    // Header Row
    const headerRow = document.createElement('div');
    headerRow.className = 'daily-focus-header-row';
    headerRow.innerHTML = `
      <h2 class="daily-date-title">${formattedDate}</h2>
      ${dateStr === todayStr ? '<span class="badge badge-primary">TODAY</span>' : ''}
    `;
    card.appendChild(headerRow);

    // Collect Scheduled Chores for this day
    const dayChores = [];

    // 1. Core chores
    state.chores.forEach(chore => {
      if (!chore.daysOfWeek.includes(dayOfWeek)) return;
      const assignee = scheduler.getAssigneeForChore(chore, dateStr);
      if (!assignee) return;
      const completionKey = `${dateStr}_${chore.id}`;
      dayChores.push({
        id: chore.id,
        name: chore.name,
        frequency: chore.frequency,
        assignee,
        completionKey,
        isDone: !!state.completions[completionKey],
        type: 'chore',
        ref: chore
      });
    });

    // 2. Group Chores
    state.monthlyGroups.forEach(group => {
      if (!dateUtils.isMonthlyGroupDate(group, dateStr)) return;
      group.chores.forEach((choreName, idx) => {
        const assignee = scheduler.getAssigneeForGroupChore(group, idx, dateStr);
        if (!assignee) return;
        const completionKey = `${dateStr}_${group.id}_${idx}`;
        dayChores.push({
          id: `${group.id}_${idx}`,
          name: choreName,
          frequency: 'monthly',
          assignee,
          completionKey,
          isDone: !!state.completions[completionKey],
          type: 'group',
          ref: group,
          index: idx
        });
      });
    });

    if (dayChores.length === 0) {
      // Empty state
      const emptyState = document.createElement('div');
      emptyState.className = 'empty-daily-state';
      emptyState.innerHTML = `
        <div class="empty-daily-icon">🎉</div>
        <div class="empty-daily-title">No Chores Scheduled</div>
        <div class="empty-daily-subtitle">Enjoy your free day! Nothing is on the list for this date.</div>
      `;
      card.appendChild(emptyState);
      grid.appendChild(card);
      return;
    }

    // Calculate Completion Statistics
    const doneCount = dayChores.filter(c => c.isDone).length;
    const totalCount = dayChores.length;
    const percentage = Math.round((doneCount / totalCount) * 100);

    // Progress Section
    const progressSection = document.createElement('div');
    progressSection.className = 'daily-progress-container';
    progressSection.style.margin = '0.5rem 0 2rem 0';
    progressSection.innerHTML = `
      <div class="daily-progress-text-row">
        <span class="daily-progress-label">Chore Completion</span>
        <span class="daily-progress-percentage">${doneCount} of ${totalCount} Chores (${percentage}%)</span>
      </div>
      <div class="progress-bar-bg">
        <div class="progress-bar-fill" style="width: ${percentage}%;"></div>
      </div>
    `;
    card.appendChild(progressSection);

    // Chores List Container
    const listContainer = document.createElement('div');
    listContainer.className = 'daily-chores-list-large';

    dayChores.forEach(item => {
      const choreCard = document.createElement('div');
      choreCard.className = `daily-chore-card-large ${item.isDone ? 'completed' : ''}`;
      
      const freqLabel = item.frequency === 'daily' ? 'Daily' 
        : item.frequency === 'weekly' ? 'Weekly' : 'Monthly Cycle';

      choreCard.innerHTML = `
        <div class="large-checkbox" aria-label="Mark completed">
          <span class="large-checkbox-check">✓</span>
        </div>
        <div class="daily-chore-info">
          <div class="daily-chore-title-row">
            <span class="daily-chore-title">${item.name}</span>
          </div>
          <div class="daily-chore-meta">
            <span class="badge badge-sm">${freqLabel}</span>
          </div>
        </div>
        <div class="daily-chore-assignee-row" title="Click to reassign">
          <span class="avatar avatar-md" style="background-color: ${item.assignee.color};">${item.assignee.name.charAt(0)}</span>
          <span class="daily-chore-assignee-name">${item.assignee.name}</span>
        </div>
      `;

      // Event: Toggle completion when clicking checkbox or text info
      choreCard.addEventListener('click', (e) => {
        // If clicked on the assignee avatar/row, open reassign dialog
        if (e.target.closest('.daily-chore-assignee-row')) {
          e.stopPropagation();
          if (item.type === 'chore') {
            this.openOverrideModal(item.ref, null, null, dateStr);
          } else {
            this.openOverrideModal(null, item.ref, item.index, dateStr);
          }
        } else {
          // Toggle completion
          state.completions[item.completionKey] = !item.isDone;
          store.save();
          this.render();
        }
      });

      listContainer.appendChild(choreCard);
    });

    card.appendChild(listContainer);
    grid.appendChild(card);
  },

  // Populate day cell with scheduled chores
  populateChoresForDay(container, dateStr, dayOfWeek) {
    // 1. Check Standard Chores (Daily & Weekly)
    state.chores.forEach(chore => {
      // Must be scheduled for this day
      if (!chore.daysOfWeek.includes(dayOfWeek)) return;

      const assignee = scheduler.getAssigneeForChore(chore, dateStr);
      if (!assignee) return;

      const completionKey = `${dateStr}_${chore.id}`;
      const isDone = !!state.completions[completionKey];

      const card = this.createChoreBadge(chore.name, assignee, isDone, () => {
        // Toggle completion status
        state.completions[completionKey] = !isDone;
        store.save();
        this.render();
      }, (e) => {
        e.stopPropagation();
        this.openOverrideModal(chore, null, null, dateStr);
      });

      container.appendChild(card);
    });

    // 2. Check Monthly Deep Clean Groups
    state.monthlyGroups.forEach(group => {
      if (!dateUtils.isMonthlyGroupDate(group, dateStr)) return;

      // Group is scheduled today! Add all chores in group
      group.chores.forEach((choreName, idx) => {
        const assignee = scheduler.getAssigneeForGroupChore(group, idx, dateStr);
        if (!assignee) return;

        const completionKey = `${dateStr}_${group.id}_${idx}`;
        const isDone = !!state.completions[completionKey];

        const card = this.createChoreBadge(choreName, assignee, isDone, () => {
          state.completions[completionKey] = !isDone;
          store.save();
          this.render();
        }, (e) => {
          e.stopPropagation();
          this.openOverrideModal(null, group, idx, dateStr);
        });

        container.appendChild(card);
      });
    });
  },

  // Create a clickable chore card for calendar cell
  createChoreBadge(name, assignee, isDone, onToggleComplete, onReassignClick) {
    const card = document.createElement('div');
    card.className = `day-chore-card ${isDone ? 'completed' : ''}`;
    card.title = `Chore: ${name} | Assigned to: ${assignee.name} (Click to toggle status, double-click/right-click to reassign)`;

    // Checkbox indicator
    const checkbox = document.createElement('div');
    checkbox.style.width = '10px';
    checkbox.style.height = '10px';
    checkbox.style.borderRadius = '2px';
    checkbox.style.border = '1.2px solid ' + (isDone ? '#10b981' : 'rgba(255,255,255,0.4)');
    checkbox.style.background = isDone ? '#10b981' : 'transparent';
    checkbox.style.flexShrink = '0';
    checkbox.style.display = 'flex';
    checkbox.style.alignItems = 'center';
    checkbox.style.justifyContent = 'center';
    if (isDone) {
      checkbox.innerHTML = `<span style="color:white; font-size:6px; font-weight:bold;">✓</span>`;
    }

    const titleEl = document.createElement('span');
    titleEl.className = 'day-chore-name';
    titleEl.textContent = name;

    const avatar = document.createElement('span');
    avatar.className = 'avatar';
    avatar.style.backgroundColor = assignee.color;
    avatar.textContent = assignee.name.charAt(0).toUpperCase();

    card.appendChild(checkbox);
    card.appendChild(titleEl);
    card.appendChild(avatar);

    // Action listener
    card.addEventListener('click', (e) => {
      // If we clicked directly on avatar, open reassign dialog
      if (e.target.closest('.avatar')) {
        onReassignClick(e);
      } else {
        onToggleComplete();
      }
    });

    // Fallback: Double click on card opens reassign
    card.addEventListener('dblclick', onReassignClick);

    return card;
  },

  // Open the manual assignee override modal
  openOverrideModal(chore, group, groupChoreIdx, dateStr) {
    this.selectedOverrideDate = dateStr;
    const select = document.getElementById('overrideAssigneeSelect');
    select.innerHTML = '<option value="">-- Keep Deterministic Rotation --</option>';

    // Load users list
    Object.values(state.users).forEach(user => {
      const opt = document.createElement('option');
      opt.value = user.id;
      opt.textContent = user.name;
      select.appendChild(opt);
    });

    let activeOverrideVal = "";
    if (chore) {
      this.selectedOverrideChore = { type: 'chore', data: chore };
      document.getElementById('overrideChoreName').textContent = chore.name;
      activeOverrideVal = state.overrides[`${dateStr}_${chore.id}`] || "";
    } else if (group) {
      this.selectedOverrideChore = { type: 'group', data: group, index: groupChoreIdx };
      document.getElementById('overrideChoreName').textContent = `${group.chores[groupChoreIdx]} (${group.name})`;
      activeOverrideVal = state.overrides[`${dateStr}_${group.id}_${groupChoreIdx}`] || "";
    }

    document.getElementById('overrideChoreDate').textContent = new Date(dateStr + 'T00:00:00').toLocaleDateString(undefined, {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    select.value = activeOverrideVal;
    this.openModal('reassignModal');
  },

  // --- Chores Section Rendering ---
  renderChores() {
    const grid = document.getElementById('choresGrid');
    grid.innerHTML = '';

    state.chores.forEach(chore => {
      const card = document.createElement('div');
      card.className = 'glass-card chore-detail-card';

      // Build weekday strings
      const daysStr = chore.frequency === 'daily' 
        ? 'Everyday' 
        : chore.daysOfWeek.map(d => ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d]).join(', ');

      const poolUsers = chore.rotationPool.map(uid => state.users[uid]).filter(Boolean);
      const startingUser = poolUsers[chore.startIndex] ? poolUsers[chore.startIndex].name : 'N/A';

      // Visual pool avatars
      let rotationHTML = '';
      poolUsers.forEach((user, idx) => {
        rotationHTML += `<span class="avatar" style="background-color: ${user.color};" title="${user.name}">${user.name.charAt(0)}</span>`;
        if (idx < poolUsers.length - 1) {
          rotationHTML += `<span class="rotation-arrow">→</span>`;
        }
      });

      card.innerHTML = `
        <div class="chore-card-header">
          <div>
            <h3 class="chore-card-title">${chore.name}</h3>
            <div class="chore-badges" style="margin-top: 0.5rem;">
              <span class="badge badge-primary">${chore.frequency.toUpperCase()}</span>
              <span class="badge badge-success">${daysStr}</span>
            </div>
          </div>
        </div>
        <div>
          <div class="chore-section-label">Rotation Order</div>
          <div class="rotation-pool-visual">
            ${rotationHTML}
          </div>
        </div>
        <div style="font-size: 0.8rem; color: var(--text-secondary); display: grid; gap: 0.25rem;">
          <div><strong>Rotation Start Date:</strong> ${chore.startDate}</div>
          <div><strong>Starting Person:</strong> ${startingUser}</div>
        </div>
        <div class="chore-card-footer">
          <button class="btn btn-secondary btn-sm" onclick="ui.editChore('${chore.id}')">Edit</button>
          <button class="btn btn-danger btn-sm" onclick="ui.deleteChore('${chore.id}')">Delete</button>
        </div>
      `;
      grid.appendChild(card);
    });
  },

  // --- Monthly Group Rotations Rendering ---
  renderMonthlyGroups() {
    const grid = document.getElementById('monthlyGroupsGrid');
    grid.innerHTML = '';

    state.monthlyGroups.forEach(group => {
      const card = document.createElement('div');
      card.className = 'glass-card chore-detail-card';

      const poolUsers = group.rotationPool.map(uid => state.users[uid]).filter(Boolean);
      const dayName = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][group.dayOfWeek];
      const weekLabel = ['1st', '2nd', '3rd', '4th', 'Last'][group.weekIndex];

      let poolAvatars = poolUsers.map(user => 
        `<span class="avatar" style="background-color: ${user.color};" title="${user.name}">${user.name.charAt(0)}</span>`
      ).join(' ');

      let choresHTML = group.chores.map(c => `<div class="badge badge-primary">${c}</div>`).join(' ');

      card.innerHTML = `
        <div class="chore-card-header">
          <div>
            <h3 class="chore-card-title">${group.name}</h3>
            <div class="chore-badges" style="margin-top: 0.5rem;">
              <span class="badge badge-warning">Monthly Cycle</span>
              <span class="badge badge-success">${weekLabel} ${dayName}</span>
            </div>
          </div>
        </div>
        <div>
          <div class="chore-section-label">Chores in Group</div>
          <div style="display: flex; flex-wrap: wrap; gap: 0.35rem; margin-top: 0.25rem;">
            ${choresHTML}
          </div>
        </div>
        <div>
          <div class="chore-section-label">Rotation Pool</div>
          <div class="rotation-pool-visual" style="margin-top: 0.25rem;">
            ${poolAvatars}
          </div>
        </div>
        <div style="font-size: 0.8rem; color: var(--text-secondary); display: grid; gap: 0.25rem;">
          <div><strong>Rotation Start Month:</strong> ${group.startMonth}</div>
        </div>
        <div class="chore-card-footer">
          <button class="btn btn-danger btn-sm" onclick="ui.deleteMonthlyGroup('${group.id}')">Delete Group</button>
        </div>
      `;
      grid.appendChild(card);
    });
  },

  // --- Users Section Rendering ---
  renderUsers() {
    const grid = document.getElementById('usersGrid');
    grid.innerHTML = '';

    Object.values(state.users).forEach(user => {
      const card = document.createElement('div');
      card.className = 'glass-panel user-card';

      card.innerHTML = `
        <span class="avatar avatar-md" style="background-color: ${user.color}; font-size: 1.1rem; font-weight: 800;">
          ${user.name.charAt(0).toUpperCase()}
        </span>
        <div class="user-card-info">
          <div class="user-card-name">${user.name}</div>
        </div>
        <div class="user-card-actions">
          <button class="btn btn-danger btn-sm btn-icon" title="Remove User" onclick="ui.deleteUser('${user.id}')">
            <svg style="width:16px; height:16px; stroke:white;" viewBox="0 0 24 24" fill="none" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"></path></svg>
          </button>
        </div>
      `;
      grid.appendChild(card);
    });
  },

  // --- Core Action Form Bindings & Events ---
  bindForms() {
    // 1. Override Assignee Action Save
    document.getElementById('saveOverrideBtn').addEventListener('click', () => {
      const select = document.getElementById('overrideAssigneeSelect');
      const selectedUserId = select.value;
      const dateStr = this.selectedOverrideDate;
      const target = this.selectedOverrideChore;

      if (!target || !dateStr) return;

      let overrideKey = "";
      if (target.type === 'chore') {
        overrideKey = `${dateStr}_${target.data.id}`;
      } else if (target.type === 'group') {
        overrideKey = `${dateStr}_${target.data.id}_${target.index}`;
      }

      if (selectedUserId) {
        state.overrides[overrideKey] = selectedUserId;
      } else {
        delete state.overrides[overrideKey]; // Clears back to math-based rotation
      }

      store.save();
      this.closeAllModals();
      this.render();
    });

    // 2. Add/Edit Chore Modal Trigger setup
    document.getElementById('addChoreBtn').addEventListener('click', () => {
      document.getElementById('choreFormTitle').textContent = 'Add Household Chore';
      document.getElementById('choreId').value = '';
      document.getElementById('choreName').value = '';
      document.getElementById('choreFrequency').value = 'weekly';
      document.getElementById('choreStartDate').value = dateUtils.formatLocalDate(new Date());
      
      // Default standard weekly checkboxes
      document.querySelectorAll('#weeklyDaysGroup input').forEach(box => box.checked = false);
      document.getElementById('weeklyDaysGroup').style.display = 'flex';
      
      this.renderChoreFormPoolSelection();
      this.openModal('choreModal');
    });

    // Toggle day checklist based on Frequency dropdown
    document.getElementById('choreFrequency').addEventListener('change', (e) => {
      const val = e.target.value;
      document.getElementById('weeklyDaysGroup').style.display = val === 'weekly' ? 'flex' : 'none';
    });

    // Save Chore Action
    document.getElementById('saveChoreBtn').addEventListener('click', () => {
      const id = document.getElementById('choreId').value;
      const name = document.getElementById('choreName').value.trim();
      const frequency = document.getElementById('choreFrequency').value;
      const startDate = document.getElementById('choreStartDate').value;

      if (!name) {
        alert('Please enter a chore name');
        return;
      }

      // Read active selected days
      const daysOfWeek = [];
      if (frequency === 'weekly') {
        document.querySelectorAll('#weeklyDaysGroup input:checked').forEach(box => {
          daysOfWeek.push(parseInt(box.value));
        });
        if (daysOfWeek.length === 0) {
          alert('Please select at least one active day for weekly chores');
          return;
        }
      } else {
        // Daily is active every day
        daysOfWeek.push(0, 1, 2, 3, 4, 5, 6);
      }

      // Assemble selected Pool & Order
      const rotationPool = [];
      document.querySelectorAll('#formPoolList .user-select-item.selected').forEach(item => {
        rotationPool.push(item.getAttribute('data-userid'));
      });

      if (rotationPool.length === 0) {
        alert('Please select at least one person in the rotation pool');
        return;
      }

      const startIndex = parseInt(document.getElementById('choreStartIndex').value) || 0;

      const newChore = {
        id: id || `c_${Date.now()}`,
        name,
        frequency,
        daysOfWeek,
        rotationPool,
        startIndex,
        startDate
      };

      if (id) {
        // Edit Mode: replace in state
        const index = state.chores.findIndex(c => c.id === id);
        if (index !== -1) {
          state.chores[index] = newChore;
        }
      } else {
        // Add Mode
        state.chores.push(newChore);
      }

      store.save();
      this.closeAllModals();
      this.render();
    });

    // 3. User Modal Setup
    document.getElementById('addUserBtn').addEventListener('click', () => {
      document.getElementById('userName').value = '';
      
      // Render color palette options
      const container = document.getElementById('userColorPalette');
      container.innerHTML = '';
      PALETTE.forEach((color, idx) => {
        const item = document.createElement('span');
        item.className = `avatar avatar-md avatar-selector-item ${idx === 0 ? 'selected' : ''}`;
        item.style.backgroundColor = color;
        item.setAttribute('data-color', color);
        item.addEventListener('click', () => {
          container.querySelectorAll('.avatar-selector-item').forEach(c => c.classList.remove('selected'));
          item.classList.add('selected');
        });
        container.appendChild(item);
      });

      this.openModal('userModal');
    });

    // Save User action
    document.getElementById('saveUserBtn').addEventListener('click', () => {
      const name = document.getElementById('userName').value.trim();
      const selectedColorEl = document.querySelector('#userColorPalette .avatar-selector-item.selected');
      const color = selectedColorEl ? selectedColorEl.getAttribute('data-color') : PALETTE[0];

      if (!name) {
        alert('Please enter a user name');
        return;
      }

      const id = `u_${Date.now()}`;
      state.users[id] = { id, name, color };
      store.save();
      
      this.closeAllModals();
      this.render();
    });

    // 4. Monthly Deep Clean Group Creation Bindings
    document.getElementById('addGroupBtn').addEventListener('click', () => {
      document.getElementById('groupName').value = 'Monthly Deep Clean';
      document.getElementById('groupStartMonth').value = '2026-06';
      document.getElementById('groupWeekIndex').value = 1; // 2nd
      document.getElementById('groupDayOfWeek').value = 6;  // Sat

      // Render monthly chores checkboxes (only chores with monthly capabilities or we write custom ones)
      const choresContainer = document.getElementById('groupChoresSelectContainer');
      choresContainer.innerHTML = '';
      
      // For groups, we allow typing comma-separated chore names as it matches the HLD custom structure perfectly!
      const input = document.createElement('textarea');
      input.id = 'groupChoresInput';
      input.className = 'form-control';
      input.rows = 3;
      input.placeholder = 'Enter monthly chores, one per line (e.g.)\nClean Bathrooms\nVacuum Rugs\nVacuum Stairs';
      input.value = 'Clean Bathrooms\nVacuum Rugs\nVacuum Stairs';
      choresContainer.appendChild(input);

      // Render rotation pool selectors
      this.renderGroupFormPoolSelection();
      this.openModal('groupModal');
    });

    // Save Monthly Group action
    document.getElementById('saveGroupBtn').addEventListener('click', () => {
      const name = document.getElementById('groupName').value.trim();
      const rawChores = document.getElementById('groupChoresInput').value;
      const startMonth = document.getElementById('groupStartMonth').value;
      const weekIndex = parseInt(document.getElementById('groupWeekIndex').value);
      const dayOfWeek = parseInt(document.getElementById('groupDayOfWeek').value);

      const chores = rawChores.split('\n').map(c => c.trim()).filter(c => c.length > 0);

      if (!name) {
        alert('Please enter a group name');
        return;
      }
      if (chores.length === 0) {
        alert('Please enter at least one chore name');
        return;
      }

      const rotationPool = [];
      document.querySelectorAll('#formGroupPoolList .user-select-item.selected').forEach(item => {
        rotationPool.push(item.getAttribute('data-userid'));
      });

      if (rotationPool.length === 0) {
        alert('Please select at least one person in the rotation pool');
        return;
      }

      const newGroup = {
        id: `g_${Date.now()}`,
        name,
        chores,
        rotationPool,
        startMonth,
        weekIndex,
        dayOfWeek
      };

      state.monthlyGroups.push(newGroup);
      store.save();
      this.closeAllModals();
      this.render();
    });
  },

  // Edit Single Standard Chore
  editChore(id) {
    const chore = state.chores.find(c => c.id === id);
    if (!chore) return;

    document.getElementById('choreFormTitle').textContent = 'Edit Chore Settings';
    document.getElementById('choreId').value = chore.id;
    document.getElementById('choreName').value = chore.name;
    document.getElementById('choreFrequency').value = chore.frequency;
    document.getElementById('choreStartDate').value = chore.startDate;

    // Toggle weekly block
    document.getElementById('weeklyDaysGroup').style.display = chore.frequency === 'weekly' ? 'flex' : 'none';
    document.querySelectorAll('#weeklyDaysGroup input').forEach(box => {
      box.checked = chore.daysOfWeek.includes(parseInt(box.value));
    });

    // Pool select list
    this.renderChoreFormPoolSelection(chore.rotationPool, chore.startIndex);
    this.openModal('choreModal');
  },

  // Remove Chore action
  deleteChore(id) {
    if (confirm('Are you sure you want to delete this chore? Historical status will be removed.')) {
      state.chores = state.chores.filter(c => c.id !== id);
      
      // Cleanup orphan overrides / completions
      Object.keys(state.overrides).forEach(key => {
        if (key.endsWith(`_${id}`)) delete state.overrides[key];
      });
      Object.keys(state.completions).forEach(key => {
        if (key.endsWith(`_${id}`)) delete state.completions[key];
      });

      store.save();
      this.render();
    }
  },

  // Remove monthly rotation group
  deleteMonthlyGroup(id) {
    if (confirm('Are you sure you want to delete this Monthly Group rotation?')) {
      state.monthlyGroups = state.monthlyGroups.filter(g => g.id !== id);
      store.save();
      this.render();
    }
  },

  // Delete User
  deleteUser(id) {
    if (confirm('Are you sure you want to delete this user? They will be removed from all active rotation pools.')) {
      delete state.users[id];

      // Remove from standard chores pools
      state.chores.forEach(chore => {
        chore.rotationPool = chore.rotationPool.filter(uid => uid !== id);
        if (chore.startIndex >= chore.rotationPool.length) {
          chore.startIndex = 0;
        }
      });

      // Remove from monthly groups pools
      state.monthlyGroups.forEach(group => {
        group.rotationPool = group.rotationPool.filter(uid => uid !== id);
      });

      store.save();
      this.render();
    }
  },

  // Render pool selections with ordering capability in Forms (Chores Form)
  renderChoreFormPoolSelection(activePool = [], activeStartIndex = 0) {
    const list = document.getElementById('formPoolList');
    list.innerHTML = '';

    const sortedUsers = Object.values(state.users);
    
    // Sort so already active users are placed on top in their specific pool order
    if (activePool.length > 0) {
      sortedUsers.sort((a, b) => {
        const idxA = activePool.indexOf(a.id);
        const idxB = activePool.indexOf(b.id);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return 0;
      });
    }

    sortedUsers.forEach(user => {
      const inPool = activePool.length > 0 ? activePool.includes(user.id) : true;
      const orderNum = activePool.indexOf(user.id);

      const item = document.createElement('div');
      item.className = `user-select-item ${inPool ? 'selected' : ''}`;
      item.setAttribute('data-userid', user.id);
      
      item.innerHTML = `
        <span class="drag-handle">☰</span>
        <span class="select-checkbox"></span>
        <span class="avatar" style="background-color: ${user.color}; margin: 0 0.25rem;">${user.name.charAt(0)}</span>
        <span class="item-name">${user.name}</span>
        <span class="item-order-badge">${orderNum !== -1 ? orderNum + 1 : ''}</span>
      `;

      item.addEventListener('click', () => {
        item.classList.toggle('selected');
        this.updateFormPoolOrderBadges('formPoolList');
        this.populateStartIndexOptions('formPoolList', 'choreStartIndex', activeStartIndex);
      });

      list.appendChild(item);
    });

    // Make pool list sortable (Basic drag & drop layout ordering)
    this.setupDragAndDropSorting('formPoolList', () => {
      this.updateFormPoolOrderBadges('formPoolList');
      this.populateStartIndexOptions('formPoolList', 'choreStartIndex', activeStartIndex);
    });

    this.updateFormPoolOrderBadges('formPoolList');
    this.populateStartIndexOptions('formPoolList', 'choreStartIndex', activeStartIndex);
  },

  // Render pool selector for Monthly Group Form
  renderGroupFormPoolSelection(activePool = []) {
    const list = document.getElementById('formGroupPoolList');
    list.innerHTML = '';

    Object.values(state.users).forEach(user => {
      const inPool = activePool.length > 0 ? activePool.includes(user.id) : true;
      const orderNum = activePool.indexOf(user.id);

      const item = document.createElement('div');
      item.className = `user-select-item ${inPool ? 'selected' : ''}`;
      item.setAttribute('data-userid', user.id);
      
      item.innerHTML = `
        <span class="drag-handle">☰</span>
        <span class="select-checkbox"></span>
        <span class="avatar" style="background-color: ${user.color}; margin: 0 0.25rem;">${user.name.charAt(0)}</span>
        <span class="item-name">${user.name}</span>
        <span class="item-order-badge">${orderNum !== -1 ? orderNum + 1 : ''}</span>
      `;

      item.addEventListener('click', () => {
        item.classList.toggle('selected');
        this.updateFormPoolOrderBadges('formGroupPoolList');
      });

      list.appendChild(item);
    });

    this.setupDragAndDropSorting('formGroupPoolList', () => {
      this.updateFormPoolOrderBadges('formGroupPoolList');
    });

    this.updateFormPoolOrderBadges('formGroupPoolList');
  },

  // Setup simple drag and drop list reordering
  setupDragAndDropSorting(listId, onSortCompleted) {
    const list = document.getElementById(listId);
    let dragItem = null;

    list.querySelectorAll('.user-select-item').forEach(item => {
      item.draggable = true;

      item.addEventListener('dragstart', (e) => {
        dragItem = item;
        item.style.opacity = '0.4';
      });

      item.addEventListener('dragend', () => {
        dragItem = null;
        item.style.opacity = '1';
        onSortCompleted();
      });

      item.addEventListener('dragover', (e) => {
        e.preventDefault();
        const bounding = item.getBoundingClientRect();
        const offset = e.clientY - bounding.top - bounding.height / 2;
        if (offset < 0) {
          list.insertBefore(dragItem, item);
        } else {
          list.insertBefore(dragItem, item.nextSibling);
        }
      });
    });
  },

  updateFormPoolOrderBadges(listId) {
    let order = 1;
    document.querySelectorAll(`#${listId} .user-select-item`).forEach(item => {
      const badge = item.querySelector('.item-order-badge');
      if (item.classList.contains('selected')) {
        badge.textContent = order++;
      } else {
        badge.textContent = '';
      }
    });
  },

  populateStartIndexOptions(listId, selectId, defaultIndex = 0) {
    const select = document.getElementById(selectId);
    select.innerHTML = '';

    let selectedCount = 0;
    document.querySelectorAll(`#${listId} .user-select-item.selected`).forEach((item, idx) => {
      const name = item.querySelector('.item-name').textContent;
      const opt = document.createElement('option');
      opt.value = idx;
      opt.textContent = `${name} (Order ${idx + 1})`;
      select.appendChild(opt);
      selectedCount++;
    });

    if (selectedCount === 0) {
      const opt = document.createElement('option');
      opt.value = 0;
      opt.textContent = '-- Choose Pool Members First --';
      select.appendChild(opt);
    } else {
      select.value = defaultIndex < selectedCount ? defaultIndex : 0;
    }
  },

  // --- Export iCalendar (ICS) File Engine ---
  triggerIcsExport() {
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    const monthsNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    let icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Antigravity AI//Chore Chart Calendar Generator//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH'
    ];

    const totalDays = new Date(year, month + 1, 0).getDate();

    // Iterate day by day for current month
    for (let day = 1; day <= totalDays; day++) {
      const targetDate = new Date(year, month, day);
      const dateStr = dateUtils.formatLocalDate(targetDate);
      const dayOfWeek = targetDate.getDay();

      // Format ICS date tags (YYYYMMDD)
      const icsDate = dateStr.replace(/-/g, '');

      // 1. Core Chores
      state.chores.forEach(chore => {
        if (!chore.daysOfWeek.includes(dayOfWeek)) return;
        const assignee = scheduler.getAssigneeForChore(chore, dateStr);
        if (!assignee) return;

        icsContent.push(
          'BEGIN:VEVENT',
          `UID:${dateStr}_${chore.id}@chorechart.local`,
          `DTSTART;VALUE=DATE:${icsDate}`,
          `DTEND;VALUE=DATE:${this.getNextDayIcsString(targetDate)}`,
          `SUMMARY:[Chore] ${chore.name} - ${assignee.name}`,
          `DESCRIPTION:Household chore. Assigned to: ${assignee.name}. Frequency: ${chore.frequency}.`,
          'STATUS:CONFIRMED',
          'TRANSP:TRANSPARENT', // Free up calendar time
          'END:VEVENT'
        );
      });

      // 2. Group Chores
      state.monthlyGroups.forEach(group => {
        if (!dateUtils.isMonthlyGroupDate(group, dateStr)) return;

        group.chores.forEach((choreName, idx) => {
          const assignee = scheduler.getAssigneeForGroupChore(group, idx, dateStr);
          if (!assignee) return;

          icsContent.push(
            'BEGIN:VEVENT',
            `UID:${dateStr}_${group.id}_${idx}@chorechart.local`,
            `DTSTART;VALUE=DATE:${icsDate}`,
            `DTEND;VALUE=DATE:${this.getNextDayIcsString(targetDate)}`,
            `SUMMARY:[Chore] ${choreName} - ${assignee.name}`,
            `DESCRIPTION:Monthly Deep Clean. Assigned to: ${assignee.name}. Group: ${group.name}.`,
            'STATUS:CONFIRMED',
            'TRANSP:TRANSPARENT',
            'END:VEVENT'
          );
        });
      });
    }

    icsContent.push('END:VCALENDAR');

    // Trigger File Download
    const blob = new Blob([icsContent.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', `Chore_Schedule_${monthsNames[month]}_${year}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  getNextDayIcsString(date) {
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);
    return dateUtils.formatLocalDate(nextDay).replace(/-/g, '');
  }
};

// Expose UI to window for inline onclick attributes
window.ui = ui;

// Boot application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  ui.init();
});
