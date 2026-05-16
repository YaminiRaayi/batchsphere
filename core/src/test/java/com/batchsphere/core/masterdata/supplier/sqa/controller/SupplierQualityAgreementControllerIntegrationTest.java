package com.batchsphere.core.masterdata.supplier.sqa.controller;

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
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.MOCK)
@ActiveProfiles("test")
class SupplierQualityAgreementControllerIntegrationTest {

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
    void createsTracksExpiryAndTerminatesSupplierQualityAgreement() throws Exception {
        String token = loginAsAdmin();
        String supplierId = createSupplier(token, "SQA-ACT-" + System.currentTimeMillis());
        String uncoveredSupplierId = createSupplier(token, "SQA-GAP-" + System.currentTimeMillis());
        LocalDate today = LocalDate.now();

        MvcResult createResult = mockMvc.perform(post("/api/supplier-quality-agreements")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "supplierId": "%s",
                                  "title": "API Supply Quality Agreement",
                                  "effectiveDate": "%s",
                                  "expiryDate": "%s",
                                  "status": "ACTIVE",
                                  "gmpResponsibilities": "Supplier maintains GMP manufacture, testing, storage, and release controls.",
                                  "changeNotificationRequirements": "Supplier must notify BatchSphere before process, site, specification, or test method changes.",
                                  "auditRights": "BatchSphere may conduct scheduled and for-cause quality audits.",
                                  "testingResponsibilities": "Supplier provides CoA and BatchSphere QC performs incoming release testing.",
                                  "retentionSampleRequirements": "Representative retained samples are held per approved retention procedure.",
                                  "agreedAcceptanceCriteria": "Material must meet approved specification and pharmacopoeial requirements.",
                                  "ourSignatory": "QA Manager",
                                  "ourSignatoryDate": "%s",
                                  "supplierSignatory": "Supplier QA Head",
                                  "supplierSignatoryDate": "%s"
                                }
                                """.formatted(supplierId, today, today.plusDays(45), today, today)))
                .andReturn();
        assertEquals(200, createResult.getResponse().getStatus(), createResult.getResponse().getContentAsString());
        JsonNode created = objectMapper.readTree(createResult.getResponse().getContentAsString());
        assertTrue(created.get("sqaNumber").asText().startsWith("SQA-" + today.getYear()));
        assertEquals("ACTIVE", created.get("status").asText());
        assertTrue(created.get("expiringSoon").asBoolean());
        String sqaId = created.get("id").asText();

        MvcResult expiringResult = mockMvc.perform(get("/api/supplier-quality-agreements/expiring-soon?days=60")
                        .header("Authorization", "Bearer " + token))
                .andReturn();
        assertEquals(200, expiringResult.getResponse().getStatus(), expiringResult.getResponse().getContentAsString());
        assertTrue(expiringResult.getResponse().getContentAsString().contains(sqaId));

        MvcResult bySupplierResult = mockMvc.perform(get("/api/suppliers/{id}/quality-agreements", supplierId)
                        .header("Authorization", "Bearer " + token))
                .andReturn();
        assertEquals(200, bySupplierResult.getResponse().getStatus(), bySupplierResult.getResponse().getContentAsString());
        assertTrue(bySupplierResult.getResponse().getContentAsString().contains("API Supply Quality Agreement"));

        MvcResult gapsResult = mockMvc.perform(get("/api/supplier-quality-agreements/suppliers-without-sqa")
                        .header("Authorization", "Bearer " + token))
                .andReturn();
        assertEquals(200, gapsResult.getResponse().getStatus(), gapsResult.getResponse().getContentAsString());
        String gapsPayload = gapsResult.getResponse().getContentAsString();
        assertTrue(gapsPayload.contains(uncoveredSupplierId));
        assertFalse(gapsPayload.contains(supplierId));

        MvcResult terminateResult = mockMvc.perform(put("/api/supplier-quality-agreements/{id}/status", sqaId)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "status": "TERMINATED",
                                  "terminatedReason": "Supplier replaced after quality agreement renegotiation."
                                }
                                """))
                .andReturn();
        assertEquals(200, terminateResult.getResponse().getStatus(), terminateResult.getResponse().getContentAsString());
        JsonNode terminated = objectMapper.readTree(terminateResult.getResponse().getContentAsString());
        assertEquals("TERMINATED", terminated.get("status").asText());
        assertEquals("Supplier replaced after quality agreement renegotiation.", terminated.get("terminatedReason").asText());
    }

    private String createSupplier(String token, String supplierCode) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/suppliers")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "supplierCode": "%s",
                                  "supplierName": "Supplier %s",
                                  "contactPerson": "Supplier QA",
                                  "email": "qa@example.com",
                                  "phone": "+91-9000000000",
                                  "supplierType": "MANUFACTURER",
                                  "qualificationStatus": "QUALIFIED",
                                  "countryOfManufacture": "India",
                                  "gmpcertNumber": "GMP-%s",
                                  "gmpcertIssuingAuthority": "WHO GMP",
                                  "gmpcertExpiryDate": "%s",
                                  "approvedSince": "%s",
                                  "lastAuditDate": "%s",
                                  "nextAuditDue": "%s",
                                  "rejectionRate": 0.25,
                                  "openCapaCount": 0,
                                  "createdBy": "admin"
                                }
                                """.formatted(
                                supplierCode,
                                supplierCode,
                                supplierCode,
                                LocalDate.now().plusYears(2),
                                LocalDate.now().minusMonths(3),
                                LocalDate.now().minusMonths(1),
                                LocalDate.now().plusMonths(11))))
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
