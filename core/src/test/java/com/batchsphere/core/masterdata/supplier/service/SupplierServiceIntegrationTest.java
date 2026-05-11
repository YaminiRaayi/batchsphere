package com.batchsphere.core.masterdata.supplier.service;

import com.batchsphere.core.auth.entity.User;
import com.batchsphere.core.auth.entity.UserRole;
import com.batchsphere.core.auth.security.AuthenticatedUser;
import com.batchsphere.core.masterdata.supplier.dto.supplier.dto.SupplierRequest;
import com.batchsphere.core.masterdata.supplier.dto.supplier.dto.SupplierResponse;
import com.batchsphere.core.masterdata.supplier.entity.SupplierQualificationStatus;
import com.batchsphere.core.masterdata.supplier.entity.SupplierType;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

@SpringBootTest
@ActiveProfiles("test")
class SupplierServiceIntegrationTest {

    @Autowired
    private SupplierService supplierService;

    @BeforeEach
    void setUpAuthentication() {
        AuthenticatedUser user = new AuthenticatedUser(User.builder()
                .id(UUID.randomUUID())
                .username("supplier-tester")
                .email("supplier-tester@batchsphere.local")
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
    void createAndUpdateSupplierPersistsPharmaFields() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        SupplierRequest createRequest = new SupplierRequest();
        createRequest.setSupplierCode("SUP-PH-" + suffix);
        createRequest.setSupplierName("Pharma Supplier");
        createRequest.setContactPerson("Fixture User");
        createRequest.setEmail("supplier@example.com");
        createRequest.setPhone("9999999999");
        createRequest.setSupplierType(SupplierType.MANUFACTURER);
        createRequest.setQualificationStatus(SupplierQualificationStatus.QUALIFIED);
        createRequest.setCountryOfManufacture("India");
        createRequest.setGmpcertNumber("GMP-" + suffix);
        createRequest.setGmpcertIssuingAuthority("CDSCO");
        createRequest.setGmpcertExpiryDate(LocalDate.now().plusYears(1));
        createRequest.setApprovedSince(LocalDate.now().minusMonths(6));
        createRequest.setLastAuditDate(LocalDate.now().minusMonths(1));
        createRequest.setNextAuditDue(LocalDate.now().plusMonths(11));
        createRequest.setOpenCapaCount(1);
        createRequest.setCreatedBy("tester");

        SupplierResponse created = supplierService.createSupplier(createRequest);
        assertNotNull(created.getId());
        assertEquals(SupplierType.MANUFACTURER, created.getSupplierType());
        assertEquals(SupplierQualificationStatus.QUALIFIED, created.getQualificationStatus());
        assertEquals("India", created.getCountryOfManufacture());

        SupplierRequest updateRequest = new SupplierRequest();
        updateRequest.setSupplierCode(created.getSupplierCode());
        updateRequest.setSupplierName(created.getSupplierName());
        updateRequest.setContactPerson(created.getContactPerson());
        updateRequest.setEmail(created.getEmail());
        updateRequest.setPhone(created.getPhone());
        updateRequest.setSupplierType(SupplierType.MANUFACTURER);
        updateRequest.setQualificationStatus(SupplierQualificationStatus.SUSPENDED);
        updateRequest.setCountryOfManufacture("India");
        updateRequest.setGmpcertNumber(created.getGmpcertNumber());
        updateRequest.setGmpcertIssuingAuthority(created.getGmpcertIssuingAuthority());
        updateRequest.setGmpcertExpiryDate(created.getGmpcertExpiryDate());
        updateRequest.setApprovedSince(created.getApprovedSince());
        updateRequest.setLastAuditDate(created.getLastAuditDate());
        updateRequest.setNextAuditDue(created.getNextAuditDue());
        updateRequest.setOpenCapaCount(3);
        updateRequest.setCreatedBy("tester");

        SupplierResponse updated = supplierService.updateSupplier(created.getId(), updateRequest);
        assertEquals(SupplierQualificationStatus.SUSPENDED, updated.getQualificationStatus());
        assertEquals(3, updated.getOpenCapaCount());
    }
}
