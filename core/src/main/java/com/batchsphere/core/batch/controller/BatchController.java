package com.batchsphere.core.batch.controller;

import com.batchsphere.core.batch.dto.BatchRequest;
import com.batchsphere.core.batch.dto.BatchTransitionRequest;
import com.batchsphere.core.batch.entity.Batch;
import com.batchsphere.core.batch.service.BatchService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/batches")
@RequiredArgsConstructor
public class BatchController {

    private final BatchService batchService;

    @PostMapping
    public ResponseEntity<Batch> createBatch(@Valid @RequestBody BatchRequest request){
        Batch batch = batchService.createBatch(request);
        return ResponseEntity.ok(batch);
    }

    @PostMapping("{id}/transition")
    public ResponseEntity<Batch> transitionBatch(@PathVariable UUID id , @Valid @RequestBody BatchTransitionRequest request){
        Batch batch =  batchService.transitionBatchStatus(id, request);
        return  ResponseEntity.ok(batch);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Batch>  getBatchById(@PathVariable UUID id){
        return ResponseEntity.ok(batchService.getBatchById(id));
    }

    @GetMapping
    public ResponseEntity<Page<Batch>> getAllBatches(Pageable pageable){
        return ResponseEntity.ok(batchService.getAllBatches(pageable));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deactivateBatch(@PathVariable UUID id){
        batchService.deactivateBatch(id);
        return  ResponseEntity.noContent().build();
    }
}
