import { html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { BaseElement } from '../elements/base-element';
import { AuthService } from '../services/auth-service';
import CryptoJS from 'crypto-js';

/**
 * Auth View (Login Form)
 * Provides an interface to configure the connection to a Subsonic server.
 * Styled to fit perfectly within the tablet screen display.
 */
@customElement('auth-view')
export class AuthView extends BaseElement {
  @state() private serverUrl = '';
  @state() private username = '';
  @state() private password = '';
  @state() private error = '';
  @state() private loading = false;

  async handleSubmit(e: Event) {
    e.preventDefault();
    this.loading = true;
    this.error = '';

    try {
      // 1. Generate salt and token for modern Subsonic auth
      const salt = Math.random().toString(36).substring(2, 8);
      const token = CryptoJS.MD5(this.password + salt).toString();

      const config = {
        baseUrl: this.serverUrl.endsWith('/') ? this.serverUrl.slice(0, -1) : this.serverUrl,
        userName: this.username,
        token: token,
        salt: salt,
        clientName: 'WebSonic',
        apiVersion: '1.16.1'
      };

      // 2. Validate connection
      const isValid = await AuthService.validate(config);
      
      if (isValid) {
        AuthService.saveServer(config);
        // Explicitly fire for immediate effect (though AuthService does it too)
        window.dispatchEvent(new CustomEvent('websonic-auth-changed'));
        window.location.href = '/'; 
      } else {
        this.error = 'Connection failed. Please check your credentials and server URL.';
      }
    } catch (err) {
      this.error = 'An unexpected error occurred during authentication.';
      console.error(err);
    } finally {
      this.loading = false;
    }
  }

  handleSwitch(url: string) {
    if (AuthService.switchServer(url)) {
      window.dispatchEvent(new CustomEvent('websonic-auth-changed'));
      window.location.href = '/';
    }
  }

  handleRemove(url: string, e: Event) {
    e.stopPropagation();
    if (confirm('Are you sure you want to remove this server?')) {
      AuthService.removeServer(url);
      this.requestUpdate();
    }
  }

  render() {
    const servers = AuthService.getAllServers();

    return html`
      <style>
        .auth-container {
          display: flex;
          flex-direction: column;
          height: 100%;
          width: 100%;
          padding: 20px;
          color: #ede0c4;
          font-family: var(--font-sans);
          overflow-y: auto;
        }
        .auth-field {
          display: flex;
          flex-direction: column;
          gap: 4px;
          margin-bottom: 12px;
        }
        .auth-input {
          background: rgba(0, 0, 0, 0.4);
          border: 1px solid rgba(159, 145, 114, 0.3);
          border-radius: 4px;
          padding: 8px 12px;
          color: #fff;
          font-size: 14px;
          transition: border-color 0.2s;
        }
        .auth-input:focus {
          outline: none;
          border-color: #d4af37;
        }
      </style>

      <div class="auth-container">
        <h2 class="text-xl font-bold mb-5 uppercase tracking-widest text-[#d4af37]">Server Connections</h2>
        
        <div class="flex flex-col gap-8 h-full overflow-hidden">
          <!-- New Connection Form -->
          <section>
            <h3 class="text-xs font-bold uppercase text-[#9f9172] mb-4">Add New Server</h3>
            <form @submit=${this.handleSubmit} class="flex flex-col gap-4">
              <div class="auth-field">
                <label class="text-[11px] uppercase text-[#9f9172] font-semibold">Subsonic Server URL</label>
                <input 
                  type="url" 
                  class="auth-input"
                  placeholder="http://your-server:4040" 
                  .value=${this.serverUrl}
                  @input=${(e: any) => this.serverUrl = e.target.value}
                  required
                >
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div class="auth-field">
                  <label class="text-[11px] uppercase text-[#9f9172] font-semibold">Username</label>
                  <input 
                    type="text" 
                    class="auth-input"
                    placeholder="admin" 
                    .value=${this.username}
                    @input=${(e: any) => this.username = e.target.value}
                    required
                  >
                </div>

                <div class="auth-field">
                  <label class="text-[11px] uppercase text-[#9f9172] font-semibold">Password</label>
                  <input 
                    type="password" 
                    class="auth-input"
                    placeholder="••••••••" 
                    .value=${this.password}
                    @input=${(e: any) => this.password = e.target.value}
                    required
                  >
                </div>
              </div>

              ${this.error ? html`<div class="text-red-500 text-xs mt-2 p-2 bg-red-500/10 rounded">${this.error}</div>` : ''}

              <button type="submit" ?disabled=${this.loading} class="mt-4 bg-[#8c734b] text-white py-3 rounded font-bold uppercase cursor-pointer hover:brightness-110 disabled:opacity-50 transition-all">
                ${this.loading ? 'Connecting...' : 'Connect to Server'}
              </button>
            </form>
          </section>

          <!-- Saved Servers List -->
          ${servers.length > 0 ? html`
            <section class="flex-1 overflow-y-auto mt-4">
              <h3 class="text-xs font-bold uppercase text-[#9f9172] mb-4">Switch Connection</h3>
              <div class="flex flex-col gap-2">
                ${servers.map(server => html`
                  <div 
                    class="p-3 rounded bg-black/30 border border-white/5 flex items-center justify-between cursor-pointer hover:border-[#d4af37] transition-all group"
                    @click=${() => this.handleSwitch(server.baseUrl)}
                  >
                    <div class="flex flex-col overflow-hidden">
                       <span class="text-sm font-bold truncate text-[#ede0c4]">${server.baseUrl}</span>
                       <span class="text-[10px] text-stone-500 uppercase">${server.userName}</span>
                    </div>
                    <button 
                      class="p-2 text-stone-500 hover:text-red-400 opacity-50 group-hover:opacity-100 transition-opacity"
                      @click=${(e: Event) => this.handleRemove(server.baseUrl, e)}
                    >
                      ×
                    </button>
                  </div>
                `)}
              </div>
            </section>
          ` : ''}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'auth-view': AuthView;
  }
}
