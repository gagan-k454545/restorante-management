export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { bus } = await import('./src/modules/realtime/bus');
    bus.init();
  }
}
