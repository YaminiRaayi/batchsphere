package com.batchsphere.core.auth.service;

import com.batchsphere.core.auth.security.AuthenticatedUser;
import com.batchsphere.core.exception.BusinessConflictException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

@Service
public class AuthenticatedActorService {

    public String currentActor() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new BusinessConflictException("No authenticated user in security context");
        }

        Object principal = authentication.getPrincipal();
        if (principal instanceof AuthenticatedUser user) {
            return user.getUsername();
        }

        throw new BusinessConflictException("No authenticated user in security context");
    }
}
