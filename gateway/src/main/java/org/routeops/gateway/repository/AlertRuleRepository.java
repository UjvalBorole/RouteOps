package org.routeops.gateway.repository;

import java.util.List;
import java.util.Optional;

import org.routeops.gateway.entity.alert.AlertRule;
import org.routeops.gateway.entity.RouteSession;
import org.routeops.gateway.entity.user.User;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AlertRuleRepository extends JpaRepository<AlertRule, String> {
    List<AlertRule> findAllByRouteSessionUser(User user);
    List<AlertRule> findAllByRouteSessionUserAndEnabled(User user, boolean enabled);
    List<AlertRule> findAllByRouteSession(RouteSession routeSession);
    List<AlertRule> findAllByRouteSessionAndEnabled(RouteSession routeSession, boolean enabled);
    Optional<AlertRule> findByIdAndRouteSessionUser(String id, User user);
}
