package com.batchsphere.core.compliance.esign.service;

import com.batchsphere.core.auth.entity.User;
import com.batchsphere.core.auth.repository.UserRepository;
import com.batchsphere.core.auth.service.AuthenticatedActorService;
import com.batchsphere.core.compliance.delegation.service.ApprovalDelegationService;
import com.batchsphere.core.compliance.esign.dto.CreateESignatureRequest;
import com.batchsphere.core.compliance.esign.dto.ESignatureRequest;
import com.batchsphere.core.compliance.esign.dto.ESignatureRecordResponse;
import com.batchsphere.core.compliance.esign.entity.ESignatureRecord;
import com.batchsphere.core.compliance.esign.entity.ESignatureVerificationMethod;
import com.batchsphere.core.compliance.esign.entity.ESignatureVerificationStatus;
import com.batchsphere.core.compliance.esign.repository.ESignatureRecordRepository;
import com.batchsphere.core.exception.BusinessConflictException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ESignatureServiceImpl implements ESignatureService {

    private final ESignatureRecordRepository eSignatureRecordRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticatedActorService authenticatedActorService;
    private final ApprovalDelegationService approvalDelegationService;

    @Override
    public ESignatureRecordResponse sign(CreateESignatureRequest request) {
        String action = request.getAction() != null ? request.getAction().trim() : null;
        return sign(
                request.getEntityType() != null ? request.getEntityType().trim() : null,
                request.getEntityId(),
                action,
                action,
                authenticatedActorService.currentActor(),
                request,
                request.getReason());
    }

    @Override
    public ESignatureRecordResponse sign(String entityType,
                                         UUID entityId,
                                         String action,
                                         String defaultMeaning,
                                         String actor,
                                         ESignatureRequest request,
                                         String reason) {
        String credentialUsername = StringUtils.hasText(request != null ? request.getUsername() : null)
                ? request.getUsername().trim()
                : actor;
        String representedUsername = StringUtils.hasText(request != null ? request.getDelegatedByUsername() : null)
                ? request.getDelegatedByUsername().trim()
                : credentialUsername;
        ESignatureVerificationMethod method = StringUtils.hasText(request != null ? request.getPassword() : null)
                ? ESignatureVerificationMethod.PASSWORD
                : ESignatureVerificationMethod.SESSION_CONFIRMATION;

        if (!credentialUsername.equalsIgnoreCase(actor)) {
            throw new BusinessConflictException("Electronic signature credential user must match the authenticated user");
        }

        User credentialUser = userRepository.findByUsername(credentialUsername).orElse(null);
        if (method == ESignatureVerificationMethod.PASSWORD) {
            if (credentialUser == null || !Boolean.TRUE.equals(credentialUser.getIsActive())
                    || !passwordEncoder.matches(request.getPassword(), credentialUser.getPasswordHash())) {
                throw new BusinessConflictException("Electronic signature password verification failed");
            }
        }

        User representedUser = credentialUser;
        String signatureReason = StringUtils.hasText(reason) ? reason.trim() : null;
        if (!representedUsername.equalsIgnoreCase(actor)) {
            approvalDelegationService.assertActiveDelegation(representedUsername, actor, entityType, action);
            representedUser = userRepository.findByUsername(representedUsername)
                    .orElseThrow(() -> new BusinessConflictException("Delegated signer user not found"));
            String delegationNote = "Delegated approval by " + actor + " for " + representedUsername;
            signatureReason = signatureReason == null ? delegationNote : signatureReason + " | " + delegationNote;
        }

        ESignatureRecord record = eSignatureRecordRepository.save(ESignatureRecord.builder()
                .id(UUID.randomUUID())
                .entityType(entityType.trim())
                .entityId(entityId)
                .action(action.trim())
                .meaning(StringUtils.hasText(request != null ? request.getMeaning() : null)
                        ? request.getMeaning().trim()
                        : defaultMeaning)
                .signerUsername(representedUsername)
                .signerRole(representedUser != null && representedUser.getRole() != null ? representedUser.getRole().name() : null)
                .signedAt(LocalDateTime.now())
                .verificationMethod(method)
                .verificationStatus(ESignatureVerificationStatus.VERIFIED)
                .reason(signatureReason)
                .isActive(true)
                .build());
        return toResponse(record);
    }

    @Override
    public List<ESignatureRecordResponse> getSignatures(String entityType, UUID entityId) {
        return eSignatureRecordRepository.findByEntityTypeAndEntityIdAndIsActiveTrueOrderBySignedAtDesc(entityType, entityId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    private ESignatureRecordResponse toResponse(ESignatureRecord record) {
        return ESignatureRecordResponse.builder()
                .id(record.getId())
                .entityType(record.getEntityType())
                .entityId(record.getEntityId())
                .action(record.getAction())
                .meaning(record.getMeaning())
                .signerUsername(record.getSignerUsername())
                .signerRole(record.getSignerRole())
                .signedAt(record.getSignedAt())
                .verificationMethod(record.getVerificationMethod())
                .verificationStatus(record.getVerificationStatus())
                .reason(record.getReason())
                .build();
    }
}
