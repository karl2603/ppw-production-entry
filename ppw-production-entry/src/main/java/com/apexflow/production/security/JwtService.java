package com.apexflow.production.security;

import com.apexflow.production.config.JwtProperties;
import com.apexflow.production.user.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.time.Instant;
import java.util.Date;

@Service
public class JwtService {

    private final JwtProperties properties;

    private final SecretKey signingKey;

    public JwtService(
            JwtProperties properties
    ) {

        this.properties = properties;

        this.signingKey =
                Keys.hmacShaKeyFor(
                        java.util.Base64
                                .getDecoder()
                                .decode(
                                        properties.getSecret()
                                )
                );
    }

    public String generateToken(User user) {

        Instant now = Instant.now();

        Instant expiry =
                now.plusSeconds(
                        properties.getExpirationMinutes() * 60
                );

        return Jwts.builder()
                .subject(user.getUsername())
                .claim("role", user.getRole().name())
                .issuedAt(Date.from(now))
                .expiration(Date.from(expiry))
                .signWith(signingKey)
                .compact();
    }

    public String extractUsername(String token) {

        return parseClaims(token).getSubject();
    }

    public boolean isValid(String token) {

        try {

            Claims claims = parseClaims(token);

            return claims.getExpiration()
                    .after(new Date());

        } catch (Exception exception) {

            return false;
        }
    }

    private Claims parseClaims(String token) {

        return Jwts.parser()
                .verifyWith(signingKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}