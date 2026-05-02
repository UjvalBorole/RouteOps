import {
  GuidanceSessionResponse,
  LocationUpdateRequest,
  LocationUpdateResponse,
  StartGuidanceRequest,
} from "../models/guidance";

export class GuidanceApi {
  constructor(private readonly baseUrl: string) {}

  async startSession(payload: StartGuidanceRequest): Promise<GuidanceSessionResponse> {
    const response = await fetch(`${this.baseUrl}/api/guidance/sessions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Failed to start session: ${response.status}`);
    }

    return response.json();
  }

  async getSession(sessionId: string): Promise<GuidanceSessionResponse> {
    const response = await fetch(`${this.baseUrl}/api/guidance/sessions/${sessionId}`);
    if (!response.ok) {
      throw new Error(`Failed to load session: ${response.status}`);
    }
    return response.json();
  }

  async sendLocation(sessionId: string, payload: LocationUpdateRequest): Promise<LocationUpdateResponse> {
    const response = await fetch(`${this.baseUrl}/api/guidance/sessions/${sessionId}/location`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Failed to send location: ${response.status}`);
    }

    return response.json();
  }
}
