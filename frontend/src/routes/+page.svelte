<script lang="ts">
  import { onMount } from 'svelte';
  import NotificationBell from '$lib/NotificationBell.svelte';
  import { requestNotificationPermission, onForegroundMessage } from '$lib/firebase';
  import { API_URL } from '$lib/config';

  interface Subtask { id: number; title: string; status: string }
  interface Task { id: number; title: string; status: string; subtasks: Subtask[] }

  let activePage = $state('tasks');
  let tasks = $state<Task[]>([]);
  let expanded = $state<Record<number, boolean>>({});
  let username = $state('');
  let oldPassword = $state('');
  let newPassword = $state('');
  let settingsMsg = $state('');
  let settingsError = $state('');
  let mobileMenuOpen = $state(false);
  let darkMode = $state(false);

  function authHeaders() {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
    };
  }

  function logout() { localStorage.clear(); window.location.href = '/login'; }

  function navigate(page: string) {
    activePage = page;
    mobileMenuOpen = false;
  }

  async function loadTasks() {
    const token = localStorage.getItem('token');
    if (!token) { window.location.href = '/login'; return; }
    const res = await fetch(`${API_URL}/tasks`, { headers: authHeaders() });
    if (res.status === 401) { window.location.href = '/login'; return; }
    tasks = await res.json();
  }

  async function updateStatus(id: number, status: string) {
    await fetch(`${API_URL}/tasks/${id}`, {
      method: 'PATCH', headers: authHeaders(), body: JSON.stringify({ status }),
    });
    await loadTasks();
  }

  async function updateSubtaskStatus(id: number, status: string) {
    await fetch(`${API_URL}/tasks/subtasks/${id}`, {
      method: 'PATCH', headers: authHeaders(), body: JSON.stringify({ status }),
    });
    await loadTasks();
  }

  function toggleExpand(id: number) { expanded[id] = !expanded[id]; }

  async function changePassword() {
    settingsMsg = ''; settingsError = '';
    if (!oldPassword || !newPassword) { settingsError = 'Fill in both fields'; return; }
    const res = await fetch(`${API_URL}/auth/change-password`, {
      method: 'PATCH', headers: authHeaders(),
      body: JSON.stringify({ oldPassword, newPassword }),
    });
    if (!res.ok) { settingsError = 'Old password incorrect'; return; }
    settingsMsg = 'Password changed!'; oldPassword = ''; newPassword = '';
  }

  function toggleDark() {
    darkMode = !darkMode;
    localStorage.setItem('darkMode', String(darkMode));
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
  }

  let totalDone = $derived(tasks.filter(t => t.status === 'done').length);
  let totalInProgress = $derived(tasks.filter(t => t.status === 'in_progress').length);
  let totalTodo = $derived(tasks.filter(t => t.status === 'todo').length);

  onMount(async () => {
    username = localStorage.getItem('username') || '';
    const saved = localStorage.getItem('darkMode');
    if (saved === 'true') {
      darkMode = true;
      document.documentElement.setAttribute('data-theme', 'dark');
    }
    await loadTasks();
    const token = await requestNotificationPermission();
    if (token) {
      await fetch(`${API_URL}/auth/fcm-token`, {
        method: 'PATCH', headers: authHeaders(), body: JSON.stringify({ token }),
      });
    }
    onForegroundMessage((payload: any) => {
      alert(`🔔 ${payload.notification?.title}: ${payload.notification?.body}`);
    });
  });
</script>

<!-- Mobile overlay -->
{#if mobileMenuOpen}
  <div class="overlay" onclick={() => mobileMenuOpen = false}></div>
{/if}

<div class="shell">
  <!-- Sidebar -->
  <aside class="sidebar" class:mobile-open={mobileMenuOpen}>
    <div class="brand">
      <div class="brand-icon">✓</div>
      <span class="brand-name">TaskFlow</span>
    </div>

    <div class="profile">
      <div class="avatar-lg">{username[0]?.toUpperCase()}</div>
      <div>
        <p class="profile-name">{username}</p>
        <span class="user-badge">👤 Member</span>
      </div>
    </div>

    <nav class="nav">
      <button class="nav-btn" class:active={activePage==='tasks'} onclick={() => navigate('tasks')}>
        <i class="ti ti-checklist"></i><span>My Tasks</span>
      </button>
      <button class="nav-btn" class:active={activePage==='settings'} onclick={() => navigate('settings')}>
        <i class="ti ti-settings"></i><span>Settings</span>
      </button>
    </nav>

    <div class="sidebar-bottom">
      <button class="nav-btn danger" onclick={logout}>
        <i class="ti ti-logout"></i><span>Logout</span>
      </button>
    </div>
  </aside>

  <div class="content-wrap">
    <!-- Topbar -->
    <header class="topbar">
      <button class="toggle-btn" onclick={() => mobileMenuOpen = !mobileMenuOpen}>
        <i class="ti ti-menu-2"></i>
      </button>
      <h1 class="topbar-title">
        {activePage === 'tasks' ? 'My Tasks' : 'Settings'}
      </h1>
      <div class="topbar-right">
        <button class="icon-action" onclick={toggleDark} title="Toggle dark mode">
          <i class="ti ti-{darkMode ? 'sun' : 'moon'}"></i>
        </button>
        <NotificationBell />
        <div class="topbar-user">
          <div class="avatar-sm">{username[0]?.toUpperCase()}</div>
          <span class="username-label">{username}</span>
        </div>
      </div>
    </header>

    <main class="main">

      <!-- TASKS -->
      {#if activePage === 'tasks'}
        <div class="stats-row">
          <div class="stat-card">
            <div class="stat-icon-wrap purple"><i class="ti ti-checklist"></i></div>
            <div><p class="stat-label">Total</p><p class="stat-num">{tasks.length}</p></div>
          </div>
          <div class="stat-card">
            <div class="stat-icon-wrap amber"><i class="ti ti-clock"></i></div>
            <div><p class="stat-label">In progress</p><p class="stat-num amber">{totalInProgress}</p></div>
          </div>
          <div class="stat-card">
            <div class="stat-icon-wrap green"><i class="ti ti-circle-check"></i></div>
            <div><p class="stat-label">Done</p><p class="stat-num green">{totalDone}</p></div>
          </div>
          <div class="stat-card">
            <div class="stat-icon-wrap gray"><i class="ti ti-list"></i></div>
            <div><p class="stat-label">Todo</p><p class="stat-num">{totalTodo}</p></div>
          </div>
        </div>

        {#if tasks.length === 0}
          <div class="panel">
            <div class="empty-state">
              <i class="ti ti-mood-empty"></i>
              <p>No tasks assigned yet</p>
              <p class="empty-sub">Your team leader will assign tasks to you soon</p>
            </div>
          </div>
        {:else}
          <!-- Mobile task cards -->
          <div class="task-cards mobile-only">
            {#each tasks as task (task.id)}
              <div class="task-card">
                <div class="task-card-head">
                  <p class="task-card-title">{task.title}</p>
                  <button class="icon-btn" onclick={() => toggleExpand(task.id)}>
                    <i class="ti ti-chevron-{expanded[task.id] ? 'down' : 'right'}"></i>
                  </button>
                </div>
                <div class="task-card-row">
                  <span class="task-card-label">Status</span>
                  <select class="status-sel {task.status}" value={task.status}
                    onchange={(e) => updateStatus(task.id, e.currentTarget.value)}>
                    <option value="todo">Todo</option>
                    <option value="in_progress">In progress</option>
                    <option value="done">Done</option>
                  </select>
                </div>

                {#if expanded[task.id] && task.subtasks.length > 0}
                  <div class="subtask-list">
                    {#each task.subtasks as subtask (subtask.id)}
                      <div class="subtask-item">
                        <span class="subtask-title">↳ {subtask.title}</span>
                        <select class="status-sel {subtask.status}" value={subtask.status}
                          onchange={(e) => updateSubtaskStatus(subtask.id, e.currentTarget.value)}>
                          <option value="todo">Todo</option>
                          <option value="in_progress">In progress</option>
                          <option value="done">Done</option>
                        </select>
                      </div>
                    {/each}
                  </div>
                {/if}
              </div>
            {/each}
          </div>

          <!-- Desktop table -->
          <div class="panel desktop-only">
            <div class="panel-head"><i class="ti ti-list"></i> Assigned tasks</div>
            <div class="table-wrap">
              <table class="tbl">
                <thead>
                  <tr><th></th><th>Task</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {#each tasks as task (task.id)}
                    <tr class="task-row">
                      <td style="width:36px">
                        <button class="icon-btn" onclick={() => toggleExpand(task.id)}>
                          <i class="ti ti-chevron-{expanded[task.id] ? 'down' : 'right'}"></i>
                        </button>
                      </td>
                      <td><p class="task-title">{task.title}</p></td>
                      <td>
                        <select class="status-sel {task.status}" value={task.status}
                          onchange={(e) => updateStatus(task.id, e.currentTarget.value)}>
                          <option value="todo">Todo</option>
                          <option value="in_progress">In progress</option>
                          <option value="done">Done</option>
                        </select>
                      </td>
                    </tr>

                    {#if expanded[task.id]}
                      {#each task.subtasks as subtask (subtask.id)}
                        <tr class="sub-row">
                          <td></td>
                          <td style="font-size:13px;color:var(--text2);padding-left:1.5rem">
                            <i class="ti ti-corner-down-right"></i> {subtask.title}
                          </td>
                          <td>
                            <select class="status-sel {subtask.status}" value={subtask.status}
                              onchange={(e) => updateSubtaskStatus(subtask.id, e.currentTarget.value)}>
                              <option value="todo">Todo</option>
                              <option value="in_progress">In progress</option>
                              <option value="done">Done</option>
                            </select>
                          </td>
                        </tr>
                      {/each}
                    {/if}
                  {/each}
                </tbody>
              </table>
            </div>
          </div>
        {/if}
      {/if}

      <!-- SETTINGS -->
      {#if activePage === 'settings'}
        <div class="settings-grid">
          <div class="panel">
            <div class="panel-head"><i class="ti ti-lock"></i> Change password</div>
            <div class="settings-form">
              <div class="field">
                <label>Current password</label>
                <input bind:value={oldPassword} type="password" placeholder="••••••••" />
              </div>
              <div class="field">
                <label>New password</label>
                <input bind:value={newPassword} type="password" placeholder="••••••••" />
              </div>
              <button class="btn primary" onclick={changePassword}>
                <i class="ti ti-lock-check"></i> Update password
              </button>
              {#if settingsError}<p class="msg err"><i class="ti ti-alert-circle"></i> {settingsError}</p>{/if}
              {#if settingsMsg}<p class="msg ok"><i class="ti ti-circle-check"></i> {settingsMsg}</p>{/if}
            </div>
          </div>

          <div class="panel">
            <div class="panel-head"><i class="ti ti-palette"></i> Appearance</div>
            <div class="settings-form">
              <div class="dark-toggle-row">
                <div>
                  <p class="toggle-label">Dark mode</p>
                  <p class="toggle-sub">Switch between light and dark theme</p>
                </div>
                <button class="toggle-switch" class:on={darkMode} onclick={toggleDark}>
                  <span class="toggle-thumb"></span>
                </button>
              </div>
            </div>
          </div>

          <div class="panel">
            <div class="panel-head"><i class="ti ti-user-circle"></i> Account info</div>
            <div class="info-block">
              <div class="info-row">
                <span class="info-label"><i class="ti ti-user"></i> Username</span>
                <span class="info-val">{username}</span>
              </div>
              <div class="info-row">
                <span class="info-label"><i class="ti ti-shield"></i> Role</span>
                <span class="role-pill">Member</span>
              </div>
              <div class="info-row">
                <span class="info-label"><i class="ti ti-checklist"></i> My tasks</span>
                <span class="info-val">{tasks.length} tasks</span>
              </div>
            </div>
          </div>
        </div>
      {/if}

    </main>
  </div>
</div>

<style>
  :global(html[data-theme="dark"]) {
    --bg: #1e1e2e; --bg3: #313244; --border: #45475a;
    --text: #cdd6f4; --text2: #a6adc8; --text3: #6c7086;
    --card: #24273a; --panel: #1e2030;
  }
  :global(html) {
    --bg: #f0f2f5; --bg3: #f9fafb; --border: #e5e7eb;
    --text: #111827; --text2: #6b7280; --text3: #9ca3af;
    --card: #ffffff; --panel: #ffffff;
  }
  :global(body) { margin: 0; }

  /* Layout */
  .shell { display: flex; min-height: 100vh; background: var(--bg); font-family: sans-serif; }
  .content-wrap { flex: 1; display: flex; flex-direction: column; min-width: 0; }
  .main { padding: 1.5rem; flex: 1; }

  /* Overlay */
  .overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 99; }

  /* Sidebar */
  .sidebar {
    width: 220px; background: #1e1e2e; color: #cdd6f4;
    display: flex; flex-direction: column; flex-shrink: 0;
    position: sticky; top: 0; height: 100vh; z-index: 100;
  }

  .brand { display: flex; align-items: center; gap: 10px; padding: 1.25rem 1rem; border-bottom: 1px solid #313244; }
  .brand-icon { width: 32px; height: 32px; background: #7c3aed; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 16px; color: white; font-weight: bold; flex-shrink: 0; }
  .brand-name { font-size: 15px; font-weight: 600; color: #cdd6f4; }

  .profile { display: flex; align-items: center; gap: 10px; padding: 1rem; border-bottom: 1px solid #313244; }
  .avatar-lg { width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, #4f46e5, #7c3aed); display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 600; color: white; flex-shrink: 0; }
  .avatar-sm { width: 30px; height: 30px; border-radius: 50%; background: #4f46e5; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600; color: white; flex-shrink: 0; }
  .profile-name { margin: 0; font-size: 14px; font-weight: 500; color: #cdd6f4; }
  .user-badge { font-size: 11px; color: #89b4fa; }

  .nav { display: flex; flex-direction: column; gap: 2px; padding: 0.75rem 0.5rem; flex: 1; }
  .nav-btn { display: flex; align-items: center; gap: 10px; padding: 9px 12px; border-radius: 8px; font-size: 14px; color: #a6adc8; background: none; border: none; cursor: pointer; text-align: left; text-decoration: none; width: 100%; transition: background 0.15s; font-family: inherit; }
  .nav-btn i { font-size: 18px; }
  .nav-btn:hover { background: #313244; color: #cdd6f4; }
  .nav-btn.active { background: #7c3aed22; color: #cba6f7; }
  .nav-btn.danger { color: #f38ba8; }
  .nav-btn.danger:hover { background: #f38ba811; }
  .sidebar-bottom { padding: 0.5rem; border-top: 1px solid #313244; }

  /* Topbar */
  .topbar { height: 60px; background: var(--card); border-bottom: 1px solid var(--border); display: flex; align-items: center; gap: 0.75rem; padding: 0 1rem; position: sticky; top: 0; z-index: 10; }
  .toggle-btn { background: none; border: none; font-size: 20px; cursor: pointer; color: var(--text2); padding: 6px; border-radius: 6px; display: none; flex-shrink: 0; }
  .toggle-btn:hover { background: var(--bg3); }
  .topbar-title { margin: 0; font-size: 17px; font-weight: 600; color: var(--text); flex: 1; }
  .topbar-right { display: flex; align-items: center; gap: 0.75rem; flex-shrink: 0; }
  .topbar-user { display: flex; align-items: center; gap: 8px; font-size: 14px; color: var(--text); font-weight: 500; }
  .username-label { white-space: nowrap; }
  .icon-action { background: none; border: none; font-size: 18px; cursor: pointer; color: var(--text2); padding: 6px; border-radius: 6px; display: flex; }
  .icon-action:hover { background: var(--bg3); }

  /* Show/hide */
  .desktop-only { display: block; }
  .mobile-only { display: none; }

  /* Stats */
  .stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 1.5rem; }
  .stat-card { background: var(--card); border-radius: 12px; padding: 1.25rem; display: flex; align-items: center; gap: 1rem; border: 1px solid var(--border); }
  .stat-icon-wrap { width: 44px; height: 44px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0; }
  .stat-icon-wrap.purple { background: #f5f3ff; color: #7c3aed; }
  .stat-icon-wrap.amber { background: #fffbeb; color: #f59e0b; }
  .stat-icon-wrap.green { background: #f0fdf4; color: #22c55e; }
  .stat-icon-wrap.gray { background: var(--bg3); color: var(--text2); }
  .stat-label { margin: 0 0 2px; font-size: 12px; color: var(--text2); }
  .stat-num { margin: 0; font-size: 24px; font-weight: 700; color: var(--text); }
  .stat-num.amber { color: #f59e0b; }
  .stat-num.green { color: #22c55e; }

  /* Panel */
  .panel { background: var(--panel); border-radius: 12px; border: 1px solid var(--border); margin-bottom: 1rem; overflow: hidden; }
  .panel-head { display: flex; align-items: center; gap: 8px; padding: 1rem 1.25rem; font-size: 14px; font-weight: 600; color: var(--text); border-bottom: 1px solid var(--border); background: var(--bg3); }
  .panel-head i { font-size: 16px; color: #7c3aed; }

  /* Empty state */
  .empty-state { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 3rem; color: var(--text3); }
  .empty-state i { font-size: 48px; }
  .empty-state p { margin: 0; font-size: 14px; }
  .empty-sub { font-size: 12px !important; color: var(--text3); }

  /* Mobile task cards */
  .task-cards { display: flex; flex-direction: column; gap: 0.75rem; }
  .task-card { background: var(--panel); border: 1px solid var(--border); border-radius: 12px; padding: 1rem; }
  .task-card-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem; gap: 8px; }
  .task-card-title { margin: 0; font-size: 15px; font-weight: 600; color: var(--text); flex: 1; }
  .task-card-row { display: flex; align-items: center; justify-content: space-between; padding: 0.5rem 0; border-top: 1px solid var(--border); }
  .task-card-label { font-size: 12px; color: var(--text2); }
  .subtask-list { margin-top: 0.5rem; display: flex; flex-direction: column; gap: 6px; }
  .subtask-item { display: flex; align-items: center; justify-content: space-between; padding: 0.4rem 0.5rem; background: var(--bg3); border-radius: 8px; gap: 8px; }
  .subtask-title { font-size: 13px; color: var(--text2); flex: 1; }

  /* Table */
  .table-wrap { overflow-x: auto; }
  .tbl { width: 100%; border-collapse: collapse; font-size: 14px; }
  .tbl th { text-align: left; padding: 0.6rem 1rem; font-size: 12px; font-weight: 600; color: var(--text2); background: var(--bg3); border-bottom: 1px solid var(--border); text-transform: uppercase; letter-spacing: 0.04em; }
  .tbl td { padding: 0.75rem 1rem; border-bottom: 1px solid var(--border); color: var(--text); }
  .task-row:hover td { background: var(--bg3); }
  .sub-row td { background: var(--bg3); }
  .task-title { margin: 0; font-weight: 500; color: var(--text); }

  /* Status select */
  .status-sel { font-size: 12px; padding: 0.3rem 0.5rem; border-radius: 6px; border: 1px solid var(--border); outline: none; cursor: pointer; }
  .status-sel.done { background: #f0fdf4; color: #16a34a; border-color: #bbf7d0; }
  .status-sel.in_progress { background: #fffbeb; color: #d97706; border-color: #fde68a; }
  .status-sel.todo { background: var(--bg3); color: var(--text2); border-color: var(--border); }

  .icon-btn { background: none; border: none; cursor: pointer; padding: 4px; color: var(--text3); font-size: 16px; border-radius: 4px; }
  .icon-btn:hover { background: var(--bg3); color: var(--text); }

  /* Settings */
  .settings-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; align-items: start; }
  .settings-form { display: flex; flex-direction: column; gap: 0.75rem; padding: 1.25rem; }
  .info-block { padding: 0.5rem 1.25rem; }
  .info-row { display: flex; justify-content: space-between; align-items: center; padding: 0.75rem 0; border-bottom: 1px solid var(--border); }
  .info-label { font-size: 13px; color: var(--text2); display: flex; align-items: center; gap: 6px; }
  .info-val { font-size: 14px; color: var(--text); font-weight: 500; }

  .field { display: flex; flex-direction: column; gap: 4px; }
  .field label { font-size: 12px; font-weight: 600; color: var(--text2); text-transform: uppercase; letter-spacing: 0.04em; }
  input { padding: 0.5rem 0.75rem; border: 1px solid var(--border); border-radius: 8px; font-size: 14px; color: var(--text); background: var(--card); outline: none; width: 100%; box-sizing: border-box; }
  input:focus { border-color: #7c3aed; box-shadow: 0 0 0 3px #7c3aed15; }

  /* Dark mode toggle */
  .dark-toggle-row { display: flex; align-items: center; justify-content: space-between; padding: 0.5rem 0; }
  .toggle-label { margin: 0 0 2px; font-size: 14px; font-weight: 500; color: var(--text); }
  .toggle-sub { margin: 0; font-size: 12px; color: var(--text2); }
  .toggle-switch { width: 44px; height: 24px; border-radius: 999px; background: var(--bg3); border: 1px solid var(--border); cursor: pointer; position: relative; transition: background 0.2s; flex-shrink: 0; }
  .toggle-switch.on { background: #7c3aed; border-color: #7c3aed; }
  .toggle-thumb { position: absolute; width: 18px; height: 18px; border-radius: 50%; background: white; top: 2px; left: 2px; transition: left 0.2s; box-shadow: 0 1px 3px rgba(0,0,0,0.2); }
  .toggle-switch.on .toggle-thumb { left: 22px; }

  .btn { display: inline-flex; align-items: center; gap: 6px; padding: 0.5rem 1rem; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer; border: none; font-family: inherit; width: 100%; justify-content: center; }
  .btn.primary { background: #7c3aed; color: white; }
  .btn.primary:hover { background: #6d28d9; }

  .role-pill { font-size: 12px; padding: 3px 10px; border-radius: 999px; background: var(--bg3); color: var(--text2); }

  .msg { font-size: 13px; margin: 0.5rem 0 0; display: flex; align-items: center; gap: 6px; }
  .msg.err { color: #dc2626; }
  .msg.ok { color: #16a34a; }

  /* ── TABLET ── */
  @media (max-width: 1024px) {
    .stats-row { grid-template-columns: repeat(2, 1fr); }
    .settings-grid { grid-template-columns: 1fr; }
  }

  /* ── MOBILE ── */
  @media (max-width: 768px) {
    /* Sidebar becomes a fixed drawer */
    .sidebar {
      position: fixed;
      left: -240px;
      top: 0;
      height: 100vh;
      width: 240px;
      transition: left 0.25s ease;
      z-index: 200;
    }
    .sidebar.mobile-open { left: 0; }

    /* Show hamburger */
    .toggle-btn { display: flex; }

    /* Show/hide */
    .desktop-only { display: none; }
    .mobile-only { display: flex; flex-direction: column; }

    /* Topbar */
    .topbar { padding: 0 0.75rem; }
    .username-label { display: none; }

    /* Stats */
    .stats-row { grid-template-columns: repeat(2, 1fr); gap: 8px; }
    .stat-card { padding: 0.875rem; gap: 0.75rem; }
    .stat-num { font-size: 20px; }
    .stat-icon-wrap { width: 38px; height: 38px; font-size: 17px; }

    /* Main */
    .main { padding: 0.875rem; }

    /* Settings */
    .settings-grid { grid-template-columns: 1fr; }
    .info-row { flex-direction: column; align-items: flex-start; gap: 4px; }
  }

  /* ── SMALL PHONES ── */
  @media (max-width: 480px) {
    .stats-row { grid-template-columns: repeat(2, 1fr); gap: 6px; }
    .stat-card { padding: 0.75rem; gap: 0.5rem; }
    .stat-num { font-size: 18px; }
    .stat-label { font-size: 11px; }
    .topbar-title { font-size: 15px; }
    .main { padding: 0.75rem; }
  }
</style>