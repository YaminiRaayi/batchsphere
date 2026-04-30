package com.batchsphere.core.transactions.sampling.entity;

public enum SamplingRequestStatus {
    REQUESTED,
    PLAN_DEFINED,
    IN_PROGRESS,
    SAMPLED,
    HANDED_TO_QC,
    RECEIVED,
    UNDER_REVIEW,
    UNDER_INVESTIGATION,
    RESAMPLE_REQUIRED,
    RESAMPLED,
    RETEST_REQUIRED,
    COMPLETED,
    APPROVED,
    REJECTED,
    CANCELLED
}
