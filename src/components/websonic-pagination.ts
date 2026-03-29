import { html, css, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';

/**
 * WebSonic Pagination Component
 * A reusable hardware-styled pagination control.
 */
@customElement('websonic-pagination')
export class WebSonicPagination extends LitElement {
  @property({ type: Number }) currentPage = 1;
  @property({ type: Number }) totalPages = 1;
  @property({ type: Boolean }) hideTotal = false;

  static styles = css`
    :host {
      display: block;
      width: 100%;
    }

    .container {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 0 4px;
      border-top: 1px solid rgba(92, 75, 55, 0.1);
    }

    .btn {
      padding: 4px 12px;
      font-size: 9px;
      line-height: normal;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #5c4b37;
      background: transparent;
      border: 1px solid rgba(92, 75, 55, 0.2);
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn:hover:not(:disabled) {
      background: rgba(92, 75, 55, 0.05);
      border-color: rgba(92, 75, 55, 0.4);
    }

    .btn:active:not(:disabled) {
      transform: translateY(1px);
    }

    .btn:disabled {
      opacity: 0.1;
      cursor: default;
    }

    .info {
      font-size: 9px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.2em;
      color: #5c4b37;
      opacity: 0.4;
      user-select: none;
    }
  `;

  private handlePrev() {
    if (this.currentPage > 1) {
      this.dispatchEvent(new CustomEvent('page-change', {
        detail: { page: this.currentPage - 1 },
        bubbles: true,
        composed: true
      }));
    }
  }

  private handleNext() {
    if (this.currentPage < this.totalPages || this.totalPages === 0) {
      this.dispatchEvent(new CustomEvent('page-change', {
        detail: { page: this.currentPage + 1 },
        bubbles: true,
        composed: true
      }));
    }
  }

  render() {
    return html`
      <div class="container">
        <button 
          class="btn" 
          ?disabled=${this.currentPage <= 1} 
          @click=${this.handlePrev}
        >
          [ PREV ]
        </button>

        <div class="info">
          Page ${this.currentPage} ${!this.hideTotal && this.totalPages > 0 ? html`/ ${this.totalPages}` : ''}
        </div>

        <button 
          class="btn" 
          ?disabled=${this.totalPages > 0 && this.currentPage >= this.totalPages} 
          @click=${this.handleNext}
        >
          [ NEXT ]
        </button>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'websonic-pagination': WebSonicPagination;
  }
}
