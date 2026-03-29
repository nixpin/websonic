import { html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { BaseElement } from '../elements/base-element';
import { type QueueState, QueueService } from '../services/queue-service';
import { PlayerService } from '../services/player-service';
import { PlaybackService } from '../services/playback-service';

@customElement('queue-panel')
export class QueuePanel extends BaseElement {
  @property({ type: Boolean }) isOpen = false;
  
  @state() private queueState: QueueState = { items: [], currentIndex: -1, position: 0, isPlaying: false, gain: 100 };
  @state() private loading = false;
  @state() private removedKeys: Set<string> = new Set(); // Format: "index-id"

  static styles = [
    ...BaseElement.styles,
    css`
    :host {
      display: block;
      height: 100%;
      pointer-events: none;
    }
  `];

  private _onStateChanged = (e: Event) => {
    const status = (e as CustomEvent).detail;
    this.reconcileAndSetState(status.items, status.currentIndex, status.position, status.isPlaying, status.gain);
  };

  private reconcileAndSetState(items: any[], currentIndex: number, position: number, isPlaying: boolean, gain: number) {
    // Smart Reconciliation: Clear removed keys only if the item at that index is different now
    const nextRemovedKeys = new Set<string>();
    this.removedKeys.forEach(key => {
        const [indexStr, id] = key.split('-');
        const idx = parseInt(indexStr);
        // If the item at this index is still the same one we tried to remove, keep hiding it
        if (items[idx] && items[idx].id === id) {
            nextRemovedKeys.add(key);
        }
    });
    this.removedKeys = nextRemovedKeys;

    this.queueState = { items, currentIndex, position, isPlaying, gain };
  }

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener('websonic-player-state-changed', this._onStateChanged);
    window.addEventListener('websonic-queue-changed', () => this.refreshQueue());
    
    // Initial fetch from service
    const status = PlayerService.getInstance().getState();
    if (status) {
      this.reconcileAndSetState(status.items, status.currentIndex, status.position, status.isPlaying, status.gain);
    }
  }

  disconnectedCallback() {
    window.removeEventListener('websonic-player-state-changed', this._onStateChanged);
    window.removeEventListener('websonic-queue-changed', () => this.refreshQueue());
    super.disconnectedCallback();
  }

  updated(changedProperties: Map<string, any>) {
    if (changedProperties.has('isOpen') && this.isOpen) {
      this.refreshQueue();
    }
  }

  async refreshQueue() {
    this.loading = true;
    const newState = await QueueService.fetchQueue();
    this.reconcileAndSetState(newState.items, newState.currentIndex, newState.position, newState.isPlaying, newState.gain);
    this.loading = false;
  }

  private handleJumpTo(index: number) {
    if (index >= this.queueState.items.length) return; 
    PlayerService.getInstance().jumpTo(index);
  }

  private async handleRemoveSong(index: number, id: string, e: Event) {
    e.stopPropagation();
    const key = `${index}-${id}`;
    this.removedKeys.add(key);
    this.requestUpdate();
    
    try {
      await PlaybackService.removeFromQueue(index);
    } catch (err) {
      // If server fails, restore the item
      this.removedKeys.delete(key);
      this.requestUpdate();
    }
  }

  private handleClose() {
    this.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }));
  }

  render() {
    const pendingItems = QueueService.getPendingItems();
    // Filter items based on our smart removedKeys
    const visibleItemsCount = this.queueState.items.filter((item, i) => !this.removedKeys.has(`${i}-${item.id}`)).length;
    const hasItems = visibleItemsCount > 0 || pendingItems.length > 0;

    return html`
      <div class="h-full bg-[#e8d5b1] border-l border-[#d3c29d] shadow-[-10px_0_30px_rgba(0,0,0,0.3)] transition-transform duration-500 ease-in-out pointer-events-auto overflow-hidden relative"
           style="transform: translateX(${this.isOpen ? '0' : '100%'})">
        
        <div class="absolute inset-0 opacity-[0.05] pointer-events-none" style="background-image: url('https://www.transparenttextures.com/patterns/cardboard-flat.png');"></div>
        <div class="absolute inset-0 bg-gradient-to-bl from-white/10 to-transparent pointer-events-none"></div>

        <div class="relative p-6 h-full flex flex-col items-center">
            <h2 class="text-xl font-black text-[#4a3b2a] opacity-70 uppercase tracking-[0.3em] mb-4">Play Queue</h2>
           <div class="w-full h-px bg-[#4a3b2a] opacity-10 mb-4"></div>
           
           <div class="flex-1 w-full overflow-y-auto custom-scrollbar">
               ${this.loading && !hasItems ? html`
                 <div class="flex items-center justify-center h-24 opacity-40">
                    <div class="animate-pulse font-serif italic">Accessing archive...</div>
                 </div>
               ` : !hasItems ? html`
                  <div class="flex items-center justify-center h-24 opacity-40">
                     <p class="text-[#4a3b2a] italic text-sm text-center px-4">The air is silent. No melodies have been summoned yet.</p>
                  </div>
               ` : html`
                 <div class="flex flex-col gap-1">
                    ${this.queueState.items.map((item, index) => {
                      if (this.removedKeys.has(`${index}-${item.id}`)) return null;
                      const isCurrent = index === this.queueState.currentIndex;
                      return html`
                        <div @click=${() => this.handleJumpTo(index)} class="group flex items-center gap-2 p-1.5 border-b border-[#4a3b2a]/5 hover:bg-[#4a3b2a]/5 transition-colors cursor-pointer ${isCurrent ? 'bg-[#4a3b2a]/10 border-[#4a3b2a]/20' : ''}">
                           <span class="text-[9px] font-mono opacity-30 w-4 group-hover:hidden">${isCurrent ? html`<div class="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse"></div>` : index + 1}</span>
                           <button @click=${(e: Event) => this.handleRemoveSong(index, item.id, e)} 
                                   class="hidden group-hover:flex w-4 h-4 items-center justify-center text-[#4a3b2a]/40 hover:text-red-800 transition-colors" title="Remove track">
                               <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
                           </button>
                           
                           <div class="flex flex-col flex-1 overflow-hidden">
                              <span class="text-sm font-bold text-[#4a3b2a] truncate group-hover:text-black">${item.title}</span>
                              <span class="text-xs text-[#4a3b2a]/60 italic truncate">${item.artist}</span>
                              ${isCurrent && this.queueState.position > 0 && item.duration > 0 ? html`
                                <div class="mt-1 w-full h-0.5 bg-[#4a3b2a]/10 rounded-full overflow-hidden">
                                  <div class="h-full bg-amber-600/50" style="width: ${(this.queueState.position / item.duration) * 100}%"></div>
                                </div>
                              ` : ''}
                           </div>
                        </div>
                      `;
                    })}

                    ${pendingItems.map((item, index) => {
                      const overallIndex = this.queueState.items.length + index + 1;
                      return html`
                        <div class="flex items-center gap-2 p-1.5 border-b border-[#4a3b2a]/5 opacity-40 grayscale-[0.5]">
                           <span class="text-[9px] font-mono opacity-30 w-4">${overallIndex}</span>
                           <div class="flex flex-col flex-1 overflow-hidden">
                              <span class="text-sm font-bold text-[#4a3b2a] truncate">${item.title}</span>
                              <div class="flex items-center gap-2">
                                <span class="text-xs text-[#4a3b2a]/60 italic truncate">${item.artist}</span>
                                <div class="w-2 h-2 border border-[#4a3b2a]/20 border-t-transparent rounded-full animate-spin"></div>
                              </div>
                           </div>
                        </div>
                      `;
                    })}
                 </div>
               `}
           </div>
        </div>

        <button @click=${this.handleClose} class="absolute top-3 left-4 text-[#4a3b2a] opacity-40 hover:opacity-100 transition-opacity p-2 cursor-pointer">
           <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'queue-panel': QueuePanel;
  }
}
