package com.apexflow.production.auth.dto;

import com.apexflow.production.user.Role;

public record LoginResponse(

        String token,

        Long userId,

        String username,

        String name,

        Role role

) {
}