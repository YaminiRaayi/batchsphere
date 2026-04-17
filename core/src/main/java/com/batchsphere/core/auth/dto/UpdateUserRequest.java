package com.batchsphere.core.auth.dto;

import com.batchsphere.core.auth.entity.UserRole;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
public class UpdateUserRequest {

    @NotBlank
    @Email
    @Size(max = 150)
    private String email;

    @NotNull
    private UserRole role;

    @NotNull
    private Boolean isActive;

    @Size(min = 8, max = 100)
    private String password;

    private UUID employeeId;
}
