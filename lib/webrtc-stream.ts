// Simple WebRTC streaming using BroadcastChannel for local signaling
export class WebRTCStreamer {
  private peerConnection: RTCPeerConnection | null = null;
  private signalingChannel: BroadcastChannel;
  private streamId: string;
  private onStreamCallback?: (stream: MediaStream) => void;
  private onViewerRequest?: () => Promise<void>;
  private localStream?: MediaStream;

  constructor(streamId: string) {
    this.streamId = streamId;
    this.signalingChannel = new BroadcastChannel(`stream-${streamId}`);
    this.setupSignaling();
  }

  private setupSignaling() {
    this.signalingChannel.onmessage = async (event) => {
      const { type, data } = event.data;
      console.log(`[${this.streamId}] Received signaling message:`, type);

      // Handle viewer request for stream
      if (type === 'request-stream') {
        console.log(`[${this.streamId}] Viewer requesting stream`);
        if (this.onViewerRequest) {
          await this.onViewerRequest();
        }
        return;
      }

      if (!this.peerConnection) {
        console.log(`[${this.streamId}] No peer connection, ignoring message`);
        return;
      }

      switch (type) {
        case 'offer':
          await this.handleOffer(data);
          break;
        case 'answer':
          await this.handleAnswer(data);
          break;
        case 'ice-candidate':
          await this.handleIceCandidate(data);
          break;
      }
    };
  }

  private createPeerConnection() {
    const config: RTCConfiguration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    };

    this.peerConnection = new RTCPeerConnection(config);

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.signalingChannel.postMessage({
          type: 'ice-candidate',
          data: event.candidate.toJSON()
        });
      }
    };

    this.peerConnection.ontrack = (event) => {
      console.log('Received remote track:', event.streams[0]);
      if (this.onStreamCallback && event.streams[0]) {
        this.onStreamCallback(event.streams[0]);
      }
    };

    return this.peerConnection;
  }

  async startBroadcast(stream: MediaStream) {
    console.log(`[${this.streamId}] Starting broadcast...`);
    this.localStream = stream;

    // Set up handler for viewer requests
    this.onViewerRequest = async () => {
      console.log(`[${this.streamId}] Creating new peer connection for viewer`);

      // Close existing connection if any
      if (this.peerConnection) {
        this.peerConnection.close();
      }

      const pc = this.createPeerConnection();

      // Add all tracks from the stream to the peer connection
      this.localStream!.getTracks().forEach(track => {
        console.log(`[${this.streamId}] Adding track:`, track.kind);
        pc.addTrack(track, this.localStream!);
      });

      // Create and send offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      this.signalingChannel.postMessage({
        type: 'offer',
        data: offer
      });

      console.log(`[${this.streamId}] Offer sent to viewer`);
    };

    console.log(`[${this.streamId}] Broadcast ready, waiting for viewers`);
  }

  async startViewing(onStream: (stream: MediaStream) => void) {
    console.log(`[${this.streamId}] Starting viewing...`);
    this.onStreamCallback = onStream;
    this.createPeerConnection();

    // Request broadcast
    console.log(`[${this.streamId}] Requesting stream from broadcaster...`);
    this.signalingChannel.postMessage({ type: 'request-stream' });
  }

  private async handleOffer(offer: RTCSessionDescriptionInit) {
    console.log('Handling offer...');
    if (!this.peerConnection) return;

    await this.peerConnection.setRemoteDescription(offer);
    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);

    this.signalingChannel.postMessage({
      type: 'answer',
      data: answer
    });

    console.log('Answer sent');
  }

  private async handleAnswer(answer: RTCSessionDescriptionInit) {
    console.log('Handling answer...');
    if (!this.peerConnection) return;
    await this.peerConnection.setRemoteDescription(answer);
  }

  private async handleIceCandidate(candidate: RTCIceCandidateInit) {
    console.log('Handling ICE candidate...');
    if (!this.peerConnection) return;
    await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
  }

  stopBroadcast() {
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
  }

  close() {
    this.stopBroadcast();
    this.signalingChannel.close();
  }
}
