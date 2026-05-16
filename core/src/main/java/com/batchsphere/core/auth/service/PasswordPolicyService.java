package com.batchsphere.core.auth.service;

import com.batchsphere.core.exception.BusinessConflictException;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Locale;

@Service
public class PasswordPolicyService {

    private static final int MIN_LENGTH = 8;
    private static final List<String> COMMON_PASSWORDS = List.of("password", "admin", "batchsphere", "welcome", "qwerty");

    public void validate(String password, String username, String email) {
        if (password == null || password.length() < MIN_LENGTH) {
            throw new BusinessConflictException("Password must be at least " + MIN_LENGTH + " characters");
        }
        if (!password.chars().anyMatch(Character::isUpperCase)
                || !password.chars().anyMatch(Character::isLowerCase)
                || !password.chars().anyMatch(Character::isDigit)
                || password.chars().noneMatch(ch -> !Character.isLetterOrDigit(ch))) {
            throw new BusinessConflictException("Password must include uppercase, lowercase, number, and special character");
        }
        String normalized = password.toLowerCase(Locale.ROOT);
        if (COMMON_PASSWORDS.stream().anyMatch(normalized::contains)) {
            throw new BusinessConflictException("Password contains a common weak word");
        }
        if (username != null && !username.isBlank() && normalized.contains(username.toLowerCase(Locale.ROOT))) {
            throw new BusinessConflictException("Password must not contain username");
        }
        if (email != null && email.contains("@")) {
            String localPart = email.substring(0, email.indexOf('@')).toLowerCase(Locale.ROOT);
            if (!localPart.isBlank() && normalized.contains(localPart)) {
                throw new BusinessConflictException("Password must not contain email local part");
            }
        }
    }
}
