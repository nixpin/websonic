# Full Subsonic REST API Specification
Original Source: https://subsonic.org/pages/api.jsp
Captured: 2026-03-29

## Authentication
Every method takes:
- `u` (username)
- `p` (password clear/hex) OR `t` (token) and `s` (salt)
- `v` (version, 1.16.1)
- `c` (client name)
- `f` (format: xml, json)

### Token Calculation
`token = md5(password + salt)`

## Error Codes
- 0: Generic error
- 10: Required parameter missing
- 20: Incompatible client/server version
- 30: Wrong username/password
- 40: User not authorized
- 50: Premium license required
- 60: Resource not found
- 70: View not found (Module not enabled)

## Method Reference

### System
- `ping`: Connectivity test.
- `getLicense`: Software license info.

### Browsing
- `getMusicFolders`: Top-level folders.
- `getIndexes`: Artist index.
- `getMusicDirectory`: Directory file listing.
- `getGenres`: All genres.
- `getArtists`: Artists (ID3).
- `getArtist`: Artist info + albums (ID3).
- `getAlbum`: Album info + songs (ID3).
- `getSong`: Song metadata.
- `getVideos`: Video collection.
- `getVideoInfo`: Video tracks/subtitles.

### Search
- `search2` / `search3`: Query-based search.
- `getAlbumList` / `getAlbumList2`: Filtered lists (newest, random, etc).
- `getRandomSongs`: Random songs.
- `getSongsByGenre`: Genre list.
- `getNowPlaying`: Global server playback state.

### Playlists
- `getPlaylists`: User playlists.
- `getPlaylist`: Playlist content.
- `createPlaylist` / `updatePlaylist` / `deletePlaylist`.

### Music Interaction
- `star` / `unstar`: Favorite markers.
- `setRating`: 1-5 star rating.
- `scrobble`: Last.fm and playback history update.

### Media Access
- `stream`: Audio/Video binary.
- `download`: Raw file binary.
- `hls`: M3U8 for HLS.
- `getCaptions`: Subtitles.
- `getCoverArt`: Image data.
- `getLyrics`: Text lyrics.
- `getAvatar`: User images.

### Jukebox
- `jukeboxControl`: Remote server output hardware control.
  - Actions: `get`, `status`, `set`, `start`, `stop`, `skip`, `add`, `clear`, `remove`, `shuffle`, `setGain`.

### Podcast & Radio
- `getPodcasts` / `getNewestPodcasts`.
- `refreshPodcasts` / `createPodcastChannel` / `deletePodcastChannel` / `deletePodcastEpisode` / `downloadPodcastEpisode`.
- `getInternetRadioStations` / `createInternetRadioStation` / `updateInternetRadioStation` / `deleteInternetRadioStation`.

### Users & Bookmarks
- `getUser` / `getUsers` / `createUser` / `updateUser` / `deleteUser` / `changePassword`.
- `getBookmarks` / `createBookmark` / `deleteBookmark`.

### Play Queue
- `getPlayQueue`: Get user's active session state.
- `savePlayQueue`: Persist queue state.

### Library Admin
- `getScanStatus` / `startScan`: Library rescan.

---
*Note: This is a structured index of the captured documentation. See content.md for full XML schema examples and specific version histories.*
