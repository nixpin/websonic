import { html } from 'lit';

/**
 * Universal icon helper that works for both stroke-based and fill-based icons.
 * The SVG symbols in /public/icons.svg handle their own fill/stroke logic.
 */
const renderIcon = (id: string, className = 'w-4 h-4') => {
    const assetPath = `/icons.svg?v=8#${id}`;
    return html`
        <svg class="${className}" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
            <use href="${assetPath}" xlink:href="${assetPath}"></use>
        </svg>
    `;
};

/**
 * Centralized icon library that references the /public/icons.svg sprite.
 */
export const ICONS = {
    ARTIST: renderIcon('artist', 'w-5 h-5 text-[#4a3b2a]'),

    PLAYLIST: renderIcon('playlist', 'w-5 h-5 text-[#4a3b2a]'),

    PLUS: renderIcon('plus'),

    ADD_SONG_TO_QUEUE: renderIcon('add-song-queue'),

    ADD_ALBUM_TO_QUEUE: renderIcon('add-album-queue'),

    ADD_ALBUM_TO_PLAYLIST: renderIcon('add-to-playlist', 'w-3.5 h-3.5'),

    ADD_SONG_TO_PLAYLIST: renderIcon('add-to-playlist', 'w-3.5 h-3.5'),

    CHECK: renderIcon('check'),

    CHEVRON_DOWN: renderIcon('chevron-down'),

    EDIT: renderIcon('edit'),

    DELETE: renderIcon('delete'),

    REMOVE: renderIcon('remove', 'w-3.5 h-3.5'),

    SEARCH: renderIcon('search', 'w-3 h-3 text-[#4a3b2a]/20'),

    CLOSE: renderIcon('close', 'w-5 h-5 transition-transform group-hover:scale-110'),

    CLOSE_BOLD: renderIcon('close', 'w-6 h-6 text-black/50'),

    BACK: renderIcon('back', 'w-5 h-5'),

    PLAY: renderIcon('play-v3'),

    DRAG_HANDLE: renderIcon('reorder-v3'),

    ALBUM_PLACEHOLDER: renderIcon('album-placeholder', 'w-6 h-6 text-[#4a3b2a]'),
};
