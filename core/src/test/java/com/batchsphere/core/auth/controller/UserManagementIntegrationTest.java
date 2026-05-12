package com.batchsphere.core.auth.controller;

import com.batchsphere.core.auth.repository.UserRepository;
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
class UserManagementIntegrationTest {

    @Autowired
    private WebApplicationContext webApplicationContext;

    @Autowired
    private UserRepository userRepository;

    private MockMvc mockMvc;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(webApplicationContext)
                .apply(springSecurity())
                .build();
    }

    @Test
    void superAdminCanCreateListUpdateAndDeactivateUsers() throws Exception {
        String adminToken = login("admin", "Admin@123");

        MvcResult createResult = mockMvc.perform(post("/api/auth/users")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "username": "viewer_one",
                                  "email": "viewer.one@batchsphere.local",
                                  "password": "Viewer@123",
                                  "role": "VIEWER"
                                }
                                """))
                .andReturn();
        assertEquals(200, createResult.getResponse().getStatus(), createResult.getResponse().getContentAsString());

        JsonNode createdUser = objectMapper.readTree(createResult.getResponse().getContentAsString());
        String userId = createdUser.get("id").asText();
        assertEquals("viewer_one", createdUser.get("username").asText());
        assertTrue(createdUser.get("isActive").asBoolean());
        assertEquals(0, createdUser.get("failedLoginAttempts").asInt());
        assertFalse(createdUser.get("forcePasswordChange").asBoolean());

        MvcResult listResult = mockMvc.perform(get("/api/auth/users")
                        .header("Authorization", "Bearer " + adminToken))
                .andReturn();
        assertEquals(200, listResult.getResponse().getStatus(), listResult.getResponse().getContentAsString());
        assertTrue(listResult.getResponse().getContentAsString().contains("viewer_one"));

        MvcResult updateResult = mockMvc.perform(put("/api/auth/users/" + userId)
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "email": "viewer.updated@batchsphere.local",
                                  "role": "PROCUREMENT",
                                  "isActive": true,
                                  "forcePasswordChange": true,
                                  "password": "Viewer@456"
                                }
                                """))
                .andReturn();
        assertEquals(200, updateResult.getResponse().getStatus(), updateResult.getResponse().getContentAsString());
        JsonNode updatedUser = objectMapper.readTree(updateResult.getResponse().getContentAsString());
        assertEquals("viewer.updated@batchsphere.local", updatedUser.get("email").asText());
        assertEquals("PROCUREMENT", updatedUser.get("role").asText());
        assertTrue(updatedUser.get("forcePasswordChange").asBoolean());

        String updatedToken = login("viewer_one", "Viewer@456");
        assertFalse(updatedToken.isBlank());

        MvcResult deactivateResult = mockMvc.perform(delete("/api/auth/users/" + userId)
                        .header("Authorization", "Bearer " + adminToken))
                .andReturn();
        assertEquals(204, deactivateResult.getResponse().getStatus(), deactivateResult.getResponse().getContentAsString());

        assertFalse(userRepository.findByUsername("viewer_one").orElseThrow().getIsActive());
    }

    @Test
    void superAdminCanUnlockLockedUser() throws Exception {
        String adminToken = login("admin", "Admin@123");

        MvcResult createResult = mockMvc.perform(post("/api/auth/users")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "username": "locked.viewer",
                                  "email": "locked.viewer@batchsphere.local",
                                  "password": "Viewer@123",
                                  "role": "VIEWER"
                                }
                                """))
                .andReturn();
        assertEquals(200, createResult.getResponse().getStatus(), createResult.getResponse().getContentAsString());

        for (int attempt = 0; attempt < 5; attempt++) {
            MvcResult failedLogin = mockMvc.perform(post("/api/auth/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {
                                      "username": "locked.viewer",
                                      "password": "Wrong@123"
                                    }
                                    """))
                    .andReturn();
            assertEquals(409, failedLogin.getResponse().getStatus(), failedLogin.getResponse().getContentAsString());
        }

        var lockedUser = userRepository.findByUsername("locked.viewer").orElseThrow();
        assertEquals(5, lockedUser.getFailedLoginAttempts());
        assertTrue(lockedUser.getLockedUntil() != null);

        MvcResult lockedLogin = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "username": "locked.viewer",
                                  "password": "Viewer@123"
                                }
                                """))
                .andReturn();
        assertEquals(409, lockedLogin.getResponse().getStatus(), lockedLogin.getResponse().getContentAsString());
        assertTrue(lockedLogin.getResponse().getContentAsString().contains("locked"));

        MvcResult unlockResult = mockMvc.perform(post("/api/auth/users/" + lockedUser.getId() + "/unlock")
                        .header("Authorization", "Bearer " + adminToken))
                .andReturn();
        assertEquals(200, unlockResult.getResponse().getStatus(), unlockResult.getResponse().getContentAsString());
        JsonNode unlocked = objectMapper.readTree(unlockResult.getResponse().getContentAsString());
        assertEquals(0, unlocked.get("failedLoginAttempts").asInt());
        assertTrue(unlocked.get("lockedUntil").isNull());

        assertFalse(login("locked.viewer", "Viewer@123").isBlank());
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
        return root.get("accessToken").asText();
    }
}
