package com.batchsphere.core.auth.config;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@ConfigurationProperties(prefix = "app.auth")
public class AuthSeedProperties {

    private List<SeedUser> seedUsers = new ArrayList<>();

    @Getter
    @Setter
    public static class SeedUser {

        @NotBlank
        private String username;

        @Email
        @NotBlank
        private String email;

        @NotBlank
        private String password;

        @NotBlank
        private String role;
    }
}
