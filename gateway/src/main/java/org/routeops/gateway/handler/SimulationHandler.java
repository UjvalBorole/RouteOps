package org.routeops.gateway.handler;

import java.io.IOException;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

@Component
public class SimulationHandler extends TextWebSocketHandler {

    private static final Logger log = LoggerFactory.getLogger(SimulationHandler.class);

    @Override
    @SuppressWarnings("null")
    public void afterConnectionEstablished(@NonNull WebSocketSession session) {
        log.info("WebSocket connected for simulation, but backend order simulation is currently unavailable.");
        closeSessionWithStatus(session, CloseStatus.SERVICE_RESTARTED);
    }

    @SuppressWarnings("null")
    private void closeSessionWithStatus(WebSocketSession session, CloseStatus status) {
        try {
            session.close(status);
        } catch (IOException e) {
            log.error("Error closing WebSocket session", e);
        }
    }
}
