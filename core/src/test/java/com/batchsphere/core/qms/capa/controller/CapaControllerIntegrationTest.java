package com.batchsphere.core.qms.capa.controller;

import com.batchsphere.core.compliance.esign.repository.ESignatureRecordRepository;
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

import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.MOCK)
@ActiveProfiles("test")
class CapaControllerIntegrationTest {

    @Autowired
    private WebApplicationContext webApplicationContext;

    @Autowired
    private ESignatureRecordRepository eSignatureRecordRepository;

    private MockMvc mockMvc;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(webApplicationContext)
                .apply(springSecurity())
                .build();
    }

    @Test
    void createsCapaLinkedToDeviationAndMovesDeviationToCapaInProgress() throws Exception {
        String token = loginAsAdmin();
        String deviationId = createDeviation(token);

        MvcResult createResult = createCapa(token, deviationId, "Supplier corrective action for label mismatch");
        assertEquals(200, createResult.getResponse().getStatus(), createResult.getResponse().getContentAsString());
        JsonNode capa = objectMapper.readTree(createResult.getResponse().getContentAsString());
        assertTrue(capa.get("capaNumber").asText().startsWith("CAPA-"));
        assertEquals(deviationId, capa.get("deviationId").asText());
        assertEquals("OPEN", capa.get("status").asText());

        MvcResult deviationResult = mockMvc.perform(get("/api/deviations/{id}", deviationId)
                        .header("Authorization", "Bearer " + token))
                .andReturn();
        assertEquals(200, deviationResult.getResponse().getStatus(), deviationResult.getResponse().getContentAsString());
        JsonNode deviation = objectMapper.readTree(deviationResult.getResponse().getContentAsString());
        assertEquals("CAPA_IN_PROGRESS", deviation.get("status").asText());

        MvcResult listResult = mockMvc.perform(get("/api/capas")
                        .header("Authorization", "Bearer " + token)
                        .param("deviationId", deviationId))
                .andReturn();
        assertEquals(200, listResult.getResponse().getStatus(), listResult.getResponse().getContentAsString());
        assertTrue(listResult.getResponse().getContentAsString().contains(capa.get("capaNumber").asText()));
    }

    @Test
    void closesCapaOnlyAfterEffectivenessCheckWithESignature() throws Exception {
        String token = loginAsAdmin();
        String deviationId = createDeviation(token);
        JsonNode capa = objectMapper.readTree(createCapa(token, deviationId, "Warehouse retraining CAPA").getResponse().getContentAsString());
        String capaId = capa.get("id").asText();

        MvcResult blockedClose = mockMvc.perform(put("/api/capas/{id}/status", capaId)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "status": "CLOSED",
                                  "completionSummary": "Actions completed and verified.",
                                  "username": "admin",
                                  "password": "Admin@123"
                                }
                                """))
                .andReturn();
        assertEquals(409, blockedClose.getResponse().getStatus(), blockedClose.getResponse().getContentAsString());

        mockMvc.perform(put("/api/capas/{id}/status", capaId)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"IN_PROGRESS\",\"reason\":\"Owner started action execution\"}"))
                .andReturn();
        mockMvc.perform(post("/api/capas/{id}/submit-for-approval", capaId)
                        .header("Authorization", "Bearer " + token))
                .andReturn();
        mockMvc.perform(post("/api/capas/{id}/approve", capaId)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "username": "admin",
                                  "password": "Admin@123",
                                  "meaning": "I approve this CAPA action plan",
                                  "comments": "Action plan approved for execution."
                                }
                                """))
                .andReturn();
        MvcResult auditResult = mockMvc.perform(get("/api/audit-events")
                        .header("Authorization", "Bearer " + token)
                        .param("entityType", "QMS_CAPA")
                        .param("entityId", capaId))
                .andReturn();
        assertEquals(200, auditResult.getResponse().getStatus(), auditResult.getResponse().getContentAsString());
        JsonNode auditEvents = objectMapper.readTree(auditResult.getResponse().getContentAsString());
        assertTrue(auditEvents.isArray());
        assertTrue(auditEvents.findValues("fieldName").stream().anyMatch(node -> "approvalStatus".equals(node.asText())));
        assertTrue(auditEvents.findValues("eventType").stream().anyMatch(node -> "E_SIGNATURE".equals(node.asText())));

        mockMvc.perform(put("/api/capas/{id}/status", capaId)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"COMPLETED\",\"completionSummary\":\"Corrective and preventive actions executed.\"}"))
                .andReturn();
        mockMvc.perform(put("/api/capas/{id}/status", capaId)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"EFFECTIVENESS_CHECK\",\"completionSummary\":\"Effectiveness monitoring started.\"}"))
                .andReturn();
        mockMvc.perform(post("/api/capas/{id}/schedule-effectiveness-review", capaId)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "effectivenessReviewDate": "%s",
                                  "effectivenessReviewer": "admin"
                                }
                                """.formatted(LocalDate.now().plusDays(30))))
                .andReturn();
        mockMvc.perform(post("/api/capas/{id}/review-effectiveness", capaId)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "outcome": "PASSED",
                                  "comments": "No repeat deviation observed during monitoring window.",
                                  "username": "admin",
                                  "password": "Admin@123",
                                  "meaning": "I confirm CAPA effectiveness verified"
                                }
                                """))
                .andReturn();

        long signatureCountBefore = eSignatureRecordRepository.count();
        MvcResult closeResult = mockMvc.perform(put("/api/capas/{id}/status", capaId)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "status": "CLOSED",
                                  "reason": "Effectiveness check passed",
                                  "completionSummary": "No repeat deviation after effectiveness monitoring.",
                                  "username": "admin",
                                  "password": "Admin@123",
                                  "meaning": "I approve CAPA closure"
                                }
                                """))
                .andReturn();
        assertEquals(200, closeResult.getResponse().getStatus(), closeResult.getResponse().getContentAsString());
        JsonNode closed = objectMapper.readTree(closeResult.getResponse().getContentAsString());
        assertEquals("CLOSED", closed.get("status").asText());
        assertEquals("admin", closed.get("closedBy").asText());
        assertNotNull(closed.get("closureESignatureId").asText());
        assertEquals(signatureCountBefore + 1, eSignatureRecordRepository.count());
    }

    private MvcResult createCapa(String token, String deviationId, String title) throws Exception {
        return mockMvc.perform(post("/api/capas")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "deviationId": "%s",
                                  "title": "%s",
                                  "description": "CAPA raised from the deviation investigation.",
                                  "severity": "MAJOR",
                                  "owner": "qc.manager",
                                  "dueDate": "%s",
                                  "correctiveAction": "Correct the immediate process failure and document evidence.",
                                  "preventiveAction": "Update SOP and retrain affected users.",
                                  "effectivenessCheck": "Verify no repeat event for 30 days after completion."
                                }
                                """.formatted(deviationId, title, LocalDate.now().plusDays(14))))
                .andReturn();
    }

    private String createDeviation(String token) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/deviations")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "title": "Label mismatch during GRN inspection",
                                  "description": "Vendor batch on CoA did not match one received container label.",
                                  "deviationType": "DOCUMENTATION",
                                  "severity": "MAJOR",
                                  "sourceModule": "GRN",
                                  "sourceReference": "GRN-QMS-CAPA",
                                  "department": "QC",
                                  "immediateAction": "Affected container quarantined pending investigation."
                                }
                                """))
                .andReturn();
        assertEquals(200, result.getResponse().getStatus(), result.getResponse().getContentAsString());
        return objectMapper.readTree(result.getResponse().getContentAsString()).get("id").asText();
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
