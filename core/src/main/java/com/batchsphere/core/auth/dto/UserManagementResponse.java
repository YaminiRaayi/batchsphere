package com.batchsphere.core.auth.dto;

import com.batchsphere.core.auth.entity.UserRole;
import lombok.Builder;

import java.time.LocalDateTime;
import java.util.UUID;

@Builder
public record UserManagementResponse(
        UUID id,
        String username,
        String email,
        UserRole role,
        Boolean isActive,
        UUID employeeId,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
