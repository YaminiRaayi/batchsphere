package com.batchsphere.core.auth.controller;

import com.batchsphere.core.auth.entity.User;
import com.batchsphere.core.auth.entity.UserRole;
import com.batchsphere.core.auth.repository.UserRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import java.time.LocalDateTime;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

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
        ensureUser("proc_user", UserRole.PROCUREMENT);
    }

    @Test
    void procurementCanAccessPartnerApisButNotWarehouseFlows() throws Exception {
        String token = login("proc_user");

        assertEquals(200, performGet("/api/suppliers", token));
        assertEquals(403, performGet("/api/grns", token));
        assertEquals(403, performGet("/api/auth/users", token));
    }

    @Test
    void warehouseCanAccessWarehouseFlowsButNotQcApis() throws Exception {
        String token = login("warehouse_user");

        assertEquals(200, performGet("/api/grns", token));
        assertEquals(403, performGet("/api/sampling-requests", token));
    }

    @Test
    void qcCanAccessQcApisButNotProcurementApis() throws Exception {
        String token = login("qc_user");

        assertEquals(200, performGet("/api/sampling-requests", token));
        assertEquals(403, performGet("/api/vendors", token));
    }

    private int performGet(String path, String token) throws Exception {
        MvcResult result = mockMvc.perform(get(path).header("Authorization", "Bearer " + token)).andReturn();
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
