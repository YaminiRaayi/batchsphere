package com.batchsphere.core.qms.changecontrol.controller;

import com.batchsphere.core.qms.changecontrol.entity.ChangeControlAffectedEntity;
import com.batchsphere.core.qms.changecontrol.repository.ChangeControlAffectedEntityRepository;
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
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.MOCK)
@ActiveProfiles("test")
class ChangeControlControllerIntegrationTest {

    @Autowired
    private WebApplicationContext webApplicationContext;

    @Autowired
    private ChangeControlAffectedEntityRepository affectedEntityRepository;

    private MockMvc mockMvc;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(webApplicationContext)
                .apply(springSecurity())
                .build();
    }

    @Test
    void closureGeneratesAuditEventsVisibleInTimeline() throws Exception {
        String token = loginAsAdmin();
        String changeControlId = createChangeControl(token);

        mockMvc.perform(post("/api/change-controls/{id}/submit-for-review", changeControlId)
                        .header("Authorization", "Bearer " + token))
                .andReturn();
        mockMvc.perform(post("/api/change-controls/{id}/approve", changeControlId)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "username": "admin",
                                  "password": "Admin@123",
                                  "meaning": "I approve this change control",
                                  "comments": "Approved for implementation."
                                }
                                """))
                .andReturn();
        mockMvc.perform(post("/api/change-controls/{id}/start-implementation", changeControlId)
                        .header("Authorization", "Bearer " + token))
                .andReturn();

        MvcResult taskResult = mockMvc.perform(post("/api/change-controls/{id}/tasks", changeControlId)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "title": "Update effective SOP and brief QC team",
                                  "assignedTo": "admin",
                                  "dueDate": "%s"
                                }
                                """.formatted(LocalDate.now().plusDays(7))))
                .andReturn();
        assertEquals(200, taskResult.getResponse().getStatus(), taskResult.getResponse().getContentAsString());
        String taskId = objectMapper.readTree(taskResult.getResponse().getContentAsString()).get("id").asText();

        mockMvc.perform(put("/api/change-controls/{id}/tasks/{taskId}/status", changeControlId, taskId)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"COMPLETED\"}"))
                .andReturn();
        mockMvc.perform(post("/api/change-controls/{id}/move-to-effectiveness-check", changeControlId)
                        .header("Authorization", "Bearer " + token))
                .andReturn();

        MvcResult closeResult = mockMvc.perform(post("/api/change-controls/{id}/close", changeControlId)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "username": "admin",
                                  "password": "Admin@123",
                                  "meaning": "I confirm the change control is complete and effective",
                                  "closureSummary": "Implementation tasks complete and effectiveness check acceptable."
                                }
                                """))
                .andReturn();
        assertEquals(200, closeResult.getResponse().getStatus(), closeResult.getResponse().getContentAsString());
        assertEquals("CLOSED", objectMapper.readTree(closeResult.getResponse().getContentAsString()).get("status").asText());

        MvcResult auditResult = mockMvc.perform(get("/api/audit-events")
                        .header("Authorization", "Bearer " + token)
                        .param("entityType", "QMS_CHANGE_CONTROL")
                        .param("entityId", changeControlId))
                .andReturn();
        assertEquals(200, auditResult.getResponse().getStatus(), auditResult.getResponse().getContentAsString());
        JsonNode auditEvents = objectMapper.readTree(auditResult.getResponse().getContentAsString());
        assertTrue(auditEvents.findValues("fieldName").stream().anyMatch(node -> "closureESignatureId".equals(node.asText())));
        assertTrue(auditEvents.findValues("newValue").stream().anyMatch(node -> "CLOSED".equals(node.asText())));
        assertTrue(auditEvents.findValues("fieldName").stream().anyMatch(node -> "taskStatus".equals(node.asText())));
        for (int i = 1; i < auditEvents.size(); i++) {
            assertFalse(auditEvents.get(i).get("eventAt").asText()
                    .compareTo(auditEvents.get(i - 1).get("eventAt").asText()) < 0);
        }
    }

    @Test
    void removingAffectedEntitySoftDeletesRowAndRecordsAudit() throws Exception {
        String token = loginAsAdmin();
        String changeControlId = createChangeControl(token);

        MvcResult addResult = mockMvc.perform(post("/api/change-controls/{id}/affected-entities", changeControlId)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "entityType": "MATERIAL",
                                  "entityReference": "MAT-SOFT-DELETE",
                                  "notes": "Temporary impacted material"
                                }
                                """))
                .andReturn();
        assertEquals(200, addResult.getResponse().getStatus(), addResult.getResponse().getContentAsString());
        String entityId = objectMapper.readTree(addResult.getResponse().getContentAsString()).get("id").asText();

        MvcResult deleteResult = mockMvc.perform(delete("/api/change-controls/{id}/affected-entities/{entityId}",
                        changeControlId, entityId)
                        .header("Authorization", "Bearer " + token))
                .andReturn();
        assertEquals(204, deleteResult.getResponse().getStatus(), deleteResult.getResponse().getContentAsString());

        ChangeControlAffectedEntity stored = affectedEntityRepository.findById(UUID.fromString(entityId)).orElseThrow();
        assertFalse(stored.getIsActive());
        assertEquals("admin", stored.getUpdatedBy());
        assertTrue(stored.getUpdatedAt() != null);

        MvcResult getResult = mockMvc.perform(get("/api/change-controls/{id}", changeControlId)
                        .header("Authorization", "Bearer " + token))
                .andReturn();
        assertEquals(200, getResult.getResponse().getStatus(), getResult.getResponse().getContentAsString());
        JsonNode activeEntities = objectMapper.readTree(getResult.getResponse().getContentAsString()).get("affectedEntities");
        assertEquals(0, activeEntities.size());

        MvcResult auditResult = mockMvc.perform(get("/api/audit-events")
                        .header("Authorization", "Bearer " + token)
                        .param("entityType", "QMS_CHANGE_CONTROL")
                        .param("entityId", changeControlId))
                .andReturn();
        assertEquals(200, auditResult.getResponse().getStatus(), auditResult.getResponse().getContentAsString());
        JsonNode auditEvents = objectMapper.readTree(auditResult.getResponse().getContentAsString());
        assertTrue(auditEvents.findValues("fieldName").stream().anyMatch(node -> "affectedEntity".equals(node.asText())));
        assertTrue(auditEvents.findValues("newValue").stream().anyMatch(node -> "REMOVED".equals(node.asText())));
    }

    private String createChangeControl(String token) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/change-controls")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "title": "Revise sampling SOP for inbound checks",
                                  "description": "Controlled change for inbound compliance procedure.",
                                  "changeType": "DOCUMENT",
                                  "reason": "Clarify sampling acceptance checks after audit observation.",
                                  "riskClassification": "MEDIUM",
                                  "impactAssessment": "Limited to QC sampling procedure.",
                                  "implementationPlan": "Update SOP, approve revision, and brief users.",
                                  "effectivenessCheck": "Verify next three GRNs follow updated procedure.",
                                  "targetCompletionDate": "%s"
                                }
                                """.formatted(LocalDate.now().plusDays(21))))
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
