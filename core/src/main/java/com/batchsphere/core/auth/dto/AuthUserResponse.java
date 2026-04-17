package com.batchsphere.core.auth.dto;

import com.batchsphere.core.auth.entity.UserRole;
import lombok.Builder;

import java.util.UUID;

@Builder
public record AuthUserResponse(
        UUID id,
        String username,
        String email,
        UserRole role,
        UUID employeeId
) {
}
