import { NextRequest } from 'next/server';
import { requireGuestContext } from '@/modules/auth/guest-guard';
import { db } from '@/db/client';
import { events, tableSessions } from '@/db/schema';
import { eq, gt, and } from 'drizzle-orm';
import { bus, RealtimeEventPayload } from '@/modules/realtime/bus';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  let guest;
  try {
    guest = await requireGuestContext();
  } catch {
    return new Response('Unauthorized', { status: 401 });
  }

  // Look up live session for this table
  const [session] = await db
    .select({ id: tableSessions.id })
    .from(tableSessions)
    .where(
      and(
        eq(tableSessions.tableId, guest.tableId),
        eq(tableSessions.restaurantId, guest.restaurantId)
      )
    )
    .limit(1);

  const sessionId = session?.id;

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      // Send initial retry configuration
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
                eq(events.restaurantId, guest.restaurantId),
                gt(events.id, lastEventId)
              )
            )
            .orderBy(events.id)
            .limit(50);

          for (const ev of pastEvents) {
            // Filter: guest receives only events for their session or menu/settings
            if (
              ev.sessionId === sessionId ||
              ev.channel === 'menu' ||
              ev.type === 'settings.updated' ||
              ev.type === 'app.version'
            ) {
              const sseMessage = `id: ${ev.id}\nevent: ${ev.type}\ndata: ${JSON.stringify(ev.payload)}\n\n`;
              controller.enqueue(encoder.encode(sseMessage));
            }
          }
        }
      }

      // Event handler
      const onEvent = (ev: RealtimeEventPayload) => {
        if (ev.restaurantId !== guest.restaurantId) return;

        if (
          ev.sessionId === sessionId ||
          ev.channel === 'menu' ||
          ev.type === 'settings.updated' ||
          ev.type === 'app.version'
        ) {
          try {
            const sseMessage = `id: ${ev.id}\nevent: ${ev.type}\ndata: ${JSON.stringify(ev.payload)}\n\n`;
            controller.enqueue(encoder.encode(sseMessage));
          } catch {
            // Stream closed
          }
        }
      };

      bus.on('event', onEvent);

      // Heartbeat comment every 20 seconds
      const heartbeatTimer = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': heartbeat\n\n'));
        } catch {
          clearInterval(heartbeatTimer);
        }
      }, 20000);

      // Clean up on abort
      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeatTimer);
        bus.off('event', onEvent);
        try {
          controller.close();
        } catch {
          // already closed
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
