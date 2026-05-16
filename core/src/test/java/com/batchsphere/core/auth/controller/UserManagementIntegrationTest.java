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

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.io.ByteArrayOutputStream;
import java.nio.ByteBuffer;
import java.time.Instant;

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
        assertFalse(createdUser.get("totpEnabled").asBoolean());

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

    @Test
    void passwordPolicyRejectsWeakPasswordsAndAllowsUserChangePassword() throws Exception {
        String adminToken = login("admin", "Admin@123");

        MvcResult weakCreate = mockMvc.perform(post("/api/auth/users")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "username": "weak.viewer",
                                  "email": "weak.viewer@batchsphere.local",
                                  "password": "password",
                                  "role": "VIEWER"
                                }
                                """))
                .andReturn();
        assertEquals(409, weakCreate.getResponse().getStatus(), weakCreate.getResponse().getContentAsString());

        MvcResult createResult = mockMvc.perform(post("/api/auth/users")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "username": "policy.viewer",
                                  "email": "policy.viewer@batchsphere.local",
                                  "password": "Policy@123",
                                  "role": "VIEWER",
                                  "forcePasswordChange": true
                                }
                                """))
                .andReturn();
        assertEquals(200, createResult.getResponse().getStatus(), createResult.getResponse().getContentAsString());

        String userToken = login("policy.viewer", "Policy@123");
        MvcResult changeResult = mockMvc.perform(post("/api/auth/change-password")
                        .header("Authorization", "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "currentPassword": "Policy@123",
                                  "newPassword": "Better@456"
                                }
                                """))
                .andReturn();
        assertEquals(200, changeResult.getResponse().getStatus(), changeResult.getResponse().getContentAsString());
        JsonNode changed = objectMapper.readTree(changeResult.getResponse().getContentAsString());
        assertFalse(changed.get("forcePasswordChange").asBoolean());
        assertFalse(login("policy.viewer", "Better@456").isBlank());
    }

    @Test
    void userCanEnableTotpAndLoginRequiresSecondStepUntilAdminReset() throws Exception {
        String adminToken = login("admin", "Admin@123");

        MvcResult createResult = mockMvc.perform(post("/api/auth/users")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "username": "mfa.viewer",
                                  "email": "mfa.viewer@batchsphere.local",
                                  "password": "Viewer@123",
                                  "role": "VIEWER"
                                }
                                """))
                .andReturn();
        assertEquals(200, createResult.getResponse().getStatus(), createResult.getResponse().getContentAsString());
        JsonNode createdUser = objectMapper.readTree(createResult.getResponse().getContentAsString());
        String userId = createdUser.get("id").asText();

        String userToken = login("mfa.viewer", "Viewer@123");
        MvcResult setupResult = mockMvc.perform(post("/api/auth/totp/setup")
                        .header("Authorization", "Bearer " + userToken))
                .andReturn();
        assertEquals(200, setupResult.getResponse().getStatus(), setupResult.getResponse().getContentAsString());
        JsonNode setup = objectMapper.readTree(setupResult.getResponse().getContentAsString());
        assertTrue(setup.get("otpauthUrl").asText().startsWith("otpauth://totp/"));
        assertTrue(setup.get("qrCodeDataUrl").asText().startsWith("data:image/png;base64,"));
        String secret = setup.get("secret").asText();

        MvcResult enableResult = mockMvc.perform(post("/api/auth/totp/verify")
                        .header("Authorization", "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "code": "%s"
                                }
                                """.formatted(totpCode(secret))))
                .andReturn();
        assertEquals(200, enableResult.getResponse().getStatus(), enableResult.getResponse().getContentAsString());
        assertTrue(userRepository.findByUsername("mfa.viewer").orElseThrow().getTotpEnabled());

        MvcResult challengeResult = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "username": "mfa.viewer",
                                  "password": "Viewer@123"
                                }
                                """))
                .andReturn();
        assertEquals(200, challengeResult.getResponse().getStatus(), challengeResult.getResponse().getContentAsString());
        JsonNode challenge = objectMapper.readTree(challengeResult.getResponse().getContentAsString());
        assertTrue(challenge.get("mfaRequired").asBoolean());
        assertTrue(challenge.get("accessToken").isNull());
        String challengeToken = challenge.get("mfaChallengeToken").asText();

        MvcResult verifyLoginResult = mockMvc.perform(post("/api/auth/totp/verify")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "challengeToken": "%s",
                                  "code": "%s"
                                }
                                """.formatted(challengeToken, totpCode(secret))))
                .andReturn();
        assertEquals(200, verifyLoginResult.getResponse().getStatus(), verifyLoginResult.getResponse().getContentAsString());
        JsonNode verifiedLogin = objectMapper.readTree(verifyLoginResult.getResponse().getContentAsString());
        assertFalse(verifiedLogin.get("accessToken").asText().isBlank());

        MvcResult resetResult = mockMvc.perform(post("/api/auth/users/" + userId + "/totp/reset")
                        .header("Authorization", "Bearer " + adminToken))
                .andReturn();
        assertEquals(200, resetResult.getResponse().getStatus(), resetResult.getResponse().getContentAsString());
        assertFalse(userRepository.findByUsername("mfa.viewer").orElseThrow().getTotpEnabled());
        assertFalse(login("mfa.viewer", "Viewer@123").isBlank());
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

    private String totpCode(String secret) throws Exception {
        return totpCode(secret, Instant.now().getEpochSecond() / 30);
    }

    private String totpCode(String secret, long timeStep) throws Exception {
        byte[] key = base32Decode(secret);
        byte[] data = ByteBuffer.allocate(Long.BYTES).putLong(timeStep).array();
        Mac mac = Mac.getInstance("HmacSHA1");
        mac.init(new SecretKeySpec(key, "HmacSHA1"));
        byte[] hash = mac.doFinal(data);
        int offset = hash[hash.length - 1] & 0x0F;
        int binary = ((hash[offset] & 0x7F) << 24)
                | ((hash[offset + 1] & 0xFF) << 16)
                | ((hash[offset + 2] & 0xFF) << 8)
                | (hash[offset + 3] & 0xFF);
        return String.format("%06d", binary % 1_000_000);
    }

    private byte[] base32Decode(String value) {
        String normalized = value.replace("=", "").replace(" ", "").toUpperCase();
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        int buffer = 0;
        int bitsLeft = 0;
        for (char c : normalized.toCharArray()) {
            int index = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567".indexOf(c);
            if (index < 0) {
                throw new IllegalArgumentException("Invalid base32 character");
            }
            buffer = (buffer << 5) | index;
            bitsLeft += 5;
            if (bitsLeft >= 8) {
                output.write((buffer >> (bitsLeft - 8)) & 0xFF);
                bitsLeft -= 8;
            }
        }
        return output.toByteArray();
    }
}
