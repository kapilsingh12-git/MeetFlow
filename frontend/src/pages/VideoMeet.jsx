import React, { useEffect, useRef, useState, useCallback } from 'react'
import io from "socket.io-client";
import { Badge, IconButton, TextField, Button, CircularProgress, Tooltip } from '@mui/material';
import VideocamIcon from '@mui/icons-material/Videocam';
import VideocamOffIcon from '@mui/icons-material/VideocamOff'
import CallEndIcon from '@mui/icons-material/CallEnd'
import MicIcon from '@mui/icons-material/Mic'
import MicOffIcon from '@mui/icons-material/MicOff'
import ScreenShareIcon from '@mui/icons-material/ScreenShare';
import StopScreenShareIcon from '@mui/icons-material/StopScreenShare'
import ChatIcon from '@mui/icons-material/Chat'
import SendIcon from '@mui/icons-material/Send'
import PersonIcon from '@mui/icons-material/Person';
import styles from "../styles/videoComponent.module.css";
import server from '../environment';

const server_url = server;

const peerConfigConnections = {
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
    ]
}

export default function VideoMeetComponent() {

    const socketRef = useRef();
    const socketIdRef = useRef();
    const localVideoref = useRef();
    // Peer connections live on a ref scoped to this component instance,
    // instead of a module-level object shared across every mount/meeting.
    const connectionsRef = useRef({});

    const [videoAvailable, setVideoAvailable] = useState(true);
    const [audioAvailable, setAudioAvailable] = useState(true);
    const [screenAvailable, setScreenAvailable] = useState(false);

    const [video, setVideo] = useState(true);
    const [audio, setAudio] = useState(true);
    const [screen, setScreen] = useState(false);

    const [showModal, setModal] = useState(false);
    const [messages, setMessages] = useState([]);
    const [message, setMessage] = useState("");
    const [newMessages, setNewMessages] = useState(0);

    const [askForUsername, setAskForUsername] = useState(true);
    const [username, setUsername] = useState("");
    const [connecting, setConnecting] = useState(false);
    const [permissionError, setPermissionError] = useState("");

    const [videos, setVideos] = useState([]);
    const videoRef = useRef([]);

    // --- Lobby: request camera/mic ONCE up front, in a single call ---
    useEffect(() => {
        let cancelled = false;

        const setupPreview = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                if (cancelled) {
                    stream.getTracks().forEach(t => t.stop());
                    return;
                }
                window.localStream = stream;
                if (localVideoref.current) localVideoref.current.srcObject = stream;
                setVideoAvailable(true);
                setAudioAvailable(true);
            } catch (err) {
                // Combined request failed — fall back to whichever device is actually available
                // instead of assuming both are unusable.
                let videoOk = false;
                let audioOk = false;
                try {
                    const vStream = await navigator.mediaDevices.getUserMedia({ video: true });
                    videoOk = true;
                    if (!cancelled) {
                        window.localStream = vStream;
                        if (localVideoref.current) localVideoref.current.srcObject = vStream;
                    } else {
                        vStream.getTracks().forEach(t => t.stop());
                    }
                } catch (e) { /* no camera */ }

                if (!videoOk) {
                    try {
                        const aStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                        audioOk = true;
                        if (!cancelled) {
                            window.localStream = aStream;
                        } else {
                            aStream.getTracks().forEach(t => t.stop());
                        }
                    } catch (e) { /* no mic either */ }
                }

                if (!cancelled) {
                    setVideoAvailable(videoOk);
                    setAudioAvailable(audioOk);
                    setVideo(videoOk);
                    setAudio(audioOk);
                    if (!videoOk && !audioOk) {
                        setPermissionError("Camera and microphone access are blocked. Allow access in your browser settings to join with video/audio.");
                    }
                }
            }

            if (!cancelled) {
                setScreenAvailable(!!navigator.mediaDevices.getDisplayMedia);
            }
        };

        setupPreview();

        return () => {
            cancelled = true;
        };
    }, []);

    // --- Cleanup everything when leaving the page ---
    useEffect(() => {
        return () => {
            cleanupCall();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // The lobby preview and the in-call self-view are two separate <video>
    // elements (only one is mounted at a time), sharing the same ref. When
    // we switch from the lobby to the call, a brand-new <video> element
    // mounts and its srcObject is empty — reattach the existing camera
    // stream to it here, otherwise your own preview shows nothing even
    // though the camera is on and the call itself works fine.
    useEffect(() => {
        if (!askForUsername && localVideoref.current && window.localStream) {
            localVideoref.current.srcObject = window.localStream;
        }
    }, [askForUsername]);

    const cleanupCall = () => {
        try {
            if (window.localStream) {
                window.localStream.getTracks().forEach(track => track.stop());
            }
        } catch (e) { /* noop */ }

        Object.values(connectionsRef.current).forEach(pc => {
            try { pc.close(); } catch (e) { /* noop */ }
        });
        connectionsRef.current = {};

        if (socketRef.current) {
            socketRef.current.disconnect();
        }
    };

  const attachLocalTracksToPeer = (pc) => {

    if (!window.localStream) return;
    window.localStream.getTracks().forEach(track => {
        pc.addTrack(track, window.localStream);
    });
};

    const renegotiateWith = (id) => {
        const pc = connectionsRef.current[id];
        if (!pc) return;
        pc.createOffer()
            .then(description => pc.setLocalDescription(description))
            .then(() => {
                socketRef.current.emit('signal', id, JSON.stringify({ sdp: pc.localDescription }));
            })
            .catch(e => console.error("Renegotiation failed:", e));
    };

    const gotMessageFromServer = useCallback((fromId, message) => {
        const signal = JSON.parse(message);
        if (fromId === socketIdRef.current) return;

        const pc = connectionsRef.current[fromId];
        if (!pc) return;

        if (signal.sdp) {
            pc.setRemoteDescription(new RTCSessionDescription(signal.sdp))
                .then(() => {
                    if (signal.sdp.type === 'offer') {
                        pc.createAnswer()
                            .then(description => pc.setLocalDescription(description))
                            .then(() => {
                                socketRef.current.emit('signal', fromId, JSON.stringify({ sdp: pc.localDescription }));
                            })
                            .catch(e => console.error(e));
                    }
                })
                .catch(e => console.error(e));
        }

        if (signal.ice) {
            pc.addIceCandidate(new RTCIceCandidate(signal.ice)).catch(e => console.error(e));
        }
    }, []);

    const addMessage = useCallback((data, sender, socketIdSender) => {
        setMessages(prev => [...prev, { sender, data }]);
        if (socketIdSender !== socketIdRef.current) {
            setNewMessages(prev => prev + 1);
        }
    }, []);

    const connectToSocketServer = () => {
        setConnecting(true);
        socketRef.current = io(server_url);

        // IMPORTANT: these listeners are registered ONCE, outside 'connect'.
        // Socket.IO's 'connect' event fires again on every reconnect (e.g. a
        // brief network hiccup, or the free-tier host waking up mid-session).
        // Registering listeners inside 'connect' would register them again
        // each time, so the SAME event would fire the handler multiple times
        // — which was causing a second, stale offer to be sent on an already
        // -established connection (the "m-lines" error breaking video).
        socketRef.current.on('signal', gotMessageFromServer);

        socketRef.current.on('chat-message', addMessage);

        socketRef.current.on('user-left', (id) => {
            if (connectionsRef.current[id]) {
                connectionsRef.current[id].close();
                delete connectionsRef.current[id];
            }
            setVideos(videos => videos.filter(v => v.socketId !== id));
        });

        socketRef.current.on('user-joined', (id, clients) => {
            clients.forEach((socketListId) => {
                if (socketListId === socketIdRef.current) return; // never connect to yourself
                if (connectionsRef.current[socketListId]) return; // already connected

                const pc = new RTCPeerConnection(peerConfigConnections);
                connectionsRef.current[socketListId] = pc;

                pc.onicecandidate = (event) => {
                    if (event.candidate != null) {
                        socketRef.current.emit('signal', socketListId, JSON.stringify({ ice: event.candidate }));
                    }
                };

                pc.onconnectionstatechange = () => {
                    console.log(`[${socketListId}] connectionState:`, pc.connectionState);
                    if (pc.connectionState === 'connected') {
                        setConnecting(false);
                    }
                };

                pc.oniceconnectionstatechange = () => {
                    console.log(`[${socketListId}] iceConnectionState:`, pc.iceConnectionState);
                };

                pc.ontrack = (event) => {
                    console.log(`[${socketListId}] ontrack fired, streams:`, event.streams);
                    const stream = event.streams[0];
                    setVideos(prev => {
                        const exists = prev.find(v => v.socketId === socketListId);
                        let updated;
                        if (exists) {
                            updated = prev.map(v => v.socketId === socketListId ? { ...v, stream } : v);
                        } else {
                            updated = [...prev, { socketId: socketListId, stream, autoplay: true, playsinline: true }];
                        }
                        videoRef.current = updated;
                        return updated;
                    });
                };

                attachLocalTracksToPeer(pc);
            });

            // If it's us who just (re)joined, offer to everyone already in the room
            // that we don't already have a live connection to.
            if (id === socketIdRef.current) {
                Object.keys(connectionsRef.current).forEach(id2 => {
                    if (id2 === socketIdRef.current) return;
                    const pc = connectionsRef.current[id2];
                    // Only offer to peers we haven't already negotiated with —
                    // never re-offer on a connection that already has a local
                    // description, since that's what produces the m-line
                    // ordering error.
                    if (pc.signalingState === 'stable' && !pc.currentLocalDescription) {
                        renegotiateWith(id2);
                    }
                });
                setConnecting(false);
            }
        });

        socketRef.current.on('connect', () => {
            socketIdRef.current = socketRef.current.id;
            socketRef.current.emit('join-call', window.location.href);
        });

        socketRef.current.on('connect_error', () => {
            // Free-tier hosts (e.g. Render) can take 20-50s to cold-start.
            // Keep the user informed instead of leaving a silent spinner.
            setConnecting(true);
        });
    };

    const handleVideo = () => {
        // Toggle the existing track instead of tearing down and re-requesting
        // media + renegotiating with every peer — this is instant.
        const next = !video;
        setVideo(next);
        if (window.localStream) {
            window.localStream.getVideoTracks().forEach(t => { t.enabled = next; });
        }
    };

    const handleAudio = () => {
        const next = !audio;
        setAudio(next);
        if (window.localStream) {
            window.localStream.getAudioTracks().forEach(t => { t.enabled = next; });
        }
    };

    const stopScreenShare = async () => {
        setScreen(false);
        try {
            const camStream = await navigator.mediaDevices.getUserMedia({ video: videoAvailable, audio: false });
            const camTrack = camStream.getVideoTracks()[0];

            Object.values(connectionsRef.current).forEach(pc => {
                const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
                if (sender) sender.replaceTrack(camTrack);
            });

            if (window.localStream) {
                const oldTrack = window.localStream.getVideoTracks()[0];
                if (oldTrack) {
                    window.localStream.removeTrack(oldTrack);
                    oldTrack.stop();
                }
                window.localStream.addTrack(camTrack);
            }
            if (localVideoref.current) localVideoref.current.srcObject = window.localStream;
            camTrack.enabled = video;
        } catch (e) {
            console.error("Failed to switch back to camera:", e);
        }
    };

    const startScreenShare = async () => {
        try {
            const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
            const screenTrack = displayStream.getVideoTracks()[0];
            setScreen(true);

            Object.values(connectionsRef.current).forEach(pc => {
                const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
                if (sender) sender.replaceTrack(screenTrack);
            });

            if (window.localStream) {
                const oldVideoTrack = window.localStream.getVideoTracks()[0];
                if (oldVideoTrack) {
                    window.localStream.removeTrack(oldVideoTrack);
                    oldVideoTrack.stop();
                }
                window.localStream.addTrack(screenTrack);
            }
            if (localVideoref.current) localVideoref.current.srcObject = window.localStream;

            // When the user stops sharing via the browser's native "Stop sharing" control
            screenTrack.onended = () => {
                stopScreenShare();
            };
        } catch (e) {
            console.error("Screen share was cancelled or failed:", e);
            setScreen(false);
        }
    };

    const handleScreen = () => {
        if (screen) {
            stopScreenShare();
        } else {
            startScreenShare();
        }
    };

    const handleEndCall = () => {
        cleanupCall();
        window.location.href = "/home";
    };

    const handleMessage = (e) => setMessage(e.target.value);

    const sendMessage = () => {
        if (!message.trim()) return;
        socketRef.current.emit('chat-message', message, username);
        setMessage("");
    };

    const toggleChat = () => {
        setModal(prev => {
            if (!prev) setNewMessages(0);
            return !prev;
        });
    };

    const connect = () => {
        setAskForUsername(false);
        connectToSocketServer();
    };

    return (
        <div className={styles.page}>

            {askForUsername ? (
                <div className={styles.lobby}>
                    <div className={styles.lobbyCard}>
                        <h2 className={styles.lobbyTitle}>Ready to join?</h2>
                        <p className={styles.lobbySubtitle}>Check your camera and mic before you hop in.</p>

                        <div className={styles.lobbyPreviewWrapper}>
                            <video className={styles.lobbyPreview} ref={localVideoref} autoPlay muted playsInline></video>
                            {!videoAvailable && (
                                <div className={styles.lobbyPreviewOverlay}>
                                    <PersonIcon style={{ fontSize: "3rem" }} />
                                </div>
                            )}
                        </div>

                        {permissionError && <p className={styles.errorText}>{permissionError}</p>}

                        <TextField
                            fullWidth
                            className={styles.lobbyInput}
                            label="Your name"
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            variant="outlined"
                        />
                        <Button
                            fullWidth
                            variant="contained"
                            className={styles.joinButton}
                            disabled={!username.trim()}
                            onClick={connect}
                        >
                            Join now
                        </Button>
                    </div>
                </div>
            ) : (
                <div className={styles.meetVideoContainer}>

                    {connecting && (
                        <div className={styles.connectingOverlay}>
                            <CircularProgress style={{ color: "#ff9839" }} />
                            <p>Connecting to the call…</p>
                        </div>
                    )}

                    {showModal && (
                        <div className={styles.chatRoom}>
                            <div className={styles.chatContainer}>
                                <div className={styles.chatHeader}>
                                    <h3>Chat</h3>
                                    <IconButton size="small" onClick={toggleChat} style={{ color: "white" }}>✕</IconButton>
                                </div>

                                <div className={styles.chattingDisplay}>
                                    {messages.length !== 0 ? messages.map((item, index) => (
                                        <div className={styles.chatBubble} key={index}>
                                            <p className={styles.chatSender}>{item.sender}</p>
                                            <p className={styles.chatText}>{item.data}</p>
                                        </div>
                                    )) : <p className={styles.chatEmpty}>No messages yet — say hi 👋</p>}
                                </div>

                                <div className={styles.chattingArea}>
                                    <TextField
                                        size="small"
                                        fullWidth
                                        value={message}
                                        onChange={handleMessage}
                                        onKeyDown={(e) => { if (e.key === 'Enter') sendMessage(); }}
                                        placeholder="Type a message"
                                        variant="outlined"
                                    />
                                    <IconButton onClick={sendMessage} className={styles.sendButton}>
                                        <SendIcon />
                                    </IconButton>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className={styles.conferenceView}>
                        {videos.map((v) => (
                            <div key={v.socketId} className={styles.remoteTile}>
                                <video
                                    className={styles.remoteVideo}
                                    data-socket={v.socketId}
                                    ref={ref => { if (ref && v.stream) ref.srcObject = v.stream; }}
                                    autoPlay
                                    playsInline
                                ></video>
                            </div>
                        ))}
                        {videos.length === 0 && !connecting && (
                            <div className={styles.waitingMessage}>
                                <p>You're the only one here. Share the link to invite others.</p>
                            </div>
                        )}
                    </div>

                    <video className={styles.meetUserVideo} ref={localVideoref} autoPlay muted playsInline></video>

                    <div className={styles.buttonContainers}>
                        <Tooltip title={video ? "Turn off camera" : "Turn on camera"}>
                            <IconButton onClick={handleVideo} className={styles.controlButton}>
                                {video ? <VideocamIcon /> : <VideocamOffIcon />}
                            </IconButton>
                        </Tooltip>

                        <Tooltip title="Leave call">
                            <IconButton onClick={handleEndCall} className={styles.endCallButton}>
                                <CallEndIcon />
                            </IconButton>
                        </Tooltip>

                        <Tooltip title={audio ? "Mute" : "Unmute"}>
                            <IconButton onClick={handleAudio} className={styles.controlButton}>
                                {audio ? <MicIcon /> : <MicOffIcon />}
                            </IconButton>
                        </Tooltip>

                        {screenAvailable && (
                            <Tooltip title={screen ? "Stop sharing" : "Share screen"}>
                                <IconButton onClick={handleScreen} className={styles.controlButton}>
                                    {screen ? <StopScreenShareIcon /> : <ScreenShareIcon />}
                                </IconButton>
                            </Tooltip>
                        )}

                        <Badge badgeContent={newMessages} max={99} color='warning'>
                            <Tooltip title="Chat">
                                <IconButton onClick={toggleChat} className={styles.controlButton}>
                                    <ChatIcon />
                                </IconButton>
                            </Tooltip>
                        </Badge>
                    </div>
                </div>
            )}
        </div>
    )
}