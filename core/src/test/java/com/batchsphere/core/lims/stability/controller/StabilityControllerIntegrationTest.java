package com.batchsphere.core.lims.stability.controller;

import com.batchsphere.core.compliance.esign.repository.ESignatureRecordRepository;
import com.batchsphere.core.masterdata.quality.enums.ReviewRoute;
import com.batchsphere.core.masterdata.spec.entity.Spec;
import com.batchsphere.core.masterdata.spec.entity.SpecParameter;
import com.batchsphere.core.masterdata.spec.entity.SpecParameterCriteriaType;
import com.batchsphere.core.masterdata.spec.entity.SpecParameterTestType;
import com.batchsphere.core.masterdata.spec.entity.SpecStatus;
import com.batchsphere.core.masterdata.spec.entity.SpecType;
import com.batchsphere.core.masterdata.spec.entity.TargetMarket;
import com.batchsphere.core.masterdata.spec.repository.SpecParameterRepository;
import com.batchsphere.core.masterdata.spec.repository.SpecRepository;
import com.batchsphere.core.transactions.sampling.entity.SamplingMethod;
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

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.MOCK)
@ActiveProfiles("test")
class StabilityControllerIntegrationTest {

    @Autowired
    private WebApplicationContext webApplicationContext;

    @Autowired
    private SpecRepository specRepository;

    @Autowired
    private SpecParameterRepository specParameterRepository;

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
    void createsStudyGeneratesTimepointsCalculatesOotAndTrend() throws Exception {
        String token = login("qc.manager", "Admin@123");
        UUID parameterId = createAssayParameter();

        JsonNode study = createStudy(token);
        String studyId = study.get("study").get("id").asText();
        assertEquals(4, study.get("timepoints").size());
        assertEquals("2026-01-01", study.get("timepoints").get(0).get("scheduledDate").asText());
        assertEquals("2026-04-01", study.get("timepoints").get(1).get("scheduledDate").asText());

        String t0 = study.get("timepoints").get(0).get("id").asText();
        String t3 = study.get("timepoints").get(1).get("id").asText();
        String t6 = study.get("timepoints").get(2).get("id").asText();

        MvcResult blockedResult = recordResult(token, studyId, t3, parameterId, "99.0");
        assertEquals(409, blockedResult.getResponse().getStatus(), blockedResult.getResponse().getContentAsString());

        pull(token, studyId, t0);
        JsonNode t0Result = objectMapper.readTree(recordResult(token, studyId, t0, parameterId, "100.0").getResponse().getContentAsString());
        assertFalse(t0Result.get("ootFlag").asBoolean());

        MvcResult blockedPull = pull(token, studyId, t0);
        assertEquals(409, blockedPull.getResponse().getStatus(), blockedPull.getResponse().getContentAsString());

        pull(token, studyId, t3);
        JsonNode ootResult = objectMapper.readTree(recordResult(token, studyId, t3, parameterId, "89.9").getResponse().getContentAsString());
        assertTrue(ootResult.get("ootFlag").asBoolean());

        pull(token, studyId, t6);
        JsonNode normalResult = objectMapper.readTree(recordResult(token, studyId, t6, parameterId, "98.8").getResponse().getContentAsString());
        assertFalse(normalResult.get("ootFlag").asBoolean());

        JsonNode detail = objectMapper.readTree(mockMvc.perform(get("/api/lims/stability/{id}", studyId)
                        .header("Authorization", "Bearer " + token))
                .andReturn().getResponse().getContentAsString());
        assertEquals(3, detail.get("study").get("completedTimepoints").asInt());

        JsonNode trend = objectMapper.readTree(mockMvc.perform(get("/api/lims/stability/{id}/trend", studyId)
                        .header("Authorization", "Bearer " + token))
                .andReturn().getResponse().getContentAsString());
        assertEquals(1, trend.size());
        assertEquals(3, trend.get(0).get("points").size());
        assertTrue(trend.get(0).get("points").get(1).get("ootFlag").asBoolean());
    }

    @Test
    void completedStatusRequiresValidElectronicSignature() throws Exception {
        String token = login("qc.manager", "Admin@123");
        JsonNode study = createStudy(token);
        String studyId = study.get("study").get("id").asText();

        long before = eSignatureRecordRepository.count();
        MvcResult badSignature = mockMvc.perform(put("/api/lims/stability/{id}/status", studyId)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "status": "COMPLETED",
                                  "updatedBy": "qc.manager",
                                  "username": "qc.manager",
                                  "password": "wrong",
                                  "signatureMeaning": "I certify stability study completion"
                                }
                                """))
                .andReturn();
        assertEquals(409, badSignature.getResponse().getStatus(), badSignature.getResponse().getContentAsString());

        MvcResult completed = mockMvc.perform(put("/api/lims/stability/{id}/status", studyId)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "status": "COMPLETED",
                                  "updatedBy": "qc.manager",
                                  "username": "qc.manager",
                                  "password": "Admin@123",
                                  "signatureMeaning": "I certify stability study completion"
                                }
                                """))
                .andReturn();
        assertEquals(200, completed.getResponse().getStatus(), completed.getResponse().getContentAsString());
        JsonNode response = objectMapper.readTree(completed.getResponse().getContentAsString());
        assertEquals("COMPLETED", response.get("status").asText());
        assertEquals(before + 1, eSignatureRecordRepository.count());
    }

    @Test
    void ootStudyCompletionRequiresManagerDisposition() throws Exception {
        String token = login("qc.manager", "Admin@123");
        UUID parameterId = createAssayParameter();

        JsonNode study = createStudy(token);
        String studyId = study.get("study").get("id").asText();
        String t0 = study.get("timepoints").get(0).get("id").asText();
        String t3 = study.get("timepoints").get(1).get("id").asText();

        pull(token, studyId, t0);
        recordResult(token, studyId, t0, parameterId, "100.0");
        pull(token, studyId, t3);
        JsonNode oot = objectMapper.readTree(recordResult(token, studyId, t3, parameterId, "89.0").getResponse().getContentAsString());
        assertTrue(oot.get("ootFlag").asBoolean());

        MvcResult blocked = mockMvc.perform(put("/api/lims/stability/{id}/status", studyId)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "status": "COMPLETED",
                                  "updatedBy": "qc.manager",
                                  "username": "qc.manager",
                                  "password": "Admin@123",
                                  "signatureMeaning": "I certify stability study completion"
                                }
                                """))
                .andReturn();
        assertEquals(409, blocked.getResponse().getStatus(), blocked.getResponse().getContentAsString());

        MvcResult completed = mockMvc.perform(put("/api/lims/stability/{id}/status", studyId)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "status": "COMPLETED",
                                  "updatedBy": "qc.manager",
                                  "username": "qc.manager",
                                  "password": "Admin@123",
                                  "signatureMeaning": "I certify stability study completion",
                                  "ootDisposition": "Deviation DEV-OOT-001 reviewed; trend accepted by QC Manager"
                                }
                                """))
                .andReturn();
        assertEquals(200, completed.getResponse().getStatus(), completed.getResponse().getContentAsString());
        assertEquals("COMPLETED", objectMapper.readTree(completed.getResponse().getContentAsString()).get("status").asText());
    }

    private JsonNode createStudy(String token) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/lims/stability")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "studyNumber": "STB-%s",
                                  "productName": "Paracetamol 500mg Tablets",
                                  "batchNumber": "B-2026-001",
                                  "conditionLabel": "Long Term",
                                  "storageCondition": "25C/60%%RH",
                                  "startDate": "2026-01-01",
                                  "ootThresholdPct": 10,
                                  "protocolMonths": [0,3,6,12],
                                  "createdBy": "qc.manager"
                                }
                                """.formatted(UUID.randomUUID().toString().substring(0, 8))))
                .andReturn();
        assertEquals(200, result.getResponse().getStatus(), result.getResponse().getContentAsString());
        return objectMapper.readTree(result.getResponse().getContentAsString());
    }

    private MvcResult pull(String token, String studyId, String timepointId) throws Exception {
        return mockMvc.perform(put("/api/lims/stability/{id}/timepoints/{tpId}/pull", studyId, timepointId)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "pulledBy": "qc.manager",
                                  "pulledDate": "%s"
                                }
                                """.formatted(LocalDate.now())))
                .andReturn();
    }

    private MvcResult recordResult(String token, String studyId, String timepointId, UUID parameterId, String value) throws Exception {
        return mockMvc.perform(post("/api/lims/stability/{id}/timepoints/{tpId}/results", studyId, timepointId)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "specParameterId": "%s",
                                  "resultValue": %s,
                                  "enteredBy": "qc.manager"
                                }
                                """.formatted(parameterId, value)))
                .andReturn();
    }

    private UUID createAssayParameter() {
        UUID specId = UUID.randomUUID();
        specRepository.save(Spec.builder()
                .id(specId)
                .specCode("SPEC-STB-" + UUID.randomUUID().toString().substring(0, 8))
                .specName("Stability Test Spec")
                .revision("00")
                .specType(SpecType.FINISHED_PRODUCT)
                .status(SpecStatus.APPROVED)
                .samplingMethod(SamplingMethod.SQRT_N_PLUS_1)
                .targetMarket(TargetMarket.GLOBAL)
                .reviewRoute(ReviewRoute.QC_THEN_QA)
                .isActive(true)
                .createdBy("test")
                .createdAt(LocalDateTime.now())
                .build());

        UUID parameterId = UUID.randomUUID();
        specParameterRepository.save(SpecParameter.builder()
                .id(parameterId)
                .specId(specId)
                .parameterName("Assay (%)")
                .testType(SpecParameterTestType.ASSAY)
                .criteriaType(SpecParameterCriteriaType.RANGE)
                .lowerLimit(new BigDecimal("98.0"))
                .upperLimit(new BigDecimal("102.0"))
                .unit("%")
                .isMandatory(true)
                .sequence(1)
                .isActive(true)
                .createdBy("test")
                .createdAt(LocalDateTime.now())
                .build());
        return parameterId;
    }

    private String login(String username, String password) throws Exception {
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
        JsonNode root = objectMapper.readTree(loginResult.getResponse().getContentAsString());
        assertNotNull(root.get("accessToken").asText());
        return root.get("accessToken").asText();
    }
}
