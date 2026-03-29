---
name: subsonic-protocol
description: Rules and guidelines for implementing Subsonic/OpenSubsonic API integrations, including a full technical reference for the REST API.
---

# Subsonic Protocol Skill

This skill provides mandatory guidelines and a complete technical reference for implementing Subsonic API methods and managing audio streams.

## Core Principle: Documentation-First
BEFORE implementing ANY new Subsonic API method or modifying existing SDK logic, you MUST consult the technical reference provided in this skill. Use the online documentation at `subsonic.org/pages/api.jsp` ONLY as a last resort if specific details (like specific XML schema examples) are missing from this file.

## Implementation Workflow

1.  **Verify Endpoint**: Ensure the `.view` method name corresponds EXACTLY to the specification (e.g., `getPlayQueue` vs `getJukeboxPlaylist`).
2.  **Version Compatibility**: Check the `v` parameter requirement for the method. Most modern servers support up to `1.16.1`.
3.  **Data Normalization**: 
    - Subsonic responses are wrapped in a `subsonic-response` object.
    - Check the `status` field (`ok` or `failed`).
    - Handle both single objects and arrays in results (Subsonic often returns a single object if there's only one result, but an array if there are many).
4.  **Error Handling**:
    - Map Subsonic error codes (e.g., 70 for "View not found", 10 for "Required parameter is missing").
    - Provide fallback logic for servers that lack specific modules (like Jukebox).

## Common Pitfalls
- **Jukebox Mode**: Not all servers support `jukeboxControl`. Use `getPlayQueue` as a more universal alternative for retrieving the current stream.
- **Cover Art**: To display cover art, use the `getCoverArt` method with the ID of the song/album.
- **Authentication**: Always use the modern `t` (token) and `s` (salt) authentication method rather than sending plain text passwords.

---

# Technical Reference: Subsonic REST API

## Authentication Parameters
All methods take the following parameters:
- `u`: Username
- `t`: Authentication token (md5(password + salt))
- `s`: Salt (random string)
- `v`: API version (e.g., 1.16.1)
- `c`: Client identifier
- `f`: Format (json or xml)

## API Method Summary

### System Integration
- `ping`: Test connectivity.
- `getLicense`: Get license details.

### Browsing & Metadata
- `getMusicFolders`: Get top-level folders.
- `getIndexes`: Get artist index (file-based).
- `getMusicDirectory`: List files in a directory.
- `getGenres`: List all genres.
- `getArtists` / `getArtist`: Browse by ID3 tags.
- `getAlbum` / `getSong`: Get details for album/song.
- `getVideos`: List video files.
- `getVideoInfo`: Detailed video info.

### Search & Discovery
- `search3` (Recommended): Search artists, albums, songs by ID3 tags.
- `getAlbumList2`: Random, newest, top rated albums.
- `getRandomSongs`: Random songs matching criteria.
- `getSongsByGenre`: Songs in a specific genre.
- `getNowPlaying`: Currently played by all users.

### Playlists & State
- `getPlayQueue` (Recommended for Queue): Get user's current play queue.
- `savePlayQueue`: Save current queue state.
- `getPlaylists` / `getPlaylist`: Manage saved playlists.
- `createPlaylist` / `updatePlaylist` / `deletePlaylist`.

### Playback & Streaming
- `stream` / `download`: Get media binary data.
- `hls`: HLS playlist for video/audio.
- `getCaptions`: Subtitles for video.
- `getCoverArt`: Album/artist images.
- `getLyrics`: Search for song lyrics.
- `getAvatar`: User personal images.

### Social & Interaction
- `star` / `unstar`: Favorite items.
- `setRating`: Rate media.
- `scrobble`: Register playback.
- `getShares` / `createShare`: Public sharing links.
- `getChatMessages` / `addChatMessage`: Server chat.

### Jukebox Mode
- `jukeboxControl`: Remote control of server audio hardware.
  - `action=get`: Get current jukebox playlist/status.
  - `action=start/stop/skip/add/clear/remove/shuffle/set/setGain`.

### Podcast & Radio
- `getPodcasts` / `getNewestPodcasts`.
- `getInternetRadioStations`.

---

## Detailed Method Specification (Excerpts)

### jukeboxControl (Since 1.2.0)
URL: `rest/jukeboxControl.view`
Parameters:
- `action`: `get`, `status`, `set` (index), `start`, `stop`, `skip`, `add` (id), `clear`, `remove` (index), `shuffle`, `setGain` (gain).
- `index`: Used by `set` and `remove`.
- `offset`: (Since 1.7.0) used by `skip`.
- `id`: Used by `add` and `set`.
- `gain`: Float (0.0 to 1.0) for `setGain`.

### getPlayQueue (Since 1.12.0)
URL: `rest/getPlayQueue.view`
Returns the state of the play queue, including tracks, current track, and position.

### getArtists (Since 1.8.0)
URL: `rest/getArtists.view`
Parameters:
- `musicFolderId`: Optional.
- `ifModifiedSince`: Optional.

*(Note: Full detailed specifications for all other methods follow similar patterns documented in the source reference content.md)*
