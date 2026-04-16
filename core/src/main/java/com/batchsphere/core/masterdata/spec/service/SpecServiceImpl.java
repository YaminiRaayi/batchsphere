package com.batchsphere.core.masterdata.spec.service;

import com.batchsphere.core.exception.DuplicateResourceException;
import com.batchsphere.core.exception.ResourceNotFoundException;
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
    public Spec getSpecById(UUID id) {
        return specRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Spec not found with id: " + id));
    }

    @Override
    public List<Spec> getAllSpecs() {
        return specRepository.findByIsActiveTrueOrderBySpecCodeAsc();
    }

    @Override
    public Spec updateSpec(UUID id, SpecRequest request) {
        Spec spec = getSpecById(id);
        String specCode = request.getSpecCode().trim();

        if (!spec.getSpecCode().equals(specCode) && specRepository.existsBySpecCode(specCode)) {
            throw new DuplicateResourceException("Spec code already exists: " + request.getSpecCode());
        }

        spec.setSpecCode(specCode);
        spec.setSpecName(request.getSpecName().trim());
        spec.setRevision(request.getRevision());
        spec.setSamplingMethod(request.getSamplingMethod());
        spec.setReferenceAttachment(request.getReferenceAttachment());
        spec.setUpdatedBy(request.getCreatedBy().trim());
        spec.setUpdatedAt(LocalDateTime.now());

        return specRepository.save(spec);
    }

    @Override
    public void deactivateSpec(UUID id) {
        Spec spec = getSpecById(id);
        spec.setIsActive(false);
        spec.setUpdatedAt(LocalDateTime.now());
        specRepository.save(spec);
    }
}
