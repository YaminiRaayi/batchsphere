package com.batchsphere.core.compliance.esign.service;

import com.batchsphere.core.compliance.esign.dto.CreateESignatureRequest;
import com.batchsphere.core.compliance.esign.dto.ESignatureRequest;
import com.batchsphere.core.compliance.esign.dto.ESignatureRecordResponse;

import java.util.List;
import java.util.UUID;

public interface ESignatureService {
    ESignatureRecordResponse sign(CreateESignatureRequest request);

    ESignatureRecordResponse sign(String entityType,
                                  UUID entityId,
                                  String action,
                                  String defaultMeaning,
                                  String actor,
                                  ESignatureRequest request,
                                  String reason);

    List<ESignatureRecordResponse> getSignatures(String entityType, UUID entityId);
}
