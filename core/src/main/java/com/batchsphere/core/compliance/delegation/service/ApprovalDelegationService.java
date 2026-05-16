package com.batchsphere.core.compliance.delegation.service;

import com.batchsphere.core.compliance.delegation.dto.ApprovalDelegationDTO.ApprovalDelegationResponse;
import com.batchsphere.core.compliance.delegation.dto.ApprovalDelegationDTO.CreateApprovalDelegationRequest;

import java.util.List;
import java.util.UUID;

public interface ApprovalDelegationService {
    ApprovalDelegationResponse create(CreateApprovalDelegationRequest request);
    List<ApprovalDelegationResponse> listActive();
    ApprovalDelegationResponse revoke(UUID id);
    void assertActiveDelegation(String delegatorUsername, String delegateUsername, String entityType, String action);
}
