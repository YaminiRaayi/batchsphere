package com.batchsphere.core.masterdata.vendorbusinessunit.service;

import com.batchsphere.core.auth.entity.User;
import com.batchsphere.core.auth.entity.UserRole;
import com.batchsphere.core.auth.security.AuthenticatedUser;
import com.batchsphere.core.masterdata.vendor.entity.Vendor;
import com.batchsphere.core.masterdata.vendor.repository.VendorRepository;
import com.batchsphere.core.masterdata.vendorbusinessunit.dto.CreateVendorBusinessUnitRequest;
import com.batchsphere.core.masterdata.vendorbusinessunit.dto.VendorAuditRequest;
import com.batchsphere.core.masterdata.vendorbusinessunit.entity.QualificationStatus;
import com.batchsphere.core.masterdata.vendorbusinessunit.entity.VendorAuditOutcome;
import com.batchsphere.core.masterdata.vendorbusinessunit.entity.VendorAuditStatus;
import com.batchsphere.core.masterdata.vendorbusinessunit.entity.VendorAuditType;
import com.batchsphere.core.masterdata.vendorbusinessunit.entity.VendorBusinessUnit;
import com.batchsphere.core.masterdata.vendorbusinessunit.repository.VendorBusinessUnitRepository;
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
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest
@ActiveProfiles("test")
class VendorBusinessUnitServiceIntegrationTest {

    @Autowired
    private VendorRepository vendorRepository;

    @Autowired
    private VendorBusinessUnitRepository vendorBusinessUnitRepository;

    @Autowired
    private VendorBusinessUnitService vendorBusinessUnitService;

    @BeforeEach
    void setUpAuthentication() {
        AuthenticatedUser user = new AuthenticatedUser(User.builder()
                .id(UUID.randomUUID())
                .username("qa-admin")
                .email("qa-admin@batchsphere.local")
                .passwordHash("ignored")
                .role(UserRole.SUPER_ADMIN)
                .isActive(true)
                .createdAt(LocalDateTime.now())
                .build());
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(user, null, user.getAuthorities())
        );
    }

    @Test
    void completedApprovedAuditQualifiesBusinessUnitForGrnUse() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Vendor vendor = vendorRepository.save(Vendor.builder()
                .id(UUID.randomUUID())
                .vendorCode("VBU-VEN-" + suffix)
                .vendorName("VBU Vendor " + suffix)
                .contactPerson("QA")
                .email("vbu-" + suffix + "@example.com")
                .phone("9999999999")
                .isApproved(true)
                .isActive(true)
                .createdBy("qa-admin")
                .createdAt(LocalDateTime.now())
                .build());

        CreateVendorBusinessUnitRequest createRequest = new CreateVendorBusinessUnitRequest();
        createRequest.setUnitName("API Site " + suffix);
        createRequest.setBuCode("SITE-" + suffix);
        createRequest.setIsWhoGmpCertified(true);
        createRequest.setCreatedBy("qa-admin");
        VendorBusinessUnit site = vendorBusinessUnitService.createVendorBusinessUnit(vendor.getId(), createRequest);

        VendorAuditRequest auditRequest = new VendorAuditRequest();
        auditRequest.setAuditType(VendorAuditType.INITIAL_QUALIFICATION);
        auditRequest.setScheduledDate(LocalDate.now().minusDays(3));
        auditRequest.setCompletedDate(LocalDate.now());
        auditRequest.setAuditedBy("QA Manager");
        auditRequest.setStatus(VendorAuditStatus.COMPLETED);
        auditRequest.setOutcome(VendorAuditOutcome.APPROVED);
        auditRequest.setObservationCount(0);
        auditRequest.setNotes("Approved site qualification audit.");

        vendorBusinessUnitService.createVendorAudit(site.getId(), auditRequest);

        VendorBusinessUnit updated = vendorBusinessUnitRepository.findById(site.getId()).orElseThrow();
        assertEquals(QualificationStatus.QUALIFIED, updated.getQualificationStatus());
        assertTrue(updated.getIsApproved());
        assertEquals(LocalDate.now(), updated.getQualifiedDate());
        assertEquals(LocalDate.now().plusYears(2), updated.getNextRequalificationDue());
    }
}
