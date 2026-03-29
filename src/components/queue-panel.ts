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
  @state() private draggedIndex: number | null = null;
  @state() private dragOverIndex: number | null = null;

  static styles = [
    ...BaseElement.styles,
    css`
    :host {
      display: block;
      height: 100%;
      pointer-events: none;
    }
    
    .drag-over {
        border-top: 2px solid #a17c2f !important;
        background: rgba(74, 59, 42, 0.05);
    }
    
    .dragging {
        opacity: 0.3;
    }
  `];

  private _onStateChanged = (e: Event) => {
    const status = (e as CustomEvent).detail;
    this.reconcileAndSetState(status.items, status.currentIndex, status.position, status.isPlaying, status.gain);
  };

  private reconcileAndSetState(items: any[], currentIndex: number, position: number, isPlaying: boolean, gain: number) {
    const nextRemovedKeys = new Set<string>();
    this.removedKeys.forEach(key => {
      const [indexStr, id] = key.split('-');
      const idx = parseInt(indexStr);
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

  private handleJumpTo(index: number, e: Event) {
    e.stopPropagation();
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
      this.removedKeys.delete(key);
      this.requestUpdate();
    }
  }

  // --- Drag and Drop Logic ---

  private handleDragStart(e: DragEvent, index: number) {
    this.draggedIndex = index;
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', index.toString());
    }
  }

  private handleDragOver(e: DragEvent, index: number) {
    e.preventDefault();
    if (this.draggedIndex === index) return;
    this.dragOverIndex = index;
  }

  private handleDragEnd() {
    this.draggedIndex = null;
    this.dragOverIndex = null;
  }

  private async handleDrop(e: DragEvent, targetIndex: number) {
    e.preventDefault();
    const fromIndex = this.draggedIndex;
    this.draggedIndex = null;
    this.dragOverIndex = null;

    if (fromIndex === null || fromIndex === targetIndex) return;

    // 1. Optimistic Update (Immediate Local Order)
    const items = [...this.queueState.items];
    const [movedItem] = items.splice(fromIndex, 1);
    items.splice(targetIndex, 0, movedItem);

    this.queueState = { ...this.queueState, items };
    this.requestUpdate();

    // 2. Synchronize with Server (Atomic update)
    try {
      await QueueService.reorderQueue(items);
      window.dispatchEvent(new CustomEvent('websonic-queue-changed'));
    } catch (err) {
      console.error('Failed to sync reordered queue', err);
      this.refreshQueue(); // Fallback to server state
    }
  }

  private async handleClearQueue() {
    if (confirm('Are you sure you want to clear the entire play queue?')) {
        // Optimistic UI update
        this.queueState = { ...this.queueState, items: [], currentIndex: -1 };
        this.requestUpdate();
        
        try {
            await QueueService.clearQueue();
            window.dispatchEvent(new CustomEvent('websonic-queue-changed'));
        } catch (err) {
            console.error('Failed to clear queue on server', err);
            this.refreshQueue();
        }
    }
  }

  private handleClose() {
    this.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }));
  }

  render() {
    const pendingItems = QueueService.getPendingItems();
    const visibleItemsCount = this.queueState.items.filter((item, i) => !this.removedKeys.has(`${i}-${item.id}`)).length;
    const hasItems = visibleItemsCount > 0 || pendingItems.length > 0;

    return html`
        <div class="h-full bg-[#e8d5b1] border-l border-[#d3c29d] shadow-[-10px_0_30px_rgba(0,0,0,0.3)] transition-transform duration-500 ease-in-out pointer-events-auto overflow-hidden relative"
             style="transform: translateX(${this.isOpen ? '0' : '100%'})">
          
          <div class="absolute inset-0 opacity-[0.05] pointer-events-none" style="background-image: url('https://www.transparenttextures.com/patterns/cardboard-flat.png');"></div>
          <div class="absolute inset-0 bg-gradient-to-bl from-white/10 to-transparent pointer-events-none"></div>

          <div class="relative p-6 h-full flex flex-col items-center">
              <!-- Re-organized Header: Close on Left, Title on Right -->
              <div class="w-full flex items-center justify-between mb-2">
                <div class="flex items-center">
                    <button @click=${this.handleClose} 
                            class="text-[#4a3b2a] opacity-40 hover:opacity-100 transition-opacity p-2 -ml-3 mr-2 cursor-pointer" 
                            title="Close Queue">
                       <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                    <h2 class="text-xl font-black text-[#4a3b2a] opacity-70 uppercase tracking-[0.3em] truncate">Play Queue</h2>
                </div>
                
                <!-- NEW Clear Queue Button -->
                ${hasItems ? html`
                    <button @click=${this.handleClearQueue} 
                            class="text-[10px] font-black uppercase tracking-widest text-red-900/40 hover:text-red-800 transition-colors flex items-center gap-1 cursor-pointer" 
                            title="Clear All Tracks">
                       <span>Clear</span>
                       <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                ` : ''}
              </div>
              
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
                          <div class="group flex items-center gap-2 p-1.5 border-b border-[#4a3b2a]/5 hover:bg-[#4a3b2a]/5 transition-all cursor-default
                                      ${isCurrent ? 'bg-[#4a3b2a]/10 border-[#4a3b2a]/20' : ''}
                                      ${this.draggedIndex === index ? 'dragging' : ''}
                                      ${this.dragOverIndex === index ? 'drag-over' : ''}"
                               draggable="true"
                               @dragstart=${(e: DragEvent) => this.handleDragStart(e, index)}
                               @dragover=${(e: DragEvent) => this.handleDragOver(e, index)}
                               @dragend=${this.handleDragEnd}
                               @drop=${(e: DragEvent) => this.handleDrop(e, index)}>
                             
                             <!-- Drag Handle -->
                             <div class="flex items-center w-4 text-[#4a3b2a]/10 group-hover:text-[#a17c2f]/40 transition-colors cursor-grab">
                                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M11 18c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm-2-8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm6 4c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>
                             </div>

                             <!-- Play/Index Button -->
                             <div class="relative w-5 h-5 flex items-center justify-center">
                                <span class="text-[9px] font-mono opacity-30 group-hover:hidden ${isCurrent ? 'hidden' : ''}">${index + 1}</span>
                                ${isCurrent ? html`<div class="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse group-hover:hidden"></div>` : ''}
                                <button @click=${(e: Event) => this.handleJumpTo(index, e)} 
                                        class="hidden group-hover:flex w-5 h-5 items-center justify-center text-[#a17c2f] hover:scale-110 transition-transform cursor-pointer" 
                                        title="Play track">
                                   <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"></path></svg>
                                </button>
                             </div>
                             
                             <div class="flex flex-col flex-1 overflow-hidden">
                                <span class="text-sm font-bold text-[#4a3b2a] truncate group-hover:text-black">${item.title}</span>
                                <span class="text-xs text-[#4a3b2a]/60 italic truncate">${item.artist}</span>
                             </div>

                             <button @click=${(e: Event) => this.handleRemoveSong(index, item.id, e)} 
                                     class="opacity-0 group-hover:opacity-100 flex w-6 h-6 items-center justify-center text-[#4a3b2a]/40 hover:text-red-800 transition-colors" title="Remove track">
                                 <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
                             </button>
                          </div>
                        `;
    })}

                      ${pendingItems.map((item, index) => {
      const overallIndex = this.queueState.items.length + index + 1;
      return html`
                          <div class="flex items-center gap-2 p-1.5 border-b border-[#4a3b2a]/5 opacity-40 grayscale-[0.5]">
                             <div class="w-4"></div>
                             <span class="text-[9px] font-mono opacity-30 w-4 pl-1">${overallIndex}</span>
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
        </div>
      `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'queue-panel': QueuePanel;
  }
}
