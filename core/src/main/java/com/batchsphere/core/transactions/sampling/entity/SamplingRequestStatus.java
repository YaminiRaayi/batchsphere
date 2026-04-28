package com.batchsphere.core.transactions.sampling.entity;

public enum SamplingRequestStatus {
    REQUESTED,
    PLAN_DEFINED,
    IN_PROGRESS,
    SAMPLED,
    HANDED_TO_QC,
    RECEIVED,
    UNDER_REVIEW,
    COMPLETED,
    APPROVED,
    REJECTED,
    CANCELLED
}
