package com.batchsphere.core.auth.security;

import com.batchsphere.core.auth.entity.User;
import lombok.Getter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

@Getter
public class AuthenticatedUser implements UserDetails {

    private final UUID id;
    private final String username;
    private final String email;
    private final String password;
    private final String role;
    private final UUID employeeId;
    private final boolean active;
    private final boolean locked;
    private final boolean forcePasswordChange;

    public AuthenticatedUser(User user) {
        this.id = user.getId();
        this.username = user.getUsername();
        this.email = user.getEmail();
        this.password = user.getPasswordHash();
        this.role = user.getRole().name();
        this.employeeId = user.getEmployeeId();
        this.active = Boolean.TRUE.equals(user.getIsActive());
        this.locked = user.getLockedUntil() != null && user.getLockedUntil().isAfter(LocalDateTime.now());
        this.forcePasswordChange = Boolean.TRUE.equals(user.getForcePasswordChange());
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + role));
    }

    @Override
    public String getPassword() {
        return password;
    }

    @Override
    public String getUsername() {
        return username;
    }

    @Override
    public boolean isAccountNonExpired() {
        return active;
    }

    @Override
    public boolean isAccountNonLocked() {
        return active && !locked;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return active;
    }

    @Override
    public boolean isEnabled() {
        return active;
    }
}
