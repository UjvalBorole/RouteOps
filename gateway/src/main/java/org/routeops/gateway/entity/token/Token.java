package org.routeops.gateway.entity.token;

import org.routeops.gateway.entity.user.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "tokens")
public class Token {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private String id;

    @Column(length = 2048)
    private String refreshToken;

    @Column(length = 2048)
    private String accessToken;

    @JoinColumn(name = "user_id")
    @ManyToOne
    private User user;

    @Column()
    private boolean blacklisted;

    @Column()
    private Instant createdAt;

}
