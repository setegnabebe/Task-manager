<script lang="ts">
  import { onMount } from 'svelte';
  import NotificationBell from '$lib/NotificationBell.svelte';
  import { requestNotificationPermission, onForegroundMessage } from '$lib/firebase';

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

  function authHeaders() {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
    };
  }

  function logout() { localStorage.clear(); window.location.href = '/login'; }

  async function loadTasks() {
    const token = localStorage.getItem('token');
    if (!token) { window.location.href = '/login'; return; }
    const res = await fetch('http://localhost:3000/tasks', { headers: authHeaders() });
    if (res.status === 401) { window.location.href = '/login'; return; }
    tasks = await res.json();
  }

  async function updateStatus(id: number, status: string) {
    await fetch(`http://localhost:3000/tasks/${id}`, {
      method: 'PATCH', headers: authHeaders(), body: JSON.stringify({ status }),
    });
    await loadTasks();
  }

  async function updateSubtaskStatus(id: number, status: string) {
    await fetch(`http://localhost:3000/tasks/subtasks/${id}`, {
      method: 'PATCH', headers: authHeaders(), body: JSON.stringify({ status }),
    });
    await loadTasks();
  }

  function toggleExpand(id: number) { expanded[id] = !expanded[id]; }

  async function changePassword() {
    settingsMsg = ''; settingsError = '';
    if (!oldPassword || !newPassword) { settingsError = 'Fill in both fields'; return; }
    const res = await fetch('http://localhost:3000/auth/change-password', {
      method: 'PATCH', headers: authHeaders(),
      body: JSON.stringify({ oldPassword, newPassword }),
    });
    if (!res.ok) { settingsError = 'Old password incorrect'; return; }
    settingsMsg = 'Password changed!'; oldPassword = ''; newPassword = '';
  }

  let totalDone = $derived(tasks.filter(t => t.status === 'done').length);
  let totalInProgress = $derived(tasks.filter(t => t.status === 'in_progress').length);
  let totalTodo = $derived(tasks.filter(t => t.status === 'todo').length);

  onMount(async () => {
    username = localStorage.getItem('username') || '';
    await loadTasks();
    const token = await requestNotificationPermission();
    if (token) {
      await fetch('http://localhost:3000/auth/fcm-token', {
        method: 'PATCH', headers: authHeaders(), body: JSON.stringify({ token }),
      });
    }
    onForegroundMessage((payload) => {
      alert(`🔔 ${payload.notification?.title}: ${payload.notification?.body}`);
    });
  });
</script>

<div class="shell">
  <!-- Sidebar -->
  <aside class="sidebar">
    <div class="brand">
      <div class="brand-icon"><i class="ti ti-layout-kanban"></i></div>
      <span class="brand-name">TaskFlow</span>
    </div>

    <div class="profile">
      <div class="avatar-lg">{username[0]?.toUpperCase()}</div>
      <div>
        <p class="profile-name">{username}</p>
        <span class="user-badge"><i class="ti ti-user"></i> Member</span>
      </div>
    </div>

    <nav class="nav">
      <button class="nav-btn" class:active={activePage==='tasks'} onclick={() => activePage='tasks'}>
        <i class="ti ti-checklist"></i><span>My Tasks</span>
      </button>
      <button class="nav-btn" class:active={activePage==='settings'} onclick={() => activePage='settings'}>
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
      <h1 class="topbar-title">
        {activePage === 'tasks' ? 'My Tasks' : 'Settings'}
      </h1>
      <div class="topbar-right">
        <NotificationBell />
        <div class="topbar-user">
          <div class="avatar-sm">{username[0]?.toUpperCase()}</div>
          <span>{username}</span>
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

        <div class="panel">
          <div class="panel-head"><i class="ti ti-list"></i> Assigned tasks</div>
          {#if tasks.length === 0}
            <div class="empty-state">
              <i class="ti ti-mood-empty"></i>
              <p>No tasks assigned yet</p>
            </div>
          {:else}
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
                    <td>
                      <p class="task-title">{task.title}</p>
                    </td>
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
                        <td style="font-size:13px;color:#6b7280;padding-left:1.5rem">
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
          {/if}
        </div>
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
  :global(body) { margin: 0; }

  .shell { display: flex; min-height: 100vh; background: #f0f2f5; font-family: sans-serif; }

  .sidebar {
    width: 220px;
    background: #1e1e2e;
    color: #cdd6f4;
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
    position: sticky;
    top: 0;
    height: 100vh;
  }

  .brand { display: flex; align-items: center; gap: 10px; padding: 1.25rem 1rem; border-bottom: 1px solid #313244; }
  .brand-icon { width: 32px; height: 32px; background: #7c3aed; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 16px; color: white; flex-shrink: 0; }
  .brand-name { font-size: 15px; font-weight: 600; color: #cdd6f4; }

  .profile { display: flex; align-items: center; gap: 10px; padding: 1rem; border-bottom: 1px solid #313244; }
  .avatar-lg { width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, #4f46e5, #7c3aed); display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 600; color: white; flex-shrink: 0; }
  .avatar-sm { width: 30px; height: 30px; border-radius: 50%; background: #4f46e5; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600; color: white; flex-shrink: 0; }
  .profile-name { margin: 0; font-size: 14px; font-weight: 500; color: #cdd6f4; }
  .user-badge { font-size: 11px; color: #89b4fa; display: flex; align-items: center; gap: 3px; }

  .nav { display: flex; flex-direction: column; gap: 2px; padding: 0.75rem 0.5rem; flex: 1; }

  .nav-btn { display: flex; align-items: center; gap: 10px; padding: 9px 12px; border-radius: 8px; font-size: 14px; color: #a6adc8; background: none; border: none; cursor: pointer; text-align: left; text-decoration: none; width: 100%; transition: background 0.15s; }
  .nav-btn i { font-size: 18px; }
  .nav-btn:hover { background: #313244; color: #cdd6f4; }
  .nav-btn.active { background: #7c3aed22; color: #cba6f7; }
  .nav-btn.danger { color: #f38ba8; }
  .nav-btn.danger:hover { background: #f38ba811; }

  .sidebar-bottom { padding: 0.5rem; border-top: 1px solid #313244; }

  .content-wrap { flex: 1; display: flex; flex-direction: column; min-width: 0; }

  .topbar { height: 60px; background: white; border-bottom: 1px solid #e5e7eb; display: flex; align-items: center; gap: 1rem; padding: 0 1.5rem; position: sticky; top: 0; z-index: 10; }
  .topbar-title { margin: 0; font-size: 17px; font-weight: 600; color: #111827; flex: 1; }
  .topbar-right { display: flex; align-items: center; gap: 1rem; }
  .topbar-user { display: flex; align-items: center; gap: 8px; font-size: 14px; color: #374151; font-weight: 500; }

  .main { padding: 1.5rem; flex: 1; }

  .stats-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; margin-bottom: 1.5rem; }
  .stat-card { background: white; border-radius: 12px; padding: 1.25rem; display: flex; align-items: center; gap: 1rem; border: 1px solid #f0f0f0; }
  .stat-icon-wrap { width: 44px; height: 44px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0; }
  .stat-icon-wrap.purple { background: #f5f3ff; color: #7c3aed; }
  .stat-icon-wrap.amber { background: #fffbeb; color: #f59e0b; }
  .stat-icon-wrap.green { background: #f0fdf4; color: #22c55e; }
  .stat-icon-wrap.gray { background: #f9fafb; color: #6b7280; }
  .stat-label { margin: 0 0 2px; font-size: 12px; color: #6b7280; }
  .stat-num { margin: 0; font-size: 24px; font-weight: 700; color: #111827; }
  .stat-num.amber { color: #f59e0b; }
  .stat-num.green { color: #22c55e; }

  .panel { background: white; border-radius: 12px; border: 1px solid #f0f0f0; margin-bottom: 1rem; overflow: hidden; }
  .panel-head { display: flex; align-items: center; gap: 8px; padding: 1rem 1.25rem; font-size: 14px; font-weight: 600; color: #111827; border-bottom: 1px solid #f3f4f6; background: #fafafa; }
  .panel-head i { font-size: 16px; color: #7c3aed; }

  .empty-state { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 3rem; color: #9ca3af; }
  .empty-state i { font-size: 48px; }
  .empty-state p { margin: 0; font-size: 14px; }

  .tbl { width: 100%; border-collapse: collapse; font-size: 14px; }
  .tbl th { text-align: left; padding: 0.6rem 1rem; font-size: 12px; font-weight: 600; color: #6b7280; background: #fafafa; border-bottom: 1px solid #f0f0f0; text-transform: uppercase; letter-spacing: 0.04em; }
  .tbl td { padding: 0.75rem 1rem; border-bottom: 1px solid #f9fafb; color: #374151; }
  .task-row:hover td { background: #fafafa; }
  .sub-row td { background: #fdfcff; }
  .task-title { margin: 0; font-weight: 500; color: #111827; }

  .status-sel { font-size: 12px; padding: 0.3rem 0.5rem; border-radius: 6px; min-width: 110px; border: 1px solid #e5e7eb; outline: none; cursor: pointer; }
  .status-sel.done { background: #f0fdf4; color: #16a34a; border-color: #bbf7d0; }
  .status-sel.in_progress { background: #fffbeb; color: #d97706; border-color: #fde68a; }
  .status-sel.todo { background: #f9fafb; color: #6b7280; border-color: #e5e7eb; }

  .icon-btn { background: none; border: none; cursor: pointer; padding: 4px; color: #9ca3af; font-size: 16px; border-radius: 4px; }
  .icon-btn:hover { background: #f3f4f6; color: #374151; }

  .settings-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; align-items: start; }
  .settings-form { display: flex; flex-direction: column; gap: 0.75rem; padding: 1.25rem; }
  .info-block { padding: 0.5rem 1.25rem; }
  .info-row { display: flex; justify-content: space-between; align-items: center; padding: 0.75rem 0; border-bottom: 1px solid #f3f4f6; }
  .info-label { font-size: 13px; color: #6b7280; display: flex; align-items: center; gap: 6px; }
  .info-val { font-size: 14px; color: #111827; font-weight: 500; }

  .field { display: flex; flex-direction: column; gap: 4px; }
  .field label { font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.04em; }

  input { padding: 0.5rem 0.75rem; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 14px; color: #111827; background: white; outline: none; }
  input:focus { border-color: #7c3aed; box-shadow: 0 0 0 3px #7c3aed15; }

  .btn { display: inline-flex; align-items: center; gap: 6px; padding: 0.5rem 1rem; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer; border: none; font-family: inherit; }
  .btn.primary { background: #7c3aed; color: white; }
  .btn.primary:hover { background: #6d28d9; }

  .role-pill { font-size: 12px; padding: 3px 10px; border-radius: 999px; background: #f3f4f6; color: #6b7280; }

  .msg { font-size: 13px; margin: 0.5rem 0 0; display: flex; align-items: center; gap: 6px; }
  .msg.err { color: #dc2626; }
  .msg.ok { color: #16a34a; }
</style>