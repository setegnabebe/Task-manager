<script lang="ts">
  import { API_URL } from '$lib/config';

  let username = $state('');
  let password = $state('');
  let error = $state('');
  let success = $state('');
  let showPassword = $state(false);
  let loading = $state(false);

  async function register() {
    error = ''; success = '';
    loading = true;
    const res = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    loading = false;

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
    <div class="logo">
      <div class="logo-icon">✓</div>
      <h1>TaskFlow</h1>
    </div>
    <p class="subtitle">Create your account</p>

    {#if error}
      <div class="alert err"><span>⚠</span> {error}</div>
    {/if}
    {#if success}
      <div class="alert ok"><span>✓</span> {success}</div>
    {/if}

    <div class="field">
      <label>Username</label>
      <input bind:value={username} placeholder="Choose a username"
        onkeydown={(e) => e.key === 'Enter' && register()} />
    </div>

    <div class="field">
      <label>Password</label>
      <div class="password-wrap">
        <input bind:value={password} type={showPassword ? 'text' : 'password'}
          placeholder="Choose a password"
          onkeydown={(e) => e.key === 'Enter' && register()} />
        <button class="eye-btn" onclick={() => showPassword = !showPassword} type="button">
          <i class="ti ti-{showPassword ? 'eye-off' : 'eye'}"></i>
        </button>
      </div>
    </div>

    <button class="submit-btn" onclick={register} disabled={loading}>
      {#if loading}
        <span class="spinner"></span> Creating account...
      {:else}
        Create account
      {/if}
    </button>

    <p class="footer-link">Already have an account? <a href="/login">Sign in</a></p>
  </div>
</main>

<style>
  @import url('https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css');

  :global(body) { margin: 0; }

  main {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100dvh;
    padding: 1rem;
    box-sizing: border-box;
    background: linear-gradient(135deg, #1e1e2e 0%, #313244 100%);
  }

  .card {
    background: white;
    width: 100%;
    max-width: 400px;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    padding: 2.25rem;
    border-radius: 16px;
    box-shadow: 0 24px 64px rgba(0,0,0,0.35);
    box-sizing: border-box;
  }

  .logo {
    display: flex;
    align-items: center;
    gap: 10px;
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
    flex-shrink: 0;
  }

  h1 { margin: 0; font-size: 20px; font-weight: 700; color: #111827; font-family: sans-serif; }
  .subtitle { margin: 0; font-size: 14px; color: #6b7280; font-family: sans-serif; }

  .alert {
    padding: 0.75rem 1rem;
    border-radius: 8px;
    font-size: 14px;
    display: flex;
    align-items: center;
    gap: 8px;
    font-family: sans-serif;
  }
  .alert.err { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; }
  .alert.ok { background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0; }

  .field { display: flex; flex-direction: column; gap: 6px; }

  label {
    font-size: 12px;
    font-weight: 600;
    color: #374151;
    font-family: sans-serif;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  input {
    width: 100%;
    padding: 0.65rem 0.875rem;
    border: 1.5px solid #e5e7eb;
    border-radius: 8px;
    font-size: 14px;
    color: #111827;
    outline: none;
    transition: border 0.15s, box-shadow 0.15s;
    box-sizing: border-box;
    font-family: sans-serif;
    background: white;
  }
  input:focus { border-color: #7c3aed; box-shadow: 0 0 0 3px #7c3aed18; }

  .password-wrap { position: relative; display: flex; align-items: center; }
  .password-wrap input { padding-right: 2.75rem; }

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

  .submit-btn {
    background: #7c3aed;
    color: white;
    border: none;
    border-radius: 10px;
    padding: 0.8rem;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s, transform 0.1s, opacity 0.15s;
    font-family: sans-serif;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
  }
  .submit-btn:hover:not(:disabled) { background: #6d28d9; }
  .submit-btn:active:not(:disabled) { transform: scale(0.98); }
  .submit-btn:disabled { opacity: 0.7; cursor: not-allowed; }

  .spinner {
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255,255,255,0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  .footer-link {
    text-align: center;
    font-size: 13px;
    color: #6b7280;
    margin: 0;
    font-family: sans-serif;
  }
  .footer-link a { color: #7c3aed; text-decoration: none; font-weight: 500; }
  .footer-link a:hover { text-decoration: underline; }

  @media (max-width: 480px) {
    .card { padding: 1.5rem; gap: 1rem; border-radius: 14px; }
    h1 { font-size: 18px; }
    .logo-icon { width: 32px; height: 32px; font-size: 16px; }
  }

  @media (max-width: 360px) {
    main { padding: 0.75rem; }
    .card { padding: 1.25rem; }
    h1 { font-size: 16px; }
  }
</style>