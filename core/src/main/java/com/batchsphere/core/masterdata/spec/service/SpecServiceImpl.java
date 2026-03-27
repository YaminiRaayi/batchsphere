package com.batchsphere.core.masterdata.spec.service;

import com.batchsphere.core.exception.DuplicateResourceException;
import com.batchsphere.core.masterdata.spec.dto.SpecRequest;
import com.batchsphere.core.masterdata.spec.entity.Spec;
import com.batchsphere.core.masterdata.spec.repository.SpecRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SpecServiceImpl implements SpecService {

    private final SpecRepository specRepository;

    @Override
    public Spec createSpec(SpecRequest request) {
        if (specRepository.existsBySpecCode(request.getSpecCode().trim())) {
            throw new DuplicateResourceException("Spec code already exists: " + request.getSpecCode());
        }

        Spec spec = Spec.builder()
                .id(UUID.randomUUID())
                .specCode(request.getSpecCode().trim())
                .specName(request.getSpecName().trim())
                .revision(request.getRevision())
                .samplingMethod(request.getSamplingMethod())
                .referenceAttachment(request.getReferenceAttachment())
                .isActive(true)
                .createdBy(request.getCreatedBy().trim())
                .createdAt(LocalDateTime.now())
                .build();

        return specRepository.save(spec);
    }

    @Override
    public List<Spec> getAllSpecs() {
        return specRepository.findByIsActiveTrueOrderBySpecCodeAsc();
    }
}
