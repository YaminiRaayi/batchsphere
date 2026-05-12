package com.batchsphere.core.compliance.esign.controller;

import com.batchsphere.core.compliance.esign.dto.CreateESignatureRequest;
import com.batchsphere.core.compliance.esign.dto.ESignatureRecordResponse;
import com.batchsphere.core.compliance.esign.service.ESignatureService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/e-signatures")
@RequiredArgsConstructor
public class ESignatureController {

    private final ESignatureService eSignatureService;

    @PostMapping
    public ResponseEntity<ESignatureRecordResponse> createSignature(@Valid @RequestBody CreateESignatureRequest request) {
        return ResponseEntity.ok(eSignatureService.sign(request));
    }

    @GetMapping
    public ResponseEntity<List<ESignatureRecordResponse>> getSignatures(@RequestParam String entityType,
                                                                        @RequestParam UUID entityId) {
        return ResponseEntity.ok(eSignatureService.getSignatures(entityType, entityId));
    }
}
