# Video Call Application

A WebRTC-based peer-to-peer video calling application built with modern web technologies. This application allows face-to-face video communication between two users in real-time without requiring any plugins or external software.

## Features

- 🎥 **Real-time Video Calling**: High-quality peer-to-peer video communication
- 🎤 **Audio Control**: Mute/unmute microphone during calls
- 📹 **Video Control**: Turn camera on/off during calls
- 🖥️ **Screen Sharing**: Share your screen with the other participant
- 📱 **Responsive Design**: Works on desktop and mobile devices
- 🔒 **Secure**: End-to-end encrypted communication using WebRTC
- 🌐 **Cross-Platform**: Works in all modern web browsers

## Technology Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Node.js, Express.js
- **Real-time Communication**: WebRTC API
- **Signaling**: Socket.io
- **STUN/TURN Servers**: Google STUN servers + Open Relay Project

## Quick Start

### Prerequisites

- Node.js (version 14 or higher)
- npm (comes with Node.js)
- Modern web browser with WebRTC support
- Camera and microphone access

### Installation

1. **Clone or download the project**
   ```bash
   cd videocall
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the server**
   ```bash
   npm start
   ```

   For development with auto-restart:
   ```bash
   npm run dev
   ```

4. **Open your browser**
   Navigate to `http://localhost:3000`

### Usage

1. **Enter a Room ID**: Type any text as a room identifier (e.g., "meeting123", "family-call")
2. **Click "Join Room"**: Allow camera and microphone access when prompted
3. **Share the Room ID**: Send the same room ID to the person you want to call
4. **Start Video Calling**: When the second person joins, the video call will start automatically

### Controls

- **🎤 Mute/Unmute**: Toggle your microphone on/off
- **📹 Video**: Toggle your camera on/off
- **🖥️ Share Screen**: Share your screen with the other participant
- **📞 Hang Up**: End the call and return to the main screen

## Project Structure

```
videocall/
├── server/
│   └── index.js          # Express server with Socket.io signaling
├── public/
│   ├── index.html        # Main application interface
│   ├── css/
│   │   └── style.css     # Application styling
│   └── js/
│       └── main.js       # WebRTC client implementation
├── package.json          # Project dependencies and scripts
├── CLAUDE.md            # Claude Code guidance file
└── README.md            # This documentation
```

## How It Works

### WebRTC Peer-to-Peer Connection

1. **Signaling**: The Socket.io server helps establish initial connection between peers
2. **Media Capture**: getUserMedia API accesses camera and microphone
3. **Peer Connection**: RTCPeerConnection creates direct connection between browsers
4. **NAT Traversal**: STUN/TURN servers help overcome network restrictions
5. **Media Streaming**: Video and audio stream directly between peers

### Network Architecture

```
User A Browser ←→ Signaling Server ←→ User B Browser
     ↓                                      ↓
     └────── Direct P2P Connection ─────────┘
           (via STUN/TURN if needed)
```

## Configuration

### STUN/TURN Servers

The application is configured with free STUN/TURN servers:

- **STUN Servers**: Google's public STUN servers for NAT traversal
- **TURN Server**: Open Relay Project (20GB free per month)

### Environment Variables

You can customize the server with environment variables:

```bash
PORT=3000  # Server port (default: 3000)
```

## Browser Compatibility

### Supported Browsers

- ✅ Chrome 60+
- ✅ Firefox 60+
- ✅ Safari 12+
- ✅ Edge 80+
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

### Required Permissions

- Camera access
- Microphone access
- (HTTPS required for production deployment)

## Deployment

### Local Network Testing

To test across devices on the same network:

1. Find your local IP address
2. Start the server: `npm start`
3. Access from other devices: `http://YOUR_LOCAL_IP:3000`

### Production Deployment

For production deployment, you'll need:

1. **HTTPS Certificate**: Required for getUserMedia API in production
2. **Domain Name**: For proper HTTPS setup
3. **Cloud Server**: Deploy to platforms like:
   - Heroku
   - Railway
   - Render
   - Digital Ocean
   - AWS

Example Heroku deployment:
```bash
# Install Heroku CLI and login
heroku create your-videocall-app
git add .
git commit -m "Deploy video call app"
git push heroku main
```

## Troubleshooting

### Common Issues

1. **"Camera/Microphone not accessible"**
   - Check browser permissions
   - Ensure HTTPS in production
   - Try refreshing the page

2. **"Cannot connect to other user"**
   - Check network firewalls
   - Verify both users are in the same room
   - Try using different browsers

3. **"Poor video quality"**
   - Check internet connection speed
   - Reduce browser resource usage
   - Try disabling other tabs

### Development Mode

For development debugging:
```bash
npm run dev  # Uses nodemon for auto-restart
```

## Security Considerations

- All WebRTC traffic is automatically encrypted
- No video/audio data passes through the server
- Room IDs should be shared securely (consider using UUIDs for production)
- Server only handles signaling, not media data

## Contributing

Feel free to contribute improvements:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - feel free to use this project for learning or commercial purposes.

## Support

For issues or questions:
- Check the troubleshooting section above
- Review browser console for error messages
- Ensure all dependencies are properly installed

---

**Note**: This is a basic implementation suitable for learning and small-scale use. For production applications with many users, consider implementing additional features like user authentication, room management, and scalable signaling infrastructure.