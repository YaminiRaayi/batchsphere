package com.batchsphere.core.compliance.security.entity;

public enum SecurityAuditEventType {
    LOGIN,
    LOGOUT,
    LOGIN_FAILED,
    SESSION_TIMEOUT,
    PASSWORD_CHANGED,
    ACCOUNT_LOCKED,
    ACCOUNT_UNLOCKED,
    MFA_CHALLENGE,
    MFA_ENABLED,
    MFA_FAILED,
    MFA_RESET
}
