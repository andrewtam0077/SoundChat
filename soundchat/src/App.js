import React, { useState, useEffect } from 'react';
import { Search, Music, Plus, Trash2, MessageCircle, User, PlayCircle } from 'lucide-react';

const API_BASE = 'http://localhost:3001';

function App() {
  const [user, setUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [artists, setArtists] = useState([]);
  const [selectedArtist, setSelectedArtist] = useState(null);
  const [albums, setAlbums] = useState([]);
  const [selectedAlbum, setSelectedAlbum] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [showCreatePlaylist, setShowCreatePlaylist] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchPlaylists();
    // Check if user is logged in (in real app, check localStorage/sessionStorage)
    const savedUser = { id: 'demo_user', name: 'Demo User', email: 'demo@example.com' };
    setUser(savedUser);
  }, []);

  const fetchPlaylists = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/playlists`);
      const data = await response.json();
      setPlaylists(data);
    } catch (error) {
      console.error('Error fetching playlists:', error);
    }
  };

  const searchArtists = async () => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/search/artists?q=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();
      setArtists(data);
    } catch (error) {
      console.error('Error searching artists:', error);
    }
    setLoading(false);
  };

  const getArtistAlbums = async (artistId) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/artist/${artistId}/albums`);
      const data = await response.json();
      setAlbums(data);
      setSelectedArtist(artistId);
      setTracks([]);
      setSelectedAlbum(null);
    } catch (error) {
      console.error('Error fetching albums:', error);
    }
    setLoading(false);
  };

  const getAlbumTracks = async (albumId) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/album/${albumId}/tracks`);
      const data = await response.json();
      setTracks(data);
      setSelectedAlbum(albumId);
    } catch (error) {
      console.error('Error fetching tracks:', error);
    }
    setLoading(false);
  };

  const createPlaylist = async () => {
    if (!newPlaylistName.trim()) return;

    try {
      const response = await fetch(`${API_BASE}/api/playlists`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newPlaylistName,
          description: 'Created with Spotify Music Discovery',
          userId: user.id
        })
      });

      const newPlaylist = await response.json();
      setPlaylists([...playlists, newPlaylist]);
      setNewPlaylistName('');
      setShowCreatePlaylist(false);
    } catch (error) {
      console.error('Error creating playlist:', error);
    }
  };

  const addTrackToPlaylist = async (track, playlistId = selectedPlaylist?.id) => {
    if (!playlistId) {
      alert('Please select a playlist first');
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/playlists/${playlistId}/tracks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trackId: track.id,
          trackName: track.name,
          artistName: track.artists[0]?.name || 'Unknown Artist',
          albumName: selectedAlbum ? albums.find(a => a.id === selectedAlbum)?.name : 'Unknown Album',
          userId: user.id
        })
      });

      if (response.ok) {
        alert('Track added to playlist!');
        if (selectedPlaylist) {
          selectPlaylist(selectedPlaylist);
        }
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to add track');
      }
    } catch (error) {
      console.error('Error adding track:', error);
    }
  };

  const selectPlaylist = async (playlist) => {
    setSelectedPlaylist(playlist);

    try {
      const response = await fetch(`${API_BASE}/api/playlists/${playlist.id}/comments`);
      const data = await response.json();
      setComments(data);
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

  const addComment = async () => {
    if (!newComment.trim() || !selectedPlaylist) return;

    try {
      const response = await fetch(`${API_BASE}/api/playlists/${selectedPlaylist.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: newComment,
          userId: user.id,
          userName: user.name
        })
      });

      const comment = await response.json();
      setComments([...comments, comment]);
      setNewComment('');
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  const removeTrackFromPlaylist = async (trackId) => {
    if (!selectedPlaylist) return;

    try {
      await fetch(`${API_BASE}/api/playlists/${selectedPlaylist.id}/tracks/${trackId}`, {
        method: 'DELETE'
      });

      selectPlaylist(selectedPlaylist); // Refresh playlist
    } catch (error) {
      console.error('Error removing track:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Music className="w-8 h-8 text-green-400" />
              <h1 className="text-3xl font-bold bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">
                Spotify Music Discovery
              </h1>
            </div>
            {user && (
              <div className="flex items-center space-x-2 bg-white/10 rounded-full px-4 py-2">
                <User className="w-5 h-5" />
                <span>{user.name}</span>
              </div>
            )}
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Search & Discovery */}
          <div className="lg:col-span-2 space-y-6">
            {/* Artist Search */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <Search className="w-5 h-5 mr-2" />
                Discover New Music
              </h2>

              <div className="flex space-x-2 mb-4">
                <input
                  type="text"
                  placeholder="Search for artists..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && searchArtists()}
                  className="flex-1 px-4 py-2 bg-white/20 rounded-lg border border-white/30 focus:outline-none focus:border-green-400"
                />
                <button
                  onClick={searchArtists}
                  disabled={loading}
                  className="px-6 py-2 bg-green-500 hover:bg-green-600 rounded-lg font-medium disabled:opacity-50"
                >
                  {loading ? 'Searching...' : 'Search'}
                </button>
              </div>

              {/* Artists Results */}
              {artists.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-medium mb-3">Artists</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {artists.slice(0, 6).map((artist) => (
                      <button
                        key={artist.id}
                        onClick={() => getArtistAlbums(artist.id)}
                        className="p-3 bg-white/20 rounded-lg hover:bg-white/30 transition-colors text-left"
                      >
                        <div className="font-medium truncate">{artist.name}</div>
                        <div className="text-sm text-gray-300 capitalize">
                          {artist.genres[0] || 'Music'}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Albums */}
              {albums.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-medium mb-3">Recent Releases</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {albums.slice(0, 8).map((album) => (
                      <button
                        key={album.id}
                        onClick={() => getAlbumTracks(album.id)}
                        className="p-3 bg-white/20 rounded-lg hover:bg-white/30 transition-colors text-left flex items-center space-x-3"
                      >
                        {album.images[0] && (
                          <img
                            src={album.images[0].url}
                            alt={album.name}
                            className="w-12 h-12 rounded object-cover"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{album.name}</div>
                          <div className="text-sm text-gray-300">{album.release_date}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Tracks */}
              {tracks.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium mb-3">Tracks</h3>
                  <div className="space-y-2">
                    {tracks.map((track) => (
                      <div
                        key={track.id}
                        className="flex items-center justify-between p-3 bg-white/20 rounded-lg"
                      >
                        <div className="flex items-center space-x-3">
                          <PlayCircle className="w-5 h-5 text-green-400" />
                          <div>
                            <div className="font-medium">{track.name}</div>
                            <div className="text-sm text-gray-300">
                              {track.artists.map(a => a.name).join(', ')}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <select
                            onChange={(e) => e.target.value && addTrackToPlaylist(track, e.target.value)}
                            className="px-3 py-1 bg-white/20 rounded border border-white/30 text-sm"
                            defaultValue=""
                          >
                            <option value="">Add to playlist...</option>
                            {playlists.map((playlist) => (
                              <option key={playlist.id} value={playlist.id}>
                                {playlist.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Playlists & Comments */}
          <div className="space-y-6">
            {/* Playlists */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold flex items-center">
                  <Music className="w-5 h-5 mr-2" />
                  My Playlists
                </h2>
                <button
                  onClick={() => setShowCreatePlaylist(true)}
                  className="p-2 bg-green-500 hover:bg-green-600 rounded-lg"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {showCreatePlaylist && (
                <div className="mb-4 p-3 bg-white/20 rounded-lg">
                  <input
                    type="text"
                    placeholder="Playlist name..."
                    value={newPlaylistName}
                    onChange={(e) => setNewPlaylistName(e.target.value)}
                    className="w-full px-3 py-2 bg-white/20 rounded border border-white/30 focus:outline-none focus:border-green-400 mb-2"
                  />
                  <div className="flex space-x-2">
                    <button
                      onClick={createPlaylist}
                      className="px-4 py-2 bg-green-500 hover:bg-green-600 rounded text-sm"
                    >
                      Create
                    </button>
                    <button
                      onClick={() => setShowCreatePlaylist(false)}
                      className="px-4 py-2 bg-gray-500 hover:bg-gray-600 rounded text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {playlists.map((playlist) => (
                  <button
                    key={playlist.id}
                    onClick={() => selectPlaylist(playlist)}
                    className={`w-full p-3 rounded-lg text-left transition-colors ${selectedPlaylist?.id === playlist.id
                        ? 'bg-green-500/30 border border-green-400'
                        : 'bg-white/20 hover:bg-white/30'
                      }`}
                  >
                    <div className="font-medium">{playlist.name}</div>
                    <div className="text-sm text-gray-300">
                      {playlist.tracks.length} tracks
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Selected Playlist Details */}
            {selectedPlaylist && (
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
                <h3 className="text-lg font-semibold mb-3">{selectedPlaylist.name}</h3>

                {/* Playlist Tracks */}
                <div className="mb-4">
                  <h4 className="font-medium mb-2">Tracks ({selectedPlaylist.tracks.length})</h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {selectedPlaylist.tracks.map((track) => (
                      <div
                        key={track.id}
                        className="flex items-center justify-between p-2 bg-white/20 rounded text-sm"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{track.trackName}</div>
                          <div className="text-gray-300 truncate">{track.artistName}</div>
                        </div>
                        <button
                          onClick={() => removeTrackFromPlaylist(track.id)}
                          className="p-1 text-red-400 hover:text-red-300"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Comments */}
                <div>
                  <h4 className="font-medium mb-2 flex items-center">
                    <MessageCircle className="w-4 h-4 mr-1" />
                    Comments ({comments.length})
                  </h4>

                  <div className="space-y-2 mb-3 max-h-32 overflow-y-auto">
                    {comments.map((comment) => (
                      <div key={comment.id} className="p-2 bg-white/20 rounded text-sm">
                        <div className="font-medium text-green-400">{comment.userName}</div>
                        <div>{comment.text}</div>
                        <div className="text-xs text-gray-400 mt-1">
                          {new Date(comment.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex space-x-2">
                    <input
                      type="text"
                      placeholder="Add a comment..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addComment()}
                      className="flex-1 px-3 py-2 bg-white/20 rounded border border-white/30 focus:outline-none focus:border-green-400"
                    />
                    <button
                      onClick={addComment}
                      className="px-4 py-2 bg-green-500 hover:bg-green-600 rounded"
                    >
                      Post
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;