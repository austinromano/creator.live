const WebSocket = require('ws');

const PORT = process.env.PORT || process.env.SIGNALING_PORT || 8080;
const wss = new WebSocket.Server({ port: PORT });

// Store active streams: streamId -> { broadcaster: ws, viewers: Map<viewerId, ws> }
const streams = new Map();
let viewerIdCounter = 0;

console.log(`Signaling server running on port ${PORT}`);

wss.on('connection', (ws) => {
  let currentStreamId = null;
  let role = null; // 'broadcaster' or 'viewer'
  let myViewerId = null; // Stable viewer ID for this connection

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      console.log(`[${data.streamId || 'unknown'}] Received:`, data.type);

      switch (data.type) {
        case 'join-as-broadcaster':
          currentStreamId = data.streamId;
          role = 'broadcaster';

          if (!streams.has(currentStreamId)) {
            streams.set(currentStreamId, { broadcaster: null, viewers: new Map() });
          }
          streams.get(currentStreamId).broadcaster = ws;
          console.log(`[${currentStreamId}] Broadcaster joined`);

          // Notify existing viewers that broadcaster is available
          const stream = streams.get(currentStreamId);
          stream.viewers.forEach((viewer) => {
            viewer.send(JSON.stringify({ type: 'broadcaster-available' }));
          });
          break;

        case 'join-as-viewer':
          currentStreamId = data.streamId;
          role = 'viewer';
          myViewerId = `viewer-${++viewerIdCounter}`; // Assign stable unique ID

          if (!streams.has(currentStreamId)) {
            streams.set(currentStreamId, { broadcaster: null, viewers: new Map() });
          }
          streams.get(currentStreamId).viewers.set(myViewerId, ws);
          console.log(`[${currentStreamId}] Viewer ${myViewerId} joined (${streams.get(currentStreamId).viewers.size} total)`);

          // If broadcaster exists, notify viewer
          if (streams.get(currentStreamId).broadcaster) {
            ws.send(JSON.stringify({ type: 'broadcaster-available' }));
          }
          break;

        case 'request-stream':
          // Viewer requesting stream from broadcaster
          if (currentStreamId && streams.has(currentStreamId) && myViewerId) {
            const broadcaster = streams.get(currentStreamId).broadcaster;
            if (broadcaster && broadcaster.readyState === WebSocket.OPEN) {
              broadcaster.send(JSON.stringify({
                type: 'viewer-request',
                viewerId: myViewerId
              }));
              console.log(`[${currentStreamId}] Stream request from ${myViewerId} forwarded to broadcaster`);
            }
          }
          break;

        case 'offer':
        case 'answer':
        case 'ice-candidate':
          // Relay WebRTC signaling messages
          if (currentStreamId && streams.has(currentStreamId)) {
            const streamData = streams.get(currentStreamId);

            if (role === 'broadcaster') {
              // Send to specific viewer by ID
              const targetViewer = data.targetViewerId
                ? streamData.viewers.get(data.targetViewerId)
                : null;

              if (targetViewer && targetViewer.readyState === WebSocket.OPEN) {
                targetViewer.send(JSON.stringify({
                  type: data.type,
                  data: data.data
                }));
                console.log(`[${currentStreamId}] ${data.type} sent to ${data.targetViewerId}`);
              } else if (!data.targetViewerId) {
                // Broadcast to all viewers if no target specified
                streamData.viewers.forEach((viewer, viewerId) => {
                  if (viewer.readyState === WebSocket.OPEN) {
                    viewer.send(JSON.stringify({
                      type: data.type,
                      data: data.data
                    }));
                  }
                });
                console.log(`[${currentStreamId}] ${data.type} broadcast to all viewers`);
              } else {
                console.log(`[${currentStreamId}] Target viewer ${data.targetViewerId} not found`);
              }
            } else if (role === 'viewer' && myViewerId) {
              // Send to broadcaster with this viewer's ID
              if (streamData.broadcaster && streamData.broadcaster.readyState === WebSocket.OPEN) {
                streamData.broadcaster.send(JSON.stringify({
                  type: data.type,
                  data: data.data,
                  viewerId: myViewerId
                }));
                console.log(`[${currentStreamId}] ${data.type} from ${myViewerId} sent to broadcaster`);
              }
            }
          }
          break;
      }
    } catch (error) {
      console.error('Error processing message:', error);
    }
  });

  ws.on('close', () => {
    if (currentStreamId && streams.has(currentStreamId)) {
      const streamData = streams.get(currentStreamId);

      if (role === 'broadcaster') {
        streamData.broadcaster = null;
        console.log(`[${currentStreamId}] Broadcaster left`);
        // Notify viewers
        streamData.viewers.forEach((viewer) => {
          if (viewer.readyState === WebSocket.OPEN) {
            viewer.send(JSON.stringify({ type: 'broadcaster-left' }));
          }
        });
      } else if (role === 'viewer' && myViewerId) {
        streamData.viewers.delete(myViewerId);
        console.log(`[${currentStreamId}] Viewer ${myViewerId} left (${streamData.viewers.size} remaining)`);
      }

      // Clean up empty streams
      if (!streamData.broadcaster && streamData.viewers.size === 0) {
        streams.delete(currentStreamId);
        console.log(`[${currentStreamId}] Stream cleaned up`);
      }
    }
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down signaling server...');
  wss.close(() => {
    process.exit(0);
  });
});
