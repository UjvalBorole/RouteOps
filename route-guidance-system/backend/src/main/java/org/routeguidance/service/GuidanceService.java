package org.routeguidance.service;

import org.routeguidance.dto.GuidanceSessionResponse;
import org.routeguidance.dto.LocationUpdateRequest;
import org.routeguidance.dto.LocationUpdateResponse;
import org.routeguidance.dto.StartGuidanceRequest;

public interface GuidanceService {

    GuidanceSessionResponse startSession(StartGuidanceRequest request);

    GuidanceSessionResponse getSession(String sessionId);

    LocationUpdateResponse processLocationUpdate(String sessionId, LocationUpdateRequest request);
}
