package org.routeops.gateway.repository;

import org.routeops.gateway.entity.token.Token;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface TokenRepository extends JpaRepository<Token, String> {

    public Optional<Token> findByAccessToken(String accessToken);

    public Optional<Token> findByRefreshToken(String refreshToken);

    @Query(value = "select t from Token t where t.user.id = :id and t.blacklisted = false ", nativeQuery = false)
    List<Token> findAllValidTokenByUser(String id);

}
