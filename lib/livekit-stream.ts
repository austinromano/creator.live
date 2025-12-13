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

export interface LiveKitInviteEvent {
  id: string;
  type: 'invite' | 'invite_accepted' | 'invite_declined' | 'guest_joined' | 'guest_left';
  fromUser: string;
  toUser: string;
  roomName: string;
  avatar?: string;
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
  private onInviteEventCallback?: (event: LiveKitInviteEvent) => void;
  private onGuestPipCallback?: (data: any) => void;

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

  // Set callback for receiving invite events (guest PiP invitations)
  onInviteEvent(callback: (event: LiveKitInviteEvent) => void): void {
    console.log(`[${this.streamId}] onInviteEvent callback registered`);
    this.onInviteEventCallback = callback;
  }

  // Set callback for receiving guest PiP data (for viewers)
  onGuestPip(callback: (data: any) => void): void {
    console.log(`[${this.streamId}] onGuestPip callback registered`);
    this.onGuestPipCallback = callback;
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

  // Send an invite event via data channel (for guest PiP)
  async sendInviteEvent(event: LiveKitInviteEvent): Promise<void> {
    if (!this.room || !this.room.localParticipant) {
      console.error('Cannot send invite event: not connected to room');
      return;
    }

    const encoder = new TextEncoder();
    const data = encoder.encode(JSON.stringify({
      type: 'invite',
      payload: event,
    }));

    await this.room.localParticipant.publishData(data, { reliable: true });
    console.log(`[${this.streamId}] Sent invite event:`, event.type, event.toUser);
  }

  // Setup data channel listener
  private setupDataListener(): void {
    if (!this.room) return;

    console.log(`🔊 [${this.streamId}] Setting up data channel listener`);
    console.log(`🔊 [${this.streamId}] Room state: ${this.room.state}, Local participant: ${this.room.localParticipant?.identity}`);

    this.room.on(RoomEvent.DataReceived, (payload, participant) => {
      console.log(`📨 [${this.streamId}] DataReceived event from participant:`, participant?.identity);
      try {
        const decoder = new TextDecoder();
        const jsonString = decoder.decode(payload);
        console.log(`📨 [${this.streamId}] Received data:`, jsonString);
        const data = JSON.parse(jsonString);
        console.log(`📨 [${this.streamId}] Parsed data type:`, data.type);

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
        } else if (data.type === 'invite') {
          console.log(`[${this.streamId}] Invite event received:`, data.payload);
          if (this.onInviteEventCallback) {
            console.log(`[${this.streamId}] Calling onInviteEventCallback`);
            this.onInviteEventCallback(data.payload as LiveKitInviteEvent);
          } else {
            console.log(`[${this.streamId}] WARNING: No onInviteEventCallback registered!`);
          }
        } else if (data.type === 'guest_pip') {
          console.log(`🎬 [${this.streamId}] Guest PiP event received:`, data);
          console.log(`🎬 [${this.streamId}] onGuestPipCallback is:`, this.onGuestPipCallback ? 'SET' : 'NOT SET');
          if (this.onGuestPipCallback) {
            console.log(`🎬 [${this.streamId}] Calling onGuestPipCallback with data:`, data);
            this.onGuestPipCallback(data);
          } else {
            console.log(`🎬 [${this.streamId}] WARNING: No onGuestPipCallback registered!`);
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

    // Create and connect to room with optimized settings for smooth streaming
    this.room = new Room({
      adaptiveStream: false, // Disable adaptive for consistent quality
      dynacast: false, // Disable dynacast for lower latency
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
        simulcast: false, // Disable simulcast for smoother streaming
        videoEncoding: {
          maxBitrate: 2_500_000, // 2.5 Mbps for smooth 720p
          maxFramerate: 30,
        },
      });
      console.log(`[${this.streamId}] Published video track (optimized)`);
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
    onNeedsInteraction?: () => void,
    options?: { muteAudio?: boolean }
  ): Promise<void> {
    console.log(`[${this.streamId}] Starting LiveKit viewing with element...`);
    this.onVideoElement = videoElement;
    this.onConnectedCallback = onConnected;
    this.onNeedsInteractionCallback = onNeedsInteraction;
    const muteAudio = options?.muteAudio ?? false;

    const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;
    if (!livekitUrl) {
      throw new Error('NEXT_PUBLIC_LIVEKIT_URL is not configured');
    }

    // Get viewer token
    const token = await this.getToken(`viewer-${Date.now()}`, false);

    // Create and connect to room with optimized settings for viewing
    this.room = new Room({
      adaptiveStream: false, // Disable adaptive - always request full quality
      dynacast: false, // Disable dynacast for viewers - receive everything
      videoCaptureDefaults: {
        resolution: VideoPresets.h720.resolution,
      },
    });

    // Handle track subscriptions - use LiveKit's attach method
    this.room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
      console.log(`[${this.streamId}] Subscribed to track: ${track.kind} from ${participant.identity}`);

      if (track.kind === 'video' && this.onVideoElement) {
        // Request highest quality layer immediately
        if ('setVideoQuality' in publication) {
          (publication as any).setVideoQuality(2); // 2 = high quality
        }
        // Also try setting video dimensions preference
        if ('setVideoDimensions' in publication) {
          (publication as any).setVideoDimensions({ width: 1280, height: 720 });
        }

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
      } else if (track.kind === 'audio' && this.onVideoElement && !muteAudio) {
        // Attach audio track (skip if muteAudio option is set)
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

    try {
      await this.room.connect(livekitUrl, token);
      console.log(`[${this.streamId}] Connected to LiveKit room as viewer`);
    } catch (error: any) {
      // Suppress expected connection errors (fake streams, network issues during unmount)
      console.log(`[${this.streamId}] Connection failed or cancelled`);
      return;
    }

    // Setup data channel for chat
    this.setupDataListener();

    // Check for existing participants and their tracks
    if (!this.room) return;
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
          } else if (track.kind === 'audio' && this.onVideoElement && !muteAudio) {
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

    try {
      await this.room.connect(livekitUrl, token);
      console.log(`[${this.streamId}] Connected to LiveKit room as viewer`);
    } catch (error: any) {
      // Suppress expected connection errors (fake streams, network issues during unmount)
      console.log(`[${this.streamId}] Connection failed or cancelled`);
      return;
    }

    // Setup data channel for chat
    this.setupDataListener();

    // Check for existing participants and their tracks
    if (!this.room) return;
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

  // Replace the video track (for screen sharing or composite)
  async replaceVideoTrack(newVideoTrack: MediaStreamTrack): Promise<void> {
    if (!this.room || !this.room.localParticipant) {
      console.error('Cannot replace video track: not connected to room');
      return;
    }

    // Find the current video track publication
    const videoPublication = Array.from(this.room.localParticipant.trackPublications.values())
      .find(pub => pub.track?.kind === 'video');

    if (videoPublication && videoPublication.track) {
      // Unpublish the old track
      await this.room.localParticipant.unpublishTrack(videoPublication.track);
      console.log(`[${this.streamId}] Unpublished old video track`);
    }

    // Publish the new track with optimized settings for composite streams
    // Disable simulcast for composite - it causes quality issues with canvas streams
    const localVideoTrack = new LocalVideoTrack(newVideoTrack);
    await this.room.localParticipant.publishTrack(localVideoTrack, {
      name: 'camera',
      simulcast: false, // Disable simulcast for composite streams - single high quality layer
      videoEncoding: {
        maxBitrate: 2_500_000, // 2.5 Mbps for 720p - good balance of quality and bandwidth
        maxFramerate: 30,
      },
    });
    console.log(`[${this.streamId}] Published new video track (720p optimized, no simulcast)`);
  }

  // Replace or add an audio track (for screen share audio mixing)
  async replaceAudioTrack(newAudioTrack: MediaStreamTrack): Promise<void> {
    if (!this.room || !this.room.localParticipant) {
      console.error('Cannot replace audio track: not connected to room');
      return;
    }

    // Find the current audio track publication
    const audioPublication = Array.from(this.room.localParticipant.trackPublications.values())
      .find(pub => pub.track?.kind === 'audio');

    if (audioPublication && audioPublication.track) {
      // Unpublish the old track
      await this.room.localParticipant.unpublishTrack(audioPublication.track);
      console.log(`[${this.streamId}] Unpublished old audio track`);
    }

    // Publish the new track
    const localAudioTrack = new LocalAudioTrack(newAudioTrack);
    await this.room.localParticipant.publishTrack(localAudioTrack, {
      name: 'microphone',
    });
    console.log(`[${this.streamId}] Published new audio track`);
  }

  // Publish an additional audio track (e.g., desktop audio alongside mic)
  async publishAdditionalAudioTrack(audioTrack: MediaStreamTrack, name: string): Promise<void> {
    if (!this.room || !this.room.localParticipant) {
      console.error('Cannot publish additional audio track: not connected to room');
      return;
    }

    const localAudioTrack = new LocalAudioTrack(audioTrack);
    await this.room.localParticipant.publishTrack(localAudioTrack, {
      name: name,
    });
    console.log(`[${this.streamId}] Published additional audio track: ${name}`);
  }

  // Unpublish an additional audio track by name
  async unpublishAdditionalAudioTrack(name: string): Promise<void> {
    if (!this.room || !this.room.localParticipant) {
      console.error('Cannot unpublish audio track: not connected to room');
      return;
    }

    const audioPublication = Array.from(this.room.localParticipant.trackPublications.values())
      .find(pub => pub.track?.kind === 'audio' && pub.trackName === name);

    if (audioPublication && audioPublication.track) {
      await this.room.localParticipant.unpublishTrack(audioPublication.track);
      console.log(`[${this.streamId}] Unpublished audio track: ${name}`);
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
