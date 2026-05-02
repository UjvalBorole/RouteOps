package org.routeguidance.repository;

import org.routeguidance.domain.GuidanceSession;
import org.springframework.stereotype.Repository;

import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

@Repository
public class GuidanceSessionRepository {

    private final Map<String, GuidanceSession> sessions = new ConcurrentHashMap<>();

    public GuidanceSession save(GuidanceSession session) {
        sessions.put(session.getSessionId(), session);
        return session;
    }

    public Optional<GuidanceSession> findById(String sessionId) {
        return Optional.ofNullable(sessions.get(sessionId));
    }
}
