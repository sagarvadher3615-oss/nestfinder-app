// Tiny module-level singleton to pass a picked lat/lng back to the Add Property screen.
type Coord = { lat: number; lng: number } | null;

let pending: { hasValue: boolean; value: Coord } = { hasValue: false, value: null };

export const pickedLocation = {
  set(v: Coord) { pending = { hasValue: true, value: v }; },
  consume(): { hasValue: boolean; value: Coord } {
    const out = pending;
    pending = { hasValue: false, value: null };
    return out;
  },
};
