package com.batchsphere.core.masterdata.material.service;

import com.batchsphere.core.auth.entity.User;
import com.batchsphere.core.auth.entity.UserRole;
import com.batchsphere.core.auth.security.AuthenticatedUser;
import com.batchsphere.core.masterdata.material.dto.MaterialRequest;
import com.batchsphere.core.masterdata.material.entity.Material;
import com.batchsphere.core.masterdata.material.entity.StorageCondition;
import com.batchsphere.core.masterdata.material.repository.MaterialRepository;
import com.batchsphere.core.masterdata.quality.enums.ReviewRoute;
import com.batchsphere.core.masterdata.spec.entity.Spec;
import com.batchsphere.core.masterdata.spec.entity.SpecStatus;
import com.batchsphere.core.masterdata.spec.entity.SpecType;
import com.batchsphere.core.masterdata.spec.repository.SpecRepository;
import com.batchsphere.core.transactions.sampling.entity.SamplingMethod;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDateTime;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

@SpringBootTest
@ActiveProfiles("test")
class MaterialServiceIntegrationTest {

    @Autowired
    private MaterialServiceInterface materialService;

    @Autowired
    private SpecRepository specRepository;

    @Autowired
    private MaterialRepository materialRepository;

    @BeforeEach
    void setUpAuthentication() {
        AuthenticatedUser user = new AuthenticatedUser(User.builder()
                .id(UUID.randomUUID())
                .username("material-tester")
                .email("material-tester@batchsphere.local")
                .passwordHash("ignored")
                .role(UserRole.SUPER_ADMIN)
                .isActive(true)
                .createdAt(LocalDateTime.now())
                .build());
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(user, null, user.getAuthorities())
        );
    }

    @AfterEach
    void clearAuthentication() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void createMaterialPersistsExtendedMasterDataFields() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Spec spec = specRepository.save(Spec.builder()
                .id(UUID.randomUUID())
                .specCode("SPEC-MAT-" + suffix)
                .specName("Material Spec " + suffix)
                .revision("v1")
                .specType(SpecType.MATERIAL)
                .status(SpecStatus.APPROVED)
                .samplingMethod(SamplingMethod.SQRT_N_PLUS_1)
                .reviewRoute(ReviewRoute.QC_ONLY)
                .isActive(true)
                .createdBy("tester")
                .createdAt(LocalDateTime.now())
                .build());

        MaterialRequest request = new MaterialRequest();
        request.setMaterialCode("MAT-EXT-" + suffix);
        request.setMaterialName("Extended Material");
        request.setMaterialCategory("EXCIPIENT");
        request.setGenericNames("Magnesium stearate");
        request.setMaterialType("NON_CRITICAL");
        request.setUom("KG");
        request.setSpecId(spec.getId());
        request.setHsnCode("29157090");
        request.setCasNumber("557-04-0");
        request.setPharmacopoeialRef("IP 2022");
        request.setStorageCondition(StorageCondition.AMBIENT);
        request.setMaxHumidity("NMT 65%");
        request.setLightSensitivity("AMBER_CONTAINER");
        request.setHygroscopic(true);
        request.setShelfLifeMonths(36);
        request.setRetestPeriodMonths(24);
        request.setReorderLevel("50 KG");
        request.setLeadTimeDays(14);
        request.setControlledSubstance(false);
        request.setPhotosensitive(true);
        request.setHazardous(false);
        request.setSelectiveMaterial(false);
        request.setVendorCoaReleaseAllowed(true);
        request.setSamplingRequired(true);
        request.setDescription("Extended material attributes");
        request.setCreatedBy("tester");

        Material saved = materialService.createMaterial(request);
        Material reloaded = materialRepository.findById(saved.getId()).orElseThrow();

        assertNotNull(saved.getId());
        assertEquals("EXCIPIENT", reloaded.getMaterialCategory());
        assertEquals("Magnesium stearate", reloaded.getGenericNames());
        assertEquals("29157090", reloaded.getHsnCode());
        assertEquals("557-04-0", reloaded.getCasNumber());
        assertEquals("IP 2022", reloaded.getPharmacopoeialRef());
        assertEquals("NMT 65%", reloaded.getMaxHumidity());
        assertEquals("AMBER_CONTAINER", reloaded.getLightSensitivity());
        assertEquals(36, reloaded.getShelfLifeMonths());
        assertEquals(24, reloaded.getRetestPeriodMonths());
        assertEquals("50 KG", reloaded.getReorderLevel());
        assertEquals(14, reloaded.getLeadTimeDays());
        assertEquals(false, reloaded.getControlledSubstance());
        assertEquals(true, reloaded.getPhotosensitive());
        assertEquals(true, reloaded.getHygroscopic());
    }
}
