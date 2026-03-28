import { SubsonicClient, type SubsonicConfig } from '../sdk/subsonic';

interface AuthStore {
  servers: SubsonicConfig[];
  activeServerUrl?: string;
}

/**
 * Authentication Service
 * Manages a collection of Subsonic server configurations.
 * Handles persistence and session state.
 */
export class AuthService {
  private static readonly STORAGE_KEY = 'websonic_auth_v2';

  /**
   * Internal helper to read the full store
   */
  private static getStore(): AuthStore {
    const data = localStorage.getItem(this.STORAGE_KEY);
    if (!data) return { servers: [] };
    try {
      return JSON.parse(data) as AuthStore;
    } catch {
      return { servers: [] };
    }
  }

  /**
   * Internal helper to save the full store
   */
  private static saveStore(store: AuthStore): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(store));
  }

  private static notifyChange(): void {
    window.dispatchEvent(new CustomEvent('websonic-auth-changed'));
  }

  /**
   * Adds or updates a server in the list and sets it as active
   */
  static saveServer(config: SubsonicConfig): void {
    const store = this.getStore();
    const index = store.servers.findIndex(s => s.baseUrl === config.baseUrl);
    
    if (index >= 0) {
      store.servers[index] = config;
    } else {
      store.servers.push(config);
    }
    
    store.activeServerUrl = config.baseUrl;
    this.saveStore(store);
    this.notifyChange();
  }

  /**
   * Retrieves all registered servers
   */
  static getAllServers(): SubsonicConfig[] {
    return this.getStore().servers;
  }

  /**
   * Gets the currently active server configuration
   */
  static getActiveConfig(): SubsonicConfig | null {
    const store = this.getStore();
    if (!store.activeServerUrl) return null;
    return store.servers.find(s => s.baseUrl === store.activeServerUrl) || null;
  }

  /**
   * Switches the active session to another registered server
   */
  static switchServer(baseUrl: string): boolean {
    const store = this.getStore();
    const exists = store.servers.some(s => s.baseUrl === baseUrl);
    if (exists) {
      store.activeServerUrl = baseUrl;
      this.saveStore(store);
      this.notifyChange();
      return true;
    }
    return false;
  }

  /**
   * Remove a server from the list
   */
  static removeServer(baseUrl: string): void {
    const store = this.getStore();
    store.servers = store.servers.filter(s => s.baseUrl !== baseUrl);
    if (store.activeServerUrl === baseUrl) {
      store.activeServerUrl = store.servers.length > 0 ? store.servers[0].baseUrl : undefined;
    }
    this.saveStore(store);
    this.notifyChange();
  }

  /**
   * Validates if a server configuration works (Ping test)
   */
  static async validate(config: SubsonicConfig): Promise<boolean> {
    const client = new SubsonicClient(config);
    try {
      const response = await client.ping();
      return response.status === 'ok';
    } catch (error) {
      console.error('Connection validation failed:', error);
      return false;
    }
  }

  /**
   * Check if any active session exists
   */
  static isAuthenticated(): boolean {
    return this.getActiveConfig() !== null;
  }

  /**
   * Clears the current session (Logout)
   */
  static logout(): void {
    const store = this.getStore();
    store.activeServerUrl = undefined;
    this.saveStore(store);
    this.notifyChange();
  }
}
