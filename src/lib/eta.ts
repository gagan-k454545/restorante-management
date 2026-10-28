/**
 * Order ETA Calculation
 * Section 7 Specification
 */

export interface EtaCalculationParams {
  linePrepTimes: number[];
  activeTickets: number; // orders in PLACED, ACCEPTED, PREPARING
  kitchenCapacityTickets: number;
  minutesPerExtraTicket: number;
  extraDelayMinutes: number;
}

export function calculateEtaMinutes(params: EtaCalculationParams): number {
  const maxLinePrep = params.linePrepTimes.length > 0 ? Math.max(...params.linePrepTimes) : 15;
  const queueDelay = Math.max(0, params.activeTickets - params.kitchenCapacityTickets) * params.minutesPerExtraTicket;
  return maxLinePrep + queueDelay + params.extraDelayMinutes;
}

export function formatEtaRange(etaMinutes: number): { min: number; max: number; label: string } {
  const min = etaMinutes;
  const max = etaMinutes + 5;
  return {
    min,
    max,
    label: `${min}–${max} mins`,
  };
}
