package com.batchsphere.core.lims.em.controller;

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
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.MOCK)
@ActiveProfiles("test")
class EnvironmentalMonitoringControllerIntegrationTest {

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
    void alertAndActionBreachFlagsComputedFromLimits() throws Exception {
        String token = loginAsAdmin();
        long unique = System.currentTimeMillis();

        // Create monitoring point — alert 26 °C, action 27 °C
        String pointCode = "LAB-TEMP-" + unique;
        JsonNode point = objectMapper.readTree(mockMvc.perform(post("/api/lims/em-monitoring-points")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "pointCode": "%s",
                                  "pointName": "Lab A Temperature",
                                  "monitoringType": "TEMPERATURE",
                                  "unit": "C",
                                  "alertLimit": 26.0,
                                  "actionLimit": 27.0,
                                  "createdBy": "qc.manager"
                                }
                                """.formatted(pointCode)))
                .andReturn().getResponse().getContentAsString());
        String pointId = point.get("id").asText();

        // Normal reading (25.0) — no breach
        JsonNode normal = recordResult(token, pointId, "25.0");
        assertFalse(normal.get("alertBreached").asBoolean(), "25.0 should not breach alert");
        assertFalse(normal.get("actionBreached").asBoolean(), "25.0 should not breach action");
        assertFalse(normal.get("suggestDeviation").asBoolean(), "25.0 should not suggest deviation");

        // Above alert but below action (26.5) — alert breach only
        JsonNode alert = recordResult(token, pointId, "26.5");
        assertTrue(alert.get("alertBreached").asBoolean(), "26.5 should breach alert");
        assertFalse(alert.get("actionBreached").asBoolean(), "26.5 should not breach action");

        // Above action (27.3) — both flags + suggestDeviation
        JsonNode breach = recordResult(token, pointId, "27.3");
        assertTrue(breach.get("alertBreached").asBoolean(), "27.3 should breach alert");
        assertTrue(breach.get("actionBreached").asBoolean(), "27.3 should breach action");
        assertTrue(breach.get("suggestDeviation").asBoolean(),
                "Action-limit breach should suggest deviation creation");

        // /breaches lists the action-breach record
        MvcResult breaches = mockMvc.perform(get("/api/lims/em-results/breaches")
                        .header("Authorization", "Bearer " + token))
                .andReturn();
        assertEquals(200, breaches.getResponse().getStatus(), breaches.getResponse().getContentAsString());
        String body = breaches.getResponse().getContentAsString();
        assertTrue(body.contains(breach.get("id").asText()),
                "Breach endpoint should include the 27.3 record id");
    }

    @Test
    void linkingDeviationRemovesBreachFromOpenList() throws Exception {
        String token = loginAsAdmin();
        long unique = System.currentTimeMillis();

        String pointId = createPoint(token, "LAB-TEMP-LINK-" + unique, "26.0", "27.0").get("id").asText();
        // record action-breach reading
        JsonNode breach = recordResult(token, pointId, "27.5");
        assertTrue(breach.get("actionBreached").asBoolean());
        assertTrue(breach.get("suggestDeviation").asBoolean());

        String deviationId = createDeviation(token).get("id").asText();

        MvcResult link = mockMvc.perform(post("/api/lims/em-results/{id}/link-deviation", breach.get("id").asText())
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"deviationId":"%s","updatedBy":"qc.manager"}
                                """.formatted(deviationId)))
                .andReturn();
        assertEquals(200, link.getResponse().getStatus(), link.getResponse().getContentAsString());
        JsonNode linked = objectMapper.readTree(link.getResponse().getContentAsString());
        assertEquals(deviationId, linked.get("linkedDeviationId").asText());
        assertFalse(linked.get("suggestDeviation").asBoolean(),
                "suggestDeviation should flip false once deviation linked");

        // /breaches should no longer include this breach
        String breachesBody = mockMvc.perform(get("/api/lims/em-results/breaches")
                        .header("Authorization", "Bearer " + token))
                .andReturn().getResponse().getContentAsString();
        assertFalse(breachesBody.contains(breach.get("id").asText()),
                "Linked breach should not appear in /breaches");
    }

    @Test
    void dismissingBreachRequiresReasonAndRemovesFromOpenList() throws Exception {
        String token = loginAs("qc.manager");
        long unique = System.currentTimeMillis();

        String pointId = createPoint(token, "LAB-TEMP-DIS-" + unique, "26.0", "27.0").get("id").asText();
        JsonNode breach = recordResult(token, pointId, "28.0");
        assertTrue(breach.get("actionBreached").asBoolean());

        // dismissal without reason → 409
        MvcResult noReason = mockMvc.perform(post("/api/lims/em-results/{id}/dismiss", breach.get("id").asText())
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"dismissedBy":"qc.manager"}
                                """))
                .andReturn();
        assertEquals(409, noReason.getResponse().getStatus(),
                "Dismiss without reason should fail with business conflict");

        // invalid e-sign password -> no state change
        MvcResult wrongPassword = mockMvc.perform(post("/api/lims/em-results/{id}/dismiss", breach.get("id").asText())
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "reason":"Calibration drift on probe, replaced",
                                  "dismissedBy":"qc.manager",
                                  "username":"qc.manager",
                                  "password":"wrong-password",
                                  "meaning":"I approve dismissal of this environmental monitoring action-limit breach"
                                }
                                """))
                .andReturn();
        assertEquals(409, wrongPassword.getResponse().getStatus(),
                "Dismiss with wrong e-sign password should fail with business conflict");
        String openBreaches = mockMvc.perform(get("/api/lims/em-results/breaches")
                        .header("Authorization", "Bearer " + token))
                .andReturn().getResponse().getContentAsString();
        assertTrue(openBreaches.contains(breach.get("id").asText()),
                "Wrong password should not dismiss breach");

        // dismissal with reason
        MvcResult dismissed = mockMvc.perform(post("/api/lims/em-results/{id}/dismiss", breach.get("id").asText())
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "reason":"Calibration drift on probe, replaced",
                                  "dismissedBy":"qc.manager",
                                  "username":"qc.manager",
                                  "password":"Admin@123",
                                  "meaning":"I approve dismissal of this environmental monitoring action-limit breach"
                                }
                                """))
                .andReturn();
        assertEquals(200, dismissed.getResponse().getStatus(), dismissed.getResponse().getContentAsString());
        JsonNode body = objectMapper.readTree(dismissed.getResponse().getContentAsString());
        assertTrue(body.get("breachDismissed").asBoolean());

        String breachesBody = mockMvc.perform(get("/api/lims/em-results/breaches")
                        .header("Authorization", "Bearer " + token))
                .andReturn().getResponse().getContentAsString();
        assertFalse(breachesBody.contains(breach.get("id").asText()),
                "Dismissed breach should not appear in /breaches");

        String adminToken = loginAsAdmin();
        String signatureBody = mockMvc.perform(get("/api/e-signatures")
                        .header("Authorization", "Bearer " + token)
                        .param("entityType", "EM_RESULT")
                        .param("entityId", breach.get("id").asText()))
                .andReturn().getResponse().getContentAsString();
        JsonNode signatures = objectMapper.readTree(signatureBody);
        assertTrue(signatures.findValues("action").stream().anyMatch(node -> "DISMISS_BREACH".equals(node.asText())),
                "Dismiss breach should create e-signature row");

        String auditBody = mockMvc.perform(get("/api/audit-events")
                        .header("Authorization", "Bearer " + adminToken)
                        .param("entityType", "EM_RESULT")
                        .param("entityId", breach.get("id").asText()))
                .andReturn().getResponse().getContentAsString();
        JsonNode auditEvents = objectMapper.readTree(auditBody);
        assertTrue(auditEvents.findValues("eventType").stream().anyMatch(node -> "E_SIGNATURE".equals(node.asText())),
                "Dismiss breach should create E_SIGNATURE audit row");

        // double-dismiss rejected
        MvcResult doubleDismiss = mockMvc.perform(post("/api/lims/em-results/{id}/dismiss", breach.get("id").asText())
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"reason":"already gone","dismissedBy":"qc.manager"}
                                """))
                .andReturn();
        assertEquals(409, doubleDismiss.getResponse().getStatus(),
                "Already-dismissed breach should reject second dismiss");
    }

    @Test
    void qcAnalystCannotDismissBreach() throws Exception {
        String managerToken = loginAs("qc.manager");
        String analystToken = loginAs("qc.analyst");
        long unique = System.currentTimeMillis();

        String pointId = createPoint(managerToken, "LAB-TEMP-ROLE-" + unique, "26.0", "27.0").get("id").asText();
        JsonNode breach = recordResult(managerToken, pointId, "28.0");

        MvcResult blocked = mockMvc.perform(post("/api/lims/em-results/{id}/dismiss", breach.get("id").asText())
                        .header("Authorization", "Bearer " + analystToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "reason":"Analyst should not dismiss",
                                  "dismissedBy":"qc.analyst",
                                  "username":"qc.analyst",
                                  "password":"Admin@123",
                                  "meaning":"I approve dismissal of this environmental monitoring action-limit breach"
                                }
                                """))
                .andReturn();
        assertEquals(403, blocked.getResponse().getStatus(),
                "QC analyst should not dismiss EM action breach");
    }

    @Test
    void missingResultValueRejected() throws Exception {
        String token = loginAsAdmin();
        long unique = System.currentTimeMillis();
        JsonNode point = objectMapper.readTree(mockMvc.perform(post("/api/lims/em-monitoring-points")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "pointCode": "LAB-HUM-%d",
                                  "pointName": "Lab A Humidity",
                                  "monitoringType": "HUMIDITY",
                                  "unit": "%%RH",
                                  "alertLimit": 60.0,
                                  "actionLimit": 65.0,
                                  "createdBy": "qc.manager"
                                }
                                """.formatted(unique)))
                .andReturn().getResponse().getContentAsString());
        String pointId = point.get("id").asText();

        MvcResult result = mockMvc.perform(post("/api/lims/em-results")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "pointId": "%s",
                                  "recordedBy": "qc.analyst"
                                }
                                """.formatted(pointId)))
                .andReturn();
        assertEquals(409, result.getResponse().getStatus(),
                "Missing resultValue should fail with business conflict: " + result.getResponse().getContentAsString());
    }

    private JsonNode createPoint(String token, String code, String alert, String action) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/lims/em-monitoring-points")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "pointCode": "%s",
                                  "pointName": "Test point %s",
                                  "monitoringType": "TEMPERATURE",
                                  "unit": "C",
                                  "alertLimit": %s,
                                  "actionLimit": %s,
                                  "createdBy": "qc.manager"
                                }
                                """.formatted(code, code, alert, action)))
                .andReturn();
        assertEquals(200, result.getResponse().getStatus(), result.getResponse().getContentAsString());
        return objectMapper.readTree(result.getResponse().getContentAsString());
    }

    private JsonNode createDeviation(String token) throws Exception {
        long unique = System.currentTimeMillis();
        MvcResult result = mockMvc.perform(post("/api/deviations")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "title": "EM action breach %d",
                                  "description": "Action limit exceeded on monitoring point during integration test.",
                                  "deviationType": "EQUIPMENT",
                                  "severity": "MAJOR",
                                  "sourceModule": "MANUAL"
                                }
                                """.formatted(unique)))
                .andReturn();
        assertEquals(200, result.getResponse().getStatus(), result.getResponse().getContentAsString());
        JsonNode body = objectMapper.readTree(result.getResponse().getContentAsString());
        assertNotNull(body.get("id"));
        return body;
    }

    private JsonNode recordResult(String token, String pointId, String value) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/lims/em-results")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "pointId": "%s",
                                  "resultValue": %s,
                                  "recordedBy": "qc.analyst"
                                }
                                """.formatted(pointId, value)))
                .andReturn();
        assertEquals(200, result.getResponse().getStatus(),
                "record result " + value + " should succeed: " + result.getResponse().getContentAsString());
        return objectMapper.readTree(result.getResponse().getContentAsString());
    }

    private String loginAsAdmin() throws Exception {
        return loginAs("admin");
    }

    private String loginAs(String username) throws Exception {
        MvcResult loginResult = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "username": "%s",
                                  "password": "Admin@123"
                                }
                                """.formatted(username)))
                .andReturn();
        assertEquals(200, loginResult.getResponse().getStatus(), loginResult.getResponse().getContentAsString());
        return objectMapper.readTree(loginResult.getResponse().getContentAsString()).get("accessToken").asText();
    }
}
