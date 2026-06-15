<script lang="ts">
  import { API_URL } from '$lib/config';
  import { onMount } from 'svelte';
  import NotificationBell from '$lib/NotificationBell.svelte';

  interface User { id: number; username: string; role: string }
  interface Subtask { id: number; title: string; status: string }
  interface Task {
    id: number; title: string; status: string; priority: string;
    dueDate: string | null; subtasks: Subtask[]; assignee?: User
  }
  interface Activity {
    id: number; action: string; details: string;
    created_at: string; performedBy?: User
  }

  let activePage = $state('dashboard');
  let tasks = $state<Task[]>([]);
  let users = $state<User[]>([]);
  let activities = $state<Activity[]>([]);
  let expanded = $state<Record<number, boolean>>({});
  let newTaskTitle = $state('');
  let newTaskAssignee = $state<number | null>(null);
  let newTaskPriority = $state('medium');
  let newTaskDueDate = $state('');
  let newUsername = $state('');
  let newPassword = $state('');
  let newRole = $state('user');
  let newSubtaskTitle = $state<Record<number, string>>({});
  let editingTask = $state<Record<number, boolean>>({});
  let editTaskTitle = $state<Record<number, string>>({});
  let userError = $state('');
  let userSuccess = $state('');
  let currentUsername = $state('');
  let oldPassword = $state('');
  let newSettingsPassword = $state('');
  let settingsMsg = $state('');
  let settingsError = $state('');
  let sidebarOpen = $state(true);
  let mobileMenuOpen = $state(false);
  let darkMode = $state(false);
  let searchQuery = $state('');
  let filterStatus = $state('all');
  let filterAssignee = $state('all');

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
    if (page === 'activity') loadActivity();
  }

  async function loadTasks() {
    const res = await fetch(`${API_URL}/tasks/all`, { headers: authHeaders() });
    if (res.status === 401 || res.status === 403) { window.location.href = '/login'; return; }
    tasks = await res.json();
  }

  async function loadUsers() {
    const res = await fetch(`${API_URL}/auth/users`, { headers: authHeaders() });
    users = await res.json();
  }

  async function loadActivity() {
    const res = await fetch(`${API_URL}/activity`, { headers: authHeaders() });
    activities = await res.json();
  }

  async function createTask() {
    if (!newTaskTitle.trim()) return;
    await fetch(`${API_URL}/tasks`, {
      method: 'POST', headers: authHeaders(),
      body: JSON.stringify({
        title: newTaskTitle, assigneeId: newTaskAssignee,
        priority: newTaskPriority, dueDate: newTaskDueDate || null,
      }),
    });
    newTaskTitle = ''; newTaskAssignee = null;
    newTaskPriority = 'medium'; newTaskDueDate = '';
    await loadTasks();
  }

  async function updateStatus(id: number, status: string) {
    await fetch(`${API_URL}/tasks/${id}`, {
      method: 'PATCH', headers: authHeaders(), body: JSON.stringify({ status }),
    });
    await loadTasks();
  }

  async function updatePriority(id: number, priority: string) {
    await fetch(`${API_URL}/tasks/${id}/priority`, {
      method: 'PATCH', headers: authHeaders(), body: JSON.stringify({ priority }),
    });
    await loadTasks();
  }

  async function updateDueDate(id: number, dueDate: string) {
    await fetch(`${API_URL}/tasks/${id}/due-date`, {
      method: 'PATCH', headers: authHeaders(), body: JSON.stringify({ dueDate }),
    });
    await loadTasks();
  }

  async function deleteTask(id: number) {
    await fetch(`${API_URL}/tasks/${id}`, { method: 'DELETE', headers: authHeaders() });
    await loadTasks();
  }

  function toggleExpand(id: number) { expanded[id] = !expanded[id]; }
  function startEditTask(task: Task) { editingTask[task.id] = true; editTaskTitle[task.id] = task.title; }
  function cancelEditTask(id: number) { editingTask[id] = false; }

  async function saveTaskTitle(id: number) {
    const title = editTaskTitle[id];
    if (!title?.trim()) return;
    await fetch(`${API_URL}/tasks/${id}/title`, {
      method: 'PATCH', headers: authHeaders(), body: JSON.stringify({ title }),
    });
    editingTask[id] = false; await loadTasks();
  }

  async function createSubtask(taskId: number) {
    const title = newSubtaskTitle[taskId];
    if (!title?.trim()) return;
    await fetch(`${API_URL}/tasks/${taskId}/subtasks`, {
      method: 'POST', headers: authHeaders(), body: JSON.stringify({ title }),
    });
    newSubtaskTitle[taskId] = ''; await loadTasks();
  }

  async function deleteSubtask(id: number) {
    await fetch(`${API_URL}/tasks/subtasks/${id}`, { method: 'DELETE', headers: authHeaders() });
    await loadTasks();
  }

  async function createUser() {
    userError = ''; userSuccess = '';
    if (!newUsername.trim() || !newPassword.trim()) { userError = 'Username and password required'; return; }
    const res = await fetch(`${API_URL}/auth/users`, {
      method: 'POST', headers: authHeaders(),
      body: JSON.stringify({ username: newUsername, password: newPassword, role: newRole }),
    });
    if (!res.ok) { const d = await res.json(); userError = d.message || 'Failed'; return; }
    userSuccess = `User "${newUsername}" created!`;
    newUsername = ''; newPassword = ''; newRole = 'user';
    await loadUsers();
  }

  async function deleteUser(id: number) {
    await fetch(`${API_URL}/auth/users/${id}`, { method: 'DELETE', headers: authHeaders() });
    await loadUsers();
  }

  async function changePassword() {
    settingsMsg = ''; settingsError = '';
    if (!oldPassword || !newSettingsPassword) { settingsError = 'Fill in both fields'; return; }
    const res = await fetch(`${API_URL}/auth/change-password`, {
      method: 'PATCH', headers: authHeaders(),
      body: JSON.stringify({ oldPassword, newPassword: newSettingsPassword }),
    });
    if (!res.ok) { settingsError = 'Old password incorrect'; return; }
    settingsMsg = 'Password changed!'; oldPassword = ''; newSettingsPassword = '';
  }

  async function reassignTask(taskId: number, assigneeId: number) {
    await fetch(`${API_URL}/tasks/${taskId}/assignee`, {
      method: 'PATCH', headers: authHeaders(), body: JSON.stringify({ assigneeId }),
    });
    await loadTasks();
  }

  function toggleDark() {
    darkMode = !darkMode;
    localStorage.setItem('darkMode', String(darkMode));
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
  }

  function isOverdue(dueDate: string | null) {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date(new Date().toDateString());
  }

  function formatDate(date: string | null) {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function timeAgo(date: string) {
    const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
    return `${Math.floor(diff/86400)}d ago`;
  }

  function actionIcon(action: string) {
    if (action.includes('created')) return '✦';
    if (action.includes('deleted')) return '✕';
    if (action.includes('status')) return '↻';
    if (action.includes('priority')) return '⚑';
    if (action.includes('due')) return '📅';
    if (action.includes('renamed') || action.includes('updated')) return '✎';
    return '•';
  }

  let filteredTasks = $derived(tasks.filter(t => {
    const matchSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = filterStatus === 'all' || t.status === filterStatus;
    const matchAssignee = filterAssignee === 'all' ||
      (filterAssignee === 'unassigned' ? !t.assignee : String(t.assignee?.id) === filterAssignee);
    return matchSearch && matchStatus && matchAssignee;
  }));

  let totalDone = $derived(tasks.filter(t => t.status === 'done').length);
  let totalInProgress = $derived(tasks.filter(t => t.status === 'in_progress').length);
  let totalTodo = $derived(tasks.filter(t => t.status === 'todo').length);
  let overdueCount = $derived(tasks.filter(t => isOverdue(t.dueDate) && t.status !== 'done').length);

  onMount(() => {
    const role = localStorage.getItem('role');
    if (role !== 'admin') { window.location.href = '/'; return; }
    currentUsername = localStorage.getItem('username') || '';
    const saved = localStorage.getItem('darkMode');
    if (saved === 'true') {
      darkMode = true;
      document.documentElement.setAttribute('data-theme', 'dark');
    }
    loadTasks(); loadUsers(); loadActivity();
  });
</script>

<!-- Mobile overlay -->
{#if mobileMenuOpen}
  <div class="overlay" onclick={() => mobileMenuOpen = false}></div>
{/if}

<div class="shell">
  <!-- Sidebar -->
  <aside class="sidebar" class:collapsed={!sidebarOpen} class:mobile-open={mobileMenuOpen}>
    <div class="brand">
      <div class="brand-icon">✓</div>
      {#if sidebarOpen || mobileMenuOpen}<span class="brand-name">TaskFlow</span>{/if}
    </div>

    <div class="profile">
      <div class="avatar-lg">{currentUsername[0]?.toUpperCase()}</div>
      {#if sidebarOpen || mobileMenuOpen}
        <div>
          <p class="profile-name">{currentUsername}</p>
          <span class="admin-badge">⚙ Admin</span>
        </div>
      {/if}
    </div>

    <nav class="nav">
      {#if sidebarOpen || mobileMenuOpen}<p class="nav-label">Main</p>{/if}
      <button class="nav-btn" class:active={activePage==='dashboard'} onclick={() => navigate('dashboard')}>
        <i class="ti ti-layout-dashboard"></i><span>Dashboard</span>
      </button>
      <button class="nav-btn" class:active={activePage==='users'} onclick={() => navigate('users')}>
        <i class="ti ti-users"></i><span>Users</span>
      </button>
      <button class="nav-btn" class:active={activePage==='tasks'} onclick={() => navigate('tasks')}>
        <i class="ti ti-checklist"></i><span>Tasks</span>
      </button>
      <button class="nav-btn" class:active={activePage==='activity'} onclick={() => navigate('activity')}>
        <i class="ti ti-history"></i><span>Activity</span>
      </button>
      {#if sidebarOpen || mobileMenuOpen}<p class="nav-label">Account</p>{/if}
      <button class="nav-btn" class:active={activePage==='settings'} onclick={() => navigate('settings')}>
        <i class="ti ti-settings"></i><span>Settings</span>
      </button>
    </nav>

    <div class="sidebar-bottom">
      <a href="/" class="nav-btn" onclick={() => mobileMenuOpen = false}>
        <i class="ti ti-arrow-left"></i><span>My Tasks</span>
      </a>
      <button class="nav-btn danger" onclick={logout}>
        <i class="ti ti-logout"></i><span>Logout</span>
      </button>
    </div>
  </aside>

  <div class="content-wrap">
    <!-- Topbar -->
    <header class="topbar">
      <!-- Desktop collapse toggle -->
      <button class="toggle-btn desktop-only" onclick={() => sidebarOpen = !sidebarOpen}>
        <i class="ti ti-menu-2"></i>
      </button>
      <!-- Mobile hamburger -->
      <button class="toggle-btn mobile-only" onclick={() => mobileMenuOpen = !mobileMenuOpen}>
        <i class="ti ti-menu-2"></i>
      </button>

      <h1 class="topbar-title">
        {activePage === 'dashboard' ? 'Dashboard'
          : activePage === 'users' ? 'Users'
          : activePage === 'tasks' ? 'Tasks'
          : activePage === 'activity' ? 'Activity'
          : 'Settings'}
      </h1>

      <div class="topbar-right">
        <button class="icon-action" onclick={toggleDark} title="Toggle dark mode">
          <i class="ti ti-{darkMode ? 'sun' : 'moon'}"></i>
        </button>
        <NotificationBell />
        <div class="topbar-user">
          <div class="avatar-sm">{currentUsername[0]?.toUpperCase()}</div>
          <span class="username-label">{currentUsername}</span>
        </div>
      </div>
    </header>

    <main class="main">

      <!-- DASHBOARD -->
      {#if activePage === 'dashboard'}
        <div class="stats-row">
          <div class="stat-card">
            <div class="stat-icon-wrap blue"><i class="ti ti-users"></i></div>
            <div><p class="stat-label">Users</p><p class="stat-num">{users.length}</p></div>
          </div>
          <div class="stat-card">
            <div class="stat-icon-wrap purple"><i class="ti ti-checklist"></i></div>
            <div><p class="stat-label">Total tasks</p><p class="stat-num">{tasks.length}</p></div>
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
            <div class="stat-icon-wrap red"><i class="ti ti-alarm"></i></div>
            <div><p class="stat-label">Overdue</p><p class="stat-num red">{overdueCount}</p></div>
          </div>
        </div>

        <div class="grid-2">
          <div class="panel">
            <div class="panel-head"><i class="ti ti-chart-bar"></i> Task breakdown</div>
            <div class="breakdown-bars">
              {#each [['Done', 'green', totalDone], ['In progress', 'amber', totalInProgress], ['Todo', 'gray', totalTodo]] as [label, color, count]}
                <div class="bar-row">
                  <span class="bar-label">{label}</span>
                  <div class="bar-track">
                    <div class="bar-fill {color}" style="width:{tasks.length ? ((count as number)/tasks.length*100).toFixed(0) : 0}%"></div>
                  </div>
                  <span class="bar-pct">{tasks.length ? ((count as number)/tasks.length*100).toFixed(0) : 0}%</span>
                </div>
              {/each}
            </div>
          </div>

          <div class="panel">
            <div class="panel-head"><i class="ti ti-users"></i> Team</div>
            <div class="user-list">
              {#each users as user (user.id)}
                <div class="user-row">
                  <div class="avatar-sm">{user.username[0].toUpperCase()}</div>
                  <div style="flex:1; min-width:0">
                    <p class="user-name">{user.username}</p>
                    <p class="user-meta">{tasks.filter(t => t.assignee?.id === user.id).length} tasks</p>
                  </div>
                  <span class="role-pill" class:admin={user.role==='admin'}>{user.role}</span>
                </div>
              {/each}
            </div>
          </div>
        </div>

        <div class="panel">
          <div class="panel-head"><i class="ti ti-layout-list"></i> All tasks</div>
          <div class="table-wrap">
            <table class="tbl">
              <thead><tr><th>Title</th><th>Priority</th><th>Assigned to</th><th>Due date</th><th>Status</th></tr></thead>
              <tbody>
                {#each tasks as task (task.id)}
                  <tr>
                    <td class="task-title-cell">{task.title}</td>
                    <td><span class="priority-badge {task.priority}">{task.priority}</span></td>
                    <td>
                      <select class="reassign-sel" value={task.assignee?.id ?? ''}
                        onchange={(e) => reassignTask(task.id, +e.currentTarget.value)}>
                        <option value="">Unassigned</option>
                        {#each users as u (u.id)}<option value={u.id}>{u.username}</option>{/each}
                      </select>
                    </td>
                    <td>
                      {#if task.dueDate}
                        <span class="due-date" class:overdue={isOverdue(task.dueDate) && task.status !== 'done'}>
                          {formatDate(task.dueDate)}
                        </span>
                      {:else}<span class="chip gray">—</span>{/if}
                    </td>
                    <td><span class="chip {task.status}">{task.status.replace('_',' ')}</span></td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        </div>
      {/if}

      <!-- USERS -->
      {#if activePage === 'users'}
        <div class="panel">
          <div class="panel-head"><i class="ti ti-user-plus"></i> Create new user</div>
          <div class="form-grid">
            <div class="field"><label>Username</label><input bind:value={newUsername} placeholder="e.g. john_doe" /></div>
            <div class="field"><label>Password</label><input bind:value={newPassword} type="password" placeholder="••••••••" /></div>
            <div class="field"><label>Role</label>
              <select bind:value={newRole}>
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div class="field btn-field">
              <label>&nbsp;</label>
              <button class="btn primary full-width" onclick={createUser}><i class="ti ti-plus"></i> Create user</button>
            </div>
          </div>
          {#if userError}<p class="msg err"><i class="ti ti-alert-circle"></i> {userError}</p>{/if}
          {#if userSuccess}<p class="msg ok"><i class="ti ti-circle-check"></i> {userSuccess}</p>{/if}
        </div>

        <div class="panel">
          <div class="panel-head"><i class="ti ti-users"></i> All users <span class="count-badge">{users.length}</span></div>
          <div class="user-cards">
            {#each users as user (user.id)}
              <div class="user-card">
                <div class="avatar-md">{user.username[0].toUpperCase()}</div>
                <div class="user-card-info">
                  <p class="user-name">{user.username}</p>
                  <p class="user-meta">{tasks.filter(t => t.assignee?.id === user.id).length} tasks assigned</p>
                </div>
                <span class="role-pill" class:admin={user.role==='admin'}>{user.role}</span>
                <button class="btn danger-soft icon-only" onclick={() => deleteUser(user.id)}>
                  <i class="ti ti-trash"></i>
                </button>
              </div>
            {/each}
          </div>
        </div>
      {/if}

      <!-- TASKS -->
      {#if activePage === 'tasks'}
        <div class="panel">
          <div class="panel-head"><i class="ti ti-plus"></i> Create & assign task</div>
          <div class="form-grid">
            <div class="field wide"><label>Title</label><input bind:value={newTaskTitle} placeholder="Task title..." /></div>
            <div class="field"><label>Assign to</label>
              <select bind:value={newTaskAssignee}>
                <option value={null}>Select user...</option>
                {#each users as u (u.id)}<option value={u.id}>{u.username}</option>{/each}
              </select>
            </div>
            <div class="field"><label>Priority</label>
              <select bind:value={newTaskPriority}>
                <option value="low">🟢 Low</option>
                <option value="medium">🟡 Medium</option>
                <option value="high">🔴 High</option>
              </select>
            </div>
            <div class="field"><label>Due date</label><input type="date" bind:value={newTaskDueDate} /></div>
            <div class="field btn-field">
              <label>&nbsp;</label>
              <button class="btn primary full-width" onclick={createTask}><i class="ti ti-plus"></i> Add task</button>
            </div>
          </div>
        </div>

        <div class="filter-bar">
          <div class="search-wrap">
            <i class="ti ti-search"></i>
            <input class="search-inp" bind:value={searchQuery} placeholder="Search tasks..." />
          </div>
          <select class="filter-sel" bind:value={filterStatus}>
            <option value="all">All statuses</option>
            <option value="todo">Todo</option>
            <option value="in_progress">In progress</option>
            <option value="done">Done</option>
          </select>
          <select class="filter-sel" bind:value={filterAssignee}>
            <option value="all">All assignees</option>
            <option value="unassigned">Unassigned</option>
            {#each users as u (u.id)}<option value={String(u.id)}>{u.username}</option>{/each}
          </select>
          <span class="result-count">{filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''}</span>
        </div>

        <!-- Mobile task cards -->
        <div class="task-cards mobile-only">
          {#each filteredTasks as task (task.id)}
            <div class="task-card" class:overdue-card={isOverdue(task.dueDate) && task.status !== 'done'}>
              <div class="task-card-head">
                <span class="priority-badge {task.priority}">{task.priority}</span>
                <span class="chip {task.status}">{task.status.replace('_',' ')}</span>
              </div>
              <p class="task-card-title">{task.title}</p>
              <div class="task-card-row">
                <span class="task-card-label">Assigned to</span>
                <select class="reassign-sel" value={task.assignee?.id ?? ''}
                  onchange={(e) => reassignTask(task.id, +e.currentTarget.value)}>
                  <option value="">Unassigned</option>
                  {#each users as u (u.id)}<option value={u.id}>{u.username}</option>{/each}
                </select>
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
              <div class="task-card-row">
                <span class="task-card-label">Priority</span>
                <select class="priority-sel {task.priority}" value={task.priority}
                  onchange={(e) => updatePriority(task.id, e.currentTarget.value)}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              {#if task.dueDate}
                <div class="task-card-row">
                  <span class="task-card-label">Due</span>
                  <span class="due-date" class:overdue={isOverdue(task.dueDate) && task.status !== 'done'}>
                    {formatDate(task.dueDate)}
                  </span>
                </div>
              {/if}
              <div class="task-card-actions">
                <button class="btn warn-soft" onclick={() => startEditTask(task)}><i class="ti ti-edit"></i> Edit</button>
                <button class="btn danger-soft" onclick={() => deleteTask(task.id)}><i class="ti ti-trash"></i> Delete</button>
              </div>
              {#if editingTask[task.id]}
                <div class="inline-edit-row">
                  <input class="inline-inp" bind:value={editTaskTitle[task.id]} placeholder="New title..."
                    onkeydown={(e) => { if(e.key==='Enter') saveTaskTitle(task.id); if(e.key==='Escape') cancelEditTask(task.id); }} />
                  <button class="btn success-soft" onclick={() => saveTaskTitle(task.id)}><i class="ti ti-check"></i></button>
                  <button class="btn gray-soft" onclick={() => cancelEditTask(task.id)}><i class="ti ti-x"></i></button>
                </div>
              {/if}
            </div>
          {/each}
        </div>

        <!-- Desktop task table -->
        <div class="panel desktop-only">
          <div class="panel-head"><i class="ti ti-list"></i> Tasks <span class="count-badge">{filteredTasks.length}</span></div>
          <div class="table-wrap">
            <table class="tbl">
              <thead><tr><th></th><th>ID</th><th>Title</th><th>Priority</th><th>Assigned to</th><th>Due date</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {#each filteredTasks as task (task.id)}
                  <tr class="task-row" class:overdue-row={isOverdue(task.dueDate) && task.status !== 'done'}>
                    <td style="width:36px">
                      <button class="icon-btn" onclick={() => toggleExpand(task.id)}>
                        <i class="ti ti-chevron-{expanded[task.id] ? 'down' : 'right'}"></i>
                      </button>
                    </td>
                    <td class="id-cell">#{task.id}</td>
                    <td>
                      {#if editingTask[task.id]}
                        <input class="inline-inp" bind:value={editTaskTitle[task.id]}
                          onkeydown={(e) => { if(e.key==='Enter') saveTaskTitle(task.id); if(e.key==='Escape') cancelEditTask(task.id); }} />
                      {:else}
                        <span class="task-title-cell">{task.title}</span>
                      {/if}
                    </td>
                    <td>
                      <select class="priority-sel {task.priority}" value={task.priority}
                        onchange={(e) => updatePriority(task.id, e.currentTarget.value)}>
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                    </td>
                    <td>
                      <select class="reassign-sel" value={task.assignee?.id ?? ''}
                        onchange={(e) => reassignTask(task.id, +e.currentTarget.value)}>
                        <option value="">Unassigned</option>
                        {#each users as u (u.id)}<option value={u.id}>{u.username}</option>{/each}
                      </select>
                    </td>
                    <td>
                      <input type="date" class="date-inp" value={task.dueDate || ''}
                        onchange={(e) => updateDueDate(task.id, e.currentTarget.value)} />
                      {#if isOverdue(task.dueDate) && task.status !== 'done'}
                        <span class="overdue-label">Overdue</span>
                      {/if}
                    </td>
                    <td>
                      <select class="status-sel {task.status}" value={task.status}
                        onchange={(e) => updateStatus(task.id, e.currentTarget.value)}>
                        <option value="todo">Todo</option>
                        <option value="in_progress">In progress</option>
                        <option value="done">Done</option>
                      </select>
                    </td>
                    <td>
                      <div class="flex-row" style="gap:4px">
                        {#if editingTask[task.id]}
                          <button class="btn success-soft" onclick={() => saveTaskTitle(task.id)}><i class="ti ti-check"></i></button>
                          <button class="btn gray-soft" onclick={() => cancelEditTask(task.id)}><i class="ti ti-x"></i></button>
                        {:else}
                          <button class="btn warn-soft" onclick={() => startEditTask(task)}><i class="ti ti-edit"></i></button>
                          <button class="btn danger-soft" onclick={() => deleteTask(task.id)}><i class="ti ti-trash"></i></button>
                        {/if}
                      </div>
                    </td>
                  </tr>

                  {#if expanded[task.id]}
                    {#each task.subtasks as subtask (subtask.id)}
                      <tr class="sub-row">
                        <td></td>
                        <td class="id-cell">{task.id}.{task.subtasks.indexOf(subtask)+1}</td>
                        <td colspan="5" style="font-size:13px;color:#6b7280">
                          <i class="ti ti-corner-down-right"></i> {subtask.title}
                        </td>
                        <td><button class="btn danger-soft" onclick={() => deleteSubtask(subtask.id)}><i class="ti ti-trash"></i></button></td>
                      </tr>
                    {/each}
                    <tr class="add-sub-row">
                      <td></td>
                      <td colspan="6">
                        <input class="inline-inp" bind:value={newSubtaskTitle[task.id]} placeholder="Add sub-task..."
                          onkeydown={(e) => e.key==='Enter' && createSubtask(task.id)} />
                      </td>
                      <td><button class="btn success-soft" onclick={() => createSubtask(task.id)}><i class="ti ti-plus"></i></button></td>
                    </tr>
                  {/if}
                {/each}
              </tbody>
            </table>
          </div>
        </div>
      {/if}

      <!-- ACTIVITY -->
      {#if activePage === 'activity'}
        <div class="panel">
          <div class="panel-head"><i class="ti ti-history"></i> Recent activity <span class="count-badge">{activities.length}</span></div>
          {#if activities.length === 0}
            <div class="empty-state"><i class="ti ti-mood-empty"></i><p>No activity yet</p></div>
          {:else}
            <div class="activity-list">
              {#each activities as act (act.id)}
                <div class="activity-item">
                  <div class="act-icon-wrap {act.action.includes('deleted') ? 'red' : act.action.includes('created') ? 'green' : 'blue'}">
                    {actionIcon(act.action)}
                  </div>
                  <div class="act-body">
                    <p class="act-details">{act.details}</p>
                    <div class="act-meta">
                      {#if act.performedBy}<span class="chip blue">{act.performedBy.username}</span>{/if}
                      <span class="act-time">{timeAgo(act.created_at)}</span>
                    </div>
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      {/if}

      <!-- SETTINGS -->
      {#if activePage === 'settings'}
        <div class="settings-grid">
          <div class="panel">
            <div class="panel-head"><i class="ti ti-lock"></i> Change password</div>
            <div class="settings-form">
              <div class="field"><label>Current password</label><input bind:value={oldPassword} type="password" placeholder="••••••••" /></div>
              <div class="field"><label>New password</label><input bind:value={newSettingsPassword} type="password" placeholder="••••••••" /></div>
              <button class="btn primary" onclick={changePassword}><i class="ti ti-lock-check"></i> Update password</button>
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
              <div class="info-row"><span class="info-label"><i class="ti ti-user"></i> Username</span><span class="info-val">{currentUsername}</span></div>
              <div class="info-row"><span class="info-label"><i class="ti ti-shield"></i> Role</span><span class="role-pill admin">Admin</span></div>
              <div class="info-row"><span class="info-label"><i class="ti ti-users"></i> Team size</span><span class="info-val">{users.length} users</span></div>
              <div class="info-row"><span class="info-label"><i class="ti ti-checklist"></i> Total tasks</span><span class="info-val">{tasks.length} tasks</span></div>
            </div>
          </div>
        </div>
      {/if}

    </main>
  </div>
</div>

<style>
  :global(html[data-theme="dark"]) {
    --bg: #1e1e2e; --bg2: #181825; --bg3: #313244;
    --border: #45475a; --text: #cdd6f4; --text2: #a6adc8;
    --text3: #6c7086; --card: #24273a; --panel: #1e2030;
  }
  :global(html) {
    --bg: #f0f2f5; --bg2: #ffffff; --bg3: #f9fafb;
    --border: #e5e7eb; --text: #111827; --text2: #6b7280;
    --text3: #9ca3af; --card: #ffffff; --panel: #ffffff;
  }
  :global(body) { margin: 0; }

  /* Layout */
  .shell { display: flex; min-height: 100vh; background: var(--bg); font-family: sans-serif; }
  .content-wrap { flex: 1; display: flex; flex-direction: column; min-width: 0; }
  .main { padding: 1.5rem; flex: 1; }

  /* Overlay */
  .overlay {
    position: fixed; inset: 0; background: rgba(0,0,0,0.5);
    z-index: 99; display: none;
  }

  /* Sidebar */
  .sidebar {
    width: 240px; background: #1e1e2e; color: #cdd6f4;
    display: flex; flex-direction: column; flex-shrink: 0;
    position: sticky; top: 0; height: 100vh;
    overflow: hidden; transition: width 0.2s;
    z-index: 100;
  }
  .sidebar.collapsed { width: 64px; }
  .sidebar.collapsed .nav-btn span,
  .sidebar.collapsed .nav-label,
  .sidebar.collapsed .profile-name,
  .sidebar.collapsed .admin-badge,
  .sidebar.collapsed .brand-name { display: none; }

  .brand { display: flex; align-items: center; gap: 10px; padding: 1.25rem 1rem; border-bottom: 1px solid #313244; }
  .brand-icon { width: 32px; height: 32px; background: #7c3aed; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 16px; color: white; font-weight: bold; flex-shrink: 0; }
  .brand-name { font-size: 15px; font-weight: 600; color: #cdd6f4; white-space: nowrap; }

  .profile { display: flex; align-items: center; gap: 10px; padding: 1rem; border-bottom: 1px solid #313244; }
  .profile-name { margin: 0; font-size: 14px; font-weight: 500; color: #cdd6f4; white-space: nowrap; }
  .admin-badge { font-size: 11px; color: #a6e3a1; }

  .nav { display: flex; flex-direction: column; gap: 2px; padding: 0.75rem 0.5rem; flex: 1; overflow: hidden; }
  .nav-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: #585b70; padding: 0.5rem 0.75rem 0.25rem; margin: 0; white-space: nowrap; }

  .nav-btn { display: flex; align-items: center; gap: 10px; padding: 9px 12px; border-radius: 8px; font-size: 14px; color: #a6adc8; background: none; border: none; cursor: pointer; text-align: left; text-decoration: none; width: 100%; white-space: nowrap; transition: background 0.15s; font-family: inherit; }
  .nav-btn i { font-size: 18px; flex-shrink: 0; }
  .nav-btn:hover { background: #313244; color: #cdd6f4; }
  .nav-btn.active { background: #7c3aed22; color: #cba6f7; }
  .nav-btn.danger { color: #f38ba8; }
  .nav-btn.danger:hover { background: #f38ba811; }

  .sidebar-bottom { padding: 0.5rem; border-top: 1px solid #313244; display: flex; flex-direction: column; gap: 2px; }

  /* Topbar */
  .topbar { height: 60px; background: var(--card); border-bottom: 1px solid var(--border); display: flex; align-items: center; gap: 0.75rem; padding: 0 1rem; position: sticky; top: 0; z-index: 10; }
  .topbar-title { margin: 0; font-size: 17px; font-weight: 600; color: var(--text); flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .topbar-right { display: flex; align-items: center; gap: 0.75rem; flex-shrink: 0; }
  .topbar-user { display: flex; align-items: center; gap: 8px; font-size: 14px; color: var(--text); font-weight: 500; }
  .username-label { white-space: nowrap; }

  .toggle-btn { background: none; border: none; font-size: 20px; cursor: pointer; color: var(--text2); padding: 6px; border-radius: 6px; display: flex; flex-shrink: 0; }
  .toggle-btn:hover { background: var(--bg3); }
  .icon-action { background: none; border: none; font-size: 18px; cursor: pointer; color: var(--text2); padding: 6px; border-radius: 6px; display: flex; }
  .icon-action:hover { background: var(--bg3); }

  /* Show/hide helpers */
  .desktop-only { display: flex; }
  .mobile-only { display: none; }

  /* Stats */
  .stats-row { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; margin-bottom: 1.5rem; }
  .stat-card { background: var(--card); border-radius: 12px; padding: 1rem; display: flex; align-items: center; gap: 0.75rem; border: 1px solid var(--border); }
  .stat-icon-wrap { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0; }
  .stat-icon-wrap.blue { background: #eff6ff; color: #3b82f6; }
  .stat-icon-wrap.purple { background: #f5f3ff; color: #7c3aed; }
  .stat-icon-wrap.amber { background: #fffbeb; color: #f59e0b; }
  .stat-icon-wrap.green { background: #f0fdf4; color: #22c55e; }
  .stat-icon-wrap.red { background: #fef2f2; color: #ef4444; }
  .stat-label { margin: 0 0 2px; font-size: 11px; color: var(--text2); }
  .stat-num { margin: 0; font-size: 22px; font-weight: 700; color: var(--text); }
  .stat-num.amber { color: #f59e0b; }
  .stat-num.green { color: #22c55e; }
  .stat-num.red { color: #ef4444; }

  /* Grid */
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem; }

  /* Panel */
  .panel { background: var(--panel); border-radius: 12px; border: 1px solid var(--border); margin-bottom: 1rem; overflow: hidden; }
  .panel-head { display: flex; align-items: center; gap: 8px; padding: 0.875rem 1.25rem; font-size: 14px; font-weight: 600; color: var(--text); border-bottom: 1px solid var(--border); background: var(--bg3); }
  .panel-head i { font-size: 16px; color: #7c3aed; }
  .count-badge { margin-left: auto; background: var(--bg); color: var(--text2); font-size: 12px; padding: 2px 8px; border-radius: 999px; border: 1px solid var(--border); }

  /* Breakdown bars */
  .breakdown-bars { padding: 1.25rem; display: flex; flex-direction: column; gap: 1rem; }
  .bar-row { display: flex; align-items: center; gap: 10px; }
  .bar-label { font-size: 13px; color: var(--text2); width: 80px; flex-shrink: 0; }
  .bar-track { flex: 1; height: 8px; background: var(--bg3); border-radius: 999px; overflow: hidden; }
  .bar-fill { height: 100%; border-radius: 999px; transition: width 0.5s; }
  .bar-fill.green { background: #22c55e; }
  .bar-fill.amber { background: #f59e0b; }
  .bar-fill.gray { background: #9ca3af; }
  .bar-pct { font-size: 12px; color: var(--text2); width: 32px; text-align: right; flex-shrink: 0; }

  /* User list */
  .user-list { padding: 0.5rem 0; }
  .user-row { display: flex; align-items: center; gap: 10px; padding: 0.65rem 1.25rem; }
  .user-row:hover { background: var(--bg3); }

  /* User cards (responsive users page) */
  .user-cards { padding: 1rem; display: flex; flex-direction: column; gap: 0.75rem; }
  .user-card { display: flex; align-items: center; gap: 12px; padding: 0.875rem 1rem; background: var(--bg3); border-radius: 10px; border: 1px solid var(--border); }
  .user-card-info { flex: 1; min-width: 0; }

  /* Avatars */
  .avatar-lg { width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, #7c3aed, #4f46e5); display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 600; color: white; flex-shrink: 0; }
  .avatar-md { width: 36px; height: 36px; border-radius: 50%; background: #4f46e5; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 600; color: white; flex-shrink: 0; }
  .avatar-sm { width: 30px; height: 30px; border-radius: 50%; background: #4f46e5; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600; color: white; flex-shrink: 0; }
  .avatar-xs { width: 22px; height: 22px; border-radius: 50%; background: #4f46e5; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 600; color: white; flex-shrink: 0; }

  .user-name { margin: 0; font-size: 14px; font-weight: 500; color: var(--text); }
  .user-meta { margin: 0; font-size: 12px; color: var(--text3); }

  /* Filter bar */
  .filter-bar { display: flex; align-items: center; gap: 10px; margin-bottom: 1rem; flex-wrap: wrap; }
  .search-wrap { display: flex; align-items: center; gap: 8px; background: var(--card); border: 1px solid var(--border); border-radius: 8px; padding: 0.4rem 0.75rem; flex: 1; min-width: 180px; }
  .search-wrap i { color: var(--text3); font-size: 16px; flex-shrink: 0; }
  .search-inp { border: none; outline: none; font-size: 14px; background: transparent; color: var(--text); width: 100%; }
  .filter-sel { padding: 0.45rem 0.75rem; border: 1px solid var(--border); border-radius: 8px; font-size: 13px; background: var(--card); color: var(--text); outline: none; cursor: pointer; }
  .result-count { font-size: 13px; color: var(--text2); white-space: nowrap; }

  /* Mobile task cards */
  .task-cards { display: flex; flex-direction: column; gap: 0.75rem; }
  .task-card { background: var(--panel); border: 1px solid var(--border); border-radius: 12px; padding: 1rem; }
  .task-card.overdue-card { border-left: 3px solid #ef4444; }
  .task-card-head { display: flex; align-items: center; gap: 8px; margin-bottom: 0.5rem; }
  .task-card-title { margin: 0 0 0.75rem; font-size: 15px; font-weight: 600; color: var(--text); }
  .task-card-row { display: flex; align-items: center; justify-content: space-between; padding: 0.4rem 0; border-bottom: 1px solid var(--border); }
  .task-card-label { font-size: 12px; color: var(--text2); }
  .task-card-actions { display: flex; gap: 8px; margin-top: 0.75rem; }
  .task-card-actions .btn { flex: 1; justify-content: center; }
  .inline-edit-row { display: flex; gap: 6px; margin-top: 0.5rem; }

  /* Table */
  .table-wrap { overflow-x: auto; }
  .tbl { width: 100%; border-collapse: collapse; font-size: 14px; min-width: 700px; }
  .tbl th { text-align: left; padding: 0.6rem 1rem; font-size: 11px; font-weight: 600; color: var(--text2); background: var(--bg3); border-bottom: 1px solid var(--border); text-transform: uppercase; letter-spacing: 0.04em; white-space: nowrap; }
  .tbl td { padding: 0.7rem 1rem; border-bottom: 1px solid var(--border); color: var(--text); }
  .task-row:hover td { background: var(--bg3); }
  .task-row.overdue-row td:first-child { border-left: 3px solid #ef4444; }
  .sub-row td { background: var(--bg3); }
  .add-sub-row td { background: #f0fdf4; padding: 0.5rem 1rem; }
  .task-title-cell { font-weight: 500; }
  .id-cell { color: var(--text3); font-size: 12px; }

  /* Inputs & selects */
  input, select { padding: 0.5rem 0.75rem; border: 1px solid var(--border); border-radius: 8px; font-size: 14px; color: var(--text); background: var(--card); outline: none; transition: border 0.15s; font-family: inherit; }
  input:focus, select:focus { border-color: #7c3aed; box-shadow: 0 0 0 3px #7c3aed15; }
  .inline-inp { padding: 0.3rem 0.5rem; font-size: 13px; border-radius: 6px; }

  /* Form grid */
  .form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 1rem; padding: 1.25rem; align-items: end; }
  .field { display: flex; flex-direction: column; gap: 4px; }
  .field.wide { grid-column: span 2; }
  .field label { font-size: 11px; font-weight: 600; color: var(--text2); text-transform: uppercase; letter-spacing: 0.04em; }
  .btn-field { justify-content: flex-end; }
  .full-width { width: 100%; justify-content: center; }

  /* Priority */
  .priority-badge { font-size: 11px; padding: 3px 8px; border-radius: 999px; font-weight: 500; text-transform: capitalize; white-space: nowrap; }
  .priority-badge.low { background: #eff6ff; color: #2563eb; }
  .priority-badge.medium { background: #fffbeb; color: #d97706; }
  .priority-badge.high { background: #fef2f2; color: #dc2626; }
  .priority-sel { font-size: 12px; padding: 0.3rem 0.5rem; border-radius: 6px; border: 1px solid var(--border); outline: none; cursor: pointer; }
  .priority-sel.low { background: #eff6ff; color: #2563eb; border-color: #bfdbfe; }
  .priority-sel.medium { background: #fffbeb; color: #d97706; border-color: #fde68a; }
  .priority-sel.high { background: #fef2f2; color: #dc2626; border-color: #fecaca; }

  /* Due date */
  .due-date { font-size: 13px; color: var(--text2); white-space: nowrap; }
  .due-date.overdue { color: #ef4444; font-weight: 500; }
  .overdue-label { display: block; font-size: 11px; color: #ef4444; font-weight: 500; margin-top: 2px; }
  .date-inp { font-size: 12px; padding: 0.25rem 0.4rem; border: 1px solid var(--border); border-radius: 6px; background: var(--card); color: var(--text); outline: none; }

  /* Status */
  .status-sel { font-size: 12px; padding: 0.3rem 0.5rem; border-radius: 6px; border: 1px solid var(--border); outline: none; cursor: pointer; }
  .status-sel.done { background: #f0fdf4; color: #16a34a; border-color: #bbf7d0; }
  .status-sel.in_progress { background: #fffbeb; color: #d97706; border-color: #fde68a; }
  .status-sel.todo { background: var(--bg3); color: var(--text2); }

  /* Reassign */
  .reassign-sel { font-size: 12px; padding: 0.3rem 0.5rem; border-radius: 6px; border: 1px solid var(--border); background: var(--card); color: var(--text); outline: none; cursor: pointer; max-width: 130px; }

  /* Chips */
  .chip { font-size: 12px; padding: 3px 8px; border-radius: 999px; white-space: nowrap; }
  .chip.blue { background: #eff6ff; color: #2563eb; }
  .chip.gray { background: var(--bg3); color: var(--text2); }
  .chip.done { background: #f0fdf4; color: #16a34a; }
  .chip.in_progress { background: #fffbeb; color: #d97706; }
  .chip.todo { background: var(--bg3); color: var(--text2); }

  .role-pill { font-size: 12px; padding: 3px 10px; border-radius: 999px; background: var(--bg3); color: var(--text2); white-space: nowrap; }
  .role-pill.admin { background: #f5f3ff; color: #7c3aed; }

  /* Activity */
  .activity-list { padding: 0.5rem 0; }
  .activity-item { display: flex; align-items: flex-start; gap: 12px; padding: 1rem 1.25rem; border-bottom: 1px solid var(--border); }
  .activity-item:last-child { border-bottom: none; }
  .act-icon-wrap { width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; flex-shrink: 0; }
  .act-icon-wrap.blue { background: #eff6ff; color: #3b82f6; }
  .act-icon-wrap.green { background: #f0fdf4; color: #22c55e; }
  .act-icon-wrap.red { background: #fef2f2; color: #ef4444; }
  .act-body { flex: 1; min-width: 0; }
  .act-details { margin: 0 0 6px; font-size: 14px; color: var(--text); }
  .act-meta { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .act-time { font-size: 12px; color: var(--text3); }

  /* Settings */
  .settings-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; align-items: start; }
  .settings-form { display: flex; flex-direction: column; gap: 0.75rem; padding: 1.25rem; }
  .info-block { padding: 0.5rem 1.25rem; }
  .info-row { display: flex; justify-content: space-between; align-items: center; padding: 0.75rem 0; border-bottom: 1px solid var(--border); }
  .info-label { font-size: 13px; color: var(--text2); display: flex; align-items: center; gap: 6px; }
  .info-val { font-size: 14px; color: var(--text); font-weight: 500; }
  .dark-toggle-row { display: flex; align-items: center; justify-content: space-between; padding: 0.5rem 0; }
  .toggle-label { margin: 0 0 2px; font-size: 14px; font-weight: 500; color: var(--text); }
  .toggle-sub { margin: 0; font-size: 12px; color: var(--text2); }
  .toggle-switch { width: 44px; height: 24px; border-radius: 999px; background: var(--bg3); border: 1px solid var(--border); cursor: pointer; position: relative; transition: background 0.2s; flex-shrink: 0; }
  .toggle-switch.on { background: #7c3aed; border-color: #7c3aed; }
  .toggle-thumb { position: absolute; width: 18px; height: 18px; border-radius: 50%; background: white; top: 2px; left: 2px; transition: left 0.2s; box-shadow: 0 1px 3px rgba(0,0,0,0.2); }
  .toggle-switch.on .toggle-thumb { left: 22px; }

  /* Buttons */
  .btn { display: inline-flex; align-items: center; gap: 6px; padding: 0.45rem 0.9rem; border-radius: 8px; font-size: 13px; font-weight: 500; cursor: pointer; border: none; white-space: nowrap; font-family: inherit; }
  .btn.primary { background: #7c3aed; color: white; }
  .btn.primary:hover { background: #6d28d9; }
  .btn.danger-soft { background: #fef2f2; color: #dc2626; }
  .btn.danger-soft:hover { background: #fee2e2; }
  .btn.success-soft { background: #f0fdf4; color: #16a34a; }
  .btn.warn-soft { background: #fffbeb; color: #d97706; }
  .btn.gray-soft { background: var(--bg3); color: var(--text2); }
  .btn.icon-only { padding: 0.45rem; }

  .icon-btn { background: none; border: none; cursor: pointer; padding: 4px; color: var(--text3); font-size: 16px; border-radius: 4px; }
  .icon-btn:hover { background: var(--bg3); color: var(--text); }

  .flex-row { display: flex; align-items: center; }
  .empty-state { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 3rem; color: var(--text3); }
  .empty-state i { font-size: 48px; }
  .empty-state p { margin: 0; font-size: 14px; }
  .msg { font-size: 13px; margin: 0.5rem 0 0; display: flex; align-items: center; gap: 6px; }
  .msg.err { color: #dc2626; }
  .msg.ok { color: #16a34a; }

  /* ── TABLET ── */
  @media (max-width: 1024px) {
    .stats-row { grid-template-columns: repeat(3, 1fr); }
    .grid-2 { grid-template-columns: 1fr; }
    .settings-grid { grid-template-columns: 1fr; }
    .sidebar { width: 200px; }
    .sidebar.collapsed { width: 60px; }
    .field.wide { grid-column: span 1; }
  }

  /* ── MOBILE ── */
  @media (max-width: 768px) {
    /* Show overlay when menu open */
    .overlay { display: block; }

    /* Sidebar becomes a drawer */
    .sidebar {
      position: fixed;
      left: -280px;
      top: 0;
      width: 260px !important;
      height: 100vh;
      transition: left 0.25s ease;
      z-index: 200;
    }
    .sidebar.mobile-open { left: 0; }
    /* Always show labels in mobile drawer */
    .sidebar .nav-btn span,
    .sidebar .nav-label,
    .sidebar .profile-name,
    .sidebar .admin-badge,
    .sidebar .brand-name { display: block !important; }
    .sidebar .profile { flex-direction: row; }

    /* Topbar */
    .topbar { padding: 0 0.75rem; }
    .topbar-title { font-size: 15px; }
    .username-label { display: none; }

    /* Show/hide */
    .desktop-only { display: none !important; }
    .mobile-only { display: flex !important; }

    /* Stats */
    .stats-row { grid-template-columns: repeat(2, 1fr); gap: 8px; }
    .stat-card { padding: 0.75rem; gap: 0.5rem; }
    .stat-num { font-size: 18px; }

    /* Main */
    .main { padding: 0.75rem; }

    /* Form grid */
    .form-grid { grid-template-columns: 1fr; padding: 1rem; }
    .field.wide { grid-column: span 1; }

    /* Filter bar */
    .filter-bar { flex-direction: column; }
    .search-wrap { min-width: 0; }
    .filter-sel { width: 100%; }

    /* Settings */
    .settings-grid { grid-template-columns: 1fr; }
    .info-row { flex-direction: column; align-items: flex-start; gap: 4px; }
  }

  /* ── SMALL PHONES ── */
  @media (max-width: 480px) {
    .stats-row { grid-template-columns: 1fr 1fr; }
    .topbar { height: auto; min-height: 56px; }
    .avatar-lg { width: 34px; height: 34px; font-size: 14px; }
  }
</style>