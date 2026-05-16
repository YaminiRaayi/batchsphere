package com.batchsphere.core.exception;

public class RecordLockedException extends RuntimeException {
    public RecordLockedException(String message) {
        super(message);
    }
}
