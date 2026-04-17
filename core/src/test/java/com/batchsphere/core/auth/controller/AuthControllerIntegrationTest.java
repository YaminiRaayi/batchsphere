package com.batchsphere.core.auth.controller;

import com.batchsphere.core.auth.repository.UserRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.MOCK)
@ActiveProfiles("test")
class AuthControllerIntegrationTest {

    @org.springframework.beans.factory.annotation.Autowired
    private WebApplicationContext webApplicationContext;

    @org.springframework.beans.factory.annotation.Autowired
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
    void loginReturnsJwtAndAllowsCurrentUserLookup() throws Exception {
        assertTrue(userRepository.existsByUsername("admin"));

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

        JsonNode root = objectMapper.readTree(loginResult.getResponse().getContentAsString());
        String token = root.get("accessToken").asText();
        String refreshToken = root.get("refreshToken").asText();
        assertFalse(token.isBlank());
        assertFalse(refreshToken.isBlank());
        assertEquals("admin", root.get("user").get("username").asText());

        MvcResult meResult = mockMvc.perform(get("/api/auth/me")
                        .header("Authorization", "Bearer " + token))
                .andReturn();
        assertEquals(200, meResult.getResponse().getStatus(), meResult.getResponse().getContentAsString());

        JsonNode meRoot = objectMapper.readTree(meResult.getResponse().getContentAsString());
        assertEquals("admin", meRoot.get("username").asText());
        assertEquals("SUPER_ADMIN", meRoot.get("role").asText());

        MvcResult refreshResult = mockMvc.perform(post("/api/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                        {
                          "refreshToken": "%s"
                        }
                        """.formatted(refreshToken)))
                .andReturn();
        assertEquals(200, refreshResult.getResponse().getStatus(), refreshResult.getResponse().getContentAsString());

        JsonNode refreshRoot = objectMapper.readTree(refreshResult.getResponse().getContentAsString());
        assertFalse(refreshRoot.get("accessToken").asText().isBlank());
        assertFalse(refreshRoot.get("refreshToken").asText().isBlank());
        assertEquals("admin", refreshRoot.get("user").get("username").asText());
    }

    @Test
    void logoutRequiresAuthenticationAndReturnsNoContentForAuthenticatedUser() throws Exception {
        MvcResult unauthenticatedLogout = mockMvc.perform(post("/api/auth/logout")).andReturn();
        assertEquals(403, unauthenticatedLogout.getResponse().getStatus(), unauthenticatedLogout.getResponse().getContentAsString());

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

        JsonNode root = objectMapper.readTree(loginResult.getResponse().getContentAsString());
        String token = root.get("accessToken").asText();

        MvcResult logoutResult = mockMvc.perform(post("/api/auth/logout")
                        .header("Authorization", "Bearer " + token))
                .andReturn();
        assertEquals(204, logoutResult.getResponse().getStatus(), logoutResult.getResponse().getContentAsString());
    }

    @Test
    void protectedEndpointRejectsMissingToken() throws Exception {
        MvcResult meResult = mockMvc.perform(get("/api/auth/me")).andReturn();
        assertEquals(403, meResult.getResponse().getStatus(), meResult.getResponse().getContentAsString());
    }
}
