<script lang="ts">
  import { API_URL } from '$lib/config';
  let username = $state('');
  let password = $state('');
  let error = $state('');
  let success = $state('');

  async function register() {
    error = '';
    success = '';
    const res = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    if (!res.ok) {
      const data = await res.json();
      error = data.message || 'Registration failed';
      return;
    }

    success = 'Account created! Redirecting to login...';
    setTimeout(() => window.location.href = '/login', 1500);
  }
</script>


<main>
  <div class="card">
    <h1>Register</h1>

    {#if error}
      <p class="error">{error}</p>
    {/if}

    {#if success}
      <p class="success">{success}</p>
    {/if}

    <input bind:value={username} placeholder="Username" />
    <input bind:value={password} placeholder="Password" type="password"
      onkeydown={(e) => e.key === 'Enter' && register()} />
    <button onclick={register}>Register</button>
    <p class="link">Already have an account? <a href="/login">Login</a></p>
  </div>
</main>

<style>
main {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: #f3f4f6;
  padding: 1rem;
  box-sizing: border-box;
}

 .card {
  background: white;
  padding: 2rem;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.1);
  width: 100%;
  max-width: 380px;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  box-sizing: border-box;
}

  h1 { margin: 0; font-size: 1.5rem; }

  input {
    padding: 0.6rem 0.8rem;
    border: 1px solid #ccc;
    border-radius: 6px;
    font-size: 1rem;
    width: 100%;
    box-sizing: border-box;
  }

  button {
    padding: 0.65rem;
    background: #4f46e5;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 1rem;
    cursor: pointer;
  }

  .error { color: #ef4444; font-size: 0.9rem; margin: 0; }
  .success { color: #059669; font-size: 0.9rem; margin: 0; }

  .link {
    text-align: center;
    font-size: 0.9rem;
    margin: 0;
  }

  @media (max-width: 480px) {
  main {
    padding: 0.75rem;
  }

  .card {
    padding: 1.25rem;
    border-radius: 10px;
  }

  h1 {
    font-size: 1.3rem;
    text-align: center;
  }

  input,
  button {
    font-size: 0.95rem;
  }

  .link {
    font-size: 0.85rem;
  }
}
</style>