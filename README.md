# SoundChat
The purpose of this project is to create a music community where users can discover new songs and create weekly playlists

## Instructions:
1. Ensure that the directory node_modules and the file package-lock.json are removed
2. Run "npm install" inside the soundchat directory
3. run "npm start"

## Core requirements:
- get new music from spotify's api and add to playlist
- be able to get music from all spotify artists you follow, and automatically add them to a weekly playlist
- Users should able to comment on and like your playlists

Non Functional Requirements: 
- System should assign weekly playlists that are unique to the user that creates them
- System should be consistent (if multiple ppl follow the same artists, they should all see the same music added to their playlists)
- Should be able to scale to add as many songs as the user follows
## Stack

This project uses React framework for the frontend and ExpressJS for the backend