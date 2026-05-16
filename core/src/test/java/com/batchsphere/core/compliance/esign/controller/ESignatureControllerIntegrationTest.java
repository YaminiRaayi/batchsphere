package com.batchsphere.core.compliance.esign.controller;

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

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.MOCK)
@ActiveProfiles("test")
class ESignatureControllerIntegrationTest {

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
    void postCreatesPasswordVerifiedSignatureAndGetReturnsTimeline() throws Exception {
        String token = loginAsAdmin();
        UUID entityId = UUID.randomUUID();

        MvcResult postResult = mockMvc.perform(post("/api/e-signatures")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "entityType": "QMS_DEVIATION",
                                  "entityId": "%s",
                                  "action": "CLOSE_DEVIATION",
                                  "username": "admin",
                                  "password": "Admin@123",
                                  "meaning": "I approve this deviation closure",
                                  "reason": "Investigation completed and impact assessed"
                                }
                                """.formatted(entityId)))
                .andReturn();

        assertEquals(200, postResult.getResponse().getStatus(), postResult.getResponse().getContentAsString());
        JsonNode postRoot = objectMapper.readTree(postResult.getResponse().getContentAsString());
        assertEquals("QMS_DEVIATION", postRoot.get("entityType").asText());
        assertEquals(entityId.toString(), postRoot.get("entityId").asText());
        assertEquals("CLOSE_DEVIATION", postRoot.get("action").asText());
        assertEquals("admin", postRoot.get("signerUsername").asText());
        assertEquals("PASSWORD", postRoot.get("verificationMethod").asText());
        assertEquals("VERIFIED", postRoot.get("verificationStatus").asText());

        MvcResult getResult = mockMvc.perform(get("/api/e-signatures")
                        .header("Authorization", "Bearer " + token)
                        .param("entityType", "QMS_DEVIATION")
                        .param("entityId", entityId.toString()))
                .andReturn();

        assertEquals(200, getResult.getResponse().getStatus(), getResult.getResponse().getContentAsString());
        JsonNode getRoot = objectMapper.readTree(getResult.getResponse().getContentAsString());
        assertFalse(getRoot.isEmpty());
        assertEquals(postRoot.get("id").asText(), getRoot.get(0).get("id").asText());
    }

    @Test
    void postRejectsWrongPasswordAndDoesNotCreateSignature() throws Exception {
        String token = loginAsAdmin();
        UUID entityId = UUID.randomUUID();
        long before = eSignatureRecordRepository.count();

        MvcResult result = mockMvc.perform(post("/api/e-signatures")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "entityType": "QMS_DEVIATION",
                                  "entityId": "%s",
                                  "action": "CLOSE_DEVIATION",
                                  "username": "admin",
                                  "password": "Wrong@123",
                                  "meaning": "I approve this deviation closure"
                                }
                                """.formatted(entityId)))
                .andReturn();

        assertEquals(409, result.getResponse().getStatus(), result.getResponse().getContentAsString());
        assertEquals(before, eSignatureRecordRepository.count());
    }

    @Test
    void delegatedSignatureRequiresActiveDelegation() throws Exception {
        String adminToken = loginAs("admin", "Admin@123");
        String managerToken = loginAs("qc.manager", "Admin@123");
        UUID entityId = UUID.randomUUID();

        MvcResult blocked = mockMvc.perform(post("/api/e-signatures")
                        .header("Authorization", "Bearer " + managerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "entityType": "QMS_CAPA",
                                  "entityId": "%s",
                                  "action": "APPROVE_CAPA",
                                  "username": "qc.manager",
                                  "password": "Admin@123",
                                  "delegatedByUsername": "admin",
                                  "meaning": "I approve under delegated authority"
                                }
                                """.formatted(entityId)))
                .andReturn();
        assertEquals(409, blocked.getResponse().getStatus(), blocked.getResponse().getContentAsString());

        MvcResult delegation = mockMvc.perform(post("/api/approval-delegations")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "delegatorUsername": "admin",
                                  "delegateUsername": "qc.manager",
                                  "scopeEntityType": "QMS_CAPA",
                                  "scopeAction": "APPROVE_CAPA",
                                  "validFrom": "2026-05-01T00:00:00",
                                  "validUntil": "2099-12-31T00:00:00",
                                  "reason": "QA manager vacation coverage"
                                }
                                """))
                .andReturn();
        assertEquals(200, delegation.getResponse().getStatus(), delegation.getResponse().getContentAsString());

        MvcResult signed = mockMvc.perform(post("/api/e-signatures")
                        .header("Authorization", "Bearer " + managerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "entityType": "QMS_CAPA",
                                  "entityId": "%s",
                                  "action": "APPROVE_CAPA",
                                  "username": "qc.manager",
                                  "password": "Admin@123",
                                  "delegatedByUsername": "admin",
                                  "meaning": "I approve under delegated authority",
                                  "reason": "Delegated review"
                                }
                                """.formatted(entityId)))
                .andReturn();
        assertEquals(200, signed.getResponse().getStatus(), signed.getResponse().getContentAsString());
        JsonNode root = objectMapper.readTree(signed.getResponse().getContentAsString());
        assertEquals("admin", root.get("signerUsername").asText());
        assertEquals("SUPER_ADMIN", root.get("signerRole").asText());
        assertEquals("PASSWORD", root.get("verificationMethod").asText());
    }

    private String loginAsAdmin() throws Exception {
        return loginAs("admin", "Admin@123");
    }

    private String loginAs(String username, String password) throws Exception {
        MvcResult loginResult = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "username": "%s",
                                  "password": "%s"
                                }
                                """.formatted(username, password)))
                .andReturn();
        assertEquals(200, loginResult.getResponse().getStatus(), loginResult.getResponse().getContentAsString());
        return objectMapper.readTree(loginResult.getResponse().getContentAsString()).get("accessToken").asText();
    }
}
