package com.batchsphere.core.transactions.sampling.controller;

import com.batchsphere.core.auth.entity.User;
import com.batchsphere.core.auth.entity.UserRole;
import com.batchsphere.core.auth.repository.UserRepository;
import com.batchsphere.core.auth.security.AuthenticatedUser;
import com.batchsphere.core.batch.entity.Batch;
import com.batchsphere.core.batch.entity.BatchStatus;
import com.batchsphere.core.batch.entity.BatchType;
import com.batchsphere.core.batch.repository.BatchRepository;
import com.batchsphere.core.masterdata.businessunit.entity.BusinessUnit;
import com.batchsphere.core.masterdata.businessunit.repository.BusinessUnitRepository;
import com.batchsphere.core.masterdata.material.entity.Material;
import com.batchsphere.core.masterdata.material.entity.StorageCondition;
import com.batchsphere.core.masterdata.material.repository.MaterialRepository;
import com.batchsphere.core.masterdata.moa.entity.Moa;
import com.batchsphere.core.masterdata.moa.entity.MoaStatus;
import com.batchsphere.core.masterdata.moa.entity.MoaValidationStatus;
import com.batchsphere.core.masterdata.moa.repository.MoaRepository;
import com.batchsphere.core.masterdata.quality.enums.ReviewRoute;
import com.batchsphere.core.masterdata.samplingtool.entity.SamplingTool;
import com.batchsphere.core.masterdata.samplingtool.repository.SamplingToolRepository;
import com.batchsphere.core.masterdata.spec.entity.MaterialSpecLink;
import com.batchsphere.core.masterdata.spec.entity.Spec;
import com.batchsphere.core.masterdata.spec.entity.SpecParameter;
import com.batchsphere.core.masterdata.spec.entity.SpecParameterCriteriaType;
import com.batchsphere.core.masterdata.spec.entity.SpecParameterTestType;
import com.batchsphere.core.masterdata.spec.entity.SpecStatus;
import com.batchsphere.core.masterdata.spec.entity.SpecType;
import com.batchsphere.core.masterdata.spec.repository.MaterialSpecLinkRepository;
import com.batchsphere.core.masterdata.spec.repository.SpecParameterRepository;
import com.batchsphere.core.masterdata.spec.repository.SpecRepository;
import com.batchsphere.core.masterdata.supplier.entity.Supplier;
import com.batchsphere.core.masterdata.supplier.repository.SupplierRepository;
import com.batchsphere.core.masterdata.vendor.entity.Vendor;
import com.batchsphere.core.masterdata.vendor.repository.VendorRepository;
import com.batchsphere.core.masterdata.vendorbusinessunit.entity.QualificationStatus;
import com.batchsphere.core.masterdata.vendorbusinessunit.entity.VendorBusinessUnit;
import com.batchsphere.core.masterdata.vendorbusinessunit.repository.VendorBusinessUnitRepository;
import com.batchsphere.core.masterdata.warehouselocation.dto.CreatePalletRequest;
import com.batchsphere.core.masterdata.warehouselocation.dto.CreateRackRequest;
import com.batchsphere.core.masterdata.warehouselocation.dto.CreateRoomRequest;
import com.batchsphere.core.masterdata.warehouselocation.dto.CreateShelfRequest;
import com.batchsphere.core.masterdata.warehouselocation.dto.CreateWarehouseRequest;
import com.batchsphere.core.masterdata.warehouselocation.entity.Pallet;
import com.batchsphere.core.masterdata.warehouselocation.entity.Rack;
import com.batchsphere.core.masterdata.warehouselocation.entity.Room;
import com.batchsphere.core.masterdata.warehouselocation.entity.Shelf;
import com.batchsphere.core.masterdata.warehouselocation.entity.Warehouse;
import com.batchsphere.core.masterdata.warehouselocation.service.WarehouseLocationService;
import com.batchsphere.core.transactions.grn.entity.ContainerType;
import com.batchsphere.core.transactions.grn.entity.Grn;
import com.batchsphere.core.transactions.grn.entity.GrnContainer;
import com.batchsphere.core.transactions.grn.entity.GrnItem;
import com.batchsphere.core.transactions.grn.entity.GrnStatus;
import com.batchsphere.core.transactions.grn.entity.LabelStatus;
import com.batchsphere.core.transactions.grn.entity.QcStatus;
import com.batchsphere.core.transactions.grn.repository.GrnContainerRepository;
import com.batchsphere.core.transactions.grn.repository.GrnItemRepository;
import com.batchsphere.core.transactions.grn.repository.GrnRepository;
import com.batchsphere.core.transactions.inventory.entity.Inventory;
import com.batchsphere.core.transactions.inventory.entity.InventoryStatus;
import com.batchsphere.core.transactions.inventory.repository.InventoryRepository;
import com.batchsphere.core.transactions.sampling.dto.CreateSamplingPlanRequest;
import com.batchsphere.core.transactions.sampling.dto.EscalateQcInvestigationRequest;
import com.batchsphere.core.transactions.sampling.dto.OpenQcInvestigationRequest;
import com.batchsphere.core.transactions.sampling.dto.QcReceiptRequest;
import com.batchsphere.core.transactions.sampling.dto.RecordQcTestResultRequest;
import com.batchsphere.core.transactions.sampling.dto.ResolveQcInvestigationRequest;
import com.batchsphere.core.transactions.sampling.dto.SamplingCompletionRequest;
import com.batchsphere.core.transactions.sampling.dto.SamplingContainerSampleRequest;
import com.batchsphere.core.transactions.sampling.dto.SamplingHandoffRequest;
import com.batchsphere.core.transactions.sampling.dto.SamplingRequestResponse;
import com.batchsphere.core.transactions.sampling.dto.SamplingStartRequest;
import com.batchsphere.core.transactions.sampling.dto.StartQcReviewRequest;
import com.batchsphere.core.transactions.sampling.entity.QcInvestigationOutcome;
import com.batchsphere.core.transactions.sampling.entity.QcInvestigationType;
import com.batchsphere.core.transactions.sampling.entity.SamplingMethod;
import com.batchsphere.core.transactions.sampling.entity.SampleStatus;
import com.batchsphere.core.transactions.sampling.entity.SampleType;
import com.batchsphere.core.transactions.sampling.entity.SamplingRequest;
import com.batchsphere.core.transactions.sampling.entity.SamplingRequestStatus;
import com.batchsphere.core.transactions.sampling.repository.SamplingRequestRepository;
import com.batchsphere.core.transactions.sampling.service.SamplingService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.MOCK)
@ActiveProfiles("test")
class SamplingControllerIntegrationTest {

    @Autowired
    private WebApplicationContext webApplicationContext;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private SamplingService samplingService;

    @Autowired
    private MaterialRepository materialRepository;

    @Autowired
    private SpecRepository specRepository;

    @Autowired
    private MaterialSpecLinkRepository materialSpecLinkRepository;

    @Autowired
    private SpecParameterRepository specParameterRepository;

    @Autowired
    private MoaRepository moaRepository;

    @Autowired
    private SamplingToolRepository samplingToolRepository;

    @Autowired
    private SamplingRequestRepository samplingRequestRepository;

    @Autowired
    private SupplierRepository supplierRepository;

    @Autowired
    private VendorRepository vendorRepository;

    @Autowired
    private VendorBusinessUnitRepository vendorBusinessUnitRepository;

    @Autowired
    private BusinessUnitRepository businessUnitRepository;

    @Autowired
    private GrnRepository grnRepository;

    @Autowired
    private GrnItemRepository grnItemRepository;

    @Autowired
    private GrnContainerRepository grnContainerRepository;

    @Autowired
    private BatchRepository batchRepository;

    @Autowired
    private InventoryRepository inventoryRepository;

    @Autowired
    private WarehouseLocationService warehouseLocationService;

    private MockMvc mockMvc;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(webApplicationContext)
                .apply(springSecurity())
                .build();
        ensureUser("sampling_admin", UserRole.SUPER_ADMIN);
        ensureUser("sampling_manager", UserRole.QC_MANAGER);
        setFixtureAuthentication();
    }

    @Test
    void investigationEndpointsOpenListAndResolve() throws Exception {
        SamplingWorkflowFixture fixture = prepareUnderReviewWorkflow("CTRL-INV");
        UUID worksheetRowId = getFirstWorksheetRowId(fixture.samplingRequest().getId());
        SecurityContextHolder.clearContext();
        String analystToken = login("sampling_admin");
        String managerToken = login("sampling_manager");

        MvcResult openResult = mockMvc.perform(post("/api/sampling-requests/{id}/investigations", fixture.samplingRequest().getId())
                        .header("Authorization", "Bearer " + analystToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "qcTestResultId": "%s",
                                  "reason": "Endpoint investigation",
                                  "initialAssessment": "Failing assay needs review",
                                  "investigationType": "OOT"
                                }
                                """.formatted(worksheetRowId)))
                .andReturn();

        assertEquals(200, openResult.getResponse().getStatus(), openResult.getResponse().getContentAsString());
        JsonNode opened = objectMapper.readTree(openResult.getResponse().getContentAsString());
        assertEquals("PHASE_I", opened.get("status").asText());
        assertEquals("OOT", opened.get("investigationType").asText());
        assertEquals("PHASE_I", opened.get("phase").asText());
        assertTrue(opened.get("investigationNumber").asText().startsWith("QCINV-"));

        MvcResult listResult = mockMvc.perform(get("/api/sampling-requests/{id}/investigations", fixture.samplingRequest().getId())
                        .header("Authorization", "Bearer " + analystToken))
                .andReturn();

        assertEquals(200, listResult.getResponse().getStatus(), listResult.getResponse().getContentAsString());
        JsonNode listed = objectMapper.readTree(listResult.getResponse().getContentAsString());
        assertEquals(1, listed.size());

        MvcResult phaseTwoResult = mockMvc.perform(post("/api/sampling-requests/{id}/investigations/{investigationId}/phase-ii",
                        fixture.samplingRequest().getId(), opened.get("id").asText())
                        .header("Authorization", "Bearer " + analystToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "phaseTwoAssessment": "No assignable cause found in Phase I"
                                }
                                """))
                .andReturn();

        assertEquals(200, phaseTwoResult.getResponse().getStatus(), phaseTwoResult.getResponse().getContentAsString());
        JsonNode escalated = objectMapper.readTree(phaseTwoResult.getResponse().getContentAsString());
        assertEquals("PHASE_II", escalated.get("phase").asText());
        assertEquals("No assignable cause found in Phase I", escalated.get("phaseTwoAssessment").asText());

        MvcResult resolveResult = mockMvc.perform(post("/api/sampling-requests/{id}/investigations/{investigationId}/resolve",
                        fixture.samplingRequest().getId(), opened.get("id").asText())
                        .header("Authorization", "Bearer " + analystToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "outcome": "RESUME_REVIEW",
                                  "rootCause": "Analyst transcription error",
                                  "resolutionRemarks": "Resume QC review"
                                }
                                """))
                .andReturn();

        assertEquals(200, resolveResult.getResponse().getStatus(), resolveResult.getResponse().getContentAsString());
        JsonNode pendingQa = objectMapper.readTree(resolveResult.getResponse().getContentAsString());
        assertEquals("QA_REVIEW_PENDING", pendingQa.get("status").asText());
        assertEquals("RESUME_REVIEW", pendingQa.get("outcome").asText());

        MvcResult qaReviewResult = mockMvc.perform(post("/api/sampling-requests/{id}/investigations/{investigationId}/qa-review",
                        fixture.samplingRequest().getId(), opened.get("id").asText())
                        .header("Authorization", "Bearer " + managerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "approved": true,
                                  "qaReviewRemarks": "QA approves resumption of review",
                                  "confirmedBy": "sampling_manager",
                                  "confirmationText": "I APPROVE THIS QA REVIEW"
                                }
                                """))
                .andReturn();

        assertEquals(200, qaReviewResult.getResponse().getStatus(), qaReviewResult.getResponse().getContentAsString());
        JsonNode resolved = objectMapper.readTree(qaReviewResult.getResponse().getContentAsString());
        assertEquals("CLOSED_INVALID", resolved.get("status").asText());
        assertTrue(!resolved.get("qaReviewedBy").asText().isBlank());
        assertEquals("QA approves resumption of review", resolved.get("qaReviewRemarks").asText());

        SamplingRequestResponse refreshed = samplingService.getSamplingRequestById(fixture.samplingRequest().getId());
        assertEquals(SamplingRequestStatus.UNDER_REVIEW, refreshed.getRequestStatus());
        assertEquals(SampleStatus.UNDER_REVIEW, refreshed.getSample().getSampleStatus());
    }

    @Test
    void retestEndpointConsumesRetainedSample() throws Exception {
        SamplingWorkflowFixture fixture = prepareRetestRequiredWorkflow("CTRL-RET");
        SecurityContextHolder.clearContext();
        String token = login("sampling_admin");

        MvcResult retestResult = mockMvc.perform(post("/api/sampling-requests/{id}/retest", fixture.samplingRequest().getId())
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "analystCode": "EMP-HTTP-RT",
                                  "remarks": "HTTP retest execution"
                                }
                                """))
                .andReturn();

        assertEquals(200, retestResult.getResponse().getStatus(), retestResult.getResponse().getContentAsString());
        JsonNode root = objectMapper.readTree(retestResult.getResponse().getContentAsString());
        assertEquals("UNDER_REVIEW", root.get("requestStatus").asText());
        assertEquals(false, root.path("sample").path("retainedFlag").asBoolean());
        assertEquals(true, root.path("sample").path("consumedFlag").asBoolean());
    }

    @Test
    void resampleAndCycleEndpointsReturnChildAndHistoricalParent() throws Exception {
        SamplingWorkflowFixture fixture = prepareResampleRequiredWorkflow("CTRL-RSM");
        SecurityContextHolder.clearContext();
        String token = login("sampling_admin");

        MvcResult resampleResult = mockMvc.perform(post("/api/sampling-requests/{id}/resample", fixture.samplingRequest().getId())
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "reason": "HTTP child cycle"
                                }
                                """))
                .andReturn();

        assertEquals(200, resampleResult.getResponse().getStatus(), resampleResult.getResponse().getContentAsString());
        JsonNode child = objectMapper.readTree(resampleResult.getResponse().getContentAsString());
        assertEquals("REQUESTED", child.get("requestStatus").asText());
        assertEquals(2, child.get("cycleNumber").asInt());

        MvcResult cyclesResult = mockMvc.perform(get("/api/sampling-requests/{id}/cycles", fixture.samplingRequest().getId())
                        .header("Authorization", "Bearer " + token))
                .andReturn();

        assertEquals(200, cyclesResult.getResponse().getStatus(), cyclesResult.getResponse().getContentAsString());
        JsonNode cycles = objectMapper.readTree(cyclesResult.getResponse().getContentAsString());
        assertEquals(2, cycles.size());
        assertEquals("RESAMPLED", cycles.get(0).get("requestStatus").asText());
        assertEquals("REQUESTED", cycles.get(1).get("requestStatus").asText());
    }

    @Test
    void destroyRetainedSampleEndpointMarksSampleDestroyed() throws Exception {
        SamplingWorkflowFixture fixture = prepareReceivedWorkflowWithRetainedSample("CTRL-DEST");
        SecurityContextHolder.clearContext();
        String token = login("sampling_admin");

        MvcResult destroyResult = mockMvc.perform(post("/api/sampling-requests/{id}/retained-sample/destroy", fixture.samplingRequest().getId())
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "remarks": "HTTP destruction flow"
                                }
                                """))
                .andReturn();

        assertEquals(200, destroyResult.getResponse().getStatus(), destroyResult.getResponse().getContentAsString());
        JsonNode root = objectMapper.readTree(destroyResult.getResponse().getContentAsString());
        assertEquals(true, root.path("sample").path("destroyedFlag").asBoolean());
        assertEquals(false, root.path("sample").path("retainedFlag").asBoolean());
        assertTrue(root.path("sample").path("remarks").asText().contains("HTTP destruction flow"));
    }

    private SamplingWorkflowFixture prepareUnderReviewWorkflow(String suffix) {
        SamplingWorkflowFixture fixture = createWorkflowFixture(suffix, SamplingMethod.HUNDRED_PERCENT, "CRITICAL", false, 1, new BigDecimal("10.000"));
        createStandardPlan(fixture, "EMP-" + suffix);
        startAndHandoffToQc(fixture.samplingRequest().getId());
        receiveAndStartQcReview(fixture.samplingRequest().getId(), "EMP-" + suffix, false);
        recordFirstWorksheetResult(fixture.samplingRequest().getId(), new BigDecimal("80.0000"));
        return fixture;
    }

    private SamplingWorkflowFixture prepareRetestRequiredWorkflow(String suffix) {
        SamplingWorkflowFixture fixture = createWorkflowFixture(suffix, SamplingMethod.HUNDRED_PERCENT, "CRITICAL", false, 1, new BigDecimal("10.000"));
        createStandardPlan(fixture, "EMP-" + suffix);
        startAndHandoffToQc(fixture.samplingRequest().getId());
        receiveAndStartQcReview(fixture.samplingRequest().getId(), "EMP-" + suffix, true);
        recordFirstWorksheetResult(fixture.samplingRequest().getId(), new BigDecimal("80.0000"));

        OpenQcInvestigationRequest openRequest = new OpenQcInvestigationRequest();
        openRequest.setQcTestResultId(getFirstWorksheetRowId(fixture.samplingRequest().getId()));
        openRequest.setReason("Retest required");
        openRequest.setInitialAssessment("Retained sample will be used");
        var opened = samplingService.openInvestigation(fixture.samplingRequest().getId(), openRequest);

        ResolveQcInvestigationRequest resolveRequest = new ResolveQcInvestigationRequest();
        resolveRequest.setOutcome(QcInvestigationOutcome.RETEST_REQUIRED);
        resolveRequest.setRootCause("Preparation issue");
        resolveRequest.setResolutionRemarks("Run retained sample retest");
        samplingService.resolveInvestigation(fixture.samplingRequest().getId(), opened.getId(), resolveRequest);
        approveQaReview(fixture.samplingRequest().getId(), opened.getId(), "QA approves retained sample retest");
        return fixture;
    }

    private SamplingWorkflowFixture prepareResampleRequiredWorkflow(String suffix) {
        SamplingWorkflowFixture fixture = createWorkflowFixture(suffix, SamplingMethod.HUNDRED_PERCENT, "CRITICAL", false, 1, new BigDecimal("10.000"));
        createStandardPlan(fixture, "EMP-" + suffix);
        startAndHandoffToQc(fixture.samplingRequest().getId());
        receiveAndStartQcReview(fixture.samplingRequest().getId(), "EMP-" + suffix, false);
        recordFirstWorksheetResult(fixture.samplingRequest().getId(), new BigDecimal("80.0000"));

        OpenQcInvestigationRequest openRequest = new OpenQcInvestigationRequest();
        openRequest.setQcTestResultId(getFirstWorksheetRowId(fixture.samplingRequest().getId()));
        openRequest.setReason("Resample required");
        openRequest.setInitialAssessment("Representative sample issue");
        var opened = samplingService.openInvestigation(fixture.samplingRequest().getId(), openRequest);

        ResolveQcInvestigationRequest resolveRequest = new ResolveQcInvestigationRequest();
        resolveRequest.setOutcome(QcInvestigationOutcome.RESAMPLE_REQUIRED);
        resolveRequest.setRootCause("Representative issue");
        resolveRequest.setResolutionRemarks("Create new child cycle");
        samplingService.resolveInvestigation(fixture.samplingRequest().getId(), opened.getId(), resolveRequest);
        approveQaReview(fixture.samplingRequest().getId(), opened.getId(), "QA approves new sampling cycle");
        return fixture;
    }

    private SamplingWorkflowFixture prepareReceivedWorkflowWithRetainedSample(String suffix) {
        SamplingWorkflowFixture fixture = createWorkflowFixture(suffix, SamplingMethod.HUNDRED_PERCENT, "CRITICAL", false, 1, new BigDecimal("10.000"));
        createStandardPlan(fixture, "EMP-" + suffix);
        startAndHandoffToQc(fixture.samplingRequest().getId());
        receiveInQcWithRetention(fixture.samplingRequest().getId());
        return fixture;
    }

    private void createStandardPlan(SamplingWorkflowFixture fixture, String analystCode) {
        CreateSamplingPlanRequest request = new CreateSamplingPlanRequest();
        request.setSamplingMethod(SamplingMethod.HUNDRED_PERCENT);
        request.setSampleType(SampleType.COMPOSITE);
        request.setSpecId(fixture.spec().getId());
        request.setMoaId(fixture.moa().getId());
        request.setTotalContainers(1);
        request.setContainersToSample(1);
        request.setIndividualSampleQuantity(new BigDecimal("1.000"));
        request.setCompositeSampleQuantity(new BigDecimal("1.000"));
        request.setSamplingLocation("QC Booth");
        request.setAnalystEmployeeCode(analystCode);
        request.setSamplingToolId(fixture.tool().getId());
        request.setPhotosensitiveHandlingRequired(false);
        request.setHygroscopicHandlingRequired(false);
        request.setCoaBasedRelease(false);
        request.setRationale("HTTP controller fixture");
        request.setContainerSamples(List.of(sampleRequest(fixture.containers().get(0).getId(), "1.000")));
        request.setCreatedBy("tester");
        samplingService.createSamplingPlan(fixture.samplingRequest().getId(), request);
    }

    private void startAndHandoffToQc(UUID samplingRequestId) {
        SamplingStartRequest startRequest = new SamplingStartRequest();
        startRequest.setUpdatedBy("tester");
        samplingService.startSampling(samplingRequestId, startRequest);

        SamplingCompletionRequest completionRequest = new SamplingCompletionRequest();
        completionRequest.setUpdatedBy("tester");
        samplingService.completeSampling(samplingRequestId, completionRequest);

        SamplingHandoffRequest handoffRequest = new SamplingHandoffRequest();
        handoffRequest.setUpdatedBy("tester");
        samplingService.handoffToQc(samplingRequestId, handoffRequest);
    }

    private void receiveAndStartQcReview(UUID samplingRequestId, String analystCode, boolean retained) {
        if (retained) {
            receiveInQcWithRetention(samplingRequestId);
        } else {
            QcReceiptRequest receiptRequest = new QcReceiptRequest();
            receiptRequest.setReceivedBy("QC Analyst");
            receiptRequest.setReceiptCondition("Sealed and intact");
            receiptRequest.setSampleStorageLocation("QC Shelf A1");
            samplingService.receiveInQc(samplingRequestId, receiptRequest);
        }

        StartQcReviewRequest reviewRequest = new StartQcReviewRequest();
        reviewRequest.setAnalystCode(analystCode);
        samplingService.startQcReview(samplingRequestId, reviewRequest);
    }

    private void receiveInQcWithRetention(UUID samplingRequestId) {
        QcReceiptRequest receiptRequest = new QcReceiptRequest();
        receiptRequest.setReceivedBy("QC Analyst");
        receiptRequest.setReceiptCondition("Sealed and intact");
        receiptRequest.setSampleStorageLocation("QC Shelf A1");
        receiptRequest.setRetainedFlag(true);
        receiptRequest.setRetainedQuantity(new BigDecimal("0.250"));
        receiptRequest.setRetainedUntil(LocalDate.now().plusDays(30));
        samplingService.receiveInQc(samplingRequestId, receiptRequest);
    }

    private void recordFirstWorksheetResult(UUID samplingRequestId, BigDecimal resultValue) {
        RecordQcTestResultRequest resultRequest = new RecordQcTestResultRequest();
        resultRequest.setResultValue(resultValue);
        samplingService.recordWorksheetResult(samplingRequestId, getFirstWorksheetRowId(samplingRequestId), resultRequest);
    }

    private UUID getFirstWorksheetRowId(UUID samplingRequestId) {
        return samplingService.getWorksheet(samplingRequestId).stream().findFirst().orElseThrow().getId();
    }

    private void approveQaReview(UUID samplingRequestId, UUID investigationId, String remarks) {
        setFixtureAuthentication(UserRole.QC_MANAGER, "sampling-fixture-qa");
        try {
            var request = new com.batchsphere.core.transactions.sampling.dto.CompleteQaInvestigationReviewRequest();
            request.setApproved(true);
            request.setQaReviewRemarks(remarks);
            request.setConfirmedBy("sampling-fixture-qa");
            request.setConfirmationText("I APPROVE THIS QA REVIEW");
            samplingService.completeQaInvestigationReview(samplingRequestId, investigationId, request);
        } finally {
            setFixtureAuthentication();
        }
    }

    private String login(String username) throws Exception {
        MvcResult loginResult = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "username": "%s",
                                  "password": "Test@123"
                                }
                                """.formatted(username)))
                .andReturn();

        assertEquals(200, loginResult.getResponse().getStatus(), loginResult.getResponse().getContentAsString());
        JsonNode root = objectMapper.readTree(loginResult.getResponse().getContentAsString());
        return root.get("accessToken").asText();
    }

    private void setFixtureAuthentication() {
        setFixtureAuthentication(UserRole.SUPER_ADMIN, "sampling-fixture");
    }

    private void setFixtureAuthentication(UserRole role, String username) {
        AuthenticatedUser fixtureUser = new AuthenticatedUser(User.builder()
                .id(UUID.randomUUID())
                .username(username)
                .email(username + "@batchsphere.local")
                .passwordHash("ignored")
                .role(role)
                .isActive(true)
                .createdAt(LocalDateTime.now())
                .build());
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(fixtureUser, null, fixtureUser.getAuthorities())
        );
    }

    private void ensureUser(String username, UserRole role) {
        if (userRepository.existsByUsername(username)) {
            return;
        }

        userRepository.save(User.builder()
                .id(UUID.randomUUID())
                .username(username)
                .email(username + "@batchsphere.local")
                .passwordHash(passwordEncoder.encode("Test@123"))
                .role(role)
                .isActive(true)
                .createdAt(LocalDateTime.now())
                .build());
    }

    private SamplingContainerSampleRequest sampleRequest(UUID grnContainerId, String quantity) {
        SamplingContainerSampleRequest request = new SamplingContainerSampleRequest();
        request.setGrnContainerId(grnContainerId);
        request.setSampledQuantity(new BigDecimal(quantity));
        return request;
    }

    private CreateWarehouseRequest createWarehouseRequest(String suffix, UUID businessUnitId) {
        CreateWarehouseRequest request = new CreateWarehouseRequest();
        request.setWarehouseCode("WH-" + suffix);
        request.setWarehouseName("Warehouse");
        request.setBusinessUnitId(businessUnitId);
        request.setCreatedBy("tester");
        return request;
    }

    private CreateRoomRequest createRoomRequest(String suffix) {
        CreateRoomRequest request = new CreateRoomRequest();
        request.setRoomCode("ROOM-" + suffix);
        request.setRoomName("Room");
        request.setStorageCondition(StorageCondition.ROOM_TEMPERATURE);
        request.setCreatedBy("tester");
        return request;
    }

    private CreateRackRequest createRackRequest(String suffix) {
        CreateRackRequest request = new CreateRackRequest();
        request.setRackCode("RACK-" + suffix);
        request.setRackName("Rack");
        request.setCreatedBy("tester");
        return request;
    }

    private CreateShelfRequest createShelfRequest(String suffix) {
        CreateShelfRequest request = new CreateShelfRequest();
        request.setShelfCode("SHELF-" + suffix);
        request.setShelfName("Shelf");
        request.setCreatedBy("tester");
        return request;
    }

    private CreatePalletRequest createPalletRequest(String suffix) {
        CreatePalletRequest request = new CreatePalletRequest();
        request.setPalletCode("PALLET-" + suffix);
        request.setPalletName("Pallet");
        request.setCreatedBy("tester");
        return request;
    }

    private BusinessUnit createBusinessUnit(String suffix) {
        return businessUnitRepository.save(BusinessUnit.builder()
                .id(UUID.randomUUID())
                .unitCode("BU-" + suffix)
                .unitName("Business Unit " + suffix)
                .isActive(true)
                .createdBy("tester")
                .createdAt(LocalDateTime.now())
                .build());
    }

    private SpecParameter createMandatorySpecParameter(UUID specId, UUID moaId, String suffix) {
        return specParameterRepository.save(SpecParameter.builder()
                .id(UUID.randomUUID())
                .specId(specId)
                .parameterName("Assay " + suffix)
                .testType(SpecParameterTestType.ASSAY)
                .moaId(moaId)
                .criteriaType(SpecParameterCriteriaType.RANGE)
                .lowerLimit(new BigDecimal("95.0000"))
                .upperLimit(new BigDecimal("105.0000"))
                .unit("%")
                .isMandatory(true)
                .sequence(1)
                .isActive(true)
                .createdBy("tester")
                .createdAt(LocalDateTime.now())
                .build());
    }

    private void createActiveMaterialSpecLink(UUID materialId, UUID specId, String actor) {
        materialSpecLinkRepository.save(MaterialSpecLink.builder()
                .id(UUID.randomUUID())
                .materialId(materialId)
                .specId(specId)
                .isActive(true)
                .linkedBy(actor)
                .linkedAt(LocalDateTime.now())
                .notes("HTTP controller fixture link")
                .createdAt(LocalDateTime.now())
                .build());
    }

    private SamplingWorkflowFixture createWorkflowFixture(String suffix,
                                                         SamplingMethod specMethod,
                                                         String materialType,
                                                         boolean vendorCoaReleaseAllowed,
                                                         int totalContainers,
                                                         BigDecimal quantityPerContainer) {
        Material material = materialRepository.save(Material.builder()
                .id(UUID.randomUUID())
                .materialCode("MAT-" + suffix)
                .materialName("Material " + suffix)
                .materialType(materialType)
                .uom("KG")
                .storageCondition(StorageCondition.ROOM_TEMPERATURE)
                .photosensitive(false)
                .hygroscopic(false)
                .hazardous(false)
                .selectiveMaterial(false)
                .vendorCoaReleaseAllowed(vendorCoaReleaseAllowed)
                .samplingRequired(true)
                .description("fixture")
                .isActive(true)
                .createdBy("tester")
                .createdAt(LocalDateTime.now())
                .build());

        Spec spec = specRepository.save(Spec.builder()
                .id(UUID.randomUUID())
                .specCode("SPEC-" + suffix)
                .specName("Spec " + suffix)
                .revision("v1")
                .specType(SpecType.MATERIAL)
                .status(SpecStatus.APPROVED)
                .samplingMethod(specMethod)
                .reviewRoute(ReviewRoute.QC_ONLY)
                .isActive(true)
                .createdBy("tester")
                .createdAt(LocalDateTime.now())
                .build());
        createActiveMaterialSpecLink(material.getId(), spec.getId(), "tester");

        Moa moa = moaRepository.save(Moa.builder()
                .id(UUID.randomUUID())
                .moaCode("MOA-" + suffix)
                .moaName("MOA " + suffix)
                .revision("v1")
                .validationStatus(MoaValidationStatus.VALIDATED)
                .status(MoaStatus.APPROVED)
                .reviewRoute(ReviewRoute.QC_ONLY)
                .isActive(true)
                .createdBy("tester")
                .createdAt(LocalDateTime.now())
                .build());
        createMandatorySpecParameter(spec.getId(), moa.getId(), suffix);

        SamplingTool tool = samplingToolRepository.save(SamplingTool.builder()
                .id(UUID.randomUUID())
                .toolCode("TOOL-" + suffix)
                .toolName("Tool " + suffix)
                .isActive(true)
                .createdBy("tester")
                .createdAt(LocalDateTime.now())
                .build());

        Supplier supplier = supplierRepository.save(Supplier.builder()
                .id(UUID.randomUUID())
                .supplierCode("SUP-" + suffix)
                .supplierName("Supplier " + suffix)
                .isActive(true)
                .createdBy("tester")
                .createdAt(LocalDateTime.now())
                .build());

        Vendor vendor = vendorRepository.save(Vendor.builder()
                .id(UUID.randomUUID())
                .vendorCode("VEN-" + suffix)
                .vendorName("Vendor " + suffix)
                .isApproved(true)
                .isActive(true)
                .createdBy("tester")
                .createdAt(LocalDateTime.now())
                .build());

        VendorBusinessUnit businessUnit = vendorBusinessUnitRepository.save(VendorBusinessUnit.builder()
                .id(UUID.randomUUID())
                .vendorId(vendor.getId())
                .unitName("Unit " + suffix)
                .city("Chennai")
                .country("India")
                .isWhoGmpCertified(false)
                .isUsfda(false)
                .isEuGmp(false)
                .qualificationStatus(QualificationStatus.QUALIFIED)
                .isApproved(true)
                .isActive(true)
                .createdBy("tester")
                .createdAt(LocalDateTime.now())
                .build());

        BusinessUnit warehouseBusinessUnit = createBusinessUnit(suffix);
        Warehouse warehouse = warehouseLocationService.createWarehouse(createWarehouseRequest(suffix, warehouseBusinessUnit.getId()));
        Room room = warehouseLocationService.createRoom(warehouse.getId(), createRoomRequest(suffix));
        Rack rack = warehouseLocationService.createRack(room.getId(), createRackRequest(suffix));
        Shelf shelf = warehouseLocationService.createShelf(rack.getId(), createShelfRequest(suffix));
        Pallet pallet = warehouseLocationService.createPallet(shelf.getId(), createPalletRequest(suffix));

        BigDecimal totalQuantity = quantityPerContainer.multiply(BigDecimal.valueOf(totalContainers)).setScale(3);
        Batch batch = batchRepository.save(Batch.builder()
                .id(UUID.randomUUID())
                .batchNumber("BATCH-" + suffix)
                .material(material)
                .batchType(BatchType.RAW_MATERIAL)
                .batchStatus(BatchStatus.QUARANTINE)
                .quantity(totalQuantity)
                .unitOfMeasure("KG")
                .manufactureDate(LocalDate.now())
                .expiryDate(LocalDate.now().plusMonths(12))
                .isActive(true)
                .createdBy("tester")
                .createdAt(LocalDateTime.now())
                .build());

        inventoryRepository.save(Inventory.builder()
                .id(UUID.randomUUID())
                .materialId(material.getId())
                .batchId(batch.getId())
                .warehouseLocation("WH/ROOM/RACK/SHELF/PALLET")
                .palletId(pallet.getId())
                .quantityOnHand(totalQuantity)
                .uom("KG")
                .status(InventoryStatus.QUARANTINE)
                .isActive(true)
                .createdBy("tester")
                .createdAt(LocalDateTime.now())
                .build());

        Grn grn = grnRepository.save(Grn.builder()
                .id(UUID.randomUUID())
                .grnNumber("GRN-" + suffix)
                .supplierId(supplier.getId())
                .vendorId(vendor.getId())
                .vendorBusinessUnitId(businessUnit.getId())
                .receiptDate(LocalDate.now())
                .invoiceNumber("INV-" + suffix)
                .remarks("fixture")
                .status(GrnStatus.RECEIVED)
                .isActive(true)
                .createdBy("tester")
                .createdAt(LocalDateTime.now())
                .build());

        GrnItem grnItem = grnItemRepository.save(GrnItem.builder()
                .id(UUID.randomUUID())
                .grnId(grn.getId())
                .lineNumber(1)
                .materialId(material.getId())
                .batchId(batch.getId())
                .receivedQuantity(totalQuantity)
                .acceptedQuantity(totalQuantity)
                .rejectedQuantity(BigDecimal.ZERO.setScale(3))
                .uom("KG")
                .warehouseLocation("WH/ROOM/RACK/SHELF/PALLET")
                .palletId(pallet.getId())
                .containerType(ContainerType.BAG)
                .numberOfContainers(totalContainers)
                .quantityPerContainer(quantityPerContainer)
                .vendorBatch("VB-" + suffix)
                .unitPrice(new BigDecimal("1.00"))
                .totalPrice(totalQuantity)
                .qcStatus(QcStatus.PENDING)
                .description("fixture")
                .isActive(true)
                .createdBy("tester")
                .createdAt(LocalDateTime.now())
                .build());

        List<GrnContainer> containers = new ArrayList<>();
        for (int index = 1; index <= totalContainers; index++) {
            containers.add(grnContainerRepository.save(GrnContainer.builder()
                    .id(UUID.randomUUID())
                    .grnId(grn.getId())
                    .grnItemId(grnItem.getId())
                    .materialId(material.getId())
                    .batchId(batch.getId())
                    .palletId(pallet.getId())
                    .containerNumber("C" + index)
                    .containerType(ContainerType.BAG)
                    .vendorBatch("VB-" + suffix)
                    .internalLot("LOT-" + suffix + "-" + index)
                    .quantity(quantityPerContainer)
                    .uom("KG")
                    .storageCondition(StorageCondition.ROOM_TEMPERATURE)
                    .inventoryStatus(InventoryStatus.QUARANTINE)
                    .labelStatus(LabelStatus.GENERATED)
                    .sampled(false)
                    .isActive(true)
                    .createdBy("tester")
                    .createdAt(LocalDateTime.now())
                    .build()));
        }

        UUID rootRequestId = UUID.randomUUID();
        SamplingRequest samplingRequest = samplingRequestRepository.save(SamplingRequest.builder()
                .id(rootRequestId)
                .grnId(grn.getId())
                .grnItemId(grnItem.getId())
                .parentSamplingRequestId(null)
                .rootSamplingRequestId(rootRequestId)
                .cycleNumber(1)
                .materialId(material.getId())
                .batchId(batch.getId())
                .warehouseLocation(grnItem.getWarehouseLocation())
                .palletId(pallet.getId())
                .totalContainers(totalContainers)
                .requestStatus(SamplingRequestStatus.REQUESTED)
                .warehouseLabelApplied(true)
                .samplingLabelRequired(true)
                .vendorCoaReleaseAllowed(vendorCoaReleaseAllowed)
                .photosensitiveMaterial(false)
                .hygroscopicMaterial(false)
                .hazardousMaterial(false)
                .selectiveMaterial(false)
                .remarks("fixture")
                .isActive(true)
                .createdBy("tester")
                .createdAt(LocalDateTime.now())
                .build());

        return new SamplingWorkflowFixture(material, spec, moa, tool, pallet, batch, samplingRequest, containers);
    }

    private record SamplingWorkflowFixture(
            Material material,
            Spec spec,
            Moa moa,
            SamplingTool tool,
            Pallet pallet,
            Batch batch,
            SamplingRequest samplingRequest,
            List<GrnContainer> containers
    ) {
    }
}
