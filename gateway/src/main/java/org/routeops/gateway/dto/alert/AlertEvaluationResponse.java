package org.routeops.gateway.dto.alert;

import java.util.Optional;

public record AlertEvaluationResponse(
        Optional<TriggeredAlertResponse> triggeredAlert,
        boolean hasMoreAlerts
) {
}
