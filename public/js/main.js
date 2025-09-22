class VideoCallApp {
    constructor() {
        this.socket = io();
        this.localVideo = document.getElementById('localVideo');
        this.remoteVideo = document.getElementById('remoteVideo');
        this.roomInput = document.getElementById('roomInput');
        this.joinBtn = document.getElementById('joinBtn');
        this.roomStatus = document.getElementById('roomStatus');
        this.videoContainer = document.getElementById('videoContainer');
        this.controls = document.getElementById('controls');
        this.connectionStatus = document.getElementById('connectionStatus');

        this.muteBtn = document.getElementById('muteBtn');
        this.videoBtn = document.getElementById('videoBtn');
        this.screenShareBtn = document.getElementById('screenShareBtn');
        this.hangupBtn = document.getElementById('hangupBtn');

        this.localStream = null;
        this.remoteStream = null;
        this.peerConnection = null;
        this.currentRoom = null;
        this.isAudioMuted = false;
        this.isVideoMuted = false;
        this.isScreenSharing = false;

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
    }

    setupEventListeners() {
        this.joinBtn.addEventListener('click', () => this.joinRoom());
        this.roomInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.joinRoom();
        });

        this.muteBtn.addEventListener('click', () => this.toggleAudio());
        this.videoBtn.addEventListener('click', () => this.toggleVideo());
        this.screenShareBtn.addEventListener('click', () => this.toggleScreenShare());
        this.hangupBtn.addEventListener('click', () => this.hangUp());
    }

    setupSocketEvents() {
        this.socket.on('user-connected', (userId) => {
            console.log('User connected:', userId);
            this.roomStatus.textContent = 'User connected. Initiating call...';
            this.initiateCall();
        });

        this.socket.on('offer', async (data) => {
            console.log('Received offer from:', data.sender);
            await this.handleOffer(data.offer, data.sender);
        });

        this.socket.on('answer', async (data) => {
            console.log('Received answer from:', data.sender);
            await this.handleAnswer(data.answer);
        });

        this.socket.on('ice-candidate', async (data) => {
            console.log('Received ICE candidate from:', data.sender);
            await this.handleIceCandidate(data.candidate);
        });

        this.socket.on('user-disconnected', (userId) => {
            console.log('User disconnected:', userId);
            this.roomStatus.textContent = 'User disconnected';
            this.connectionStatus.textContent = 'Disconnected';
            this.connectionStatus.classList.remove('connected');
            if (this.remoteVideo.srcObject) {
                this.remoteVideo.srcObject = null;
            }
        });

        this.socket.on('room-full', () => {
            this.roomStatus.textContent = 'Room is full (maximum 2 users)';
        });
    }

    async joinRoom() {
        const roomId = this.roomInput.value.trim();
        if (!roomId) {
            alert('Please enter a room ID');
            return;
        }

        try {
            this.currentRoom = roomId;
            this.roomStatus.textContent = 'Joining room...';

            await this.setupLocalStream();
            this.setupPeerConnection();

            this.socket.emit('join-room', roomId);
            this.roomStatus.textContent = `Joined room: ${roomId}. Waiting for another user...`;

            this.videoContainer.style.display = 'grid';
            this.controls.style.display = 'flex';
            this.joinBtn.disabled = true;
            this.roomInput.disabled = true;

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
    }

    setupPeerConnection() {
        this.peerConnection = new RTCPeerConnection(this.configuration);

        this.localStream.getTracks().forEach(track => {
            this.peerConnection.addTrack(track, this.localStream);
        });

        this.peerConnection.ontrack = (event) => {
            console.log('Received remote stream');
            this.remoteStream = event.streams[0];
            this.remoteVideo.srcObject = this.remoteStream;
            this.connectionStatus.textContent = 'Connected';
            this.connectionStatus.classList.add('connected');
            this.roomStatus.textContent = 'Video call connected!';
        };

        this.peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                this.socket.emit('ice-candidate', {
                    candidate: event.candidate,
                    target: this.currentRoom
                });
            }
        };

        this.peerConnection.onconnectionstatechange = () => {
            console.log('Connection state:', this.peerConnection.connectionState);
            if (this.peerConnection.connectionState === 'disconnected') {
                this.connectionStatus.textContent = 'Reconnecting...';
                this.connectionStatus.classList.remove('connected');
            }
        };
    }

    async initiateCall() {
        try {
            const offer = await this.peerConnection.createOffer();
            await this.peerConnection.setLocalDescription(offer);

            this.socket.emit('offer', {
                offer: offer,
                target: this.currentRoom
            });
        } catch (error) {
            console.error('Error creating offer:', error);
        }
    }

    async handleOffer(offer, sender) {
        try {
            await this.peerConnection.setRemoteDescription(offer);

            const answer = await this.peerConnection.createAnswer();
            await this.peerConnection.setLocalDescription(answer);

            this.socket.emit('answer', {
                answer: answer,
                target: sender
            });
        } catch (error) {
            console.error('Error handling offer:', error);
        }
    }

    async handleAnswer(answer) {
        try {
            await this.peerConnection.setRemoteDescription(answer);
        } catch (error) {
            console.error('Error handling answer:', error);
        }
    }

    async handleIceCandidate(candidate) {
        try {
            await this.peerConnection.addIceCandidate(candidate);
        } catch (error) {
            console.error('Error handling ICE candidate:', error);
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
                const sender = this.peerConnection.getSenders().find(s =>
                    s.track && s.track.kind === 'video'
                );

                if (sender) {
                    await sender.replaceTrack(videoTrack);
                }

                this.localVideo.srcObject = screenStream;
                this.isScreenSharing = true;
                this.screenShareBtn.classList.add('active');
                this.screenShareBtn.querySelector('.btn-text').textContent = 'Stop Share';

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
            const sender = this.peerConnection.getSenders().find(s =>
                s.track && s.track.kind === 'video'
            );

            if (sender && videoTrack) {
                await sender.replaceTrack(videoTrack);
            }

            this.localVideo.srcObject = this.localStream;
            this.isScreenSharing = false;
            this.screenShareBtn.classList.remove('active');
            this.screenShareBtn.querySelector('.btn-text').textContent = 'Share Screen';
        } catch (error) {
            console.error('Error stopping screen share:', error);
        }
    }

    hangUp() {
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
        }

        if (this.peerConnection) {
            this.peerConnection.close();
        }

        this.localVideo.srcObject = null;
        this.remoteVideo.srcObject = null;

        this.videoContainer.style.display = 'none';
        this.controls.style.display = 'none';
        this.joinBtn.disabled = false;
        this.roomInput.disabled = false;
        this.roomInput.value = '';

        this.roomStatus.textContent = '';
        this.connectionStatus.textContent = 'Connecting...';
        this.connectionStatus.classList.remove('connected');

        this.socket.disconnect();
        this.socket.connect();
        this.setupSocketEvents();

        location.reload();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new VideoCallApp();
});