package com.batchsphere.core.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.LocalDateTime;
import java.util.stream.Collectors;

@RestControllerAdvice
public class GlobalExceptionHandler {
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidException(MethodArgumentNotValidException ex) {
String errors = ex.getBindingResult()
        .getFieldErrors().stream()
        .map(error ->error.getField() +": "+ error.getDefaultMessage())
        .collect(Collectors.joining(", "));
ErrorResponse errorResponse = new ErrorResponse("Validation Failed",errors, LocalDateTime.now());
    return new ResponseEntity<>(errorResponse, HttpStatus.BAD_REQUEST);
    }
    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<ErrorResponse> handleMaxUploadSizeExceeded(MaxUploadSizeExceededException ex) {
        ErrorResponse response = new ErrorResponse(
                "Upload Too Large",
                "Uploaded file exceeds the 20MB limit",
                LocalDateTime.now()
        );
        return new ResponseEntity<>(response, HttpStatus.PAYLOAD_TOO_LARGE);
    }

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<ErrorResponse> handleRuntimeException(RuntimeException ex){
        ErrorResponse errorResponse = new ErrorResponse("Application Error", ex.getMessage(),LocalDateTime.now());
        return  new ResponseEntity<>(errorResponse, HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(DuplicateResourceException.class)
    public ResponseEntity<ErrorResponse> handleDupliateException(DuplicateResourceException ex)
    {
        ErrorResponse response = new ErrorResponse("Duplicate Resource",
                ex.getMessage(),
                LocalDateTime.now());
        return new ResponseEntity<>(response, HttpStatus.CONFLICT);
    }

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ErrorResponse> resourceNotFoundException(ResourceNotFoundException res){
        ErrorResponse response = new ErrorResponse("Resource Not Found ",
                res.getMessage(),LocalDateTime.now());
        return new ResponseEntity<>(response, HttpStatus.NOT_FOUND);
    }

    @ExceptionHandler(BusinessConflictException.class)
    public ResponseEntity<ErrorResponse> resourceNotFoundException(BusinessConflictException res){
        ErrorResponse response = new ErrorResponse("Business Rule Violation ",
                res.getMessage(),LocalDateTime.now());
        return new ResponseEntity<>(response, HttpStatus.CONFLICT);
    }

}
