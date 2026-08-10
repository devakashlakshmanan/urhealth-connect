import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { startBackgroundJobs, store, subscribeNetwork, type NetworkEvent } from "./mock-backend";
import type { Hospital, Incident, Severity } from "./types";

/**
 * API adapter. Today it resolves against the in-memory mock backend.
 * To go live, replace each body with fetch("/api/...") — signatures already
 * match the FastAPI contract, and useNetworkChannel maps to WS /ws/network.
 */

const delay = <T,>(v: T, ms = 180) => new Promise<T>((r) => setTimeout(() => r(v), ms));

export const api = {
  getNetworkStatus: () => delay({ hospitals: store.hospitals(), incidents: store.incidents() }),
  getHospital: (id: string) => delay(store.hospital(id) ?? null),
  getIncidents: () => delay(store.incidents()),
  getPatients: () => delay(store.patients()),
  getHolds: () => delay(store.holds()),
  getUnits: () => delay(store.units()),
  getPredictions: () => delay(store.predictions()),

  declareIncident: (input: { type: Incident["type"]; label: string; severity_estimate: number }) =>
    delay(store.declareIncident(input)),

  createPatient: (input: {
    name?: string;
    age_range: string;
    gender: string;
    identifying_marks: string;
    suspected_condition: string;
    severity: Severity;
    pickup_location: string;
    pickup_area: string;
  }) => delay(store.createPatient(input), 500),

  confirmArrival: (holdId: string) => delay(store.confirmArrival(holdId)),
  rejectHold: (holdId: string) => delay(store.rejectHold(holdId), 400),
  confirmOnboard: (unitId: string) => delay(store.confirmOnboard(unitId)),
  updateResources: (hospitalId: string, patch: Partial<Hospital>) => delay(store.updateResources(hospitalId, patch)),
  searchPatients: (q: { tracking_id?: string; age_range?: string; gender?: string; area?: string }) =>
    delay(store.search(q), 400),
  lookupTracking: (trackingId: string) => {
    const p = store.patientByTracking(trackingId);
    if (!p) return delay(null, 300);
    return delay(store.search({ tracking_id: p.tracking_id })[0] ?? null, 300);
  },
};

/** WebSocket /ws/network stand-in: invalidates query caches on every push. */
export function useNetworkChannel(onEvent?: (e: NetworkEvent) => void) {
  const qc = useQueryClient();
  useEffect(() => {
    startBackgroundJobs();
    const unsubscribe = subscribeNetwork((e) => {
      qc.invalidateQueries();
      onEvent?.(e);
    });
    return () => {
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qc]);
}
