import {
  Room,
  RoomEvent,
  LocalParticipant,
  RemoteParticipant,
  Track,
  LocalTrack,
  LocalVideoTrack,
  LocalAudioTrack,
  RemoteTrack,
  RemoteTrackPublication,
  RemoteVideoTrack,
  VideoPresets,
  createLocalTracks,
  DataPacket_Kind,
} from 'livekit-client';

export interface LiveKitChatMessage {
  id: string;
  user: string;
  message: string;
  avatar?: string;
  tip?: number;
  timestamp: number;
  isCreator?: boolean;
}

export interface LiveKitActivityEvent {
  id: string;
  type: 'like' | 'follow' | 'tip' | 'join';
  user: string;
  avatar?: string;
  amount?: number;
  message?: string;
  timestamp: number;
}

export class LiveKitStreamer {
  private room: Room | null = null;
  private streamId: string;
  private onStreamCallback?: (stream: MediaStream) => void;
  private onVideoElement?: HTMLVideoElement;
  private onConnectedCallback?: () => void;
  private localStream?: MediaStream;
  private viewerStream: MediaStream = new MediaStream(); // Persistent stream for viewer
  private onChatMessageCallback?: (message: LiveKitChatMessage) => void;
  private onActivityEventCallback?: (event: LiveKitActivityEvent) => void;

  constructor(streamId: string) {
    this.streamId = streamId;
  }

  // Get the room instance for external use (e.g., chat)
  getRoom(): Room | null {
    return this.room;
  }

  // Set callback for receiving chat messages
  onChatMessage(callback: (message: LiveKitChatMessage) => void): void {
    console.log(`[${this.streamId}] onChatMessage callback registered`);
    this.onChatMessageCallback = callback;
  }

  // Set callback for receiving activity events (likes, follows, etc.)
  onActivityEvent(callback: (event: LiveKitActivityEvent) => void): void {
    console.log(`[${this.streamId}] onActivityEvent callback registered`);
    this.onActivityEventCallback = callback;
  }

  // Send an activity event via data channel
  async sendActivityEvent(event: LiveKitActivityEvent): Promise<void> {
    if (!this.room || !this.room.localParticipant) {
      console.error('Cannot send activity event: not connected to room');
      return;
    }

    const encoder = new TextEncoder();
    const data = encoder.encode(JSON.stringify({
      type: 'activity',
      payload: event,
    }));

    await this.room.localParticipant.publishData(data, { reliable: true });
    console.log(`[${this.streamId}] Sent activity event:`, event.type, event.user);
  }

  // Send a chat message via data channel
  async sendChatMessage(message: LiveKitChatMessage): Promise<void> {
    if (!this.room || !this.room.localParticipant) {
      console.error('Cannot send chat message: not connected to room');
      return;
    }

    const encoder = new TextEncoder();
    const data = encoder.encode(JSON.stringify({
      type: 'chat',
      payload: message,
    }));

    await this.room.localParticipant.publishData(data, { reliable: true });
    console.log(`[${this.streamId}] Sent chat message:`, message.message);
  }

  // Setup data channel listener
  private setupDataListener(): void {
    if (!this.room) return;

    console.log(`[${this.streamId}] Setting up data channel listener`);

    this.room.on(RoomEvent.DataReceived, (payload, participant) => {
      console.log(`[${this.streamId}] DataReceived event from participant:`, participant?.identity);
      try {
        const decoder = new TextDecoder();
        const jsonString = decoder.decode(payload);
        console.log(`[${this.streamId}] Received data:`, jsonString);
        const data = JSON.parse(jsonString);

        if (data.type === 'chat') {
          console.log(`[${this.streamId}] Chat message received:`, data.payload);
          if (this.onChatMessageCallback) {
            console.log(`[${this.streamId}] Calling onChatMessageCallback`);
            this.onChatMessageCallback(data.payload as LiveKitChatMessage);
          } else {
            console.log(`[${this.streamId}] WARNING: No onChatMessageCallback registered!`);
          }
        } else if (data.type === 'activity') {
          console.log(`[${this.streamId}] Activity event received:`, data.payload);
          if (this.onActivityEventCallback) {
            console.log(`[${this.streamId}] Calling onActivityEventCallback`);
            this.onActivityEventCallback(data.payload as LiveKitActivityEvent);
          } else {
            console.log(`[${this.streamId}] WARNING: No onActivityEventCallback registered!`);
          }
        }
      } catch (error) {
        console.error('Failed to parse data message:', error);
      }
    });
  }

  async getToken(identity: string, isPublisher: boolean): Promise<string> {
    const response = await fetch('/api/livekit/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomName: this.streamId,
        identity,
        isPublisher,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to get LiveKit token');
    }

    const data = await response.json();
    return data.token;
  }

  async startBroadcast(stream: MediaStream): Promise<void> {
    console.log(`[${this.streamId}] Starting LiveKit broadcast...`);
    this.localStream = stream;

    const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;
    if (!livekitUrl) {
      throw new Error('NEXT_PUBLIC_LIVEKIT_URL is not configured');
    }

    // Get publisher token
    const token = await this.getToken(`broadcaster-${Date.now()}`, true);

    // Create and connect to room
    this.room = new Room({
      adaptiveStream: true,
      dynacast: true,
      videoCaptureDefaults: {
        resolution: VideoPresets.h720.resolution,
      },
    });

    this.room.on(RoomEvent.ParticipantConnected, (participant) => {
      console.log(`[${this.streamId}] Viewer connected: ${participant.identity}`);
    });

    this.room.on(RoomEvent.ParticipantDisconnected, (participant) => {
      console.log(`[${this.streamId}] Viewer disconnected: ${participant.identity}`);
    });

    this.room.on(RoomEvent.Disconnected, () => {
      console.log(`[${this.streamId}] Disconnected from room`);
    });

    await this.room.connect(livekitUrl, token);
    console.log(`[${this.streamId}] Connected to LiveKit room`);
    console.log(`[${this.streamId}] Current onChatMessageCallback:`, this.onChatMessageCallback ? 'SET' : 'NOT SET');

    // Setup data channel for chat
    this.setupDataListener();

    // Publish the local tracks
    const videoTrack = stream.getVideoTracks()[0];
    const audioTrack = stream.getAudioTracks()[0];

    if (videoTrack) {
      const localVideoTrack = new LocalVideoTrack(videoTrack);
      await this.room.localParticipant.publishTrack(localVideoTrack, {
        name: 'camera',
        simulcast: true,
      });
      console.log(`[${this.streamId}] Published video track`);
    }

    if (audioTrack) {
      const localAudioTrack = new LocalAudioTrack(audioTrack);
      await this.room.localParticipant.publishTrack(localAudioTrack, {
        name: 'microphone',
      });
      console.log(`[${this.streamId}] Published audio track`);
    }

    console.log(`[${this.streamId}] Broadcast started`);
  }

  private onNeedsInteractionCallback?: () => void;

  async startViewingWithElement(
    videoElement: HTMLVideoElement,
    onConnected: () => void,
    onNeedsInteraction?: () => void
  ): Promise<void> {
    console.log(`[${this.streamId}] Starting LiveKit viewing with element...`);
    this.onVideoElement = videoElement;
    this.onConnectedCallback = onConnected;
    this.onNeedsInteractionCallback = onNeedsInteraction;

    const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;
    if (!livekitUrl) {
      throw new Error('NEXT_PUBLIC_LIVEKIT_URL is not configured');
    }

    // Get viewer token
    const token = await this.getToken(`viewer-${Date.now()}`, false);

    // Create and connect to room
    this.room = new Room({
      adaptiveStream: true,
      dynacast: true,
    });

    // Handle track subscriptions - use LiveKit's attach method
    this.room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
      console.log(`[${this.streamId}] Subscribed to track: ${track.kind} from ${participant.identity}`);

      if (track.kind === 'video' && this.onVideoElement) {
        // Use LiveKit's attach method - this is the proper way
        track.attach(this.onVideoElement);
        console.log(`[${this.streamId}] Attached video track to element`);

        // iOS Safari requires these attributes
        this.onVideoElement.setAttribute('playsinline', 'true');
        this.onVideoElement.setAttribute('webkit-playsinline', 'true');

        // Start playback - must be muted for autoplay on iOS
        this.onVideoElement.muted = true;
        this.onVideoElement.play()
          .then(() => {
            console.log(`[${this.streamId}] Video playback started (muted)`);
            if (this.onConnectedCallback) {
              this.onConnectedCallback();
            }
          })
          .catch(err => {
            console.error('Failed to autoplay even muted:', err);
            // Even muted autoplay failed - need user interaction (iOS Safari)
            if (this.onNeedsInteractionCallback) {
              this.onNeedsInteractionCallback();
            }
          });
      } else if (track.kind === 'audio' && this.onVideoElement) {
        // Attach audio track too
        track.attach(this.onVideoElement);
        console.log(`[${this.streamId}] Attached audio track to element`);
      }
    });

    this.room.on(RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
      console.log(`[${this.streamId}] Unsubscribed from track: ${track.kind}`);
      track.detach();
    });

    this.room.on(RoomEvent.ParticipantConnected, (participant) => {
      console.log(`[${this.streamId}] Participant connected: ${participant.identity}`);
    });

    this.room.on(RoomEvent.ParticipantDisconnected, (participant) => {
      console.log(`[${this.streamId}] Participant disconnected: ${participant.identity}`);
    });

    this.room.on(RoomEvent.Disconnected, () => {
      console.log(`[${this.streamId}] Disconnected from room`);
    });

    await this.room.connect(livekitUrl, token);
    console.log(`[${this.streamId}] Connected to LiveKit room as viewer`);

    // Setup data channel for chat
    this.setupDataListener();

    // Check for existing participants and their tracks
    this.room.remoteParticipants.forEach((participant) => {
      participant.trackPublications.forEach((publication) => {
        if (publication.track && publication.isSubscribed) {
          const track = publication.track;
          if (track.kind === 'video' && this.onVideoElement) {
            track.attach(this.onVideoElement);
            console.log(`[${this.streamId}] Attached existing video track`);
            this.onVideoElement.muted = true;
            this.onVideoElement.play()
              .then(() => {
                if (this.onConnectedCallback) {
                  this.onConnectedCallback();
                }
              })
              .catch(err => console.error('Failed to play:', err));
          } else if (track.kind === 'audio' && this.onVideoElement) {
            track.attach(this.onVideoElement);
            console.log(`[${this.streamId}] Attached existing audio track`);
          }
        }
      });
    });
  }

  async startViewing(onStream: (stream: MediaStream) => void): Promise<void> {
    console.log(`[${this.streamId}] Starting LiveKit viewing...`);
    this.onStreamCallback = onStream;

    const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;
    if (!livekitUrl) {
      throw new Error('NEXT_PUBLIC_LIVEKIT_URL is not configured');
    }

    // Get viewer token
    const token = await this.getToken(`viewer-${Date.now()}`, false);

    // Create and connect to room
    this.room = new Room({
      adaptiveStream: true,
      dynacast: true,
    });

    // Handle track subscriptions
    this.room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
      console.log(`[${this.streamId}] Subscribed to track: ${track.kind} from ${participant.identity}`);
      this.handleTrackSubscribed(track, participant);
    });

    this.room.on(RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
      console.log(`[${this.streamId}] Unsubscribed from track: ${track.kind}`);
    });

    this.room.on(RoomEvent.ParticipantConnected, (participant) => {
      console.log(`[${this.streamId}] Participant connected: ${participant.identity}`);
    });

    this.room.on(RoomEvent.ParticipantDisconnected, (participant) => {
      console.log(`[${this.streamId}] Participant disconnected: ${participant.identity}`);
    });

    this.room.on(RoomEvent.Disconnected, () => {
      console.log(`[${this.streamId}] Disconnected from room`);
    });

    await this.room.connect(livekitUrl, token);
    console.log(`[${this.streamId}] Connected to LiveKit room as viewer`);

    // Setup data channel for chat
    this.setupDataListener();

    // Check for existing participants and their tracks
    this.room.remoteParticipants.forEach((participant) => {
      participant.trackPublications.forEach((publication) => {
        if (publication.track) {
          this.handleTrackSubscribed(publication.track as RemoteTrack, participant);
        }
      });
    });
  }

  private handleTrackSubscribed(track: RemoteTrack, participant: RemoteParticipant): void {
    if (this.onStreamCallback) {
      // Add the new track to our persistent MediaStream
      const mediaStreamTrack = track.mediaStreamTrack;
      if (mediaStreamTrack) {
        // Check if track already exists to avoid duplicates
        const existingTrack = this.viewerStream.getTracks().find(
          t => t.id === mediaStreamTrack.id
        );
        if (!existingTrack) {
          this.viewerStream.addTrack(mediaStreamTrack);
          console.log(`[${this.streamId}] Added ${track.kind} track to stream. Total tracks: ${this.viewerStream.getTracks().length}`);
        }
      }

      // Call callback every time a track is added so video element can be updated
      // The StreamPlayer will handle not re-playing if already playing
      if (this.viewerStream.getTracks().length > 0) {
        console.log(`[${this.streamId}] Calling onStream with ${this.viewerStream.getTracks().length} tracks`);
        this.onStreamCallback(this.viewerStream);
      }
    }
  }

  stopBroadcast(): void {
    if (this.room) {
      this.room.localParticipant.trackPublications.forEach((publication) => {
        if (publication.track) {
          publication.track.stop();
        }
      });
    }
  }

  close(): void {
    this.stopBroadcast();
    if (this.room) {
      this.room.disconnect();
      this.room = null;
    }
    // Clean up viewer stream
    this.viewerStream.getTracks().forEach(track => track.stop());
    this.viewerStream = new MediaStream();
    this.onVideoElement = undefined;
    this.onConnectedCallback = undefined;
  }
}
