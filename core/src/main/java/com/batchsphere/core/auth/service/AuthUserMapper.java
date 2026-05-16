package com.batchsphere.core.auth.service;

import com.batchsphere.core.auth.dto.AuthUserResponse;
import com.batchsphere.core.auth.entity.UserRole;
import com.batchsphere.core.auth.security.AuthenticatedUser;

final class AuthUserMapper {

    private AuthUserMapper() {
    }

    static AuthUserResponse toResponse(AuthenticatedUser user) {
        return AuthUserResponse.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .role(UserRole.valueOf(user.getRole()))
                .employeeId(user.getEmployeeId())
                .forcePasswordChange(user.isForcePasswordChange())
                .build();
    }
}
