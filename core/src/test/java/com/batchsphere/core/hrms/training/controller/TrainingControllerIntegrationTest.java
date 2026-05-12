package com.batchsphere.core.hrms.training.controller;

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
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.MOCK)
@ActiveProfiles("test")
class TrainingControllerIntegrationTest {

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
    void assignsAndCompletesTrainingForEmployee() throws Exception {
        String token = loginAsAdmin();
        String suffix = String.valueOf(System.currentTimeMillis());

        MvcResult employeeResult = mockMvc.perform(post("/api/employees")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "employeeCode": "EMP-TRN-%s",
                                  "fullName": "Training Analyst %s",
                                  "email": "training.%s@batchsphere.local",
                                  "department": "Quality Control",
                                  "site": "Hyderabad Plant",
                                  "jobTitle": "QC Analyst",
                                  "employmentStatus": "ACTIVE",
                                  "qualificationStatus": "PENDING",
                                  "createdBy": "admin"
                                }
                                """.formatted(suffix, suffix, suffix)))
                .andReturn();
        assertEquals(200, employeeResult.getResponse().getStatus(), employeeResult.getResponse().getContentAsString());
        String employeeId = objectMapper.readTree(employeeResult.getResponse().getContentAsString()).get("id").asText();

        MvcResult assignmentResult = mockMvc.perform(post("/api/training/assignments")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "employeeId": "%s",
                                  "assignedUsername": "admin",
                                  "trainingTitle": "GMP Awareness and Data Integrity",
                                  "trainingType": "GMP",
                                  "requiredRole": "QC_ANALYST",
                                  "dueDate": "2026-06-30"
                                }
                                """.formatted(employeeId)))
                .andReturn();
        assertEquals(200, assignmentResult.getResponse().getStatus(), assignmentResult.getResponse().getContentAsString());
        JsonNode assignment = objectMapper.readTree(assignmentResult.getResponse().getContentAsString());
        assertEquals("ASSIGNED", assignment.get("status").asText());
        assertEquals("Training Analyst " + suffix, assignment.get("employeeName").asText());
        String assignmentId = assignment.get("id").asText();

        MvcResult myAssignments = mockMvc.perform(get("/api/training/my-assignments")
                        .header("Authorization", "Bearer " + token))
                .andReturn();
        assertEquals(200, myAssignments.getResponse().getStatus(), myAssignments.getResponse().getContentAsString());
        assertTrue(myAssignments.getResponse().getContentAsString().contains("GMP Awareness and Data Integrity"));

        MvcResult completeResult = mockMvc.perform(put("/api/training/assignments/{id}/complete", assignmentId)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "comments": "Completed classroom and SOP read-through training."
                                }
                                """))
                .andReturn();
        assertEquals(200, completeResult.getResponse().getStatus(), completeResult.getResponse().getContentAsString());
        JsonNode completed = objectMapper.readTree(completeResult.getResponse().getContentAsString());
        assertEquals("COMPLETED", completed.get("status").asText());
        assertTrue(completed.hasNonNull("completedAt"));

        MvcResult requirementResult = mockMvc.perform(post("/api/training/requirements")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "roleName": "QC_ANALYST",
                                  "trainingTitle": "Sampling Technique SOP",
                                  "trainingType": "SOP",
                                  "recurrenceMonths": 12,
                                  "isMandatory": true
                                }
                                """))
                .andReturn();
        assertEquals(200, requirementResult.getResponse().getStatus(), requirementResult.getResponse().getContentAsString());

        MvcResult requirements = mockMvc.perform(get("/api/training/requirements")
                        .header("Authorization", "Bearer " + token))
                .andReturn();
        assertEquals(200, requirements.getResponse().getStatus(), requirements.getResponse().getContentAsString());
        assertTrue(requirements.getResponse().getContentAsString().contains("Sampling Technique SOP"));
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
