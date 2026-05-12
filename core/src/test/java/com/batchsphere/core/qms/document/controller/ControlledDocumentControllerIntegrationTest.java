package com.batchsphere.core.qms.document.controller;

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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.MOCK)
@ActiveProfiles("test")
class ControlledDocumentControllerIntegrationTest {

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
    void createsSubmitsAndApprovesControlledDocumentRevisionWithESignatures() throws Exception {
        String token = loginAsAdmin();
        String documentNumber = "SOP-QA-E2E-" + System.currentTimeMillis();

        MvcResult createResult = mockMvc.perform(post("/api/documents")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "documentNumber": "%s",
                                  "title": "Raw material sampling and retention procedure",
                                  "documentType": "SOP",
                                  "category": "Quality Operations",
                                  "department": "Quality Assurance",
                                  "linkedMaterialCode": "MAT-PARA-API",
                                  "linkedMoaCode": "MOA-PARA-HPLC",
                                  "reviewCycleMonths": 24,
                                  "changeSummary": "Initial controlled SOP created for warehouse and QC sampling governance."
                                }
                                """.formatted(documentNumber)))
                .andReturn();
        assertEquals(200, createResult.getResponse().getStatus(), createResult.getResponse().getContentAsString());
        JsonNode created = objectMapper.readTree(createResult.getResponse().getContentAsString());
        assertEquals("DRAFT", created.get("status").asText());
        assertEquals("v1.0", created.get("currentRevision").get("revision").asText());
        assertEquals(2, created.get("currentRevision").get("approvals").size());

        String documentId = created.get("id").asText();
        String revisionId = created.get("currentRevision").get("id").asText();
        MvcResult submitResult = mockMvc.perform(post("/api/documents/{id}/revisions/{revisionId}/submit", documentId, revisionId)
                        .header("Authorization", "Bearer " + token))
                .andReturn();
        assertEquals(200, submitResult.getResponse().getStatus(), submitResult.getResponse().getContentAsString());
        JsonNode submitted = objectMapper.readTree(submitResult.getResponse().getContentAsString());
        assertEquals("IN_REVIEW", submitted.get("status").asText());
        assertEquals("IN_REVIEW", submitted.get("currentRevision").get("revisionStatus").asText());

        long signatureCountBefore = eSignatureRecordRepository.count();
        approve(token, documentId, revisionId, "Technical review approved");
        MvcResult finalApproval = approve(token, documentId, revisionId, "QA approval approved for effective use");
        JsonNode approved = objectMapper.readTree(finalApproval.getResponse().getContentAsString());
        assertEquals("EFFECTIVE", approved.get("status").asText());
        assertEquals("APPROVED", approved.get("currentRevision").get("revisionStatus").asText());
        assertNotNull(approved.get("currentRevisionId").asText());
        assertTrue(approved.hasNonNull("effectiveDate"));
        assertTrue(approved.hasNonNull("nextReviewDate"));
        assertEquals(signatureCountBefore + 2, eSignatureRecordRepository.count());

        MvcResult listResult = mockMvc.perform(get("/api/documents")
                        .header("Authorization", "Bearer " + token)
                        .param("search", documentNumber))
                .andReturn();
        assertEquals(200, listResult.getResponse().getStatus(), listResult.getResponse().getContentAsString());
        assertTrue(listResult.getResponse().getContentAsString().contains(documentNumber));
    }

    private MvcResult approve(String token, String documentId, String revisionId, String comments) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/documents/{id}/revisions/{revisionId}/approvals", documentId, revisionId)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "comments": "%s",
                                  "username": "admin",
                                  "password": "Admin@123",
                                  "meaning": "I approve this controlled document revision"
                                }
                                """.formatted(comments)))
                .andReturn();
        assertEquals(200, result.getResponse().getStatus(), result.getResponse().getContentAsString());
        return result;
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
