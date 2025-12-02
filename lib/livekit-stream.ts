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
} from 'livekit-client';

export class LiveKitStreamer {
  private room: Room | null = null;
  private streamId: string;
  private onStreamCallback?: (stream: MediaStream) => void;
  private onVideoElement?: HTMLVideoElement;
  private onConnectedCallback?: () => void;
  private localStream?: MediaStream;
  private viewerStream: MediaStream = new MediaStream(); // Persistent stream for viewer

  constructor(streamId: string) {
    this.streamId = streamId;
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

  async startViewingWithElement(
    videoElement: HTMLVideoElement,
    onConnected: () => void
  ): Promise<void> {
    console.log(`[${this.streamId}] Starting LiveKit viewing with element...`);
    this.onVideoElement = videoElement;
    this.onConnectedCallback = onConnected;

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

        // Start playback
        this.onVideoElement.muted = true; // Start muted for autoplay
        this.onVideoElement.play()
          .then(() => {
            console.log(`[${this.streamId}] Video playback started`);
            if (this.onConnectedCallback) {
              this.onConnectedCallback();
            }
          })
          .catch(err => console.error('Failed to play:', err));
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
