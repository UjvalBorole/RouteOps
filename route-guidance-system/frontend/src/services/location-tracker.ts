import { GeoPoint, LocationUpdateResponse } from "../models/guidance";
import { GuidanceApi } from "./guidance-api";

export class LocationTracker {
  private timerId: number | null = null;

  constructor(
    private readonly api: GuidanceApi,
    private readonly sessionId: string,
    private readonly intervalMs: number,
    private readonly getCurrentLocation: () => Promise<GeoPoint>,
    private readonly onUpdate: (response: LocationUpdateResponse) => void,
  ) {}

  start() {
    if (this.timerId !== null) {
      return;
    }

    this.timerId = window.setInterval(async () => {
      const location = await this.getCurrentLocation();
      const response = await this.api.sendLocation(this.sessionId, {
        currentLocation: location,
      });
      this.onUpdate(response);
    }, this.intervalMs);
  }

  stop() {
    if (this.timerId !== null) {
      window.clearInterval(this.timerId);
      this.timerId = null;
    }
  }
}
