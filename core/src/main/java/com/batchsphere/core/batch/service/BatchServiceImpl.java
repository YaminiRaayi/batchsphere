package com.batchsphere.core.batch.service;

import com.batchsphere.core.batch.dto.BatchRequest;
import com.batchsphere.core.batch.dto.BatchTransitionRequest;
import com.batchsphere.core.batch.entity.Batch;
import com.batchsphere.core.batch.entity.BatchStatus;
import com.batchsphere.core.batch.repository.BatchRepository;
import com.batchsphere.core.exception.BusinessConflictException;
import com.batchsphere.core.exception.DuplicateResourceException;
import com.batchsphere.core.exception.ResourceNotFoundException;
import com.batchsphere.core.masterdata.entity.Material;
import com.batchsphere.core.masterdata.repository.MaterialRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cglib.core.Local;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.UUID;


@Service
@RequiredArgsConstructor
public class BatchServiceImpl implements BatchService {
  private final BatchRepository batchRepository;
  private final MaterialRepository materialRepository;

    /**
     * @param request
     * @return
     */
    @Override
    public Batch createBatch(BatchRequest request) {

        if(batchRepository.existsByBatchNumber(request.getBatchNumber())){
            throw  new DuplicateResourceException("Batch Number already exists: " +request.getBatchNumber());
        }

        Material material = materialRepository.findById(request.getMaterialId()).orElseThrow(() -> new ResourceNotFoundException("Material Not found with Id: " +request.getMaterialId()));

        Batch batch = Batch.builder()
                .id(UUID.randomUUID())
                .batchNumber(request.getBatchNumber())
                .material(material)
                .batchType(request.getBatchType())
                .batchStatus(BatchStatus.CREATED)
                .quantity(request.getQuantity())
                .unitOfMeasure(request.getUnitOfMeasure())
                .manufactureDate(request.getManufactureDate())
                .expiryDate(request.getExpiryDate())
                .retestDate(request.getRetestDate())
                .isActive(true)
                .createdBy(request.getCreatedBy())
                .createdAt(LocalDateTime.now())
                .build();

        return batchRepository.save(batch);



    }

    /**
     * @param id
     * @param transitionRequest
     * @return
     */
    @Override
    public Batch transitionBatchStatus(UUID id, BatchTransitionRequest request) {

        Batch batch = batchRepository.findById(id).orElseThrow(()-> new ResourceNotFoundException("Batch Not Found bWith this Id: " +id));

        BatchStatus current = batch.getBatchStatus();
        BatchStatus target = request.getTargetStatus();
        if(!isTransitionAllowed(batch, current, target)){
            throw new BusinessConflictException(
                    "Illegal status transition from " + current + " to " + target
            );
        }
        batch.setBatchStatus(target);
        batch.setUpdatedBy(request.getUpdatedBy());
        batch.setUpdatedAt(LocalDateTime.now());

        return batchRepository.save(batch);
    }

    /**
     * @param id
     * @return
     */
    @Override
    public Batch getBatchById(UUID id) {
        return batchRepository.findById(id).orElseThrow(()-> new ResourceNotFoundException("Batch not found with id: " +id));
    }

    /**
     * @param pageable
     * @return
     */
    @Override
    public Page<Batch> getAllBatches(Pageable pageable) {
        return batchRepository.findByISActiveTrue(pageable);
    }

    /**
     * @param id
     */
    @Override
    public void deactivateBatch(UUID id) {

        Batch batch = batchRepository.findById(id).orElseThrow(()->
                new ResourceNotFoundException("Batch Not found with id: " +id));
        batch.setIsActive(false);
        batch.setUpdatedAt(LocalDateTime.now());

        batchRepository.save(batch);

    }

    private boolean isTransitionAllowed(Batch batch, BatchStatus current, BatchStatus target) {
        if(target == BatchStatus.REJECTED) return  true;
        switch (current) {
            case CREATED -> {
                return target == BatchStatus.QUARANTINE;
            }
            case QUARANTINE -> {
                return  target == BatchStatus.UNDER_TEST;
            }
            case UNDER_TEST -> {
                return target == BatchStatus.QC_APPROVED;
            }
            case QC_APPROVED -> {
                if(batch.getBatchType().name().equals("FINISHED_GOOD")){
                    return  target == BatchStatus.QA_RELEASED || target == BatchStatus.EXPIRED;
                }else{
                    return target == BatchStatus.EXPIRED;
                }
            }
            case QA_RELEASED -> {
                return target == BatchStatus.EXPIRED;
            }
            default -> {
                return false;
            }
        }
    }
}
