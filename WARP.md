# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

This is a WebRTC-based multi-user video calling application built with Node.js, Express, Socket.io, and vanilla JavaScript. The application enables real-time peer-to-peer video communication between multiple users with features like audio/video controls, screen sharing, and responsive design.

## Development Commands

```bash
# Install dependencies
npm install

# Start production server
npm start

# Start development server with auto-restart
npm run dev

# Test server connectivity
curl http://localhost:3000
```

## Architecture

### Core Components

1. **Signaling Server** (`server/index.js`)
   - Express.js server with Socket.io for WebRTC signaling coordination
   - Manages room-based user connections and peer discovery
   - Handles offer/answer/ICE candidate relay between peers
   - Tracks user states (audio/video mute status) across rooms
   - No media data passes through server (P2P architecture)

2. **WebRTC Client** (`public/js/main.js`)
   - `MultiUserVideoCall` class managing entire client-side WebRTC logic
   - Handles getUserMedia for camera/microphone access
   - Manages multiple RTCPeerConnection instances (mesh network topology)
   - Implements media controls, screen sharing, theme switching, and fullscreen mode
   - Responsive video grid layout adapting to screen size and participant count

3. **User Interface** (`public/index.html` + `public/css/style.css`)
   - Responsive design supporting mobile, tablet, and desktop
   - Adaptive video grid layouts (1-4+ participants)
   - Floating controls during fullscreen video calls
   - Dark/light theme switching with persistent preference
   - Touch-optimized controls for mobile devices

### WebRTC Mesh Network Flow

1. **Room Join**: User enters room ID → Socket.io room assignment → Peer discovery
2. **Signaling**: Offer/Answer/ICE candidate exchange through Socket.io server
3. **P2P Connection**: Direct RTCPeerConnection established between each pair of users
4. **Media Streaming**: Video/audio streams flow directly between all peers (no server relay)
5. **State Sync**: Audio/video mute states synchronized via signaling server

### Network Configuration

- **STUN Servers**: Google's public STUN servers (`stun.l.google.com:19302`)
- **TURN Servers**: Open Relay Project servers for firewall/NAT traversal
- **Signaling**: Socket.io rooms coordinate multi-user mesh connections
- **Topology**: Full mesh (each user connects directly to every other user)

## Key Implementation Details

### Multi-User Support Architecture

The application uses a **mesh topology** where each user maintains direct P2P connections to every other user:

```javascript
// Each user maintains a Map of peer connections
this.peerConnections = new Map(); // userId -> RTCPeerConnection
this.remoteStreams = new Map(); // userId -> MediaStream
```

This works well for small groups (2-8 users) but may require SFU architecture for larger groups.

### Responsive Video Grid System

The CSS grid system automatically adapts based on participant count and screen size:

- **1 user**: Full-width single video
- **2 users**: Side-by-side layout  
- **3-4 users**: Grid layouts optimized for different screen sizes
- **Mobile**: Single-column stacked layout with touch-optimized controls

### Development Patterns

- **Event-driven architecture**: Socket.io events coordinate signaling between peers
- **Promise-based WebRTC API usage**: Modern async/await patterns for getUserMedia and RTCPeerConnection
- **Responsive CSS Grid**: Dynamic layouts using CSS custom properties and media queries
- **State management**: Centralized state in the `MultiUserVideoCall` class

### Browser Requirements

- **HTTPS required** for production (getUserMedia security requirement)
- **Camera and microphone permissions** must be granted
- **Modern browser with WebRTC support** (Chrome 60+, Firefox 60+, Safari 12+, Edge 80+)

### Environment Configuration

- **Default port**: 3000 (configurable via `PORT` environment variable)
- **CORS enabled**: Allows cross-origin requests for development
- **Static file serving**: Express serves files from `public/` directory

## File Structure

```
videocall/
├── server/index.js           # Express + Socket.io signaling server
├── public/
│   ├── index.html           # Main UI with video elements and controls
│   ├── css/style.css        # Responsive styling with CSS Grid
│   └── js/main.js           # MultiUserVideoCall class (WebRTC client)
├── package.json             # Dependencies: express, socket.io, cors
├── CLAUDE.md               # Claude-specific development guidance
└── README.md               # Comprehensive project documentation
```

## Important Technical Constraints

- **Maximum users per room**: No hard limit, but mesh topology performance degrades with many users
- **HTTPS requirement**: Required in production for getUserMedia API access
- **Network traversal**: Relies on STUN/TURN servers for users behind firewalls/NAT
- **Browser compatibility**: Requires modern browsers with full WebRTC API support
- **No persistent storage**: Room state and user connections are memory-only