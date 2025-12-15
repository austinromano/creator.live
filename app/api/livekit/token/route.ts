import { z } from 'zod';
import { AccessToken } from 'livekit-server-sdk';
import { createRoute, BadRequestError, ApiError } from '@/lib/api/middleware';

const tokenSchema = z.object({
  roomName: z.string().min(1),
  identity: z.string().min(1),
  isPublisher: z.boolean().default(false),
});

export const POST = createRoute(
  async (_req, _ctx, body) => {
    // KILL SWITCH - blocks all LiveKit connections
    if (process.env.LIVEKIT_DISABLED === 'true') {
      throw new ApiError('Streaming temporarily disabled', 503, 'LIVEKIT_DISABLED');
    }

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;

    if (!apiKey || !apiSecret) {
      throw new ApiError('LiveKit not configured', 500, 'LIVEKIT_NOT_CONFIGURED');
    }

    const at = new AccessToken(apiKey, apiSecret, {
      identity: body.identity,
      ttl: '6h',
    });

    at.addGrant({
      roomJoin: true,
      room: body.roomName,
      canPublish: body.isPublisher,
      canSubscribe: true,
      canPublishData: true,
    });

    const token = await at.toJwt();

    return { token };
  },
  { bodySchema: tokenSchema }
);
