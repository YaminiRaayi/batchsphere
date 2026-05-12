package com.batchsphere.core.qms.deviation.controller;

import com.batchsphere.core.compliance.esign.repository.ESignatureRecordRepository;
import com.batchsphere.core.qms.deviation.repository.DeviationRepository;
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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.MOCK)
@ActiveProfiles("test")
class DeviationControllerIntegrationTest {

    @Autowired
    private WebApplicationContext webApplicationContext;

    @Autowired
    private DeviationRepository deviationRepository;

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
    void createsDeviationAndReturnsItInRegisterAndSummary() throws Exception {
        String token = loginAsAdmin();

        MvcResult createResult = createDeviation(token, "Temperature excursion in Cold Room B");
        assertEquals(200, createResult.getResponse().getStatus(), createResult.getResponse().getContentAsString());
        JsonNode created = objectMapper.readTree(createResult.getResponse().getContentAsString());
        assertTrue(created.get("deviationNumber").asText().startsWith("DEV-"));
        assertEquals("OPEN", created.get("status").asText());
        assertEquals("CRITICAL", created.get("severity").asText());
        assertEquals("WAREHOUSE", created.get("department").asText());

        MvcResult listResult = mockMvc.perform(get("/api/deviations")
                        .header("Authorization", "Bearer " + token))
                .andReturn();
        assertEquals(200, listResult.getResponse().getStatus(), listResult.getResponse().getContentAsString());
        assertTrue(listResult.getResponse().getContentAsString().contains(created.get("deviationNumber").asText()));

        MvcResult summaryResult = mockMvc.perform(get("/api/deviations/summary")
                        .header("Authorization", "Bearer " + token))
                .andReturn();
        assertEquals(200, summaryResult.getResponse().getStatus(), summaryResult.getResponse().getContentAsString());
        JsonNode summary = objectMapper.readTree(summaryResult.getResponse().getContentAsString());
        assertTrue(summary.get("countsByStatus").get("OPEN").asInt() >= 1);
        assertTrue(summary.get("countsBySeverity").get("CRITICAL").asInt() >= 1);
    }

    @Test
    void closureRequiresInvestigationAndCreatesESignature() throws Exception {
        String token = loginAsAdmin();
        MvcResult createResult = createDeviation(token, "Moisture result above specification");
        JsonNode created = objectMapper.readTree(createResult.getResponse().getContentAsString());
        String id = created.get("id").asText();

        MvcResult blockedClose = mockMvc.perform(put("/api/deviations/{id}/status", id)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "status": "CLOSED",
                                  "closureSummary": "No product impact after investigation",
                                  "username": "admin",
                                  "password": "Admin@123",
                                  "meaning": "I approve deviation closure"
                                }
                                """))
                .andReturn();
        assertEquals(409, blockedClose.getResponse().getStatus(), blockedClose.getResponse().getContentAsString());

        MvcResult updateResult = mockMvc.perform(put("/api/deviations/{id}", id)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "title": "Moisture result above specification",
                                  "description": "QC worksheet recorded moisture above the approved specification limit.",
                                  "deviationType": "MATERIAL",
                                  "severity": "MAJOR",
                                  "department": "QC",
                                  "immediateAction": "Quarantined affected containers pending investigation.",
                                  "investigationSummary": "Analyst retested retained sample and reviewed balance calibration records.",
                                  "rootCause": "Sampling exposure time exceeded validated hold time.",
                                  "impactAssessment": "No released stock impacted; affected lot remains blocked."
                                }
                                """))
                .andReturn();
        assertEquals(200, updateResult.getResponse().getStatus(), updateResult.getResponse().getContentAsString());

        long signatureCountBefore = eSignatureRecordRepository.count();
        MvcResult closeResult = mockMvc.perform(put("/api/deviations/{id}/status", id)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "status": "CLOSED",
                                  "reason": "Investigation complete and no additional CAPA required",
                                  "closureSummary": "Deviation closed after documented retest and impact assessment.",
                                  "username": "admin",
                                  "password": "Admin@123",
                                  "meaning": "I approve deviation closure"
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

    private MvcResult createDeviation(String token, String title) throws Exception {
        return mockMvc.perform(post("/api/deviations")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "title": "%s",
                                  "description": "A GxP-relevant deviation was detected during routine operations.",
                                  "deviationType": "PROCESS",
                                  "severity": "CRITICAL",
                                  "sourceModule": "MANUAL",
                                  "sourceReference": "MANUAL-OBS-001",
                                  "department": "WAREHOUSE",
                                  "immediateAction": "Material movement stopped and area owner notified."
                                }
                                """.formatted(title)))
                .andReturn();
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
