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
    if (!newTaskTitle.trim()) return;await fetch(`${API_URL}/tasks`, {
      method: 'POST', headers: authHeaders(),
      body: JSON.stringify({
        title: newTaskTitle,
        assigneeId: newTaskAssignee,
        priority: newTaskPriority,
        dueDate: newTaskDueDate || null,
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
     method: 'PATCH',
     headers: authHeaders(),
     body: JSON.stringify({ assigneeId }),
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

<div class="shell" class:dark={darkMode}>
  <!-- Sidebar -->
  <aside class="sidebar" class:collapsed={!sidebarOpen}>
    <div class="brand">
      <div class="brand-icon">✓</div>
      {#if sidebarOpen}<span class="brand-name">TaskFlow</span>{/if}
    </div>

    <div class="profile">
      <div class="avatar-lg">{currentUsername[0]?.toUpperCase()}</div>
      {#if sidebarOpen}
        <div>
          <p class="profile-name">{currentUsername}</p>
          <span class="admin-badge">⚙ Admin</span>
        </div>
      {/if}
    </div>

    <nav class="nav">
      {#if sidebarOpen}<p class="nav-label">Main</p>{/if}
      <button class="nav-btn" class:active={activePage==='dashboard'} onclick={() => activePage='dashboard'}>
        <i class="ti ti-layout-dashboard"></i>{#if sidebarOpen}<span>Dashboard</span>{/if}
      </button>
      <button class="nav-btn" class:active={activePage==='users'} onclick={() => { activePage='users'; }}>
        <i class="ti ti-users"></i>{#if sidebarOpen}<span>Users</span>{/if}
      </button>
      <button class="nav-btn" class:active={activePage==='tasks'} onclick={() => activePage='tasks'}>
        <i class="ti ti-checklist"></i>{#if sidebarOpen}<span>Tasks</span>{/if}
      </button>
      <button class="nav-btn" class:active={activePage==='activity'} onclick={() => { activePage='activity'; loadActivity(); }}>
        <i class="ti ti-history"></i>{#if sidebarOpen}<span>Activity</span>{/if}
      </button>
      {#if sidebarOpen}<p class="nav-label">Account</p>{/if}
      <button class="nav-btn" class:active={activePage==='settings'} onclick={() => activePage='settings'}>
        <i class="ti ti-settings"></i>{#if sidebarOpen}<span>Settings</span>{/if}
      </button>
    </nav>

    <div class="sidebar-bottom">
      <a href="/" class="nav-btn">
        <i class="ti ti-arrow-left"></i>{#if sidebarOpen}<span>My Tasks</span>{/if}
      </a>
      <button class="nav-btn danger" onclick={logout}>
        <i class="ti ti-logout"></i>{#if sidebarOpen}<span>Logout</span>{/if}
      </button>
    </div>
  </aside>

  <div class="content-wrap">
    <!-- Topbar -->
    <header class="topbar">
      <button class="toggle-btn" onclick={() => sidebarOpen = !sidebarOpen}>
        <i class="ti ti-menu-2"></i>
      </button>
      <h1 class="topbar-title">
        {activePage === 'dashboard' ? 'Dashboard' : activePage === 'users' ? 'User Management' : activePage === 'tasks' ? 'Task Management' : activePage === 'activity' ? 'Activity Log' : 'Settings'}
      </h1>
      <div class="topbar-right">
        <button class="dark-toggle" onclick={toggleDark} title="Toggle dark mode">
          <i class="ti ti-{darkMode ? 'sun' : 'moon'}"></i>
        </button>
        <NotificationBell />
        <div class="topbar-user">
          <div class="avatar-sm">{currentUsername[0]?.toUpperCase()}</div>
          {#if sidebarOpen}<span>{currentUsername}</span>{/if}
        </div>
      </div>
    </header>

    <main class="main">

      <!-- DASHBOARD -->
      {#if activePage === 'dashboard'}
        <div class="stats-row">
          <div class="stat-card">
            <div class="stat-icon-wrap blue"><i class="ti ti-users"></i></div>
            <div><p class="stat-label">Total users</p><p class="stat-num">{users.length}</p></div>
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
              <div class="bar-row">
                <span class="bar-label">Done</span>
                <div class="bar-track"><div class="bar-fill green" style="width:{tasks.length ? (totalDone/tasks.length*100).toFixed(0) : 0}%"></div></div>
                <span class="bar-pct">{tasks.length ? (totalDone/tasks.length*100).toFixed(0) : 0}%</span>
              </div>
              <div class="bar-row">
                <span class="bar-label">In progress</span>
                <div class="bar-track"><div class="bar-fill amber" style="width:{tasks.length ? (totalInProgress/tasks.length*100).toFixed(0) : 0}%"></div></div>
                <span class="bar-pct">{tasks.length ? (totalInProgress/tasks.length*100).toFixed(0) : 0}%</span>
              </div>
              <div class="bar-row">
                <span class="bar-label">Todo</span>
                <div class="bar-track"><div class="bar-fill gray" style="width:{tasks.length ? (totalTodo/tasks.length*100).toFixed(0) : 0}%"></div></div>
                <span class="bar-pct">{tasks.length ? (totalTodo/tasks.length*100).toFixed(0) : 0}%</span>
              </div>
              {#if overdueCount > 0}
              <div class="bar-row">
                <span class="bar-label">Overdue</span>
                <div class="bar-track"><div class="bar-fill red" style="width:{tasks.length ? (overdueCount/tasks.length*100).toFixed(0) : 0}%"></div></div>
                <span class="bar-pct red">{tasks.length ? (overdueCount/tasks.length*100).toFixed(0) : 0}%</span>
              </div>
              {/if}
            </div>
          </div>

          <div class="panel">
            <div class="panel-head"><i class="ti ti-users"></i> Team</div>
            <div class="user-list">
              {#each users as user (user.id)}
                <div class="user-row">
                  <div class="avatar-sm">{user.username[0].toUpperCase()}</div>
                  <div style="flex:1">
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
          <table class="tbl">
            <thead><tr><th>Title</th><th>Priority</th><th>Assigned to</th><th>Due date</th><th>Status</th></tr></thead>
            <tbody>
              {#each tasks as task (task.id)}
                <tr>
                  <td class="task-title">{task.title}</td>
                  <td><span class="priority-badge {task.priority}">{task.priority}</span></td>
              <td>
                <select
                  class="reassign-sel"
                  value={task.assignee?.id ?? ''}
                  onchange={(e) => reassignTask(task.id, +e.currentTarget.value)}
                >
                  <option value="">Unassigned</option>
                  {#each users as user (user.id)}
                    <option value={user.id}>{user.username}</option>
                  {/each}
              </select>
           </td>
                  <td>
                    {#if task.dueDate}
                      <span class="due-date" class:overdue={isOverdue(task.dueDate) && task.status !== 'done'}>
                        {#if isOverdue(task.dueDate) && task.status !== 'done'}<i class="ti ti-alert-circle"></i>{/if}
                        {formatDate(task.dueDate)}
                      </span>
                    {:else}<span class="chip gray">No due date</span>{/if}
                  </td>
                  <td><span class="chip {task.status}">{task.status.replace('_',' ')}</span></td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}

      <!-- USERS -->
      {#if activePage === 'users'}
        <div class="panel">
          <div class="panel-head"><i class="ti ti-user-plus"></i> Create new user</div>
          <div class="form-row">
            <div class="field"><label>Username</label><input bind:value={newUsername} placeholder="e.g. john_doe" /></div>
            <div class="field"><label>Password</label><input bind:value={newPassword} type="password" placeholder="••••••••" /></div>
            <div class="field"><label>Role</label>
              <select bind:value={newRole}>
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div class="field" style="justify-content:flex-end">
              <label>&nbsp;</label>
              <button class="btn primary" onclick={createUser}><i class="ti ti-plus"></i> Create user</button>
            </div>
          </div>
          {#if userError}<p class="msg err"><i class="ti ti-alert-circle"></i> {userError}</p>{/if}
          {#if userSuccess}<p class="msg ok"><i class="ti ti-circle-check"></i> {userSuccess}</p>{/if}
        </div>

        <div class="panel">
          <div class="panel-head"><i class="ti ti-users"></i> All users <span class="count-badge">{users.length}</span></div>
          <table class="tbl">
            <thead><tr><th>User</th><th>Role</th><th>Tasks assigned</th><th>Actions</th></tr></thead>
            <tbody>
              {#each users as user (user.id)}
                <tr>
                  <td>
                    <div class="flex-row">
                      <div class="avatar-sm">{user.username[0].toUpperCase()}</div>
                      <div>
                        <p class="user-name">{user.username}</p>
                        <p class="user-meta">ID: {user.id}</p>
                      </div>
                    </div>
                  </td>
                  <td><span class="role-pill" class:admin={user.role==='admin'}>{user.role}</span></td>
                  <td><span class="chip blue">{tasks.filter(t => t.assignee?.id === user.id).length} tasks</span></td>
                  <td><button class="btn danger-soft" onclick={() => deleteUser(user.id)}><i class="ti ti-trash"></i> Delete</button></td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}

      <!-- TASKS -->
      {#if activePage === 'tasks'}
        <div class="panel">
          <div class="panel-head"><i class="ti ti-plus"></i> Create & assign task</div>
          <div class="form-row">
            <div class="field" style="flex:2"><label>Title</label><input bind:value={newTaskTitle} placeholder="Task title..." /></div>
            <div class="field"><label>Assign to</label>
              <select bind:value={newTaskAssignee}>
                <option value={null}>Select user...</option>
                {#each users as user (user.id)}<option value={user.id}>{user.username}</option>{/each}
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
            <div class="field" style="justify-content:flex-end">
              <label>&nbsp;</label>
              <button class="btn primary" onclick={createTask}><i class="ti ti-plus"></i> Add task</button>
            </div>
          </div>
        </div>

        <!-- Search & Filter -->
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
            {#each users as user (user.id)}<option value={String(user.id)}>{user.username}</option>{/each}
          </select>
          <span class="result-count">{filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''}</span>
        </div>

        <div class="panel">
          <div class="panel-head"><i class="ti ti-list"></i> Tasks <span class="count-badge">{filteredTasks.length}</span></div>
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
                      <span class="task-title">{task.title}</span>
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
                    {#if task.assignee}
                      <div class="flex-row" style="gap:6px">
                        <div class="avatar-xs">{task.assignee.username[0].toUpperCase()}</div>
                        <span style="font-size:13px">{task.assignee.username}</span>
                      </div>
                    {:else}<span class="chip gray">Unassigned</span>{/if}
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
      {/if}

      <!-- ACTIVITY LOG -->
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
                      {#if act.performedBy}
                        <span class="chip blue">{act.performedBy.username}</span>
                      {/if}
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
    --bg: #1e1e2e;
    --bg2: #181825;
    --bg3: #313244;
    --border: #45475a;
    --text: #cdd6f4;
    --text2: #a6adc8;
    --text3: #6c7086;
    --card: #24273a;
    --panel: #1e2030;
  }

  :global(html) {
    --bg: #f0f2f5;
    --bg2: #ffffff;
    --bg3: #f9fafb;
    --border: #e5e7eb;
    --text: #111827;
    --text2: #6b7280;
    --text3: #9ca3af;
    --card: #ffffff;
    --panel: #ffffff;
  }

  :global(body) { margin: 0; }

  .shell { display: flex; min-height: 100vh; background: var(--bg); font-family: sans-serif; transition: background 0.2s; }

  .sidebar { width: 240px; background: #1e1e2e; color: #cdd6f4; display: flex; flex-direction: column; flex-shrink: 0; position: sticky; top: 0; height: 100vh; overflow: hidden; transition: width 0.2s; }
  .sidebar.collapsed { width: 64px; }

  .brand { display: flex; align-items: center; gap: 10px; padding: 1.25rem 1rem; border-bottom: 1px solid #313244; }
  .brand-icon { width: 32px; height: 32px; background: #7c3aed; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 16px; color: white; font-weight: bold; flex-shrink: 0; }
  .brand-name { font-size: 15px; font-weight: 600; color: #cdd6f4; white-space: nowrap; }

  .profile { display: flex; align-items: center; gap: 10px; padding: 1rem; border-bottom: 1px solid #313244; }
  .avatar-lg { width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, #7c3aed, #4f46e5); display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 600; color: white; flex-shrink: 0; }
  .avatar-sm { width: 30px; height: 30px; border-radius: 50%; background: #4f46e5; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600; color: white; flex-shrink: 0; }
  .avatar-xs { width: 22px; height: 22px; border-radius: 50%; background: #4f46e5; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 600; color: white; flex-shrink: 0; }
  .profile-name { margin: 0; font-size: 14px; font-weight: 500; color: #cdd6f4; }
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

  .content-wrap { flex: 1; display: flex; flex-direction: column; min-width: 0; }

  .topbar { height: 60px; background: var(--card); border-bottom: 1px solid var(--border); display: flex; align-items: center; gap: 1rem; padding: 0 1.5rem; position: sticky; top: 0; z-index: 10; }
  .toggle-btn { background: none; border: none; font-size: 20px; cursor: pointer; color: var(--text2); padding: 4px; border-radius: 6px; display: flex; }
  .toggle-btn:hover { background: var(--bg3); }
  .topbar-title { margin: 0; font-size: 17px; font-weight: 600; color: var(--text); flex: 1; }
  .topbar-right { display: flex; align-items: center; gap: 1rem; }
  .topbar-user { display: flex; align-items: center; gap: 8px; font-size: 14px; color: var(--text); font-weight: 500; }

  .dark-toggle { background: none; border: none; font-size: 18px; cursor: pointer; color: var(--text2); padding: 6px; border-radius: 6px; display: flex; }
  .dark-toggle:hover { background: var(--bg3); }

  .main { padding: 1.5rem; flex: 1; }

  .stats-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; margin-bottom: 1.5rem; }
  .stat-card { background: var(--card); border-radius: 12px; padding: 1.25rem; display: flex; align-items: center; gap: 1rem; border: 1px solid var(--border); }
  .stat-icon-wrap { width: 44px; height: 44px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0; }
  .stat-icon-wrap.blue { background: #eff6ff; color: #3b82f6; }
  .stat-icon-wrap.purple { background: #f5f3ff; color: #7c3aed; }
  .stat-icon-wrap.amber { background: #fffbeb; color: #f59e0b; }
  .stat-icon-wrap.green { background: #f0fdf4; color: #22c55e; }
  .stat-icon-wrap.red { background: #fef2f2; color: #ef4444; }
  .stat-label { margin: 0 0 2px; font-size: 12px; color: var(--text2); }
  .stat-num { margin: 0; font-size: 24px; font-weight: 700; color: var(--text); }
  .stat-num.amber { color: #f59e0b; }
  .stat-num.green { color: #22c55e; }
  .stat-num.red { color: #ef4444; }

  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem; }

  .panel { background: var(--panel); border-radius: 12px; border: 1px solid var(--border); margin-bottom: 1rem; overflow: hidden; }
  .panel-head { display: flex; align-items: center; gap: 8px; padding: 1rem 1.25rem; font-size: 14px; font-weight: 600; color: var(--text); border-bottom: 1px solid var(--border); background: var(--bg3); }
  .panel-head i { font-size: 16px; color: #7c3aed; }

  .count-badge { margin-left: auto; background: var(--bg3); color: var(--text2); font-size: 12px; padding: 2px 8px; border-radius: 999px; border: 1px solid var(--border); }

  .breakdown-bars { padding: 1.25rem; display: flex; flex-direction: column; gap: 1rem; }
  .bar-row { display: flex; align-items: center; gap: 10px; }
  .bar-label { font-size: 13px; color: var(--text2); width: 80px; }
  .bar-track { flex: 1; height: 8px; background: var(--bg3); border-radius: 999px; overflow: hidden; }
  .bar-fill { height: 100%; border-radius: 999px; transition: width 0.5s; }
  .bar-fill.green { background: #22c55e; }
  .bar-fill.amber { background: #f59e0b; }
  .bar-fill.gray { background: #9ca3af; }
  .bar-fill.red { background: #ef4444; }
  .bar-pct { font-size: 12px; color: var(--text2); width: 32px; text-align: right; }
  .bar-pct.red { color: #ef4444; }

  .user-list { padding: 0.5rem 0; }
  .user-row { display: flex; align-items: center; gap: 10px; padding: 0.65rem 1.25rem; }
  .user-row:hover { background: var(--bg3); }
  .user-name { margin: 0; font-size: 14px; font-weight: 500; color: var(--text); }
  .user-meta { margin: 0; font-size: 12px; color: var(--text3); }

  /* Filter bar */
  .filter-bar { display: flex; align-items: center; gap: 10px; margin-bottom: 1rem; flex-wrap: wrap; }
  .search-wrap { display: flex; align-items: center; gap: 8px; background: var(--card); border: 1px solid var(--border); border-radius: 8px; padding: 0.4rem 0.75rem; flex: 1; min-width: 180px; }
  .search-wrap i { color: var(--text3); font-size: 16px; }
  .search-inp { border: none; outline: none; font-size: 14px; background: transparent; color: var(--text); width: 100%; }
  .filter-sel { padding: 0.45rem 0.75rem; border: 1px solid var(--border); border-radius: 8px; font-size: 13px; background: var(--card); color: var(--text); outline: none; cursor: pointer; }
  .result-count { font-size: 13px; color: var(--text2); white-space: nowrap; }

  /* Table */
  .tbl { width: 100%; border-collapse: collapse; font-size: 14px; }
  .tbl th { text-align: left; padding: 0.6rem 1rem; font-size: 11px; font-weight: 600; color: var(--text2); background: var(--bg3); border-bottom: 1px solid var(--border); text-transform: uppercase; letter-spacing: 0.04em; }
  .tbl td { padding: 0.75rem 1rem; border-bottom: 1px solid var(--border); color: var(--text); }
  .task-row:hover td { background: var(--bg3); }
  .task-row.overdue-row td { border-left: 3px solid #ef4444; }
  .sub-row td { background: var(--bg3); }
  .add-sub-row td { background: #f0fdf4; padding: 0.5rem 1rem; }
  .task-title { font-weight: 500; }
  .id-cell { color: var(--text3); font-size: 12px; }

  /* Priority */
  .priority-badge { font-size: 11px; padding: 3px 8px; border-radius: 999px; font-weight: 500; text-transform: capitalize; }
  .priority-badge.low { background: #eff6ff; color: #2563eb; }
  .priority-badge.medium { background: #fffbeb; color: #d97706; }
  .priority-badge.high { background: #fef2f2; color: #dc2626; }

  .priority-sel { font-size: 12px; padding: 0.3rem 0.5rem; border-radius: 6px; border: 1px solid var(--border); outline: none; cursor: pointer; }
  .priority-sel.low { background: #eff6ff; color: #2563eb; border-color: #bfdbfe; }
  .priority-sel.medium { background: #fffbeb; color: #d97706; border-color: #fde68a; }
  .priority-sel.high { background: #fef2f2; color: #dc2626; border-color: #fecaca; }

  /* Due date */
  .due-date { font-size: 13px; color: var(--text2); display: flex; align-items: center; gap: 4px; }
  .due-date.overdue { color: #ef4444; font-weight: 500; }
  .overdue-label { display: block; font-size: 11px; color: #ef4444; font-weight: 500; margin-top: 2px; }
  .date-inp { font-size: 12px; padding: 0.2rem 0.4rem; border: 1px solid var(--border); border-radius: 6px; background: var(--card); color: var(--text); outline: none; }

  /* Status */
  .status-sel { font-size: 12px; padding: 0.3rem 0.5rem; border-radius: 6px; border: 1px solid var(--border); outline: none; cursor: pointer; }
  .status-sel.done { background: #f0fdf4; color: #16a34a; border-color: #bbf7d0; }
  .status-sel.in_progress { background: #fffbeb; color: #d97706; border-color: #fde68a; }
  .status-sel.todo { background: var(--bg3); color: var(--text2); }

  /* Chips */
  .chip { font-size: 12px; padding: 3px 8px; border-radius: 999px; }
  .chip.blue { background: #eff6ff; color: #2563eb; }
  .chip.gray { background: var(--bg3); color: var(--text2); }
  .chip.done { background: #f0fdf4; color: #16a34a; }
  .chip.in_progress { background: #fffbeb; color: #d97706; }
  .chip.todo { background: var(--bg3); color: var(--text2); }

  .role-pill { font-size: 12px; padding: 3px 10px; border-radius: 999px; background: var(--bg3); color: var(--text2); }
  .role-pill.admin { background: #f5f3ff; color: #7c3aed; }

  /* Activity */
  .activity-list { padding: 0.5rem 0; }
  .activity-item { display: flex; align-items: flex-start; gap: 12px; padding: 1rem 1.25rem; border-bottom: 1px solid var(--border); }
  .activity-item:last-child { border-bottom: none; }
  .act-icon-wrap { width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; flex-shrink: 0; }
  .act-icon-wrap.blue { background: #eff6ff; color: #3b82f6; }
  .act-icon-wrap.green { background: #f0fdf4; color: #22c55e; }
  .act-icon-wrap.red { background: #fef2f2; color: #ef4444; }
  .act-body { flex: 1; }
  .act-details { margin: 0 0 6px; font-size: 14px; color: var(--text); }
  .act-meta { display: flex; align-items: center; gap: 8px; }
  .act-time { font-size: 12px; color: var(--text3); }

  /* Form */
  .form-row { display: flex; gap: 1rem; padding: 1.25rem; flex-wrap: wrap; align-items: flex-end; }
  .field { display: flex; flex-direction: column; gap: 4px; flex: 1; min-width: 130px; }
  .field label { font-size: 11px; font-weight: 600; color: var(--text2); text-transform: uppercase; letter-spacing: 0.04em; }

  input, select { padding: 0.5rem 0.75rem; border: 1px solid var(--border); border-radius: 8px; font-size: 14px; color: var(--text); background: var(--card); outline: none; transition: border 0.15s; font-family: inherit; }
  input:focus, select:focus { border-color: #7c3aed; box-shadow: 0 0 0 3px #7c3aed15; }
  .inline-inp { padding: 0.3rem 0.5rem; font-size: 13px; border-radius: 6px; width: 100%; flex: none; }

  /* Buttons */
  .btn { display: inline-flex; align-items: center; gap: 6px; padding: 0.45rem 0.9rem; border-radius: 8px; font-size: 13px; font-weight: 500; cursor: pointer; border: none; white-space: nowrap; font-family: inherit; }
  .btn.primary { background: #7c3aed; color: white; }
  .btn.primary:hover { background: #6d28d9; }
  .btn.danger-soft { background: #fef2f2; color: #dc2626; }
  .btn.danger-soft:hover { background: #fee2e2; }
  .btn.success-soft { background: #f0fdf4; color: #16a34a; }
  .btn.warn-soft { background: #fffbeb; color: #d97706; }
  .btn.gray-soft { background: var(--bg3); color: var(--text2); }

  .icon-btn { background: none; border: none; cursor: pointer; padding: 4px; color: var(--text3); font-size: 16px; border-radius: 4px; }
  .icon-btn:hover { background: var(--bg3); color: var(--text); }

  /* Settings */
  .settings-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; align-items: start; }
  .settings-form { display: flex; flex-direction: column; gap: 0.75rem; padding: 1.25rem; }
  .info-block { padding: 0.5rem 1.25rem; }
  .info-row { display: flex; justify-content: space-between; align-items: center; padding: 0.75rem 0; border-bottom: 1px solid var(--border); }
  .info-label { font-size: 13px; color: var(--text2); display: flex; align-items: center; gap: 6px; }
  .info-val { font-size: 14px; color: var(--text); font-weight: 500; }

  /* Dark mode toggle switch */
  .dark-toggle-row { display: flex; align-items: center; justify-content: space-between; padding: 0.5rem 0; }
  .toggle-label { margin: 0 0 2px; font-size: 14px; font-weight: 500; color: var(--text); }
  .toggle-sub { margin: 0; font-size: 12px; color: var(--text2); }
  .toggle-switch { width: 44px; height: 24px; border-radius: 999px; background: var(--bg3); border: 1px solid var(--border); cursor: pointer; position: relative; transition: background 0.2s; flex-shrink: 0; }
  .toggle-switch.on { background: #7c3aed; border-color: #7c3aed; }
  .toggle-thumb { position: absolute; width: 18px; height: 18px; border-radius: 50%; background: white; top: 2px; left: 2px; transition: left 0.2s; box-shadow: 0 1px 3px rgba(0,0,0,0.2); }
  .toggle-switch.on .toggle-thumb { left: 22px; }

  .flex-row { display: flex; align-items: center; }
  .empty-state { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 3rem; color: var(--text3); }
  .empty-state i { font-size: 48px; }
  .empty-state p { margin: 0; font-size: 14px; }

  .msg { font-size: 13px; margin: 0.5rem 0 0; display: flex; align-items: center; gap: 6px; }
  .msg.err { color: #dc2626; }
  .msg.ok { color: #16a34a; }
</style>