package com.batchsphere.core.exception;

public class ResourceNotFoundException extends  RuntimeException{
    public ResourceNotFoundException(String message){
      super(message);
    }
}
