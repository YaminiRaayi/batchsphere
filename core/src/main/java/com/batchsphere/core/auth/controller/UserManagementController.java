package com.batchsphere.core.auth.controller;

import com.batchsphere.core.auth.dto.CreateUserRequest;
import com.batchsphere.core.auth.dto.UpdateUserRequest;
import com.batchsphere.core.auth.dto.UserManagementResponse;
import com.batchsphere.core.auth.service.UserManagementService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/auth/users")
@RequiredArgsConstructor
public class UserManagementController {

    private final UserManagementService userManagementService;

    @PostMapping
    public ResponseEntity<UserManagementResponse> createUser(@Valid @RequestBody CreateUserRequest request) {
        return ResponseEntity.ok(userManagementService.createUser(request));
    }

    @GetMapping
    public ResponseEntity<List<UserManagementResponse>> getAllUsers() {
        return ResponseEntity.ok(userManagementService.getAllUsers());
    }

    @PutMapping("/{id}")
    public ResponseEntity<UserManagementResponse> updateUser(@PathVariable UUID id,
                                                             @Valid @RequestBody UpdateUserRequest request) {
        return ResponseEntity.ok(userManagementService.updateUser(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deactivateUser(@PathVariable UUID id) {
        userManagementService.deactivateUser(id);
        return ResponseEntity.noContent().build();
    }
}
