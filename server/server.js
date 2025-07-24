const express = require('express');
const cors = require('cors');
const axios = require('axios');
const querystring = require('querystring');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// In-memory storage (replace with database in production)
let playlists = [];
let comments = [];
let users = [];

// Spotify API credentials
const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI || 'http://localhost:3000/callback';

// Get Spotify access token
const getSpotifyToken = async () => {
    try {
        const response = await axios.post('https://accounts.spotify.com/api/token',
            querystring.stringify({
                grant_type: 'client_credentials'
            }), {
            headers: {
                'Authorization': `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        }
        );
        return response.data.access_token;
    } catch (error) {
        console.error('Error getting Spotify token:', error);
        throw error;
    }
};

// Auth routes
app.get('/auth/login', (req, res) => {
    const scopes = 'user-read-private user-read-email playlist-modify-public playlist-modify-private';
    const authURL = `https://accounts.spotify.com/authorize?${querystring.stringify({
        response_type: 'code',
        client_id: CLIENT_ID,
        scope: scopes,
        redirect_uri: REDIRECT_URI,
    })}`;
    res.json({ authURL });
});

app.post('/auth/callback', async (req, res) => {
    const { code } = req.body;

    try {
        const response = await axios.post('https://accounts.spotify.com/api/token',
            querystring.stringify({
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: REDIRECT_URI,
            }), {
            headers: {
                'Authorization': `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        }
        );

        const { access_token, refresh_token } = response.data;

        // Get user info
        const userResponse = await axios.get('https://api.spotify.com/v1/me', {
            headers: { 'Authorization': `Bearer ${access_token}` }
        });

        const user = {
            id: userResponse.data.id,
            name: userResponse.data.display_name,
            email: userResponse.data.email,
            access_token,
            refresh_token
        };

        // Store user (in production, use proper database)
        const existingUserIndex = users.findIndex(u => u.id === user.id);
        if (existingUserIndex >= 0) {
            users[existingUserIndex] = user;
        } else {
            users.push(user);
        }

        res.json({ user: { id: user.id, name: user.name, email: user.email }, access_token });
    } catch (error) {
        console.error('Auth callback error:', error);
        res.status(400).json({ error: 'Authentication failed' });
    }
});

// Search for artists
app.get('/api/search/artists', async (req, res) => {
    const { q } = req.query;

    try {
        const token = await getSpotifyToken();
        const response = await axios.get(`https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=artist&limit=20`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        res.json(response.data.artists.items);
    } catch (error) {
        console.error('Artist search error:', error);
        res.status(500).json({ error: 'Failed to search artists' });
    }
});

// Get new releases from an artist
app.get('/api/artist/:id/albums', async (req, res) => {
    const { id } = req.params;

    try {
        const token = await getSpotifyToken();
        const response = await axios.get(`https://api.spotify.com/v1/artists/${id}/albums?include_groups=album,single&market=US&limit=20`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        // Sort by release date (newest first)
        const sortedAlbums = response.data.items.sort((a, b) => new Date(b.release_date) - new Date(a.release_date));

        res.json(sortedAlbums);
    } catch (error) {
        console.error('Artist albums error:', error);
        res.status(500).json({ error: 'Failed to get artist albums' });
    }
});

// Get album tracks
app.get('/api/album/:id/tracks', async (req, res) => {
    const { id } = req.params;

    try {
        const token = await getSpotifyToken();
        const response = await axios.get(`https://api.spotify.com/v1/albums/${id}/tracks`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        res.json(response.data.items);
    } catch (error) {
        console.error('Album tracks error:', error);
        res.status(500).json({ error: 'Failed to get album tracks' });
    }
});

// Playlist routes
app.get('/api/playlists', (req, res) => {
    res.json(playlists);
});

app.post('/api/playlists', (req, res) => {
    const { name, description, userId } = req.body;

    const playlist = {
        id: Date.now().toString(),
        name,
        description,
        userId,
        tracks: [],
        createdAt: new Date().toISOString(),
        isPublic: true
    };

    playlists.push(playlist);
    res.json(playlist);
});

app.post('/api/playlists/:id/tracks', (req, res) => {
    const { id } = req.params;
    const { trackId, trackName, artistName, albumName, userId } = req.body;

    const playlist = playlists.find(p => p.id === id);
    if (!playlist) {
        return res.status(404).json({ error: 'Playlist not found' });
    }

    // Check if track already exists
    if (playlist.tracks.find(t => t.trackId === trackId)) {
        return res.status(400).json({ error: 'Track already in playlist' });
    }

    const track = {
        id: Date.now().toString(),
        trackId,
        trackName,
        artistName,
        albumName,
        addedBy: userId,
        addedAt: new Date().toISOString()
    };

    playlist.tracks.push(track);
    res.json(track);
});

app.delete('/api/playlists/:playlistId/tracks/:trackId', (req, res) => {
    const { playlistId, trackId } = req.params;

    const playlist = playlists.find(p => p.id === playlistId);
    if (!playlist) {
        return res.status(404).json({ error: 'Playlist not found' });
    }

    playlist.tracks = playlist.tracks.filter(t => t.id !== trackId);
    res.json({ success: true });
});

// Comment routes
app.get('/api/playlists/:id/comments', (req, res) => {
    const { id } = req.params;
    const playlistComments = comments.filter(c => c.playlistId === id);
    res.json(playlistComments);
});

app.post('/api/playlists/:id/comments', (req, res) => {
    const { id } = req.params;
    const { text, userId, userName } = req.body;

    const comment = {
        id: Date.now().toString(),
        playlistId: id,
        text,
        userId,
        userName,
        createdAt: new Date().toISOString()
    };

    comments.push(comment);
    res.json(comment);
});

app.delete('/api/comments/:id', (req, res) => {
    const { id } = req.params;
    comments = comments.filter(c => c.id !== id);
    res.json({ success: true });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log('Make sure to set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET in your .env file');
});