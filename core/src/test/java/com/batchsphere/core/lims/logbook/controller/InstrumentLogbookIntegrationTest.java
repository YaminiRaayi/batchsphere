package com.batchsphere.core.lims.logbook.controller;

import com.batchsphere.core.lims.logbook.entity.InstrumentUsageLog;
import com.batchsphere.core.lims.logbook.repository.InstrumentUsageLogRepository;
import com.batchsphere.core.lims.logbook.service.InstrumentLogbookService;
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
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.MOCK)
@ActiveProfiles("test")
class InstrumentLogbookIntegrationTest {

    @Autowired
    private WebApplicationContext webApplicationContext;

    @Autowired
    private InstrumentLogbookService logbookService;

    @Autowired
    private InstrumentUsageLogRepository logRepository;

    private MockMvc mockMvc;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(webApplicationContext)
                .apply(springSecurity())
                .build();
    }

    @Test
    void anomalyWithoutDescriptionIsRejected() throws Exception {
        String token = loginAsAdmin();
        String equipmentId = createEquipment(token).get("id").asText();

        MvcResult result = mockMvc.perform(post("/api/lims/logbook")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "equipmentId": "%s",
                                  "usedBy": "qc.analyst",
                                  "purpose": "Suitability check",
                                  "condition": "ANOMALY"
                                }
                                """.formatted(equipmentId)))
                .andReturn();
        assertEquals(409, result.getResponse().getStatus(),
                "ANOMALY with no description should be rejected: " + result.getResponse().getContentAsString());
        assertTrue(result.getResponse().getContentAsString().toLowerCase().contains("anomaly"),
                "error should mention anomaly description requirement");
    }

    @Test
    void normalEntryAppearsInBothEquipmentAndCrossInstrumentLogbook() throws Exception {
        String token = loginAsAdmin();
        JsonNode equipment = createEquipment(token);
        String equipmentId = equipment.get("id").asText();

        MvcResult create = mockMvc.perform(post("/api/lims/logbook")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "equipmentId": "%s",
                                  "usedBy": "qc.analyst",
                                  "purpose": "Daily SST",
                                  "condition": "NORMAL"
                                }
                                """.formatted(equipmentId)))
                .andReturn();
        assertEquals(200, create.getResponse().getStatus(), create.getResponse().getContentAsString());
        JsonNode entry = objectMapper.readTree(create.getResponse().getContentAsString());
        assertNotNull(entry.get("id").asText());
        assertEquals("NORMAL", entry.get("condition").asText());
        assertEquals("qc.analyst", entry.get("createdBy").asText());
        assertTrue(entry.get("active").asBoolean());
        assertTrue(entry.get("updatedAt").isNull());
        assertTrue(entry.get("updatedBy").isNull());

        // Equipment-scoped logbook should include the entry
        MvcResult eqLogs = mockMvc.perform(get("/api/lims/equipment/{id}/logbook", equipmentId)
                        .header("Authorization", "Bearer " + token))
                .andReturn();
        assertEquals(200, eqLogs.getResponse().getStatus());
        assertTrue(eqLogs.getResponse().getContentAsString().contains(entry.get("id").asText()),
                "Equipment logbook should include the new entry");

        // Cross-instrument logbook should also include the entry
        MvcResult allLogs = mockMvc.perform(get("/api/lims/logbook")
                        .header("Authorization", "Bearer " + token))
                .andReturn();
        assertEquals(200, allLogs.getResponse().getStatus());
        assertTrue(allLogs.getResponse().getContentAsString().contains(entry.get("id").asText()),
                "Cross-instrument logbook should include the new entry");

        // Filtered by usedBy that matches should still include
        MvcResult filtered = mockMvc.perform(get("/api/lims/logbook?usedBy=qc.analyst")
                        .header("Authorization", "Bearer " + token))
                .andReturn();
        assertEquals(200, filtered.getResponse().getStatus());
        assertTrue(filtered.getResponse().getContentAsString().contains(entry.get("id").asText()),
                "Filtering by qc.analyst should still include the entry");
    }

    @Test
    void autoEntryPersistsGmpMetadata() throws Exception {
        String token = loginAsAdmin();
        String equipmentId = createEquipment(token).get("id").asText();

        logbookService.logAutoUsage(UUID.fromString(equipmentId), null, "QC worksheet result", "qc.analyst");

        InstrumentUsageLog log = logRepository.findByEquipmentIdAndIsActiveTrueOrderByUsedAtDesc(UUID.fromString(equipmentId)).get(0);
        assertEquals("qc.analyst", log.getUsedBy());
        assertEquals("qc.analyst", log.getCreatedBy());
        assertNotNull(log.getCreatedAt());
        assertTrue(log.getIsActive());
    }

    private JsonNode createEquipment(String token) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/equipment")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name": "Test HPLC Unit",
                                  "equipmentType": "HPLC",
                                  "location": "QC Lab A",
                                  "manufacturer": "Agilent",
                                  "model": "1260",
                                  "serialNumber": "SN-HPLC-%d",
                                  "calibrationIntervalMonths": 12,
                                  "responsibleAnalyst": "qc.analyst"
                                }
                                """.formatted(System.currentTimeMillis())))
                .andReturn();
        assertEquals(200, result.getResponse().getStatus(), result.getResponse().getContentAsString());
        return objectMapper.readTree(result.getResponse().getContentAsString());
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
