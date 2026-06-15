<script lang="ts">
  let username = $state('');
  let password = $state('');
  let error = $state('');
  let showPassword = $state(false);

  async function login() {
    error = '';
    const res = await fetch('http://localhost:3000/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    if (!res.ok) {
      error = 'Invalid username or password';
      return;
    }

    const data = await res.json();
    localStorage.setItem('token', data.access_token);
    localStorage.setItem('role', data.role);
    localStorage.setItem('username', data.username);

    if (data.role === 'admin') {
      window.location.href = '/admin';
    } else {
      window.location.href = '/';
    }
  }
</script>

<main>
  <div class="card">
    <div class="logo">
      <div class="logo-icon">✓</div>
      <h1>TaskFlow</h1>
    </div>
    <p class="subtitle">Sign in to your account</p>

    {#if error}
      <div class="alert">
        <span>⚠</span> {error}
      </div>
    {/if}

    <div class="field">
      <label>Username</label>
      <input bind:value={username} placeholder="Enter your username"
        onkeydown={(e) => e.key === 'Enter' && login()} />
    </div>

    <div class="field">
      <label>Password</label>
      <div class="password-wrap">
        <input
          bind:value={password}
          type={showPassword ? 'text' : 'password'}
          placeholder="Enter your password"
          onkeydown={(e) => e.key === 'Enter' && login()}
        />
        <button class="eye-btn" onclick={() => showPassword = !showPassword} type="button">
          {#if showPassword}
            <i class="ti ti-eye-off"></i>
          {:else}
            <i class="ti ti-eye"></i>
          {/if}
        </button>
      </div>
    </div>

    <button class="login-btn" onclick={login}>Sign in</button>
  </div>
</main>

<style>
  @import url('https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css');

  :global(body) { margin: 0; background: #f0f2f5; }

  main {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    background: linear-gradient(135deg, #1e1e2e 0%, #313244 100%);
  }

  .card {
    background: white;
    padding: 2.5rem;
    border-radius: 16px;
    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    width: 100%;
    max-width: 400px;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .logo {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 0.25rem;
  }

  .logo-icon {
    width: 36px;
    height: 36px;
    background: #7c3aed;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 18px;
    font-weight: bold;
  }

  h1 { margin: 0; font-size: 22px; font-weight: 700; color: #111827; font-family: sans-serif; }

  .subtitle { margin: 0; font-size: 14px; color: #6b7280; font-family: sans-serif; }

  .alert {
    background: #fef2f2;
    color: #dc2626;
    padding: 0.75rem 1rem;
    border-radius: 8px;
    font-size: 14px;
    display: flex;
    align-items: center;
    gap: 8px;
    font-family: sans-serif;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  label {
    font-size: 13px;
    font-weight: 600;
    color: #374151;
    font-family: sans-serif;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  input {
    width: 100%;
    padding: 0.6rem 0.85rem;
    border: 1.5px solid #e5e7eb;
    border-radius: 8px;
    font-size: 14px;
    color: #111827;
    outline: none;
    transition: border 0.15s, box-shadow 0.15s;
    box-sizing: border-box;
    font-family: sans-serif;
  }

  input:focus { border-color: #7c3aed; box-shadow: 0 0 0 3px #7c3aed18; }

  .password-wrap {
    position: relative;
    display: flex;
    align-items: center;
  }

  .password-wrap input { padding-right: 2.75rem; width: 100%; }

  .eye-btn {
    position: absolute;
    right: 10px;
    background: none;
    border: none;
    cursor: pointer;
    color: #9ca3af;
    font-size: 18px;
    display: flex;
    align-items: center;
    padding: 0;
    transition: color 0.15s;
  }

  .eye-btn:hover { color: #7c3aed; }

  .login-btn {
    background: #7c3aed;
    color: white;
    border: none;
    border-radius: 10px;
    padding: 0.75rem;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s, transform 0.1s;
    font-family: sans-serif;
    margin-top: 0.25rem;
  }

  .login-btn:hover { background: #6d28d9; }
  .login-btn:active { transform: scale(0.98); }
</style>