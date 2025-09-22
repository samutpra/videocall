# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a WebRTC-based peer-to-peer video calling application built with Node.js, Express, Socket.io, and vanilla JavaScript. The application enables real-time face-to-face video communication between two users with features like audio/video controls and screen sharing.

## Development Commands

```bash
# Install dependencies
npm install

# Start production server
npm start

# Start development server with auto-restart
npm run dev

# Check if server is running
curl http://localhost:3000
```

## Architecture

### Core Components

1. **Signaling Server** (`server/index.js`):
   - Express.js server with Socket.io for WebRTC signaling
   - Handles room management and peer-to-peer connection establishment
   - Manages offer/answer exchange and ICE candidate relay

2. **WebRTC Client** (`public/js/main.js`):
   - VideoCallApp class managing the entire client-side logic
   - Handles getUserMedia for camera/microphone access
   - Manages RTCPeerConnection for peer-to-peer communication
   - Implements audio/video controls and screen sharing

3. **User Interface** (`public/index.html` + `public/css/style.css`):
   - Responsive design supporting desktop and mobile
   - Video containers for local and remote streams
   - Control buttons for mute, video toggle, screen share, and hang up

### WebRTC Flow

1. User joins room → Socket.io signaling → Peer discovery
2. Offer/Answer exchange through signaling server
3. ICE candidates exchanged for NAT traversal
4. Direct P2P connection established
5. Media streams (video/audio) flow directly between peers

### Network Configuration

- **STUN Servers**: Google's free STUN servers for NAT traversal
- **TURN Server**: Open Relay Project servers for firewall traversal
- **Signaling**: Socket.io rooms for connection orchestration

## Key Files

- `server/index.js` - Express + Socket.io signaling server
- `public/js/main.js` - WebRTC client implementation (VideoCallApp class)
- `public/index.html` - Main UI with video elements and controls
- `public/css/style.css` - Responsive styling with grid layout
- `package.json` - Dependencies: express, socket.io, cors

## Development Notes

- Server runs on port 3000 by default (configurable via PORT env var)
- HTTPS required for production due to getUserMedia security requirements
- Camera and microphone permissions required for functionality
- Maximum 2 users per room (enforced by server logic)
- All WebRTC traffic is end-to-end encrypted automatically