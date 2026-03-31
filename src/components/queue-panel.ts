import { html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { BaseElement } from '../elements/base-element';
import { type QueueState, QueueService } from '../services/queue-service';
import { PlayerService } from '../services/player-service';
import { PlaybackService } from '../services/playback-service';
import { ICONS } from './icons';

@customElement('queue-panel')
export class QueuePanel extends BaseElement {
  @property({ type: Boolean }) isOpen = false;

  @state() private queueState: QueueState = { items: [], currentIndex: -1, position: 0, isPlaying: false, gain: 100 };
  @state() private loading = false;
  @state() private removedKeys: Set<string> = new Set(); // Format: "index-id"
  @state() private draggedIndex: number | null = null;
  @state() private dragOverIndex: number | null = null;
  @state() private searchQuery: string = '';

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
    const currentItems = status.items || this.queueState.items;
    this.reconcileAndSetState(currentItems, status.currentIndex, status.position, status.isPlaying, status.gain);
  };

  private _onQueueChanged = (e: Event) => {
    const customEvent = e as CustomEvent;
    if (customEvent.detail) {
      const newState = customEvent.detail;
      this.reconcileAndSetState(newState.items, newState.currentIndex, newState.position, newState.isPlaying, newState.gain);
    } else {
      this.refreshQueue();
    }
  };

  private reconcileAndSetState(items: any[], currentIndex: number, position: number, isPlaying: boolean, gain: number) {
    const nextRemovedKeys = new Set<string>();
    if (items) {
      this.removedKeys.forEach(key => {
        const [indexStr, id] = key.split('-');
        const idx = parseInt(indexStr);
        if (items[idx] && items[idx].id === id) {
          nextRemovedKeys.add(key);
        }
      });
    }
    this.removedKeys = nextRemovedKeys;

    this.queueState = { items: items || [], currentIndex, position, isPlaying, gain };
  }

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener('websonic-player-state-changed', this._onStateChanged);
    window.addEventListener('websonic-queue-changed', this._onQueueChanged);

    const status = PlayerService.getInstance().getState();
    if (status) {
      const currentItems = (status as any).items || this.queueState.items;
      this.reconcileAndSetState(currentItems, status.currentIndex, status.position, status.isPlaying, status.gain);
    }
  }

  disconnectedCallback() {
    window.removeEventListener('websonic-player-state-changed', this._onStateChanged);
    window.removeEventListener('websonic-queue-changed', this._onQueueChanged);
    super.disconnectedCallback();
  }

  updated(changedProperties: Map<string, any>) {
    if (changedProperties.has('isOpen') && this.isOpen) {
      this.refreshQueue();
    } else if (changedProperties.has('isOpen') && !this.isOpen) {
      // Clear search when panel closes
      this.searchQuery = '';
    }
  }

  async refreshQueue() {
    this.loading = true;
    const newState = await QueueService.fetchQueue();
    this.reconcileAndSetState(newState.items, newState.currentIndex, newState.position, newState.isPlaying, newState.gain);
    this.loading = false;
  }

  private handleSearch(e: Event) {
    const target = e.target as HTMLInputElement;
    this.searchQuery = target.value.toLowerCase();
  }

  private handleClearSearch() {
    this.searchQuery = '';
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
    // 1. Filter out optimistically removed items and map them to retain original indices
    const nonRemovedItems = this.queueState.items
      .map((item, index) => ({ item, index }))
      .filter(({ item, index }) => !this.removedKeys.has(`${index}-${item.id}`));
      
    const hasItems = nonRemovedItems.length > 0;

    // 2. Apply search text query
    const filteredItems = nonRemovedItems.filter(({ item }) => {
      if (!this.searchQuery) return true;
      const term = this.searchQuery;
      return item.title.toLowerCase().includes(term) || item.artist.toLowerCase().includes(term);
    });

    return html`
        <div class="h-full bg-[#e8d5b1] border-l border-[#d3c29d] shadow-[-10px_0_30px_rgba(0,0,0,0.3)] transition-transform duration-500 ease-in-out pointer-events-auto overflow-hidden relative flex flex-col"
             style="transform: translateX(${this.isOpen ? '0' : '100%'})">
          
          <div class="absolute inset-0 opacity-[0.05] pointer-events-none" style="background-image: url('https://www.transparenttextures.com/patterns/cardboard-flat.png');"></div>
          <div class="absolute inset-0 bg-gradient-to-bl from-white/10 to-transparent pointer-events-none"></div>

          <div class="relative p-6 px-4 sm:px-6 h-full flex flex-col w-full">
              <!-- Header -->
              <div class="w-full flex items-center justify-between mb-2">
                <div class="flex items-center">
                    <button @click=${this.handleClose} 
                            class="text-[#4a3b2a] opacity-40 hover:opacity-100 transition-opacity p-2 -ml-3 mr-2 cursor-pointer flex-shrink-0" 
                            title="Close Queue">
                       ${ICONS.CLOSE_BOLD}
                    </button>
                    <h2 class="text-xl font-black text-[#4a3b2a] opacity-70 uppercase tracking-[0.3em] truncate">Play Queue</h2>
                </div>
                
                ${hasItems ? html`
                    <button @click=${this.handleClearQueue} 
                            class="text-[10px] font-black uppercase tracking-widest text-red-900/40 hover:text-red-800 transition-colors flex items-center gap-1 cursor-pointer flex-shrink-0 ml-2" 
                            title="Clear All Tracks">
                       <span class="hidden sm:inline">Clear</span>
                       ${ICONS.DELETE}
                    </button>
                ` : ''}
              </div>
              
             <div class="w-full h-px bg-[#4a3b2a] opacity-10 mb-4 shrink-0"></div>
             
             <!-- Search Filter -->
             ${hasItems ? html`
                 <div class="w-full mb-4 relative shrink-0">
                    <input type="text"
                           .value=${this.searchQuery}
                           @input=${this.handleSearch}
                           placeholder="Filter queue by title or artist..."
                           class="w-full bg-[#4a3b2a]/5 border border-[#4a3b2a]/10 rounded px-3 py-2 pr-8 text-xs sm:text-sm text-[#4a3b2a] focus:outline-none focus:border-[#4a3b2a]/30 focus:bg-[#4a3b2a]/10 placeholder:opacity-50 font-medium transition-colors" />
                    ${this.searchQuery ? html`
                        <button @click=${this.handleClearSearch} class="absolute right-2 top-1/2 -translate-y-1/2 text-[#4a3b2a] opacity-40 hover:opacity-100 p-1 flex items-center justify-center cursor-pointer transition-opacity">
                            <div class="scale-75 origin-center">${ICONS.CLOSE_BOLD}</div>
                        </button>
                    ` : ''}
                 </div>
             ` : ''}
             
             <div class="flex-1 w-full overflow-y-auto overflow-x-hidden custom-scrollbar pb-10">
                 ${this.loading && !hasItems ? html`
                   <div class="flex items-center justify-center h-24 opacity-40">
                      <div class="animate-pulse font-serif italic text-sm">Accessing archive...</div>
                   </div>
                 ` : !hasItems ? html`
                    <div class="flex items-center justify-center h-24 opacity-40">
                       <p class="text-[#4a3b2a] italic text-sm text-center px-4">The air is silent. No melodies have been summoned yet.</p>
                    </div>
                 ` : filteredItems.length === 0 ? html`
                    <div class="flex items-center justify-center h-24 opacity-40">
                       <p class="text-[#4a3b2a] italic text-sm text-center px-4 font-serif">No matching tracks in the queue.</p>
                    </div>
                 ` : html`
                    <div class="flex flex-col gap-1 pr-1">
                       ${filteredItems.map(({ item, index }) => {
      const isCurrent = index === this.queueState.currentIndex;

      return html`
                          <div class="group flex items-center gap-2 p-1.5 border-b border-[#4a3b2a]/5 hover:bg-[#4a3b2a]/5 transition-all cursor-default overflow-hidden rounded-sm
                                      ${isCurrent ? 'bg-[#4a3b2a]/10 border-[#4a3b2a]/20' : ''}
                                      ${this.draggedIndex === index ? 'dragging' : ''}
                                      ${this.dragOverIndex === index ? 'drag-over' : ''}"
                                draggable="true"
                                @dragstart=${(e: DragEvent) => this.handleDragStart(e, index)}
                                @dragover=${(e: DragEvent) => this.handleDragOver(e, index)}
                                @dragend=${this.handleDragEnd}
                                @drop=${(e: DragEvent) => this.handleDrop(e, index)}>
                             
                             <!-- Drag Handle -->
                             <div class="flex items-center w-4 text-[#4a3b2a] opacity-50 group-hover:opacity-100 group-hover:text-[#a17c2f] transition-all cursor-grab shrink-0">
                                ${ICONS.DRAG_HANDLE}
                             </div>

                             <!-- Play/Index Button -->
                             <div class="relative w-6 h-6 sm:w-5 sm:h-5 flex items-center justify-center shrink-0">
                                <span class="text-[9px] font-mono opacity-40 group-hover:hidden ${isCurrent ? 'hidden' : ''}">${index + 1}</span>
                                ${isCurrent ? html`<div class="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse group-hover:hidden"></div>` : ''}
                                <button @click=${(e: Event) => this.handleJumpTo(index, e)} 
                                        class="hidden group-hover:flex w-full h-full items-center justify-center text-[#a17c2f] hover:scale-110 transition-transform cursor-pointer" 
                                        title="Play track">
                                   ${ICONS.PLAY}
                                </button>
                             </div>
                             
                             <div class="flex flex-col flex-1 min-w-0">
                                <span class="text-sm font-bold text-[#4a3b2a] truncate group-hover:text-black transition-colors">${item.title}</span>
                                <span class="text-xs text-[#4a3b2a]/60 italic truncate">${item.artist}</span>
                             </div>

                             <button @click=${(e: Event) => this.handleRemoveSong(index, item.id, e)} 
                                     class="opacity-0 group-hover:opacity-100 flex w-8 h-8 sm:w-6 sm:h-6 items-center justify-center text-[#4a3b2a]/40 hover:text-red-800 transition-colors shrink-0 cursor-pointer" title="Remove track">
                                 ${ICONS.REMOVE}
                             </button>
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
