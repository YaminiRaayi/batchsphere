package com.batchsphere.core.lims.reagent.controller;

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
class ReagentInventoryIntegrationTest {

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
    void pastExpiryDateMarksLotExpiredOnResponse() throws Exception {
        String token = loginAsAdmin();
        long unique = System.currentTimeMillis();

        JsonNode reagent = objectMapper.readTree(mockMvc.perform(post("/api/lims/reagents")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "reagentCode": "RG-%d",
                                  "reagentName": "Acetonitrile",
                                  "grade": "HPLC",
                                  "manufacturer": "Merck",
                                  "storageCondition": "Room temperature",
                                  "createdBy": "qc.manager"
                                }
                                """.formatted(unique)))
                .andReturn().getResponse().getContentAsString());
        String reagentId = reagent.get("id").asText();

        LocalDate pastExpiry = LocalDate.now().minusDays(7);
        MvcResult addLot = mockMvc.perform(post("/api/lims/reagents/{id}/lots", reagentId)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "lotNumber": "EXP-%d",
                                  "supplier": "Merck",
                                  "expiryDate": "%s",
                                  "quantityReceived": 500,
                                  "unit": "mL",
                                  "createdBy": "qc.analyst"
                                }
                                """.formatted(unique, pastExpiry)))
                .andReturn();
        assertEquals(200, addLot.getResponse().getStatus(), addLot.getResponse().getContentAsString());

        JsonNode lot = objectMapper.readTree(addLot.getResponse().getContentAsString());
        assertEquals("EXPIRED", lot.get("status").asText(),
                "Lot with expiryDate in the past should be reported as EXPIRED");
    }

    @Test
    void referenceStandardListExposesPharmacopeiaAndCode() throws Exception {
        String token = loginAsAdmin();
        long unique = System.currentTimeMillis();

        MvcResult create = mockMvc.perform(post("/api/lims/reference-standards")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "standardCode": "RS-PARA-%d",
                                  "standardName": "Paracetamol RS",
                                  "pharmacopeia": "USP",
                                  "storageCondition": "2-8 C",
                                  "createdBy": "qc.manager"
                                }
                                """.formatted(unique)))
                .andReturn();
        assertEquals(200, create.getResponse().getStatus(), create.getResponse().getContentAsString());
        JsonNode created = objectMapper.readTree(create.getResponse().getContentAsString());
        assertTrue(created.get("standardCode").asText().startsWith("RS-PARA-"));
        assertEquals("USP", created.get("pharmacopeia").asText());
    }

    @Test
    void referenceStandardLotUpdateRecordsAuditEvent() throws Exception {
        String token = loginAsAdmin();
        long unique = System.currentTimeMillis();

        MvcResult create = mockMvc.perform(post("/api/lims/reference-standards")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "standardCode": "RS-AUD-%d",
                                  "standardName": "Audit RS",
                                  "pharmacopeia": "USP",
                                  "createdBy": "qc.manager"
                                }
                                """.formatted(unique)))
                .andReturn();
        assertEquals(200, create.getResponse().getStatus(), create.getResponse().getContentAsString());
        String standardId = objectMapper.readTree(create.getResponse().getContentAsString()).get("id").asText();

        MvcResult addLot = mockMvc.perform(post("/api/lims/reference-standards/{id}/lots", standardId)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "lotNumber": "RS-LOT-%d",
                                  "potency": 99.5,
                                  "expiryDate": "%s",
                                  "quantityReceived": 100,
                                  "quantityUsed": 5,
                                  "unit": "mg",
                                  "createdBy": "qc.analyst"
                                }
                                """.formatted(unique, LocalDate.now().plusMonths(12))))
                .andReturn();
        assertEquals(200, addLot.getResponse().getStatus(), addLot.getResponse().getContentAsString());
        String lotId = objectMapper.readTree(addLot.getResponse().getContentAsString()).get("id").asText();

        MvcResult update = mockMvc.perform(put("/api/lims/reference-standards/{id}/lots/{lotId}", standardId, lotId)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "quantityUsed": 15,
                                  "updatedBy": "qc.manager"
                                }
                                """))
                .andReturn();
        assertEquals(200, update.getResponse().getStatus(), update.getResponse().getContentAsString());

        MvcResult auditResult = mockMvc.perform(get("/api/audit-events")
                        .header("Authorization", "Bearer " + token)
                        .param("entityType", "LAB_REFERENCE_STANDARD_LOT")
                        .param("entityId", lotId))
                .andReturn();
        assertEquals(200, auditResult.getResponse().getStatus(), auditResult.getResponse().getContentAsString());
        JsonNode auditEvents = objectMapper.readTree(auditResult.getResponse().getContentAsString());
        assertTrue(auditEvents.findValues("fieldName").stream().anyMatch(node -> "quantityUsed".equals(node.asText())));
        assertTrue(auditEvents.findValues("newValue").stream().anyMatch(node -> "15".equals(node.asText()) || "15.0".equals(node.asText())));
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
