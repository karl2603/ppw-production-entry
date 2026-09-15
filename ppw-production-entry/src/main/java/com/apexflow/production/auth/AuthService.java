package com.apexflow.production.auth;

import com.apexflow.production.auth.dto.LoginRequest;
import com.apexflow.production.auth.dto.LoginResponse;
import com.apexflow.production.security.JwtService;
import com.apexflow.production.user.User;
import com.apexflow.production.user.UserRepository;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private final AuthenticationManager authenticationManager;

    private final UserRepository userRepository;

    private final JwtService jwtService;

    public AuthService(
            AuthenticationManager authenticationManager,
            UserRepository userRepository,
            JwtService jwtService
    ) {

        this.authenticationManager =
                authenticationManager;

        this.userRepository =
                userRepository;

        this.jwtService = jwtService;
    }

    @Transactional(readOnly = true)
    public LoginResponse login(
            LoginRequest request
    ) {

        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.username(),
                        request.password()
                )
        );

        User user =
                userRepository
                        .findByUsername(request.username())
                        .orElseThrow();

        String token =
                jwtService.generateToken(user);

        return new LoginResponse(
                token,
                user.getId(),
                user.getUsername(),
                user.getName(),
                user.getRole()
        );
    }
}