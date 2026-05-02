package org.routeops.gateway.repository;

import java.util.List;
import java.util.Optional;

import org.routeops.gateway.entity.RouteSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface RouteSessionRepository extends JpaRepository<RouteSession, String> {

    List<RouteSession> findByUserIdOrderByCreatedAtDesc(String userId);

    List<RouteSession> findByUserIdAndStatus(String userId, RouteSession.RouteSessionStatus status);

    Optional<RouteSession> findByIdAndUserId(String id, String userId);

    @Query("SELECT rs FROM RouteSession rs WHERE rs.user.id = :userId AND rs.status IN :statuses")
    List<RouteSession> findByUserIdAndStatuses(@Param("userId") String userId,
                                              @Param("statuses") List<RouteSession.RouteSessionStatus> statuses);
}