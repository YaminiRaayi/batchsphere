package com.batchsphere.core.auth.controller;

import com.batchsphere.core.auth.entity.User;
import com.batchsphere.core.auth.entity.UserRole;
import com.batchsphere.core.auth.repository.UserRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import java.time.LocalDateTime;
import java.util.UUID;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.request;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.MOCK)
@ActiveProfiles("test")
class AuthorizationIntegrationTest {

    @Autowired
    private WebApplicationContext webApplicationContext;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private MockMvc mockMvc;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(webApplicationContext)
                .apply(springSecurity())
                .build();

        ensureUser("warehouse_user", UserRole.WAREHOUSE_OP);
        ensureUser("qc_user", UserRole.QC_ANALYST);
        ensureUser("qc_manager_user", UserRole.QC_MANAGER);
        ensureUser("proc_user", UserRole.PROCUREMENT);
        ensureUser("viewer_user", UserRole.VIEWER);
    }

    @Test
    void procurementCanAccessPartnerApisButNotWarehouseFlows() throws Exception {
        String token = login("proc_user");

        assertEquals(200, performGet("/api/suppliers", token));
        assertEquals(200, performGet("/api/materials", token));
        assertEquals(200, performGet("/api/specs", token));
        assertEquals(200, performGet("/api/moas", token));
        assertEquals(403, performGet("/api/grns", token));
        assertEquals(403, performPost("/api/materials", token, """
                {
                  "materialName": "Should Fail"
                }
                """));
        assertEquals(403, performGet("/api/auth/users", token));
    }

    @Test
    void warehouseCanAccessWarehouseFlowsButNotQcApis() throws Exception {
        String token = login("warehouse_user");

        assertEquals(200, performGet("/api/grns", token));
        assertEquals(200, performGet("/api/suppliers", token));
        assertEquals(200, performGet("/api/vendors", token));
        assertEquals(200, performGet("/api/vendor-business-units", token));
        assertEquals(200, performGet("/api/wms/summary", token));
        assertEquals(403, performGet("/api/sampling-requests", token));
    }

    @Test
    void qcCanAccessQcApisButNotProcurementApis() throws Exception {
        String token = login("qc_user");

        assertEquals(200, performGet("/api/sampling-requests", token));
        assertEquals(403, performGet("/api/vendors", token));
    }

    @Test
    void qcCanReadGrnContainersNeededBySamplingFlow() throws Exception {
        String token = login("qc_user");

        assertEquals(200, performGet("/api/grns/items/00000000-0000-0000-0000-000000000001/containers", token));
    }

    @Test
    void qcCanReadBatchesNeededBySamplingPageButCannotModifyThem() throws Exception {
        String token = login("qc_user");

        assertEquals(200, performGet("/api/batches", token));
        assertEquals(403, performPost("/api/batches", token, """
                {
                  "materialId": "00000000-0000-0000-0000-000000000001",
                  "batchNumber": "BATCH-001"
                }
                """));
    }

    @ParameterizedTest(name = "{0} {1} denies {2}")
    @MethodSource("wrongRoleMatrix")
    void protectedApiGroupsRejectWrongRoles(HttpMethod method, String path, String username) throws Exception {
        String token = login(username);

        assertEquals(403, perform(method, path, token), method + " " + path + " should deny " + username);
    }

    private static Stream<Arguments> wrongRoleMatrix() {
        String id = "00000000-0000-0000-0000-000000000001";
        return Stream.of(
                Arguments.of(HttpMethod.GET, "/api/auth/users", "qc_user"),
                Arguments.of(HttpMethod.GET, "/api/approval-delegations", "warehouse_user"),
                Arguments.of(HttpMethod.GET, "/api/e-signatures", "warehouse_user"),
                Arguments.of(HttpMethod.GET, "/api/employees", "warehouse_user"),
                Arguments.of(HttpMethod.PUT, "/api/employees/" + id, "qc_manager_user"),
                Arguments.of(HttpMethod.GET, "/api/training/assignments", "qc_user"),
                Arguments.of(HttpMethod.POST, "/api/training/requirements", "qc_manager_user"),
                Arguments.of(HttpMethod.GET, "/api/grns/items/" + id + "/containers", "proc_user"),
                Arguments.of(HttpMethod.GET, "/api/batches", "proc_user"),
                Arguments.of(HttpMethod.GET, "/api/materials", "viewer_user"),
                Arguments.of(HttpMethod.GET, "/api/supplier-quality-agreements", "warehouse_user"),
                Arguments.of(HttpMethod.GET, "/api/suppliers", "qc_user"),
                Arguments.of(HttpMethod.GET, "/api/specs", "warehouse_user"),
                Arguments.of(HttpMethod.GET, "/api/moas", "warehouse_user"),
                Arguments.of(HttpMethod.GET, "/api/wms/summary", "qc_user"),
                Arguments.of(HttpMethod.GET, "/api/grns", "proc_user"),
                Arguments.of(HttpMethod.POST, "/api/sampling-requests/" + id + "/qc-decision", "qc_user"),
                Arguments.of(HttpMethod.GET, "/api/deviations", "warehouse_user"),
                Arguments.of(HttpMethod.GET, "/api/qms/analytics", "qc_user"),
                Arguments.of(HttpMethod.GET, "/api/complaints", "warehouse_user"),
                Arguments.of(HttpMethod.GET, "/api/risk-assessments", "warehouse_user"),
                Arguments.of(HttpMethod.GET, "/api/apqr", "warehouse_user"),
                Arguments.of(HttpMethod.POST, "/api/qp-batch-releases/" + id + "/coa/issue", "qc_user"),
                Arguments.of(HttpMethod.GET, "/api/qp-batch-releases", "warehouse_user"),
                Arguments.of(HttpMethod.GET, "/api/compliance/alcoa-readiness/summary", "qc_user"),
                Arguments.of(HttpMethod.GET, "/api/compliance/alcoa-readiness/gaps", "qc_user"),
                Arguments.of(HttpMethod.GET, "/api/compliance/alcoa-readiness/export", "qc_user"),
                Arguments.of(HttpMethod.POST, "/api/lims/em-results/" + id + "/dismiss", "qc_user"),
                Arguments.of(HttpMethod.GET, "/api/lims/reagents", "warehouse_user"),
                Arguments.of(HttpMethod.POST, "/api/equipment", "qc_user"),
                Arguments.of(HttpMethod.POST, "/api/retention-samples", "qc_user"),
                Arguments.of(HttpMethod.GET, "/api/sampling-requests", "warehouse_user"),
                Arguments.of(HttpMethod.POST, "/api/vendors", "warehouse_user"),
                Arguments.of(HttpMethod.GET, "/api/business-units", "proc_user"),
                Arguments.of(HttpMethod.POST, "/api/materials", "proc_user"),
                Arguments.of(HttpMethod.GET, "/api/audit-events", "viewer_user")
        );
    }

    private int perform(HttpMethod method, String path, String token) throws Exception {
        MvcResult result = mockMvc.perform(request(method, path)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andReturn();
        return result.getResponse().getStatus();
    }

    private int performGet(String path, String token) throws Exception {
        MvcResult result = mockMvc.perform(get(path).header("Authorization", "Bearer " + token)).andReturn();
        return result.getResponse().getStatus();
    }

    private int performPost(String path, String token, String body) throws Exception {
        MvcResult result = mockMvc.perform(post(path)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andReturn();
        return result.getResponse().getStatus();
    }

    private String login(String username) throws Exception {
        MvcResult loginResult = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "username": "%s",
                                  "password": "Test@123"
                                }
                                """.formatted(username)))
                .andReturn();

        assertEquals(200, loginResult.getResponse().getStatus(), loginResult.getResponse().getContentAsString());
        JsonNode root = objectMapper.readTree(loginResult.getResponse().getContentAsString());
        return root.get("accessToken").asText();
    }

    private void ensureUser(String username, UserRole role) {
        if (userRepository.existsByUsername(username)) {
            return;
        }

        userRepository.save(User.builder()
                .id(UUID.randomUUID())
                .username(username)
                .email(username + "@batchsphere.local")
                .passwordHash(passwordEncoder.encode("Test@123"))
                .role(role)
                .isActive(true)
                .createdAt(LocalDateTime.now())
                .build());
    }
}
