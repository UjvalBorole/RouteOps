package org.routeops.gateway.repository;

import java.util.List;
import java.util.Optional;

import org.routeops.gateway.entity.RouteNode;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface RouteNodeRepository extends JpaRepository<RouteNode, Long> {

    @Query("SELECT rn FROM RouteNode rn WHERE rn.nodeId = :nodeId")
    Optional<RouteNode> findByNodeId(@Param("nodeId") Long nodeId);

    @Query("SELECT rn FROM RouteNode rn ORDER BY rn.sequence ASC")
    List<RouteNode> findAllOrderedBySequence();
}