package com.batchsphere.core.compliance.esign.service;

import com.batchsphere.core.auth.entity.User;
import com.batchsphere.core.auth.repository.UserRepository;
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

    @Override
    public ESignatureRecordResponse sign(String entityType,
                                         UUID entityId,
                                         String action,
                                         String defaultMeaning,
                                         String actor,
                                         ESignatureRequest request,
                                         String reason) {
        String signer = StringUtils.hasText(request != null ? request.getUsername() : null)
                ? request.getUsername().trim()
                : actor;
        ESignatureVerificationMethod method = StringUtils.hasText(request != null ? request.getPassword() : null)
                ? ESignatureVerificationMethod.PASSWORD
                : ESignatureVerificationMethod.SESSION_CONFIRMATION;

        User user = userRepository.findByUsername(signer).orElse(null);
        if (method == ESignatureVerificationMethod.PASSWORD) {
            if (user == null || !Boolean.TRUE.equals(user.getIsActive())
                    || !passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
                throw new BusinessConflictException("Electronic signature password verification failed");
            }
            if (!signer.equalsIgnoreCase(actor)) {
                throw new BusinessConflictException("Electronic signature signer must match the authenticated user");
            }
        }

        ESignatureRecord record = eSignatureRecordRepository.save(ESignatureRecord.builder()
                .id(UUID.randomUUID())
                .entityType(entityType)
                .entityId(entityId)
                .action(action)
                .meaning(StringUtils.hasText(request != null ? request.getMeaning() : null)
                        ? request.getMeaning().trim()
                        : defaultMeaning)
                .signerUsername(signer)
                .signerRole(user != null && user.getRole() != null ? user.getRole().name() : null)
                .signedAt(LocalDateTime.now())
                .verificationMethod(method)
                .verificationStatus(ESignatureVerificationStatus.VERIFIED)
                .reason(StringUtils.hasText(reason) ? reason.trim() : null)
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
