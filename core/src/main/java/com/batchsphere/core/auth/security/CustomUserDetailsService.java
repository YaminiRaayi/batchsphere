package com.batchsphere.core.auth.security;

import com.batchsphere.core.auth.repository.UserRepository;
import com.batchsphere.core.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    @Override
    public UserDetails loadUserByUsername(String username) {
        return userRepository.findByUsername(username.trim())
                .map(AuthenticatedUser::new)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + username));
    }
}
