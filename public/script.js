 // DOM Elements
const homeScreen = document.getElementById('homeScreen');
const chatContainer = document.getElementById('chatContainer');
const videoContainer = document.getElementById('videoContainer');
const startChatBtn = document.getElementById('startChatBtn');
const startVideoBtn = document.getElementById('startVideoBtn');
const termsModal = document.getElementById('termsModal');
const closeTermsModal = document.getElementById('closeTermsModal');
const agreeBtn = document.getElementById('agreeBtn');
const chatExitBtn = document.getElementById('chatExitBtn');
const videoExitBtn = document.getElementById('videoExitBtn');
const chatMessages = document.getElementById('chatMessages');
const videoChatMessages = document.getElementById('videoChatMessages');
const messageInput = document.getElementById('messageInput');
const videoMessageInput = document.getElementById('videoMessageInput');
const sendBtn = document.getElementById('sendBtn');
const videoSendBtn = document.getElementById('videoSendBtn');
const statusIndicator = document.getElementById('statusIndicator');
const statusText = document.getElementById('statusText');
const connectBtn = document.getElementById('connectBtn');
const attachBtn = document.getElementById('attachBtn');
const attachMenu = document.getElementById('attachMenu');
const sendLocation = document.getElementById('sendLocation');
const sendPhoto = document.getElementById('sendPhoto');
const sendVideo = document.getElementById('sendVideo');
const remoteVideo = document.getElementById('remoteVideo');
const localVideo = document.getElementById('localVideo');
const requestPermissionBtn = document.getElementById('requestPermissionBtn');
const videoPermissionPrompt = document.getElementById('videoPermissionPrompt');
const messageMenu = document.getElementById('messageMenu');
const deleteMessage = document.getElementById('deleteMessage');
const replyMessage = document.getElementById('replyMessage');
const termsLink = document.getElementById('termsLink');
const privacyLink = document.getElementById('privacyLink');
const dmcaLink = document.getElementById('dmcaLink');
const photoInput = document.getElementById('photoInput');
const videoInput = document.getElementById('videoInput');
const interestsInput = document.getElementById('interestsInput');

// Configuration
const WS_SERVER_URL = 'wss://omegle-i.onrender.com'; // Replace with your WebSocket server URL
const ICE_SERVERS = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' }
];

// State variables
let isConnected = false;
let isTyping = false;
let typingTimeout;
let currentChatType = null; // 'text' or 'video'
let selectedMessage = null;
let localStream = null;
let peerConnection = null;
let dataChannel = null;
let socket = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

// Initialize the app
function init() {
    setupEventListeners();
}

// Set up event listeners
function setupEventListeners() {
    // Home screen buttons
    startChatBtn.addEventListener('click', () => {
        currentChatType = 'text';
        showTermsModal();
    });
    
    startVideoBtn.addEventListener('click', () => {
        currentChatType = 'video';
        showTermsModal();
    });
    
    // Terms modal
    closeTermsModal.addEventListener('click', hideTermsModal);
    agreeBtn.addEventListener('click', () => {
        hideTermsModal();
        if (currentChatType === 'text') {
            startTextChat();
        } else {
            startVideoChat();
        }
    });
    
    // Chat interface
    chatExitBtn.addEventListener('click', () => {
        disconnect();
        showHomeScreen();
    });
    
    videoExitBtn.addEventListener('click', () => {
        endVideoCall();
        showHomeScreen();
    });
    
    // Message input
    messageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && messageInput.value.trim()) {
            sendMessage();
        }
        
        if (!isTyping && messageInput.value) {
            isTyping = true;
            sendTypingStatus(true);
        }
    });
    
    messageInput.addEventListener('input', debounce(() => {
        if (messageInput.value) {
            if (!isTyping) {
                isTyping = true;
                sendTypingStatus(true);
            }
        } else {
            isTyping = false;
            sendTypingStatus(false);
        }
    }, 1000));
    
    videoMessageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && videoMessageInput.value.trim()) {
            sendVideoMessage();
        }
    });
    
    // Send buttons
    sendBtn.addEventListener('click', sendMessage);
    videoSendBtn.addEventListener('click', sendVideoMessage);
    
    // Connect button
    connectBtn.addEventListener('click', toggleConnection);
    
    // Attachments
    attachBtn.addEventListener('click', toggleAttachMenu);
    sendLocation.addEventListener('click', () => {
        sendLocationMessage();
        hideAttachMenu();
    });
    sendPhoto.addEventListener('click', () => {
        photoInput.click();
        hideAttachMenu();
    });
    sendVideo.addEventListener('click', () => {
        videoInput.click();
        hideAttachMenu();
    });
    
    // File inputs
    photoInput.addEventListener('change', handleFileUpload);
    videoInput.addEventListener('change', handleFileUpload);
    
    // Request permissions
    requestPermissionBtn.addEventListener('click', requestPermissions);
    
    // Message context menu
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.message') && !e.target.closest('.message-menu')) {
            hideMessageMenu();
        }
    });
    
    // Footer links
    termsLink.addEventListener('click', (e) => {
        e.preventDefault();
        alert("By using this website, you agree to comply with all applicable laws and not to use the service for any illegal activities. Users must be at least 18 years old or have parental permission to access the website. We reserve the right to terminate or restrict your access at any time for violating our policies or engaging in inappropriate behavior. You are solely responsible for your interactions and activities on this platform.");
    });
    
    privacyLink.addEventListener('click', (e) => {
        e.preventDefault();
        alert("We value your privacy. This website may collect minimal data such as IP address, browser type, and usage activity for analytical and security purposes. We do not sell or share your personal information with third parties, except as required by law. By using this site, you consent to the collection and use of information in accordance with this policy.");
    });
    
    dmcaLink.addEventListener('click', (e) => {
        e.preventDefault();
        alert("We respect copyright laws and comply with the Digital Millennium Copyright Act (DMCA). If you believe that any content on this site infringes upon your copyright, please contact us with proper documentation, and we will take appropriate action.");
    });
    
    // Long press for message menu
    document.addEventListener('contextmenu', (e) => {
        if (e.target.closest('.message')) {
            e.preventDefault();
            showMessageMenu(e.target.closest('.message'), e.clientX, e.clientY);
        }
    });
    
    deleteMessage.addEventListener('click', () => {
        if (selectedMessage) {
            selectedMessage.remove();
            hideMessageMenu();
        }
    });
    
    replyMessage.addEventListener('click', () => {
        if (selectedMessage) {
            const messageText = selectedMessage.textContent;
            if (currentChatType === 'text') {
                messageInput.value = `Replying to: ${messageText}`;
                messageInput.focus();
            } else {
                videoMessageInput.value = `Replying to: ${messageText}`;
                videoMessageInput.focus();
            }
            hideMessageMenu();
        }
    });

    // Handle window close
    window.addEventListener('beforeunload', () => {
        disconnect();
    });
}

// Initialize WebSocket connection
function connectWebSocket() {
    if (socket && socket.readyState === WebSocket.OPEN) {
        return;
    }

    socket = new WebSocket(WS_SERVER_URL);

    socket.onopen = () => {
        console.log("WebSocket connected");
        reconnectAttempts = 0;
        updateConnectionStatus(true);

        // Join the appropriate queue based on chat type
        const message = {
            type: 'join',
            chatType: currentChatType,
            interests: interestsInput.value.trim()
        };
        socket.send(JSON.stringify(message));
    };

    socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log("Message received:", data);

        switch (data.type) {
            case 'connected':
                handleStrangerConnected(data);
                break;
            case 'message':
                handleReceivedMessage(data);
                break;
            case 'typing':
                handleTypingIndicator(data);
                break;
            case 'offer':
                handleOffer(data);
                break;
            case 'answer':
                handleAnswer(data);
                break;
            case 'ice-candidate':
                handleICECandidate(data);
                break;
            case 'file':
                handleReceivedFile(data);
                break;
            case 'disconnected':
                handleStrangerDisconnected();
                break;
            case 'error':
                handleError(data.message);
                break;
        }
    };

    socket.onclose = (event) => {
        console.log("WebSocket closed:", event);
        updateConnectionStatus(false);
        
        if (event.code !== 1000 && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
            const delay = Math.min(1000 * (reconnectAttempts + 1), 5000);
            console.log(`Reconnecting in ${delay}ms...`);
            setTimeout(connectWebSocket, delay);
            reconnectAttempts++;
        }
    };

    socket.onerror = (error) => {
        console.error("WebSocket error:", error);
        handleError("Connection error occurred");
    };
}

// Disconnect WebSocket
function disconnect() {
    if (socket) {
        if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: 'leave' }));
            socket.close();
        }
        socket = null;
    }
    isConnected = false;
    updateConnectionStatus(false);
}

// Handle stranger connected
function handleStrangerConnected(data) {
    isConnected = true;
    updateConnectionStatus(true);
    
    if (currentChatType === 'text') {
        setTimeout(() => {
            addTypingIndicator();
            setTimeout(() => {
                removeTypingIndicator();
                addStrangerMessage("Hi there! How are you?");
            }, 2000);
        }, 1000);
    } else {
        initializeWebRTC(true);
    }
}

// Handle received message
function handleReceivedMessage(data) {
    if (currentChatType === 'text') {
        addStrangerMessage(data.message);
    } else {
        addVideoStrangerMessage(data.message);
    }
}

// Handle typing indicator
function handleTypingIndicator(data) {
    if (data.isTyping) {
        addTypingIndicator();
    } else {
        removeTypingIndicator();
    }
}

// Handle WebRTC offer
function handleOffer(data) {
    if (currentChatType !== 'video') return;

    // Reset peerConnection if not stable
    if (!peerConnection || peerConnection.signalingState !== "stable") {
        if (peerConnection) {
            peerConnection.close();
            peerConnection = null;
        }
        initializeWebRTC(false);
    }

    const offer = new RTCSessionDescription(data.offer);

    if (peerConnection.signalingState === "stable") {
        peerConnection.setRemoteDescription(offer)
            .then(() => peerConnection.createAnswer())
            .then(answer => peerConnection.setLocalDescription(answer))
            .then(() => {
                socket.send(JSON.stringify({
                    type: 'answer',
                    answer: peerConnection.localDescription
                }));
            })
            .catch(handleError);
    }
}

// Handle WebRTC answer         
function handleAnswer(data) {
    if (!peerConnection) return;

    if (peerConnection.signalingState === "have-local-offer") {
        const answer = new RTCSessionDescription(data.answer);
        peerConnection.setRemoteDescription(answer)
            .then(() => console.log("Answer set"))
            .catch(handleError);
    } else {
        console.warn("⚠ Skipped setting answer — invalid signalingState:", peerConnection.signalingState);
    }
}

// Handle ICE candidate
function handleICECandidate(data) {
    if (!peerConnection) return;
    
    const candidate = new RTCIceCandidate(data.candidate);
    peerConnection.addIceCandidate(candidate)
        .catch(handleError);
}

// Handle received file
function handleReceivedFile(data) {
    const fileType = data.fileType;
    const fileData = data.fileData;
    
    if (fileType.startsWith('image/')) {
        const img = document.createElement('img');
        img.src = fileData;
        img.className = 'file-preview';
        
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message stranger';
        messageDiv.textContent = 'Stranger sent an image:';
        messageDiv.appendChild(img);
        
        if (currentChatType === 'text') {
            chatMessages.appendChild(messageDiv);
        } else {
            videoChatMessages.appendChild(messageDiv);
        }
    } else if (fileType.startsWith('video/')) {
        const video = document.createElement('video');
        video.src = fileData;
        video.controls = true;
        video.className = 'file-preview';
        
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message stranger';
        messageDiv.textContent = 'Stranger sent a video:';
        messageDiv.appendChild(video);
        
        if (currentChatType === 'text') {
            chatMessages.appendChild(messageDiv);
        } else {
            videoChatMessages.appendChild(messageDiv);
        }
    }
    
    scrollToBottom(currentChatType === 'text' ? chatMessages : videoChatMessages);
}

// Handle stranger disconnected
function handleStrangerDisconnected() {
    if (currentChatType === 'text') {
        // Message removed
    } else {
        addVideoSystemMessage("Stranger has disconnected");
        endVideoCall();
    }
    
    isConnected = false;
    updateConnectionStatus(false);
    
    // Reconnect if in video chat
    if (currentChatType === 'video') {
        setTimeout(() => {
            if (socket && socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({
                    type: 'join',
                    chatType: 'video',
                    interests: interestsInput.value.trim()
                }));
            }
        }, 3000);
    }
}
 
// Handle errors
function handleError(message) {
    console.error("Error:", message);
    if (currentChatType === 'text') {
        addSystemMessage(`Error: ${message}`);
    } else {
        addVideoSystemMessage(`Error: ${message}`);
    }
}

// Initialize WebRTC connection
function initializeWebRTC(isInitiator) {
    peerConnection = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    // Add local stream to connection
    if (localStream) {
        localStream.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStream);
        });
    }

    // Set up data channel if initiator
    if (isInitiator) {
        dataChannel = peerConnection.createDataChannel('chat');
        setupDataChannel(dataChannel);
    } else {
        peerConnection.ondatachannel = (event) => {
            dataChannel = event.channel;
            setupDataChannel(dataChannel);
        };
    }

    // ICE candidate handler
    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            socket.send(JSON.stringify({
                type: 'ice-candidate',
                candidate: event.candidate
            }));
        }
    };

    // Track handlers
    peerConnection.ontrack = (event) => {
        remoteVideo.srcObject = event.streams[0];
    };

    // Create offer if initiator
    if (isInitiator) {
        peerConnection.createOffer()
            .then(offer => peerConnection.setLocalDescription(offer))
            .then(() => {
                socket.send(JSON.stringify({
                    type: 'offer',
                    offer: peerConnection.localDescription
                }));
            })
            .catch(handleError);
    }
}

// Set up data channel
function setupDataChannel(channel) {
    channel.onopen = () => {
        console.log("Data channel opened");
    };

    channel.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.type === 'message') {
            if (currentChatType === 'text') {
                addStrangerMessage(data.content);
            } else {
                addVideoStrangerMessage(data.content);
            }
        } else if (data.type === 'file') {
            handleReceivedFile(data);
        }
    };

    channel.onclose = () => {
        console.log("Data channel closed");
    };
}

// Show terms modal
function showTermsModal() {
    termsModal.style.display = 'flex';
}

// Hide terms modal
function hideTermsModal() {
    termsModal.style.display = 'none';
}

// Show home screen
function showHomeScreen() {
    homeScreen.style.display = 'flex';
    chatContainer.style.display = 'none';
    videoContainer.style.display = 'none';
    
    // Clean up
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }
    if (dataChannel) {
        dataChannel.close();
        dataChannel = null;
    }
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localStream = null;
    }
    disconnect();
}

// Start text chat
function startTextChat() {
    homeScreen.style.display = 'none';
    chatContainer.style.display = 'flex';
    videoContainer.style.display = 'none';
    
    // Clear previous messages
    chatMessages.innerHTML = '';
    
    // Connect to server
    connectWebSocket();
}

// Start video chat
function startVideoChat() {
    homeScreen.style.display = 'none';
    chatContainer.style.display = 'none';
    videoContainer.style.display = 'flex';

    videoChatMessages.innerHTML = '';
    videoPermissionPrompt.style.display = 'block';

    // First request permission
    requestPermissions()
        .then(() => {
            // Only after permission is granted, connect to WebSocket
            connectWebSocket();
        })
        .catch(err => {
            handleError("Camera/mic access denied. Please allow permission.");
            videoPermissionPrompt.innerHTML += '<p style="color:red;">Permission denied. Retry or check browser settings.</p>';
        });
}

// Request camera/mic permissions
function requestPermissions() {
    return navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then(stream => {
            localStream = stream;
            localVideo.srcObject = stream;
            videoPermissionPrompt.style.display = 'none';
            addVideoSystemMessage("Video chat started");

            if (isConnected) {
                initializeWebRTC(true);
            }
        })
        .catch(err => {
            console.error("Error accessing media devices:", err);
            throw err;
        });
}

// Toggle connection status
function toggleConnection() {
    if (isConnected && socket && socket.readyState === WebSocket.OPEN) {
        // Send disconnect message first
        socket.send(JSON.stringify({ type: 'disconnect' }));

        // Delay closing to ensure message is delivered
        setTimeout(() => {
            socket.close();
        }, 200);
    } else {
        connectWebSocket();
    }
}

// Update connection status UI
function updateConnectionStatus(connected) {
    isConnected = connected;
    if (connected) {
        statusIndicator.classList.add('connected');
        statusText.textContent = 'Connected';
        connectBtn.classList.remove('disconnected');
        connectBtn.innerHTML = '<div class="connect-icon"></div><span>Disconnect</span>';
    } else {
        statusIndicator.classList.remove('connected');
        statusText.textContent = 'Disconnected';
        connectBtn.classList.add('disconnected');
        connectBtn.innerHTML = '<div class="connect-icon"></div><span>Connect</span>';
    }
}

// Send text message
function sendMessage() {
    const message = messageInput.value.trim();
    if (!message) return;
    
    addUserMessage(message);
    
    if (dataChannel && dataChannel.readyState === 'open') {
        dataChannel.send(JSON.stringify({
            type: 'message',
            content: message
        }));
    } else if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
            type: 'message',
            message: message
        }));
    }
    
    messageInput.value = '';
    
    if (typingTimeout) clearTimeout(typingTimeout);
    isTyping = false;
    sendTypingStatus(false);
}

// Send video chat message
function sendVideoMessage() {
    const message = videoMessageInput.value.trim();
    if (!message) return;
    
    addVideoUserMessage(message);
    
    if (dataChannel && dataChannel.readyState === 'open') {
        dataChannel.send(JSON.stringify({
            type: 'message',
            content: message
        }));
    }
    
    videoMessageInput.value = '';
}

// Send typing status
function sendTypingStatus(isTyping) {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
            type: 'typing',
            isTyping: isTyping
        }));
    }
}

// Send location message
function sendLocationMessage() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            position => {
                const { latitude, longitude } = position.coords;
                const message = `My location: https://www.google.com/maps?q=${latitude},${longitude}`;
                
                if (currentChatType === 'text') {
                    addUserMessage(message);
                    socket.send(JSON.stringify({
                        type: 'message',
                        message: message
                    }));
                } else {
                    addVideoUserMessage(message);
                    if (dataChannel && dataChannel.readyState === 'open') {
                        dataChannel.send(JSON.stringify({
                            type: 'message',
                            content: message
                        }));
                    }
                }
            },
            error => {
                console.error("Error getting location:", error);
                handleError("Could not get your location. Please check your permissions.");
            }
        );
    } else {
        handleError("Geolocation is not supported by your browser");
    }
}

// Handle file upload
function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
        const fileData = event.target.result;
        
        if (file.type.startsWith('image/')) {
            const img = document.createElement('img');
            img.src = fileData;
            img.className = 'file-preview';
            
            const messageDiv = document.createElement('div');
            messageDiv.className = 'message user';
            messageDiv.textContent = 'You sent an image:';
            messageDiv.appendChild(img);
            
            if (currentChatType === 'text') {
                chatMessages.appendChild(messageDiv);
                
                // Send via WebSocket
                if (socket && socket.readyState === WebSocket.OPEN) {
                    socket.send(JSON.stringify({
                        type: 'file',
                        fileType: file.type,
                        fileData: fileData
                    }));
                }
            } else {
                videoChatMessages.appendChild(messageDiv);
                
                // Send via data channel
                if (dataChannel && dataChannel.readyState === 'open') {
                    dataChannel.send(JSON.stringify({
                        type: 'file',
                        fileType: file.type,
                        fileData: fileData
                    }));
                }
            }
        } else if (file.type.startsWith('video/')) {
            const video = document.createElement('video');
            video.src = fileData;
            video.controls = true;
            video.className = 'file-preview';
            
            const messageDiv = document.createElement('div');
            messageDiv.className = 'message user';
            messageDiv.textContent = 'You sent a video:';
            messageDiv.appendChild(video);
            
            if (currentChatType === 'text') {
                chatMessages.appendChild(messageDiv);
                
                // Send via WebSocket
                if (socket && socket.readyState === WebSocket.OPEN) {
                    socket.send(JSON.stringify({
                        type: 'file',
                        fileType: file.type,
                        fileData: fileData
                    }));
                }
            } else {
                videoChatMessages.appendChild(messageDiv);
                
                // Send via data channel
                if (dataChannel && dataChannel.readyState === 'open') {
                    dataChannel.send(JSON.stringify({
                        type: 'file',
                        fileType: file.type,
                        fileData: fileData
                    }));
                }
            }
        }
        
        scrollToBottom(currentChatType === 'text' ? chatMessages : videoChatMessages);
    };
    
    reader.readAsDataURL(file);
    e.target.value = '';
}

// Add user message to chat
function addUserMessage(text) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message user';
    messageDiv.textContent = text;
    
    // Add long press event
    messageDiv.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        showMessageMenu(messageDiv, e.clientX, e.clientY);
    });
    
    chatMessages.appendChild(messageDiv);
    scrollToBottom(chatMessages);
}

// Add stranger message to chat
function addStrangerMessage(text) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message stranger';
    messageDiv.textContent = text;
    
    // Add long press event
    messageDiv.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        showMessageMenu(messageDiv, e.clientX, e.clientY);
    });
    
    chatMessages.appendChild(messageDiv);
    scrollToBottom(chatMessages);
}

// Add system message to chat
function addSystemMessage(text) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message system';
    messageDiv.textContent = text;
    chatMessages.appendChild(messageDiv);
    scrollToBottom(chatMessages);
}

// Add typing indicator
function addTypingIndicator() {
    const typingDiv = document.createElement('div');
    typingDiv.className = 'typing-indicator';
    typingDiv.textContent = 'Stranger is typing...';
    typingDiv.id = 'typingIndicator';
    chatMessages.appendChild(typingDiv);
    scrollToBottom(chatMessages);
}

// Remove typing indicator
function removeTypingIndicator() {
    const typingDiv = document.getElementById('typingIndicator');
    if (typingDiv) typingDiv.remove();
}

// Add video user message
function addVideoUserMessage(text) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message user';
    messageDiv.textContent = text;
    
    // Add long press event
    messageDiv.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        showMessageMenu(messageDiv, e.clientX, e.clientY);
    });
    
    videoChatMessages.appendChild(messageDiv);
    scrollToBottom(videoChatMessages);
}

// Add video stranger message
function addVideoStrangerMessage(text) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message stranger';
    messageDiv.textContent = text;
    
    // Add long press event
    messageDiv.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        showMessageMenu(messageDiv, e.clientX, e.clientY);
    });
    
    videoChatMessages.appendChild(messageDiv);
    scrollToBottom(videoChatMessages);
}

// Add video system message
function addVideoSystemMessage(text) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message system';
    messageDiv.textContent = text;
    videoChatMessages.appendChild(messageDiv);
    scrollToBottom(videoChatMessages);
}

// Toggle attach menu
function toggleAttachMenu() {
    attachMenu.classList.toggle('show');
}

// Hide attach menu
function hideAttachMenu() {
    attachMenu.classList.remove('show');
}

// End video call
function endVideoCall() {
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }

    if (dataChannel) {
        dataChannel.close();
        dataChannel = null;
    }

    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localStream = null;
        localVideo.srcObject = null;
    }

    remoteVideo.srcObject = null;
    videoPermissionPrompt.style.display = 'block';
    addVideoSystemMessage("Video chat ended");

    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'disconnect' }));
        setTimeout(() => {
            socket.close();
        }, 200);
    }

    videoChatMessages.innerHTML = '';
}

// Show message context menu
function showMessageMenu(messageElement, x, y) {
    selectedMessage = messageElement;
    messageMenu.style.left = `${x}px`;
    messageMenu.style.top = `${y}px`;
    messageMenu.classList.add('show');
}

// Hide message context menu
function hideMessageMenu() {
    messageMenu.classList.remove('show');
}

// Scroll to bottom of chat
function scrollToBottom(element) {
    element.scrollTop = element.scrollHeight;
}

// Debounce function
function debounce(func, wait) {
    let timeout;
    return function() {
        const context = this;
        const args = arguments;
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            func.apply(context, args);
        }, wait);
    };
}

// Initialize the app
init();
