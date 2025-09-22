class MultiUserVideoCall {
    constructor() {
        this.socket = io();
        this.localVideo = document.getElementById('localVideo');
        this.remoteVideos = document.getElementById('remoteVideos');
        this.roomInput = document.getElementById('roomInput');
        this.usernameInput = document.getElementById('usernameInput');
        this.joinBtn = document.getElementById('joinBtn');
        this.roomStatus = document.getElementById('roomStatus');
        this.videoContainer = document.getElementById('videoContainer');
        this.controls = document.getElementById('controls');
        this.userCount = document.getElementById('userCount');
        this.userCountText = document.getElementById('userCountText');

        this.muteBtn = document.getElementById('muteBtn');
        this.videoBtn = document.getElementById('videoBtn');
        this.screenShareBtn = document.getElementById('screenShareBtn');
        this.hangupBtn = document.getElementById('hangupBtn');
        this.themeToggle = document.getElementById('themeToggle');
        this.fullscreenBtn = document.getElementById('fullscreenBtn');
        this.floatingMenu = document.getElementById('floatingMenu');
        this.floatingThemeToggle = document.getElementById('floatingThemeToggle');
        this.floatingFullscreenBtn = document.getElementById('floatingFullscreenBtn');
        this.header = document.querySelector('.header');
        this.roomControls = document.querySelector('.room-controls');
        this.infoPanel = document.querySelector('.info-panel');

        this.localAudioStatus = document.getElementById('localAudioStatus');
        this.localVideoStatus = document.getElementById('localVideoStatus');

        this.localStream = null;
        this.peerConnections = new Map(); // userId -> RTCPeerConnection
        this.remoteStreams = new Map(); // userId -> MediaStream
        this.currentRoom = null;
        this.currentUser = null;
        this.isAudioMuted = false;
        this.isVideoMuted = false;
        this.isScreenSharing = false;
        this.isFullscreen = false;
        this.isDarkMode = false;
        this.hideControlsTimeout = null;
        this.isInCall = false;

        this.configuration = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                {
                    urls: 'turn:openrelay.metered.ca:80',
                    username: 'openrelayproject',
                    credential: 'openrelayproject'
                },
                {
                    urls: 'turn:openrelay.metered.ca:443',
                    username: 'openrelayproject',
                    credential: 'openrelayproject'
                }
            ]
        };

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupSocketEvents();
        this.initializeTheme();
        this.setupFullscreenEvents();
        this.generateRandomUsername();
    }

    setupEventListeners() {
        this.joinBtn.addEventListener('click', () => this.joinRoom());
        this.roomInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.joinRoom();
        });
        this.usernameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.joinRoom();
        });

        this.muteBtn.addEventListener('click', () => this.toggleAudio());
        this.videoBtn.addEventListener('click', () => this.toggleVideo());
        this.screenShareBtn.addEventListener('click', () => this.toggleScreenShare());
        this.hangupBtn.addEventListener('click', () => this.hangUp());
        this.themeToggle.addEventListener('click', () => this.toggleTheme());
        this.fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());
        this.floatingThemeToggle.addEventListener('click', () => this.toggleTheme());
        this.floatingFullscreenBtn.addEventListener('click', () => this.toggleFullscreen());

        // Window resize event for responsive adjustments
        window.addEventListener('resize', () => this.handleWindowResize());

        // Setup mouse move detection for floating controls
        this.setupFloatingControls();
    }

    setupSocketEvents() {
        this.socket.on('existing-users', (users) => {
            console.log('Existing users in room:', users);
            users.forEach(user => this.handleUserJoined(user));
        });

        this.socket.on('user-joined', (user) => {
            console.log('New user joined:', user);
            this.handleUserJoined(user);
        });

        this.socket.on('user-left', (userId) => {
            console.log('User left:', userId);
            this.handleUserLeft(userId);
        });

        this.socket.on('room-users', (users) => {
            this.updateUserCount(users.length);
        });

        this.socket.on('offer', async (data) => {
            console.log('Received offer from:', data.sender);
            await this.handleOffer(data.offer, data.sender);
        });

        this.socket.on('answer', async (data) => {
            console.log('Received answer from:', data.sender);
            await this.handleAnswer(data.answer, data.sender);
        });

        this.socket.on('ice-candidate', async (data) => {
            console.log('Received ICE candidate from:', data.sender);
            await this.handleIceCandidate(data.candidate, data.sender);
        });

        this.socket.on('user-toggle-audio', (data) => {
            this.updateRemoteUserAudioStatus(data.userId, data.muted);
        });

        this.socket.on('user-toggle-video', (data) => {
            this.updateRemoteUserVideoStatus(data.userId, data.videoOff);
        });
    }

    async joinRoom() {
        const roomId = this.roomInput.value.trim();
        const username = this.usernameInput.value.trim() || 'Anonymous';

        if (!roomId) {
            alert('Please enter a room ID');
            return;
        }

        try {
            this.currentRoom = roomId;
            this.currentUser = {
                name: username,
                socketId: this.socket.id
            };

            this.roomStatus.textContent = 'Joining room...';

            await this.setupLocalStream();

            this.socket.emit('join-room', roomId, { name: username });
            this.roomStatus.textContent = `Joined room: ${roomId} as ${username}`;

            this.videoContainer.style.display = 'grid';
            this.controls.style.display = 'flex';
            this.userCount.style.display = 'block';
            this.fullscreenBtn.style.display = 'block';
            this.joinBtn.disabled = true;
            this.roomInput.disabled = true;
            this.usernameInput.disabled = true;

            // Switch to floating UI mode
            this.isInCall = true;
            this.enableFloatingMode();

        } catch (error) {
            console.error('Error joining room:', error);
            this.roomStatus.textContent = 'Error accessing camera/microphone';
            alert('Please allow camera and microphone access to use video calling');
        }
    }

    async setupLocalStream() {
        this.localStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
        });
        this.localVideo.srcObject = this.localStream;

        // Set up aspect ratio detection for local video
        this.setupVideoAspectRatio(this.localVideo);
    }

    setupVideoAspectRatio(videoElement) {
        videoElement.addEventListener('loadedmetadata', () => {
            const aspectRatio = videoElement.videoWidth / videoElement.videoHeight;
            const wrapper = videoElement.closest('.video-wrapper');
            if (wrapper) {
                wrapper.style.setProperty('--video-aspect-ratio', aspectRatio);
            }
        });
    }

    async handleUserJoined(user) {
        if (user.socketId === this.socket.id) return;

        const peerConnection = this.createPeerConnection(user.socketId);
        this.peerConnections.set(user.socketId, peerConnection);

        // Add local stream to peer connection
        this.localStream.getTracks().forEach(track => {
            peerConnection.addTrack(track, this.localStream);
        });

        // Create and send offer to new user
        try {
            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);

            this.socket.emit('offer', {
                offer: offer,
                target: user.socketId
            });
        } catch (error) {
            console.error('Error creating offer for user:', user.socketId, error);
        }

        this.createRemoteVideoElement(user);
    }

    async handleOffer(offer, senderId) {
        if (!this.peerConnections.has(senderId)) {
            const peerConnection = this.createPeerConnection(senderId);
            this.peerConnections.set(senderId, peerConnection);

            // Add local stream to peer connection
            this.localStream.getTracks().forEach(track => {
                peerConnection.addTrack(track, this.localStream);
            });
        }

        const peerConnection = this.peerConnections.get(senderId);

        try {
            await peerConnection.setRemoteDescription(offer);

            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);

            this.socket.emit('answer', {
                answer: answer,
                target: senderId
            });
        } catch (error) {
            console.error('Error handling offer from:', senderId, error);
        }
    }

    async handleAnswer(answer, senderId) {
        const peerConnection = this.peerConnections.get(senderId);
        if (peerConnection) {
            try {
                await peerConnection.setRemoteDescription(answer);
            } catch (error) {
                console.error('Error handling answer from:', senderId, error);
            }
        }
    }

    async handleIceCandidate(candidate, senderId) {
        const peerConnection = this.peerConnections.get(senderId);
        if (peerConnection) {
            try {
                await peerConnection.addIceCandidate(candidate);
            } catch (error) {
                console.error('Error handling ICE candidate from:', senderId, error);
            }
        }
    }

    createPeerConnection(userId) {
        const peerConnection = new RTCPeerConnection(this.configuration);

        peerConnection.ontrack = (event) => {
            console.log('Received remote stream from:', userId);
            const remoteStream = event.streams[0];
            this.remoteStreams.set(userId, remoteStream);
            this.updateRemoteVideo(userId, remoteStream);
        };

        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                this.socket.emit('ice-candidate', {
                    candidate: event.candidate,
                    target: userId
                });
            }
        };

        peerConnection.onconnectionstatechange = () => {
            console.log(`Connection state with ${userId}:`, peerConnection.connectionState);
            this.updateConnectionStatus(userId, peerConnection.connectionState);
        };

        return peerConnection;
    }

    createRemoteVideoElement(user) {
        const videoWrapper = document.createElement('div');
        videoWrapper.className = 'video-wrapper';
        videoWrapper.id = `video-wrapper-${user.socketId}`;

        const video = document.createElement('video');
        video.id = `video-${user.socketId}`;
        video.autoplay = true;
        video.playsInline = true;

        const label = document.createElement('div');
        label.className = 'video-label';
        label.textContent = user.name || 'Remote User';

        const connectionStatus = document.createElement('div');
        connectionStatus.className = 'connection-status';
        connectionStatus.id = `status-${user.socketId}`;
        connectionStatus.textContent = 'Connecting...';

        const controlsOverlay = document.createElement('div');
        controlsOverlay.className = 'video-controls-overlay';

        const audioStatus = document.createElement('span');
        audioStatus.className = 'audio-status';
        audioStatus.id = `audio-${user.socketId}`;
        audioStatus.textContent = '🔇 Muted';

        const videoStatus = document.createElement('span');
        videoStatus.className = 'video-status';
        videoStatus.id = `video-${user.socketId}`;
        videoStatus.textContent = '📵 Video Off';

        controlsOverlay.appendChild(audioStatus);
        controlsOverlay.appendChild(videoStatus);

        videoWrapper.appendChild(video);
        videoWrapper.appendChild(label);
        videoWrapper.appendChild(connectionStatus);
        videoWrapper.appendChild(controlsOverlay);

        // Set up aspect ratio detection for remote video
        this.setupVideoAspectRatio(video);

        this.remoteVideos.appendChild(videoWrapper);
        this.updateRemoteVideosLayout();

        // Trigger size calculation after DOM update
        setTimeout(() => {
            const userCount = this.remoteVideos.children.length;
            this.calculateOptimalVideoSizes(userCount);
        }, 50);
    }

    updateRemoteVideo(userId, stream) {
        const video = document.getElementById(`video-${userId}`);
        if (video) {
            video.srcObject = stream;
        }
    }

    updateConnectionStatus(userId, state) {
        const statusElement = document.getElementById(`status-${userId}`);
        if (statusElement) {
            if (state === 'connected') {
                statusElement.textContent = 'Connected';
                statusElement.classList.add('connected');
            } else if (state === 'disconnected' || state === 'failed') {
                statusElement.textContent = 'Disconnected';
                statusElement.classList.remove('connected');
            } else {
                statusElement.textContent = 'Connecting...';
                statusElement.classList.remove('connected');
            }
        }
    }

    handleUserLeft(userId) {
        // Close peer connection
        const peerConnection = this.peerConnections.get(userId);
        if (peerConnection) {
            peerConnection.close();
            this.peerConnections.delete(userId);
        }

        // Remove remote stream
        this.remoteStreams.delete(userId);

        // Remove video element
        const videoWrapper = document.getElementById(`video-wrapper-${userId}`);
        if (videoWrapper) {
            videoWrapper.remove();
        }

        this.updateRemoteVideosLayout();
    }

    updateUserCount(count) {
        this.userCountText.textContent = `Users in room: ${count}`;
    }

    updateRemoteVideosLayout() {
        const userCount = this.remoteVideos.children.length;
        this.remoteVideos.setAttribute('data-users', userCount.toString());
        this.calculateOptimalVideoSizes(userCount);
    }

    calculateOptimalVideoSizes(userCount) {
        if (userCount === 0) return;

        const remoteVideoContainer = this.remoteVideos;

        // Update grid layout attributes for proper responsive behavior
        remoteVideoContainer.setAttribute('data-users', userCount.toString());

        // Videos now use CSS aspect-ratio: 16/9, so no height calculations needed
        // The aspect ratio ensures consistent proportions across all screen sizes
    }

    updateRemoteUserAudioStatus(userId, muted) {
        const audioStatus = document.getElementById(`audio-${userId}`);
        if (audioStatus) {
            if (muted) {
                audioStatus.classList.add('muted');
            } else {
                audioStatus.classList.remove('muted');
            }
        }
    }

    updateRemoteUserVideoStatus(userId, videoOff) {
        const videoStatus = document.getElementById(`video-${userId}`);
        if (videoStatus) {
            if (videoOff) {
                videoStatus.classList.add('off');
            } else {
                videoStatus.classList.remove('off');
            }
        }
    }

    toggleAudio() {
        if (this.localStream) {
            const audioTrack = this.localStream.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                this.isAudioMuted = !audioTrack.enabled;

                this.muteBtn.classList.toggle('active', this.isAudioMuted);
                this.muteBtn.querySelector('.btn-icon').textContent = this.isAudioMuted ? '🔇' : '🎤';
                this.muteBtn.querySelector('.btn-text').textContent = this.isAudioMuted ? 'Unmute' : 'Mute';

                // Update local audio status display
                if (this.isAudioMuted) {
                    this.localAudioStatus.classList.add('muted');
                    this.localAudioStatus.textContent = '🔇 Muted';
                } else {
                    this.localAudioStatus.classList.remove('muted');
                }

                // Notify other users
                this.socket.emit('user-toggle-audio', {
                    roomId: this.currentRoom,
                    muted: this.isAudioMuted
                });
            }
        }
    }

    toggleVideo() {
        if (this.localStream) {
            const videoTrack = this.localStream.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                this.isVideoMuted = !videoTrack.enabled;

                this.videoBtn.classList.toggle('active', this.isVideoMuted);
                this.videoBtn.querySelector('.btn-icon').textContent = this.isVideoMuted ? '📵' : '📹';
                this.videoBtn.querySelector('.btn-text').textContent = this.isVideoMuted ? 'Turn On' : 'Video';

                // Update local video status display
                if (this.isVideoMuted) {
                    this.localVideoStatus.classList.add('off');
                    this.localVideoStatus.textContent = '📵 Video Off';
                } else {
                    this.localVideoStatus.classList.remove('off');
                }

                // Notify other users
                this.socket.emit('user-toggle-video', {
                    roomId: this.currentRoom,
                    videoOff: this.isVideoMuted
                });
            }
        }
    }

    async toggleScreenShare() {
        try {
            if (!this.isScreenSharing) {
                const screenStream = await navigator.mediaDevices.getDisplayMedia({
                    video: true,
                    audio: true
                });

                const videoTrack = screenStream.getVideoTracks()[0];

                // Replace video track for all peer connections
                for (const [userId, peerConnection] of this.peerConnections) {
                    const sender = peerConnection.getSenders().find(s =>
                        s.track && s.track.kind === 'video'
                    );

                    if (sender) {
                        await sender.replaceTrack(videoTrack);
                    }
                }

                this.localVideo.srcObject = screenStream;
                this.isScreenSharing = true;
                this.screenShareBtn.classList.add('active');
                this.screenShareBtn.querySelector('.btn-text').textContent = 'Stop Share';

                // Update aspect ratio for screen share
                this.setupVideoAspectRatio(this.localVideo);

                videoTrack.onended = () => {
                    this.stopScreenShare();
                };

            } else {
                this.stopScreenShare();
            }
        } catch (error) {
            console.error('Error sharing screen:', error);
        }
    }

    async stopScreenShare() {
        try {
            const videoTrack = this.localStream.getVideoTracks()[0];

            // Replace screen share track back to camera for all peer connections
            for (const [userId, peerConnection] of this.peerConnections) {
                const sender = peerConnection.getSenders().find(s =>
                    s.track && s.track.kind === 'video'
                );

                if (sender && videoTrack) {
                    await sender.replaceTrack(videoTrack);
                }
            }

            this.localVideo.srcObject = this.localStream;
            this.isScreenSharing = false;
            this.screenShareBtn.classList.remove('active');
            this.screenShareBtn.querySelector('.btn-text').textContent = 'Share Screen';

            // Update aspect ratio back to camera
            this.setupVideoAspectRatio(this.localVideo);
        } catch (error) {
            console.error('Error stopping screen share:', error);
        }
    }

    hangUp() {
        // Stop local stream
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
        }

        // Close all peer connections
        for (const [userId, peerConnection] of this.peerConnections) {
            peerConnection.close();
        }
        this.peerConnections.clear();
        this.remoteStreams.clear();

        // Clear video elements
        this.localVideo.srcObject = null;
        this.remoteVideos.innerHTML = '';

        // Reset UI
        this.videoContainer.style.display = 'none';
        this.controls.style.display = 'none';
        this.userCount.style.display = 'none';
        this.fullscreenBtn.style.display = 'none';
        this.joinBtn.disabled = false;
        this.roomInput.disabled = false;
        this.usernameInput.disabled = false;
        this.roomInput.value = '';
        this.usernameInput.value = '';

        // Disable floating mode
        this.isInCall = false;
        this.disableFloatingMode();

        // Exit fullscreen if active
        if (this.isFullscreen) {
            this.exitFullscreen();
        }

        this.roomStatus.textContent = '';

        // Reset button states
        this.muteBtn.classList.remove('active');
        this.videoBtn.classList.remove('active');
        this.screenShareBtn.classList.remove('active');
        this.muteBtn.querySelector('.btn-icon').textContent = '🎤';
        this.muteBtn.querySelector('.btn-text').textContent = 'Mute';
        this.videoBtn.querySelector('.btn-icon').textContent = '📹';
        this.videoBtn.querySelector('.btn-text').textContent = 'Video';
        this.screenShareBtn.querySelector('.btn-text').textContent = 'Share Screen';

        // Reset status displays
        this.localAudioStatus.classList.remove('muted');
        this.localVideoStatus.classList.remove('off');

        // Disconnect and reconnect socket
        this.socket.disconnect();
        this.socket.connect();
        this.setupSocketEvents();
    }

    // Theme Management
    initializeTheme() {
        // Check for saved theme preference or default to light mode
        const savedTheme = localStorage.getItem('videoCallTheme') || 'light';
        this.isDarkMode = savedTheme === 'dark';
        this.applyTheme();
    }

    toggleTheme() {
        this.isDarkMode = !this.isDarkMode;
        this.applyTheme();
        localStorage.setItem('videoCallTheme', this.isDarkMode ? 'dark' : 'light');
    }

    applyTheme() {
        const body = document.body;
        const themeIcon = this.themeToggle.querySelector('.theme-icon');
        const floatingThemeIcon = this.floatingThemeToggle.querySelector('.theme-icon');

        if (this.isDarkMode) {
            body.classList.add('dark');
            themeIcon.textContent = '☀️';
            floatingThemeIcon.textContent = '☀️';
            this.themeToggle.title = 'Switch to Light Mode';
            this.floatingThemeToggle.title = 'Switch to Light Mode';
        } else {
            body.classList.remove('dark');
            themeIcon.textContent = '🌙';
            floatingThemeIcon.textContent = '🌙';
            this.themeToggle.title = 'Switch to Dark Mode';
            this.floatingThemeToggle.title = 'Switch to Dark Mode';
        }
    }

    // Fullscreen Management
    setupFullscreenEvents() {
        // Listen for fullscreen change events
        document.addEventListener('fullscreenchange', () => this.handleFullscreenChange());
        document.addEventListener('webkitfullscreenchange', () => this.handleFullscreenChange());
        document.addEventListener('mozfullscreenchange', () => this.handleFullscreenChange());
        document.addEventListener('MSFullscreenChange', () => this.handleFullscreenChange());

        // Listen for escape key to exit fullscreen
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isFullscreen) {
                this.exitFullscreen();
            }
        });
    }

    toggleFullscreen() {
        if (this.isFullscreen) {
            this.exitFullscreen();
        } else {
            this.enterFullscreen();
        }
    }

    enterFullscreen() {
        const element = document.documentElement;

        if (element.requestFullscreen) {
            element.requestFullscreen();
        } else if (element.webkitRequestFullscreen) {
            element.webkitRequestFullscreen();
        } else if (element.mozRequestFullScreen) {
            element.mozRequestFullScreen();
        } else if (element.msRequestFullscreen) {
            element.msRequestFullscreen();
        }

        this.isFullscreen = true;
        document.body.classList.add('fullscreen');

        const fullscreenIcon = this.fullscreenBtn.querySelector('.fullscreen-icon');
        fullscreenIcon.textContent = '⛶';
        this.fullscreenBtn.title = 'Exit Fullscreen';
    }

    exitFullscreen() {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.mozCancelFullScreen) {
            document.mozCancelFullScreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        }

        this.isFullscreen = false;
        document.body.classList.remove('fullscreen');

        const fullscreenIcon = this.fullscreenBtn.querySelector('.fullscreen-icon');
        fullscreenIcon.textContent = '⛶';
        this.fullscreenBtn.title = 'Enter Fullscreen';
    }

    handleFullscreenChange() {
        const isCurrentlyFullscreen = !!(
            document.fullscreenElement ||
            document.webkitFullscreenElement ||
            document.mozFullScreenElement ||
            document.msFullscreenElement
        );

        if (!isCurrentlyFullscreen && this.isFullscreen) {
            // User exited fullscreen using browser controls or ESC key
            this.isFullscreen = false;
            document.body.classList.remove('fullscreen');

            const fullscreenIcon = this.fullscreenBtn.querySelector('.fullscreen-icon');
            fullscreenIcon.textContent = '⛶';
            this.fullscreenBtn.title = 'Enter Fullscreen';
        }
    }

    // Enhanced responsive handling
    handleWindowResize() {
        // Update video grid layout based on window size
        this.updateRemoteVideosLayout();

        // Recalculate video sizes for new viewport
        const userCount = this.remoteVideos.children.length;
        if (userCount > 0) {
            // Delay to allow layout to settle
            setTimeout(() => {
                this.calculateOptimalVideoSizes(userCount);
            }, 100);
        }

        // Adjust fullscreen layout if needed
        if (this.isFullscreen) {
            this.adjustFullscreenLayout();
        }
    }

    adjustFullscreenLayout() {
        const isMobile = window.innerWidth <= 768;
        const controls = this.controls;

        if (isMobile) {
            controls.style.bottom = '10px';
            controls.style.padding = '10px 15px';
        } else {
            controls.style.bottom = '20px';
            controls.style.padding = '15px';
        }
    }

    // Floating Controls System
    setupFloatingControls() {
        // Mouse move detection for video container
        this.videoContainer.addEventListener('mousemove', () => {
            if (this.isInCall) {
                this.showFloatingControls();
                this.resetHideTimer();
            }
        });

        // Mouse leave detection for video container
        this.videoContainer.addEventListener('mouseleave', () => {
            if (this.isInCall) {
                this.hideFloatingControls();
            }
        });

        // Keep controls visible when hovering over them
        this.controls.addEventListener('mouseenter', () => {
            if (this.isInCall) {
                this.clearHideTimer();
            }
        });

        this.controls.addEventListener('mouseleave', () => {
            if (this.isInCall) {
                this.resetHideTimer();
            }
        });

        this.floatingMenu.addEventListener('mouseenter', () => {
            if (this.isInCall) {
                this.clearHideTimer();
            }
        });

        this.floatingMenu.addEventListener('mouseleave', () => {
            if (this.isInCall) {
                this.resetHideTimer();
            }
        });
    }

    // Random Username Generator
    generateRandomUsername() {
        const adjectives = [
            'Happy', 'Clever', 'Bright', 'Swift', 'Bold', 'Calm', 'Creative', 'Dynamic',
            'Eager', 'Friendly', 'Gentle', 'Honest', 'Joyful', 'Kind', 'Lively', 'Mighty',
            'Noble', 'Polite', 'Quick', 'Radiant', 'Smart', 'Talented', 'Unique', 'Vibrant',
            'Wise', 'Zealous', 'Brilliant', 'Cheerful', 'Determined', 'Energetic'
        ];

        const nouns = [
            'Panda', 'Tiger', 'Eagle', 'Dolphin', 'Lion', 'Fox', 'Wolf', 'Bear',
            'Owl', 'Hawk', 'Shark', 'Whale', 'Leopard', 'Falcon', 'Raven', 'Lynx',
            'Otter', 'Seal', 'Deer', 'Moose', 'Elk', 'Bison', 'Jaguar', 'Cheetah',
            'Penguin', 'Flamingo', 'Parrot', 'Toucan', 'Peacock', 'Swan'
        ];

        const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
        const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
        const randomNumber = Math.floor(Math.random() * 999) + 1;

        const randomUsername = `${randomAdjective}${randomNoun}${randomNumber}`;
        this.usernameInput.value = randomUsername;
    }

    enableFloatingMode() {
        // Hide header
        this.header.classList.add('hidden');

        // Hide room controls and info panel
        this.roomControls.classList.add('hidden');
        this.infoPanel.classList.add('hidden');

        // Convert controls to floating
        this.controls.classList.add('floating');

        // Convert user count to floating
        this.userCount.classList.add('floating');

        // Show floating menu
        this.floatingMenu.classList.add('visible');

        // Initial hide of controls
        setTimeout(() => {
            this.hideFloatingControls();
        }, 3000); // Hide after 3 seconds
    }

    disableFloatingMode() {
        // Show header
        this.header.classList.remove('hidden');

        // Show room controls and info panel
        this.roomControls.classList.remove('hidden');
        this.infoPanel.classList.remove('hidden');

        // Remove floating controls
        this.controls.classList.remove('floating', 'visible');

        // Remove floating user count
        this.userCount.classList.remove('floating');

        // Hide floating menu
        this.floatingMenu.classList.remove('visible');

        // Clear any timers
        this.clearHideTimer();
    }

    showFloatingControls() {
        if (this.isInCall) {
            this.controls.classList.add('visible');
            this.floatingMenu.classList.add('visible');
        }
    }

    hideFloatingControls() {
        if (this.isInCall) {
            this.controls.classList.remove('visible');
            this.floatingMenu.classList.remove('visible');
        }
    }

    resetHideTimer() {
        this.clearHideTimer();
        this.hideControlsTimeout = setTimeout(() => {
            this.hideFloatingControls();
        }, 3000); // Hide after 3 seconds of inactivity
    }

    clearHideTimer() {
        if (this.hideControlsTimeout) {
            clearTimeout(this.hideControlsTimeout);
            this.hideControlsTimeout = null;
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new MultiUserVideoCall();
});