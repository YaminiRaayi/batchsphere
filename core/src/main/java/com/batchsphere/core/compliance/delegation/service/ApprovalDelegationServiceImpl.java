package com.batchsphere.core.compliance.delegation.service;

import com.batchsphere.core.auth.repository.UserRepository;
import com.batchsphere.core.auth.service.AuthenticatedActorService;
import com.batchsphere.core.compliance.delegation.dto.ApprovalDelegationDTO.ApprovalDelegationResponse;
import com.batchsphere.core.compliance.delegation.dto.ApprovalDelegationDTO.CreateApprovalDelegationRequest;
import com.batchsphere.core.compliance.delegation.entity.ApprovalDelegation;
import com.batchsphere.core.compliance.delegation.repository.ApprovalDelegationRepository;
import com.batchsphere.core.exception.BusinessConflictException;
import com.batchsphere.core.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ApprovalDelegationServiceImpl implements ApprovalDelegationService {

    private final ApprovalDelegationRepository repository;
    private final UserRepository userRepository;
    private final AuthenticatedActorService authenticatedActorService;

    @Override
    @Transactional
    public ApprovalDelegationResponse create(CreateApprovalDelegationRequest request) {
        if (request.getValidUntil().isBefore(request.getValidFrom()) || request.getValidUntil().isEqual(request.getValidFrom())) {
            throw new BusinessConflictException("Delegation validUntil must be after validFrom");
        }
        String delegator = request.getDelegatorUsername().trim();
        String delegate = request.getDelegateUsername().trim();
        if (delegator.equalsIgnoreCase(delegate)) {
            throw new BusinessConflictException("Delegator and delegate must be different users");
        }
        userRepository.findByUsername(delegator).orElseThrow(() -> new ResourceNotFoundException("Delegator user not found: " + delegator));
        userRepository.findByUsername(delegate).orElseThrow(() -> new ResourceNotFoundException("Delegate user not found: " + delegate));
        String actor = authenticatedActorService.currentActor();
        ApprovalDelegation saved = repository.save(ApprovalDelegation.builder()
                .id(UUID.randomUUID())
                .delegatorUsername(delegator)
                .delegateUsername(delegate)
                .scopeEntityType(blankToNull(request.getScopeEntityType()))
                .scopeAction(blankToNull(request.getScopeAction()))
                .validFrom(request.getValidFrom())
                .validUntil(request.getValidUntil())
                .reason(request.getReason().trim())
                .isActive(true)
                .createdBy(actor)
                .createdAt(LocalDateTime.now())
                .build());
        return toResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ApprovalDelegationResponse> listActive() {
        return repository.findByIsActiveTrueOrderByValidUntilAsc().stream().map(this::toResponse).toList();
    }

    @Override
    @Transactional
    public ApprovalDelegationResponse revoke(UUID id) {
        ApprovalDelegation delegation = repository.findByIdAndIsActiveTrue(id)
                .orElseThrow(() -> new ResourceNotFoundException("Approval delegation not found: " + id));
        delegation.setIsActive(false);
        delegation.setRevokedBy(authenticatedActorService.currentActor());
        delegation.setRevokedAt(LocalDateTime.now());
        return toResponse(repository.save(delegation));
    }

    @Override
    @Transactional(readOnly = true)
    public void assertActiveDelegation(String delegatorUsername, String delegateUsername, String entityType, String action) {
        repository.findActiveDelegation(delegatorUsername, delegateUsername, entityType, action, LocalDateTime.now())
                .orElseThrow(() -> new BusinessConflictException("No active approval delegation from " + delegatorUsername + " to " + delegateUsername));
    }

    private ApprovalDelegationResponse toResponse(ApprovalDelegation d) {
        return ApprovalDelegationResponse.builder()
                .id(d.getId())
                .delegatorUsername(d.getDelegatorUsername())
                .delegateUsername(d.getDelegateUsername())
                .scopeEntityType(d.getScopeEntityType())
                .scopeAction(d.getScopeAction())
                .validFrom(d.getValidFrom())
                .validUntil(d.getValidUntil())
                .reason(d.getReason())
                .isActive(d.getIsActive())
                .createdBy(d.getCreatedBy())
                .createdAt(d.getCreatedAt())
                .revokedBy(d.getRevokedBy())
                .revokedAt(d.getRevokedAt())
                .build();
    }

    private String blankToNull(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }
}
