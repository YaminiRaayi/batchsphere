package com.batchsphere.core.qms.riskassessment.controller;

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
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.MOCK)
@ActiveProfiles("test")
class RiskAssessmentControllerIntegrationTest {

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
    void createsRiskAssessmentWithAutoNumber() throws Exception {
        String token = loginAsAdmin();

        MvcResult result = mockMvc.perform(post("/api/risk-assessments")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "title": "API Stability Risk Assessment",
                                  "scope": "PROCESS",
                                  "methodology": "FMEA"
                                }
                                """))
                .andReturn();

        assertEquals(200, result.getResponse().getStatus(), result.getResponse().getContentAsString());
        JsonNode ra = objectMapper.readTree(result.getResponse().getContentAsString());
        assertTrue(ra.get("assessmentNumber").asText().startsWith("RA-"), "assessmentNumber should start with RA-");
        assertEquals("DRAFT", ra.get("status").asText());
        assertEquals("admin", ra.get("preparedBy").asText());
    }

    @Test
    void addedItemRpnComputedCorrectly() throws Exception {
        String token = loginAsAdmin();

        MvcResult createRa = mockMvc.perform(post("/api/risk-assessments")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "title": "RPN Computation Test Assessment",
                                  "scope": "PRODUCT"
                                }
                                """))
                .andReturn();
        assertEquals(200, createRa.getResponse().getStatus(), createRa.getResponse().getContentAsString());
        String assessmentId = objectMapper.readTree(createRa.getResponse().getContentAsString()).get("id").asText();

        MvcResult addItem = mockMvc.perform(post("/api/risk-assessments/{id}/items", assessmentId)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "failureMode": "Incorrect label applied",
                                  "failureEffect": "Patient receives wrong dose",
                                  "failureCause": "Manual labelling error",
                                  "probability": 3,
                                  "severity": 4,
                                  "detectability": 2
                                }
                                """))
                .andReturn();
        assertEquals(200, addItem.getResponse().getStatus(), addItem.getResponse().getContentAsString());

        MvcResult getResult = mockMvc.perform(get("/api/risk-assessments/{id}", assessmentId)
                        .header("Authorization", "Bearer " + token))
                .andReturn();
        assertEquals(200, getResult.getResponse().getStatus(), getResult.getResponse().getContentAsString());

        JsonNode ra = objectMapper.readTree(getResult.getResponse().getContentAsString());
        JsonNode items = ra.get("items");
        assertEquals(1, items.size());
        assertEquals(24, items.get(0).get("rpn").asInt(), "RPN should be 3 * 4 * 2 = 24");
    }

    @Test
    void acceptanceRequiresUnderReviewStatus() throws Exception {
        String token = loginAsAdmin();

        MvcResult createRa = mockMvc.perform(post("/api/risk-assessments")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "title": "Draft Assessment Cannot Be Accepted",
                                  "scope": "EQUIPMENT"
                                }
                                """))
                .andReturn();
        assertEquals(200, createRa.getResponse().getStatus(), createRa.getResponse().getContentAsString());
        String assessmentId = objectMapper.readTree(createRa.getResponse().getContentAsString()).get("id").asText();

        MvcResult acceptResult = mockMvc.perform(post("/api/risk-assessments/{id}/accept", assessmentId)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "username": "admin",
                                  "password": "Admin@123",
                                  "meaning": "I accept this risk assessment",
                                  "residualRiskAcceptable": true
                                }
                                """))
                .andReturn();

        assertEquals(409, acceptResult.getResponse().getStatus(), "Accepting a DRAFT assessment should return 409");
    }

    @Test
    void softDeletedItemExcludedFromList() throws Exception {
        String token = loginAsAdmin();

        MvcResult createRa = mockMvc.perform(post("/api/risk-assessments")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "title": "Soft Delete Item Test",
                                  "scope": "SUPPLIER"
                                }
                                """))
                .andReturn();
        assertEquals(200, createRa.getResponse().getStatus(), createRa.getResponse().getContentAsString());
        String assessmentId = objectMapper.readTree(createRa.getResponse().getContentAsString()).get("id").asText();

        MvcResult addItem = mockMvc.perform(post("/api/risk-assessments/{id}/items", assessmentId)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "failureMode": "Supplier delivers out-of-spec material",
                                  "failureEffect": "Product fails QC testing",
                                  "failureCause": "No incoming QC on supplier side",
                                  "probability": 2,
                                  "severity": 5,
                                  "detectability": 1
                                }
                                """))
                .andReturn();
        assertEquals(200, addItem.getResponse().getStatus(), addItem.getResponse().getContentAsString());
        String itemId = objectMapper.readTree(addItem.getResponse().getContentAsString()).get("id").asText();

        MvcResult deleteResult = mockMvc.perform(delete("/api/risk-assessments/{id}/items/{itemId}", assessmentId, itemId)
                        .header("Authorization", "Bearer " + token))
                .andReturn();
        assertEquals(204, deleteResult.getResponse().getStatus(), deleteResult.getResponse().getContentAsString());

        MvcResult getResult = mockMvc.perform(get("/api/risk-assessments/{id}", assessmentId)
                        .header("Authorization", "Bearer " + token))
                .andReturn();
        assertEquals(200, getResult.getResponse().getStatus(), getResult.getResponse().getContentAsString());

        JsonNode ra = objectMapper.readTree(getResult.getResponse().getContentAsString());
        JsonNode items = ra.get("items");
        boolean itemFound = false;
        for (JsonNode item : items) {
            if (itemId.equals(item.get("id").asText())) {
                itemFound = true;
                break;
            }
        }
        assertFalse(itemFound, "Soft-deleted item should not appear in items list");
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
