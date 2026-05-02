package org.routeops.gateway.mapper;

import org.routeops.gateway.dto.auth.UserResponse;
import org.routeops.gateway.entity.user.Role;
import org.routeops.gateway.entity.user.User;
import java.util.Set;
import java.util.stream.Collectors;

public final class UserMapper {
    private UserMapper() {}

    public static UserResponse toResponse(User u) {
        Set<String> roles = u.getRoles() == null ? Set.of()
                : u.getRoles().stream().map(Role::name).collect(Collectors.toSet());
        return new UserResponse(
                u.getId(),
                u.getUsername(),
                u.getEmail(),
                roles,
                u.getCreatedAt(),
                u.isEnabled()
        );
    }
}
