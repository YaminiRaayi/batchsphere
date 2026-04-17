package com.batchsphere.core.auth.security;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;

@Service
public class JwtService {

    private static final String TOKEN_USE_ACCESS = "access";
    private static final String TOKEN_USE_REFRESH = "refresh";

    private static final Base64.Encoder URL_ENCODER = Base64.getUrlEncoder().withoutPadding();
    private static final Base64.Decoder URL_DECODER = Base64.getUrlDecoder();
    private static final TypeReference<Map<String, Object>> MAP_TYPE = new TypeReference<>() {};

    private final ObjectMapper objectMapper;
    private final byte[] secret;
    private final long accessExpirationSeconds;
    private final long refreshExpirationSeconds;

    public JwtService(
            @Value("${app.auth.jwt.secret}") String secret,
            @Value("${app.auth.jwt.expiration-seconds:3600}") long accessExpirationSeconds,
            @Value("${app.auth.jwt.refresh-expiration-seconds:604800}") long refreshExpirationSeconds
    ) {
        this.objectMapper = new ObjectMapper();
        this.secret = secret.getBytes(StandardCharsets.UTF_8);
        this.accessExpirationSeconds = accessExpirationSeconds;
        this.refreshExpirationSeconds = refreshExpirationSeconds;
    }

    public String generateAccessToken(AuthenticatedUser user) {
        return generateToken(user, TOKEN_USE_ACCESS, accessExpirationSeconds);
    }

    public String generateRefreshToken(AuthenticatedUser user) {
        return generateToken(user, TOKEN_USE_REFRESH, refreshExpirationSeconds);
    }

    public String generateToken(AuthenticatedUser user, String tokenUse, long expirationSeconds) {
        Instant now = Instant.now();
        Map<String, Object> claims = new HashMap<>();
        claims.put("sub", user.getUsername());
        claims.put("userId", user.getId().toString());
        claims.put("role", user.getRole());
        claims.put("employeeId", user.getEmployeeId() != null ? user.getEmployeeId().toString() : null);
        claims.put("tokenUse", tokenUse);
        claims.put("iat", now.getEpochSecond());
        claims.put("exp", now.plusSeconds(expirationSeconds).getEpochSecond());
        return encode(claims);
    }

    public String extractUsername(String token) {
        return (String) decode(token).get("sub");
    }

    public boolean isAccessTokenValid(String token, AuthenticatedUser user) {
        return isTokenValid(token, user, TOKEN_USE_ACCESS);
    }

    public boolean isRefreshTokenValid(String token, AuthenticatedUser user) {
        return isTokenValid(token, user, TOKEN_USE_REFRESH);
    }

    public boolean isTokenValid(String token, AuthenticatedUser user, String expectedTokenUse) {
        Map<String, Object> claims = decode(token);
        String username = (String) claims.get("sub");
        String tokenUse = (String) claims.get("tokenUse");
        Number expiry = (Number) claims.get("exp");
        return user.getUsername().equals(username)
                && expectedTokenUse.equals(tokenUse)
                && expiry != null
                && Instant.now().isBefore(Instant.ofEpochSecond(expiry.longValue()));
    }

    public long getExpirationSeconds() {
        return accessExpirationSeconds;
    }

    public long getRefreshExpirationSeconds() {
        return refreshExpirationSeconds;
    }

    private String encode(Map<String, Object> claims) {
        try {
            String header = URL_ENCODER.encodeToString(objectMapper.writeValueAsBytes(Map.of(
                    "alg", "HS256",
                    "typ", "JWT"
            )));
            String payload = URL_ENCODER.encodeToString(objectMapper.writeValueAsBytes(claims));
            String signature = sign(header + "." + payload);
            return header + "." + payload + "." + signature;
        } catch (Exception ex) {
            throw new IllegalStateException("Failed to generate JWT", ex);
        }
    }

    private Map<String, Object> decode(String token) {
        try {
            String[] parts = token.split("\\.");
            if (parts.length != 3) {
                throw new IllegalArgumentException("Invalid JWT format");
            }

            String expectedSignature = sign(parts[0] + "." + parts[1]);
            if (!expectedSignature.equals(parts[2])) {
                throw new IllegalArgumentException("Invalid JWT signature");
            }

            byte[] payloadBytes = URL_DECODER.decode(parts[1]);
            return objectMapper.readValue(payloadBytes, MAP_TYPE);
        } catch (Exception ex) {
            throw new IllegalArgumentException("Invalid JWT token", ex);
        }
    }

    private String sign(String value) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(secret, "HmacSHA256"));
        return URL_ENCODER.encodeToString(mac.doFinal(value.getBytes(StandardCharsets.UTF_8)));
    }
}
