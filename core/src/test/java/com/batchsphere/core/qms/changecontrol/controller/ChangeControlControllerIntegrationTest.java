package com.batchsphere.core.qms.changecontrol.controller;

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
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.MOCK)
@ActiveProfiles("test")
class ChangeControlControllerIntegrationTest {

    @Autowired
    private WebApplicationContext webApplicationContext;

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
