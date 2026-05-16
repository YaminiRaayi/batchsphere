package com.batchsphere.core.auth.service;

import com.batchsphere.core.auth.dto.LoginResponse;
import com.batchsphere.core.auth.dto.TotpResetResponse;
import com.batchsphere.core.auth.dto.TotpSetupResponse;
import com.batchsphere.core.auth.dto.TotpVerifyRequest;
import com.batchsphere.core.auth.entity.User;
import com.batchsphere.core.auth.repository.UserRepository;
import com.batchsphere.core.auth.security.AuthenticatedUser;
import com.batchsphere.core.auth.security.JwtService;
import com.batchsphere.core.compliance.security.entity.SecurityAuditEventType;
import com.batchsphere.core.compliance.security.service.SecurityAuditEventService;
import com.batchsphere.core.exception.BusinessConflictException;
import com.batchsphere.core.exception.ResourceNotFoundException;
import com.google.zxing.BarcodeFormat;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.io.ByteArrayOutputStream;
import java.net.URLEncoder;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TotpService {

    private static final String ISSUER = "BatchSphere";
    private static final int SECRET_BYTES = 20;
    private static final int TIME_STEP_SECONDS = 30;
    private static final int CODE_DIGITS = 6;
    private static final int WINDOW_STEPS = 1;

    private final UserRepository userRepository;
    private final JwtService jwtService;
    private final SecurityAuditEventService securityAuditEventService;
    private final SecureRandom secureRandom = new SecureRandom();

    @Transactional
    public TotpSetupResponse setup(AuthenticatedUser authenticatedUser) {
        User user = userRepository.findById(authenticatedUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + authenticatedUser.getId()));
        String secret = generateSecret();
        user.setTotpPendingSecret(secret);
        user.setUpdatedAt(LocalDateTime.now());
        userRepository.save(user);

        String otpauthUrl = otpauthUrl(user.getUsername(), secret);
        return TotpSetupResponse.builder()
                .secret(secret)
                .otpauthUrl(otpauthUrl)
                .qrCodeDataUrl(qrCodeDataUrl(otpauthUrl))
                .build();
    }

    @Transactional
    public LoginResponse verify(TotpVerifyRequest request, AuthenticatedUser authenticatedUser, HttpServletRequest httpRequest) {
        if (request.getChallengeToken() != null && !request.getChallengeToken().isBlank()) {
            return verifyLoginChallenge(request, httpRequest);
        }
        if (authenticatedUser == null) {
            throw new BusinessConflictException("Authenticated user is required for TOTP setup verification");
        }
        User user = userRepository.findById(authenticatedUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + authenticatedUser.getId()));
        String pendingSecret = user.getTotpPendingSecret();
        if (pendingSecret == null || pendingSecret.isBlank()) {
            throw new BusinessConflictException("No pending TOTP setup found for this user");
        }
        if (!isCodeValid(pendingSecret, request.getCode())) {
            securityAuditEventService.record(SecurityAuditEventType.MFA_FAILED, user.getUsername(),
                    extractIp(httpRequest), extractUserAgent(httpRequest), "Invalid setup TOTP code");
            throw new BusinessConflictException("Invalid TOTP code");
        }
        user.setTotpSecret(pendingSecret);
        user.setTotpPendingSecret(null);
        user.setTotpEnabled(true);
        user.setUpdatedAt(LocalDateTime.now());
        User saved = userRepository.save(user);
        securityAuditEventService.record(SecurityAuditEventType.MFA_ENABLED, saved.getUsername(),
                extractIp(httpRequest), extractUserAgent(httpRequest), "TOTP MFA enabled");
        return buildLoginResponse(new AuthenticatedUser(saved));
    }

    @Transactional
    public TotpResetResponse reset(UUID userId, HttpServletRequest httpRequest) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));
        user.setTotpSecret(null);
        user.setTotpPendingSecret(null);
        user.setTotpEnabled(false);
        user.setUpdatedAt(LocalDateTime.now());
        User saved = userRepository.save(user);
        securityAuditEventService.record(SecurityAuditEventType.MFA_RESET, saved.getUsername(),
                extractIp(httpRequest), extractUserAgent(httpRequest), "TOTP MFA reset by SUPER_ADMIN");
        return TotpResetResponse.builder()
                .userId(saved.getId())
                .username(saved.getUsername())
                .totpEnabled(saved.getTotpEnabled())
                .build();
    }

    public boolean isCodeValid(String secret, String code) {
        long currentStep = Instant.now().getEpochSecond() / TIME_STEP_SECONDS;
        for (long offset = -WINDOW_STEPS; offset <= WINDOW_STEPS; offset++) {
            if (generateCode(secret, currentStep + offset).equals(code)) {
                return true;
            }
        }
        return false;
    }

    public String buildChallengeToken(User user) {
        return jwtService.generateMfaChallengeToken(new AuthenticatedUser(user));
    }

    private LoginResponse verifyLoginChallenge(TotpVerifyRequest request, HttpServletRequest httpRequest) {
        String username;
        try {
            username = jwtService.extractUsername(request.getChallengeToken());
        } catch (IllegalArgumentException ex) {
            throw new BusinessConflictException("Invalid MFA challenge token");
        }
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new BusinessConflictException("Invalid MFA challenge token"));
        if (!Boolean.TRUE.equals(user.getIsActive())
                || (user.getLockedUntil() != null && user.getLockedUntil().isAfter(LocalDateTime.now()))) {
            throw new BusinessConflictException("User account is not eligible for MFA verification");
        }
        AuthenticatedUser authenticatedUser = new AuthenticatedUser(user);
        if (!jwtService.isMfaChallengeTokenValid(request.getChallengeToken(), authenticatedUser)) {
            throw new BusinessConflictException("Invalid MFA challenge token");
        }
        if (!Boolean.TRUE.equals(user.getTotpEnabled()) || user.getTotpSecret() == null) {
            throw new BusinessConflictException("TOTP MFA is not enabled for this user");
        }
        if (!isCodeValid(user.getTotpSecret(), request.getCode())) {
            securityAuditEventService.record(SecurityAuditEventType.MFA_FAILED, user.getUsername(),
                    extractIp(httpRequest), extractUserAgent(httpRequest), "Invalid login TOTP code");
            throw new BusinessConflictException("Invalid TOTP code");
        }
        securityAuditEventService.record(SecurityAuditEventType.LOGIN, user.getUsername(),
                extractIp(httpRequest), extractUserAgent(httpRequest), "TOTP MFA verified");
        return buildLoginResponse(authenticatedUser);
    }

    private LoginResponse buildLoginResponse(AuthenticatedUser user) {
        return LoginResponse.builder()
                .accessToken(jwtService.generateAccessToken(user))
                .refreshToken(jwtService.generateRefreshToken(user))
                .tokenType("Bearer")
                .expiresInSeconds(jwtService.getExpirationSeconds())
                .refreshExpiresInSeconds(jwtService.getRefreshExpirationSeconds())
                .user(AuthUserMapper.toResponse(user))
                .mfaRequired(false)
                .mfaChallengeToken(null)
                .build();
    }

    private String generateSecret() {
        byte[] bytes = new byte[SECRET_BYTES];
        secureRandom.nextBytes(bytes);
        return base32Encode(bytes);
    }

    private String generateCode(String secret, long timeStep) {
        try {
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
            int otp = binary % (int) Math.pow(10, CODE_DIGITS);
            return String.format("%0" + CODE_DIGITS + "d", otp);
        } catch (Exception ex) {
            throw new IllegalStateException("Failed to generate TOTP code", ex);
        }
    }

    private String otpauthUrl(String username, String secret) {
        String label = URLEncoder.encode(ISSUER + ":" + username, StandardCharsets.UTF_8);
        String issuer = URLEncoder.encode(ISSUER, StandardCharsets.UTF_8);
        return "otpauth://totp/" + label + "?secret=" + secret + "&issuer=" + issuer + "&digits=6&period=30";
    }

    private String qrCodeDataUrl(String value) {
        try {
            BitMatrix matrix = new QRCodeWriter().encode(value, BarcodeFormat.QR_CODE, 240, 240);
            ByteArrayOutputStream output = new ByteArrayOutputStream();
            MatrixToImageWriter.writeToStream(matrix, "PNG", output);
            return "data:image/png;base64," + Base64.getEncoder().encodeToString(output.toByteArray());
        } catch (Exception ex) {
            throw new IllegalStateException("Failed to generate TOTP QR code", ex);
        }
    }

    private String base32Encode(byte[] data) {
        final char[] alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567".toCharArray();
        StringBuilder result = new StringBuilder((data.length * 8 + 4) / 5);
        int buffer = 0;
        int bitsLeft = 0;
        for (byte value : data) {
            buffer = (buffer << 8) | (value & 0xFF);
            bitsLeft += 8;
            while (bitsLeft >= 5) {
                result.append(alphabet[(buffer >> (bitsLeft - 5)) & 0x1F]);
                bitsLeft -= 5;
            }
        }
        if (bitsLeft > 0) {
            result.append(alphabet[(buffer << (5 - bitsLeft)) & 0x1F]);
        }
        return result.toString();
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

    private String extractIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    private String extractUserAgent(HttpServletRequest request) {
        return request.getHeader("User-Agent");
    }
}
