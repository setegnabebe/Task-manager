<script lang="ts">
  import { API_URL } from '$lib/config';
  import { onMount } from 'svelte';

  interface Notification {
    id: number;
    message: string;
    isRead: boolean;
    created_at: string;
  }

  let notifications = $state<Notification[]>([]);
  let open = $state(false);

  function authHeaders() {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
    };
  }

  async function loadNotifications() {
    const res = await fetch(`${API_URL}/notifications`, {
      headers: authHeaders(),
    });
    notifications = await res.json();
  }

  async function markRead(id: number) {
    await fetch(`${API_URL}/notifications/${id}/read`, {
      method: 'PATCH',
      headers: authHeaders(),
    });
    await loadNotifications();
  }

  async function markAllRead() {
    await fetch(`${API_URL}/notifications/read/all`, {
      method: 'PATCH',
      headers: authHeaders(),
    });
    await loadNotifications();
  }

  function toggleOpen() {
    open = !open;
    if (open) loadNotifications();
  }

  let unreadCount = $derived(notifications.filter(n => !n.isRead).length);

  onMount(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 15000);
    return () => clearInterval(interval);
  });
</script>

<div class="bell-wrapper">
  <button class="bell-btn" onclick={toggleOpen}>
    🔔
    {#if unreadCount > 0}
      <span class="badge">{unreadCount}</span>
    {/if}
  </button>

  {#if open}
    <div class="dropdown">
      <div class="dropdown-header">
        <span>Notifications</span>
        {#if unreadCount > 0}
          <button class="mark-all" onclick={markAllRead}>Mark all read</button>
        {/if}
      </div>

      {#if notifications.length === 0}
        <p class="empty">No notifications</p>
      {:else}
        {#each notifications as n (n.id)}
          <button
            type="button"
            class="notification-item"
            class:unread={!n.isRead}
            onclick={() => markRead(n.id)}
          >
            <p class="msg">{n.message}</p>
            <span class="time">
              {new Date(n.created_at).toLocaleTimeString()}
            </span>
          </button>
        {/each}
      {/if}
    </div>
  {/if}
</div>

<style>
  .bell-wrapper {
    position: relative;
  }

  .bell-btn {
    background: none;
    border: none;
    font-size: 1.4rem;
    cursor: pointer;
    position: relative;
    padding: 0.25rem;
  }

  .badge {
    position: absolute;
    top: -4px;
    right: -4px;
    background: #ef4444;
    color: white;
    font-size: 0.65rem;
    font-weight: bold;
    border-radius: 999px;
    padding: 1px 5px;
    min-width: 16px;
    text-align: center;
  }

  .dropdown {
    position: absolute;
    right: 0;
    top: 2.5rem;
    width: 320px;
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 10px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.12);
    z-index: 100;
    max-height: 400px;
    overflow-y: auto;
  }

  .dropdown-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid #e5e7eb;
    font-weight: 600;
    font-size: 0.95rem;
  }

  .mark-all {
    background: none;
    border: none;
    color: #4f46e5;
    font-size: 0.8rem;
    cursor: pointer;
    padding: 0;
  }

  .notification-item {
    padding: 0.75rem 1rem;
    border-bottom: 1px solid #f3f4f6;
    cursor: pointer;
    transition: background 0.15s;
  }

  .notification-item:hover { background: #f9fafb; }
  .notification-item.unread { background: #eff6ff; }
  .notification-item.unread:hover { background: #dbeafe; }

  .msg {
    margin: 0 0 0.25rem;
    font-size: 0.9rem;
    color: #111827;
  }

  .time {
    font-size: 0.75rem;
    color: #9ca3af;
  }

  .empty {
    padding: 1.5rem;
    text-align: center;
    color: #9ca3af;
    font-size: 0.9rem;
  }
</style>
