package com.batchsphere.core.qms.batchrelease.controller;

import com.batchsphere.core.qms.batchrelease.entity.BatchReleaseStatus;
import com.batchsphere.core.qms.batchrelease.entity.QpBatchRelease;
import com.batchsphere.core.qms.batchrelease.repository.QpBatchReleaseRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.MOCK)
@ActiveProfiles("test")
class QpBatchReleaseControllerIntegrationTest {

    @Autowired
    private WebApplicationContext webApplicationContext;

    @Autowired
    private QpBatchReleaseRepository batchReleaseRepository;

    private MockMvc mockMvc;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(webApplicationContext)
                .apply(springSecurity())
                .build();
    }

    @Test
    void createsBlocksCertifyUntilChecklistPassesThenCertifiesAndReturnsCertificate() throws Exception {
        String token = loginAsAdmin();
        String lot = "QP-LOT-" + UUID.randomUUID().toString().substring(0, 8);

        MvcResult createResult = mockMvc.perform(post("/api/qp-batch-releases")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "lotNumber": "%s",
                                  "productName": "Annex 16 Tablet Batch",
                                  "batchSize": 1000.0000,
                                  "batchUom": "EA",
                                  "manufactureDate": "2026-05-01",
                                  "expiryDate": "2028-05-01"
                                }
                                """.formatted(lot)))
                .andReturn();
        assertEquals(200, createResult.getResponse().getStatus(), createResult.getResponse().getContentAsString());
        JsonNode created = objectMapper.readTree(createResult.getResponse().getContentAsString());
        assertTrue(created.get("releaseNumber").asText().startsWith("QBR-"));
        assertEquals("PENDING_QP_REVIEW", created.get("status").asText());
        assertEquals(false, created.get("qcDispositionConfirmed").asBoolean());
        String releaseId = created.get("id").asText();

        MvcResult blockedCertify = mockMvc.perform(post("/api/qp-batch-releases/{id}/certify", releaseId)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(signaturePayload()))
                .andReturn();
        assertEquals(409, blockedCertify.getResponse().getStatus(), blockedCertify.getResponse().getContentAsString());

        QpBatchRelease release = batchReleaseRepository.findById(UUID.fromString(releaseId)).orElseThrow();
        release.setQcDispositionConfirmed(true);
        release.setOosInvestigationsClosed(true);
        release.setNoOpenCriticalDeviations(true);
        release.setDocumentsComplete(true);
        batchReleaseRepository.save(release);

        MvcResult certifyResult = mockMvc.perform(post("/api/qp-batch-releases/{id}/certify", releaseId)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(signaturePayload()))
                .andReturn();
        assertEquals(200, certifyResult.getResponse().getStatus(), certifyResult.getResponse().getContentAsString());
        JsonNode certified = objectMapper.readTree(certifyResult.getResponse().getContentAsString());
        assertEquals(BatchReleaseStatus.CERTIFIED.name(), certified.get("status").asText());
        assertNotNull(certified.get("certificationESignatureId").asText());

        MvcResult certificateResult = mockMvc.perform(get("/api/qp-batch-releases/{id}/certificate", releaseId)
                        .header("Authorization", "Bearer " + token))
                .andReturn();
        assertEquals(200, certificateResult.getResponse().getStatus(), certificateResult.getResponse().getContentAsString());
        JsonNode certificate = objectMapper.readTree(certificateResult.getResponse().getContentAsString());
        assertEquals(lot, certificate.get("lotNumber").asText());
        assertEquals("Annex 16 Tablet Batch", certificate.get("productName").asText());
        assertNotNull(certificate.get("eSignatureId").asText());
    }

    @Test
    void rejectsBatchReleaseWithReason() throws Exception {
        String token = loginAsAdmin();
        MvcResult createResult = mockMvc.perform(post("/api/qp-batch-releases")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "lotNumber": "QP-REJECT-%s",
                                  "productName": "Rejected Tablet Batch"
                                }
                                """.formatted(UUID.randomUUID().toString().substring(0, 8))))
                .andReturn();
        assertEquals(200, createResult.getResponse().getStatus(), createResult.getResponse().getContentAsString());
        String releaseId = objectMapper.readTree(createResult.getResponse().getContentAsString()).get("id").asText();

        MvcResult rejectResult = mockMvc.perform(post("/api/qp-batch-releases/{id}/reject", releaseId)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "reason": "Critical release documentation gap"
                                }
                                """))
                .andReturn();
        assertEquals(200, rejectResult.getResponse().getStatus(), rejectResult.getResponse().getContentAsString());
        JsonNode rejected = objectMapper.readTree(rejectResult.getResponse().getContentAsString());
        assertEquals("REJECTED", rejected.get("status").asText());
        assertEquals("Critical release documentation gap", rejected.get("rejectionReason").asText());
    }

    private String signaturePayload() {
        return """
                {
                  "qpName": "admin",
                  "username": "admin",
                  "password": "Admin@123",
                  "meaning": "I certify this batch for release according to EU GMP Annex 16",
                  "reason": "Annex 16 review complete"
                }
                """;
    }

    private String loginAsAdmin() throws Exception {
        MvcResult loginResult = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "username": "admin",
                                  "password": "Admin@123"
                                }
                                """))
                .andReturn();
        assertEquals(200, loginResult.getResponse().getStatus(), loginResult.getResponse().getContentAsString());
        return objectMapper.readTree(loginResult.getResponse().getContentAsString()).get("accessToken").asText();
    }
}
