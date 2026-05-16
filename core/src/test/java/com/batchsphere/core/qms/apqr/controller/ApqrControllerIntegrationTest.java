package com.batchsphere.core.qms.apqr.controller;

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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.MOCK)
@ActiveProfiles("test")
class ApqrControllerIntegrationTest {

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
    void createsCompilesApprovesAndClosesApqr() throws Exception {
        String token = loginAsAdmin();
        int year = LocalDate.now().getYear();

        MvcResult createResult = mockMvc.perform(post("/api/apqr")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "productName": "Paracetamol Tablets APQR",
                                  "reviewYear": %d,
                                  "periodStart": "%d-01-01",
                                  "periodEnd": "%d-12-31"
                                }
                                """.formatted(year, year, year)))
                .andReturn();
        assertEquals(200, createResult.getResponse().getStatus(), createResult.getResponse().getContentAsString());
        JsonNode created = objectMapper.readTree(createResult.getResponse().getContentAsString());
        assertTrue(created.get("apqrNumber").asText().startsWith("APQR-" + year));
        assertEquals("DRAFT", created.get("status").asText());
        String apqrId = created.get("id").asText();

        MvcResult compileResult = mockMvc.perform(post("/api/apqr/{id}/compile", apqrId)
                        .header("Authorization", "Bearer " + token))
                .andReturn();
        assertEquals(200, compileResult.getResponse().getStatus(), compileResult.getResponse().getContentAsString());
        JsonNode compiled = objectMapper.readTree(compileResult.getResponse().getContentAsString());
        assertEquals("UNDER_REVIEW", compiled.get("status").asText());
        assertNotNull(compiled.get("preparedBy").asText());

        MvcResult conclusionResult = mockMvc.perform(put("/api/apqr/{id}/conclusions", apqrId)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "processInControl": true,
                                  "trendsIdentified": "No adverse annual quality trend identified.",
                                  "recommendations": "Continue routine monitoring in the next review cycle."
                                }
                                """))
                .andReturn();
        assertEquals(200, conclusionResult.getResponse().getStatus(), conclusionResult.getResponse().getContentAsString());

        MvcResult approveResult = mockMvc.perform(post("/api/apqr/{id}/approve", apqrId)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "username": "admin",
                                  "password": "Admin@123",
                                  "meaning": "I approve this Annual Product Quality Review",
                                  "reason": "QA review complete"
                                }
                                """))
                .andReturn();
        assertEquals(200, approveResult.getResponse().getStatus(), approveResult.getResponse().getContentAsString());
        JsonNode approved = objectMapper.readTree(approveResult.getResponse().getContentAsString());
        assertEquals("APPROVED", approved.get("status").asText());
        assertNotNull(approved.get("approvalESignatureId").asText());

        MvcResult closeResult = mockMvc.perform(post("/api/apqr/{id}/close", apqrId)
                        .header("Authorization", "Bearer " + token))
                .andReturn();
        assertEquals(200, closeResult.getResponse().getStatus(), closeResult.getResponse().getContentAsString());
        JsonNode closed = objectMapper.readTree(closeResult.getResponse().getContentAsString());
        assertEquals("CLOSED", closed.get("status").asText());
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
