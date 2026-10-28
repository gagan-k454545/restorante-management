import { NextRequest } from 'next/server';
import { requireAuth } from '@/modules/auth/guards';
import { db } from '@/db/client';
import { events } from '@/db/schema';
import { eq, gt, and, inArray } from 'drizzle-orm';
import { bus, RealtimeEventPayload } from '@/modules/realtime/bus';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  let auth;
  try {
    auth = await requireAuth();
  } catch {
    return new Response('Unauthorized', { status: 401 });
  }

  const allowedChannels =
    auth.role === 'KITCHEN'
      ? ['kitchen', 'menu', 'all']
      : ['kitchen', 'front', 'menu', 'all'];

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      controller.enqueue(encoder.encode('retry: 3000\n\n'));

      // Check Last-Event-ID for replay
      const lastEventIdStr = request.headers.get('last-event-id');
      if (lastEventIdStr) {
        const lastEventId = parseInt(lastEventIdStr, 10);
        if (!isNaN(lastEventId)) {
          const pastEvents = await db
            .select()
            .from(events)
            .where(
              and(
                eq(events.restaurantId, auth.restaurantId),
                gt(events.id, lastEventId),
                inArray(events.channel, allowedChannels)
              )
            )
            .orderBy(events.id)
            .limit(100);

          for (const ev of pastEvents) {
            const sseMessage = `id: ${ev.id}\nevent: ${ev.type}\ndata: ${JSON.stringify(ev.payload)}\n\n`;
            controller.enqueue(encoder.encode(sseMessage));
          }
        }
      }

      const onEvent = (ev: RealtimeEventPayload) => {
        if (ev.restaurantId !== auth.restaurantId) return;
        if (allowedChannels.includes(ev.channel) || ev.channel === 'all') {
          try {
            const sseMessage = `id: ${ev.id}\nevent: ${ev.type}\ndata: ${JSON.stringify(ev.payload)}\n\n`;
            controller.enqueue(encoder.encode(sseMessage));
          } catch {
            // Closed
          }
        }
      };

      bus.on('event', onEvent);

      const heartbeatTimer = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': heartbeat\n\n'));
        } catch {
          clearInterval(heartbeatTimer);
        }
      }, 20000);

      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeatTimer);
        bus.off('event', onEvent);
        try {
          controller.close();
        } catch {
          // Closed
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
