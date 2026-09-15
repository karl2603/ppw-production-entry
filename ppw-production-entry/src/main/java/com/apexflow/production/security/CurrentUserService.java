package com.apexflow.production.security;

import com.apexflow.production.common.ResourceNotFoundException;
import com.apexflow.production.user.User;
import com.apexflow.production.user.UserRepository;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

@Service
public class CurrentUserService {

    private final UserRepository userRepository;

    public CurrentUserService(
            UserRepository userRepository
    ) {
        this.userRepository = userRepository;
    }

    public User get(Authentication authentication) {

        return userRepository
                .findByUsername(
                        authentication.getName()
                )
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Authenticated user not found"
                        )
                );
    }
}