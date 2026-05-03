package org.routeops.gateway.service;

import java.time.Instant;
import java.util.List;
import java.util.stream.Collectors;

import org.routeops.gateway.entity.RouteSession;
import org.routeops.gateway.entity.user.User;
import org.routeops.gateway.repository.RouteSessionRepository;
import org.routeops.gateway.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * RouteStateService manages the lifecycle and state transitions of route sessions.
 * 
 * Responsibilities:
 * - Start, pause, resume, cancel, and complete route sessions
 * - Manage route session state transitions with validation
 * - Track session status history
 * - Retrieve session history and active sessions
 * 
 * State Diagram:
 * <pre>
 *   PLANNED -> ACTIVE -> PAUSED -> ACTIVE -> REACHED -> COMPLETED
 *      |         |         |         |         |
 *      +-------> CANCELLED
 * </pre>
 * 
 * Usage Example:
 * <pre>
 *   RouteStateService.SessionState state = routeStateService.startRoute(username, sessionId);
 *   routeStateService.pauseRoute(username, sessionId);
 *   routeStateService.resumeRoute(username, sessionId);
 *   routeStateService.completeRoute(username, sessionId);
 * </pre>
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class RouteStateService {

    private final RouteSessionRepository routeSessionRepository;
    private final UserRepository userRepository;

    /**
     * Starts an inactive route session.
     * Transitions PLANNED -> ACTIVE
     * 
     * @param username User identifier
     * @param sessionId Route session identifier
     * @return Updated session state
     * @throws IllegalArgumentException If user or session not found
     * @throws IllegalStateException If session not in PLANNED state
     * 
     * Example:
     *   SessionState state = startRoute("alice", "route-123");
     *   assert state.getStatus() == ACTIVE;
     */
    @Transactional
    public RouteSession startRoute(String username, String sessionId) {
        RouteSession session = getUserRouteSession(username, sessionId);

        // Allow restart if already active
        if (session.getStatus() == RouteSession.RouteSessionStatus.ACTIVE) {
            return session;
        }

        if (session.getStatus() != RouteSession.RouteSessionStatus.PLANNED) {
            throw new IllegalStateException("Route session cannot be started from current state: " + session.getStatus());
        }

        session.setUserPausedByCommand(false);
        session.setStatus(RouteSession.RouteSessionStatus.ACTIVE);
        session.setStartedAt(Instant.now());
        
        log.info("Started route session {} for user {}", sessionId, username);
        return routeSessionRepository.save(session);
    }

    /**
     * Pauses an active route session.
     * Transitions ACTIVE/PAUSED -> PAUSED
     * 
     * @param username User identifier
     * @param sessionId Route session identifier
     * @return Updated session state with PAUSED status
     * @throws IllegalArgumentException If user or session not found
     * @throws IllegalStateException If session is COMPLETED, REACHED, or CANCELLED
     * 
     * Example:
     *   SessionState state = pauseRoute("alice", "route-123");
     *   assert state.getUserPausedByCommand() == true;
     */
    @Transactional
    public RouteSession pauseRoute(String username, String sessionId) {
        RouteSession session = getUserRouteSession(username, sessionId);

        if (session.getStatus() == RouteSession.RouteSessionStatus.CANCELLED ||
                session.getStatus() == RouteSession.RouteSessionStatus.COMPLETED ||
                session.getStatus() == RouteSession.RouteSessionStatus.REACHED) {
            throw new IllegalStateException("Route session cannot be paused from current state: " + session.getStatus());
        }

        session.setUserPausedByCommand(true);
        session.setStatus(RouteSession.RouteSessionStatus.PAUSED);
        
        log.info("Paused route session {} for user {}", sessionId, username);
        return routeSessionRepository.save(session);
    }

    /**
     * Resumes a paused route session.
     * Transitions PAUSED -> ACTIVE
     * 
     * @param username User identifier
     * @param sessionId Route session identifier
     * @return Updated session state with ACTIVE status
     * @throws IllegalArgumentException If user or session not found
     * @throws IllegalStateException If session is COMPLETED, REACHED, or CANCELLED
     * 
     * Example:
     *   SessionState state = resumeRoute("alice", "route-123");
     *   assert state.getStatus() == ACTIVE;
     *   assert state.getUserPausedByCommand() == false;
     */
    @Transactional
    public RouteSession resumeRoute(String username, String sessionId) {
        RouteSession session = getUserRouteSession(username, sessionId);

        if (session.getStatus() == RouteSession.RouteSessionStatus.CANCELLED ||
                session.getStatus() == RouteSession.RouteSessionStatus.COMPLETED ||
                session.getStatus() == RouteSession.RouteSessionStatus.REACHED) {
            throw new IllegalStateException("Route session cannot be resumed from current state: " + session.getStatus());
        }

        session.setUserPausedByCommand(false);
        session.setStatus(RouteSession.RouteSessionStatus.ACTIVE);
        
        log.info("Resumed route session {} for user {}", sessionId, username);
        return routeSessionRepository.save(session);
    }

    /**
     * Cancels a route session, terminating navigation.
     * Transitions ANY -> CANCELLED
     * 
     * @param username User identifier
     * @param sessionId Route session identifier
     * @return Updated session state with CANCELLED status
     * @throws IllegalArgumentException If user or session not found
     * 
     * Example:
     *   SessionState state = cancelRoute("alice", "route-123");
     *   assert state.getStatus() == CANCELLED;
     */
    @Transactional
    public RouteSession cancelRoute(String username, String sessionId) {
        RouteSession session = getUserRouteSession(username, sessionId);
        session.setUserPausedByCommand(false);
        session.setStatus(RouteSession.RouteSessionStatus.CANCELLED);
        
        log.info("Cancelled route session {} for user {}", sessionId, username);
        return routeSessionRepository.save(session);
    }

    /**
     * Marks a route session as completed.
     * Transitions ACTIVE/PAUSED/REACHED -> COMPLETED
     * 
     * @param username User identifier
     * @param sessionId Route session identifier
     * @return Updated session state with COMPLETED status
     * @throws IllegalArgumentException If user or session not found
     * @throws IllegalStateException If session is already CANCELLED or COMPLETED
     * 
     * Example:
     *   SessionState state = completeRoute("alice", "route-123");
     *   assert state.getStatus() == COMPLETED;
     *   assert state.getCompletedAt() != null;
     */
    @Transactional
    public RouteSession completeRoute(String username, String sessionId) {
        RouteSession session = getUserRouteSession(username, sessionId);

        if (session.getStatus() != RouteSession.RouteSessionStatus.REACHED &&
                session.getStatus() != RouteSession.RouteSessionStatus.ACTIVE &&
                session.getStatus() != RouteSession.RouteSessionStatus.PAUSED) {
            throw new IllegalStateException("Route session cannot be completed from current state");
        }

        session.setUserPausedByCommand(false);
        session.setStatus(RouteSession.RouteSessionStatus.COMPLETED);
        if (session.getCompletedAt() == null) {
            session.setCompletedAt(Instant.now());
        }
        
        log.info("Completed route session {} for user {}", sessionId, username);
        return routeSessionRepository.save(session);
    }

    /**
     * Marks a route session as reached when destination is within acceptable distance.
     * Automatically transitions ACTIVE/PAUSED -> REACHED
     * 
     * @param username User identifier
     * @param sessionId Route session identifier
     * @return Updated session state with REACHED status
     */
    @Transactional
    public RouteSession markAsReached(String username, String sessionId) {
        RouteSession session = getUserRouteSession(username, sessionId);
        session.setStatus(RouteSession.RouteSessionStatus.REACHED);
        session.setCompletedAt(Instant.now());
        
        log.info("Marked route session {} as reached for user {}", sessionId, username);
        return routeSessionRepository.save(session);
    }

    /**
     * Retrieves all route sessions for a user ordered by most recent first.
     * Includes sessions in any state.
     * 
     * @param username User identifier
     * @return List of all route sessions for user
     * @throws IllegalArgumentException If user not found
     * 
     * Example:
     *   List<RouteSession> sessions = getAllUserSessions("alice");
     *   sessions.stream().forEach(s -> System.out.println(s.getStatus()));
     */
    @Transactional(readOnly = true)
    public List<RouteSession> getAllUserSessions(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        return routeSessionRepository.findByUserIdOrderByCreatedAtDesc(user.getId());
    }

    /**
     * Retrieves completed route sessions for a user (history).
     * Only returns COMPLETED, REACHED, or CANCELLED sessions.
     * 
     * @param username User identifier
     * @return List of terminal state route sessions
     * @throws IllegalArgumentException If user not found
     * 
     * Example:
     *   List<RouteSession> history = getRouteHistory("alice");
     *   history.stream()
     *       .filter(s -> s.getStatus() == COMPLETED)
     *       .forEach(s -> System.out.println("Completed: " + s.getTotalRouteDistance()));
     */
    @Transactional(readOnly = true)
    public List<RouteSession> getRouteHistory(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        return routeSessionRepository.findByUserIdOrderByCreatedAtDesc(user.getId())
                .stream()
                .filter(session -> session.getStatus() == RouteSession.RouteSessionStatus.COMPLETED ||
                                 session.getStatus() == RouteSession.RouteSessionStatus.REACHED ||
                                 session.getStatus() == RouteSession.RouteSessionStatus.CANCELLED)
                .collect(Collectors.toList());
    }

    /**
     * Retrieves a specific route session for a user.
     * Validates that the session belongs to the user.
     * 
     * @param username User identifier
     * @param sessionId Route session identifier
     * @return Route session entity
     * @throws IllegalArgumentException If user not found or session not owned by user
     */
    @Transactional(readOnly = true)
    public RouteSession getRouteSession(String username, String sessionId) {
        return getUserRouteSession(username, sessionId);
    }

    /**
     * Helper method to retrieve and validate user ownership of a session.
     * 
     * @param username User identifier
     * @param sessionId Route session identifier
     * @return Route session owned by the user
     * @throws IllegalArgumentException If user not found or session not owned by user
     */
    private RouteSession getUserRouteSession(String username, String sessionId) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        return routeSessionRepository.findByIdAndUserId(sessionId, user.getId())
                .orElseThrow(() -> new IllegalArgumentException("Route session not found"));
    }

    /**
     * Updates the automatic pause/resume status based on movement detection.
     * Used when user's speed indicates they've stopped/started moving.
     * 
     * @param session Route session to update
     * @param isMoving Whether user is currently moving based on speed threshold
     */
    @Transactional
    public void updateMovementStatus(RouteSession session, boolean isMoving) {
        // Only auto-pause if user hasn't manually paused
        if (!Boolean.TRUE.equals(session.getUserPausedByCommand())) {
            RouteSession.RouteSessionStatus newStatus = isMoving ? 
                    RouteSession.RouteSessionStatus.ACTIVE : 
                    RouteSession.RouteSessionStatus.PAUSED;
            session.setStatus(newStatus);
        }
        routeSessionRepository.save(session);
    }
}
