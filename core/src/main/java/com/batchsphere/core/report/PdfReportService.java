package com.batchsphere.core.report;

import com.lowagie.text.Chunk;
import com.lowagie.text.Document;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.FontFactory;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.Rectangle;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfPageEventHelper;
import com.lowagie.text.pdf.PdfWriter;
import com.batchsphere.core.qms.deviation.dto.DeviationResponse;
import com.batchsphere.core.qms.capa.dto.CapaResponse;
import com.batchsphere.core.qms.batchrelease.dto.QpBatchReleaseDTO.BatchCertificateResponse;
import com.batchsphere.core.qms.apqr.dto.ApqrDTO.ApqrResponse;
import com.batchsphere.core.qms.document.dto.ControlledDocumentResponse;
import com.batchsphere.core.qms.document.dto.DocumentApprovalResponse;
import com.batchsphere.core.qms.document.dto.DocumentDistributionResponse;
import com.batchsphere.core.qms.document.dto.DocumentRevisionResponse;
import com.batchsphere.core.transactions.sampling.dto.SamplingRequestResponse;
import org.springframework.stereotype.Service;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
public class PdfReportService {

    private static final Color HEADER_BG = new Color(15, 118, 110);   // teal-700
    private static final Color SECTION_BG = new Color(240, 253, 250); // teal-50
    private static final Color LABEL_COLOR = new Color(71, 85, 105);  // slate-600
    private static final Color VALUE_COLOR = new Color(15, 23, 42);   // slate-900
    private static final Color BORDER_COLOR = new Color(226, 232, 240); // slate-200

    private static final Font TITLE_FONT = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 16, Color.WHITE);
    private static final Font SUBTITLE_FONT = FontFactory.getFont(FontFactory.HELVETICA, 10, Color.WHITE);
    private static final Font SECTION_FONT = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9, HEADER_BG);
    private static final Font LABEL_FONT = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8, LABEL_COLOR);
    private static final Font VALUE_FONT = FontFactory.getFont(FontFactory.HELVETICA, 9, VALUE_COLOR);
    private static final Font FOOTER_FONT = FontFactory.getFont(FontFactory.HELVETICA, 7, new Color(148, 163, 184));

    private static final DateTimeFormatter DT_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    private static final DateTimeFormatter D_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    // ── Deviation Closure Report ─────────────────────────────────────────────

    public byte[] generateDeviationReport(DeviationResponse d, String generatedBy) {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        Document doc = new Document(PageSize.A4, 40, 40, 60, 50);
        try {
            PdfWriter writer = PdfWriter.getInstance(doc, out);
            writer.setPageEvent(new FooterEvent("Confidential GMP Record | Deviation " + d.getDeviationNumber()));
            doc.open();

            addHeader(doc, "DEVIATION CLOSURE REPORT", d.getDeviationNumber());
            addMeta(doc, generatedBy);

            addSection(doc, "DEVIATION DETAILS");
            addRow(doc, "Deviation Number", d.getDeviationNumber());
            addRow(doc, "Title", d.getTitle());
            addRow(doc, "Type", fmt(d.getDeviationType()));
            addRow(doc, "Severity", fmt(d.getSeverity()));
            addRow(doc, "Status", fmt(d.getStatus()));
            addRow(doc, "Department", d.getDepartment());
            addRow(doc, "Detected By", d.getDetectedBy());
            addRow(doc, "Detected At", d.getDetectedAt() != null ? d.getDetectedAt().format(DT_FMT) : "—");
            addRow(doc, "Source Module", fmt(d.getSourceModule()));

            addSection(doc, "DESCRIPTION");
            addTextBlock(doc, d.getDescription());

            addSection(doc, "INVESTIGATION");
            addRow(doc, "Immediate Action", d.getImmediateAction());
            addTextBlockLabelled(doc, "Investigation Summary", d.getInvestigationSummary());
            addTextBlockLabelled(doc, "Root Cause", d.getRootCause());
            addTextBlockLabelled(doc, "Impact Assessment", d.getImpactAssessment());

            addSection(doc, "CLOSURE");
            addRow(doc, "Status", fmt(d.getStatus()));
            addRow(doc, "Closed By", d.getClosedBy());
            addRow(doc, "Closed At", d.getClosedAt() != null ? d.getClosedAt().format(DT_FMT) : "—");
            addRow(doc, "E-Signature ID", d.getClosureESignatureId() != null ? d.getClosureESignatureId().toString() : "—");
            addTextBlockLabelled(doc, "Closure Summary", d.getClosureSummary());

            addSection(doc, "RECORD INFORMATION");
            addRow(doc, "Created By", d.getCreatedBy());
            addRow(doc, "Created At", d.getCreatedAt() != null ? d.getCreatedAt().format(DT_FMT) : "—");
            addRow(doc, "Last Updated By", d.getUpdatedBy());
            addRow(doc, "Last Updated At", d.getUpdatedAt() != null ? d.getUpdatedAt().format(DT_FMT) : "—");

            doc.close();
        } catch (Exception e) {
            throw new RuntimeException("PDF generation failed: " + e.getMessage(), e);
        }
        return out.toByteArray();
    }

    // ── CAPA Closure Report ──────────────────────────────────────────────────

    public byte[] generateCapaReport(CapaResponse c, String generatedBy) {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        Document doc = new Document(PageSize.A4, 40, 40, 60, 50);
        try {
            PdfWriter writer = PdfWriter.getInstance(doc, out);
            writer.setPageEvent(new FooterEvent("Confidential GMP Record | CAPA " + c.getCapaNumber()));
            doc.open();

            addHeader(doc, "CAPA CLOSURE REPORT", c.getCapaNumber());
            addMeta(doc, generatedBy);

            addSection(doc, "CAPA DETAILS");
            addRow(doc, "CAPA Number", c.getCapaNumber());
            addRow(doc, "Title", c.getTitle());
            addRow(doc, "Severity", fmt(c.getSeverity()));
            addRow(doc, "Status", fmt(c.getStatus()));
            addRow(doc, "Owner", c.getOwner());
            addRow(doc, "Due Date", c.getDueDate() != null ? c.getDueDate().format(D_FMT) : "—");

            addSection(doc, "ACTIONS");
            addTextBlockLabelled(doc, "Corrective Action", c.getCorrectiveAction());
            addTextBlockLabelled(doc, "Preventive Action", c.getPreventiveAction());
            addTextBlockLabelled(doc, "Effectiveness Check Plan", c.getEffectivenessCheck());

            addSection(doc, "CLOSURE");
            addRow(doc, "Closed By", c.getClosedBy());
            addRow(doc, "Closed At", c.getClosedAt() != null ? c.getClosedAt().format(DT_FMT) : "—");

            addSection(doc, "RECORD INFORMATION");
            addRow(doc, "Created By", c.getCreatedBy());
            addRow(doc, "Created At", c.getCreatedAt() != null ? c.getCreatedAt().format(DT_FMT) : "—");

            doc.close();
        } catch (Exception e) {
            throw new RuntimeException("PDF generation failed: " + e.getMessage(), e);
        }
        return out.toByteArray();
    }

    // ── QP Batch Certificate ─────────────────────────────────────────────────

    public byte[] generateBatchCertificate(BatchCertificateResponse r, String generatedBy) {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        Document doc = new Document(PageSize.A4, 40, 40, 60, 50);
        try {
            PdfWriter writer = PdfWriter.getInstance(doc, out);
            writer.setPageEvent(new FooterEvent("Confidential GMP Record | Release " + r.getReleaseNumber()));
            doc.open();

            addHeader(doc, "BATCH RELEASE CERTIFICATE", r.getReleaseNumber());
            addMeta(doc, generatedBy);

            addSection(doc, "BATCH IDENTITY");
            addRow(doc, "Release Number", r.getReleaseNumber());
            addRow(doc, "Lot Number", r.getLotNumber());
            addRow(doc, "Product Name", r.getProductName());
            addRow(doc, "Batch Size", r.getBatchSize() != null ? r.getBatchSize() + " " + nvl(r.getBatchUom()) : "—");
            addRow(doc, "Manufacture Date", r.getManufactureDate() != null ? r.getManufactureDate().format(D_FMT) : "—");
            addRow(doc, "Expiry Date", r.getExpiryDate() != null ? r.getExpiryDate().format(D_FMT) : "—");
            addRow(doc, "Status", fmt(r.getStatus()));

            addSection(doc, "QP CHECKLIST (EU GMP Annex 16)");
            addTextBlockLabelled(doc, "QC Disposition", r.getQcDispositionSummary());
            addTextBlockLabelled(doc, "OOS/OOT Investigation Summary", r.getInvestigationSummary());
            addTextBlockLabelled(doc, "Deviation Summary", r.getDeviationSummary());
            addTextBlockLabelled(doc, "Documentation Summary", r.getDocumentSummary());

            addSection(doc, "QP CERTIFICATION");
            addRow(doc, "Qualified Person", r.getQpName());
            addRow(doc, "Certified At", r.getCertifiedAt() != null ? r.getCertifiedAt().format(DT_FMT) : "—");
            addRow(doc, "E-Signature ID", r.getESignatureId() != null ? r.getESignatureId().toString() : "—");
            if (r.getCertificationStatement() != null) {
                addTextBlockLabelled(doc, "Certification Statement", r.getCertificationStatement());
            }

            doc.close();
        } catch (Exception e) {
            throw new RuntimeException("PDF generation failed: " + e.getMessage(), e);
        }
        return out.toByteArray();
    }

    // ── APQR Report ──────────────────────────────────────────────────────────

    public byte[] generateApqrReport(ApqrResponse a, String generatedBy) {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        Document doc = new Document(PageSize.A4, 40, 40, 60, 50);
        try {
            PdfWriter writer = PdfWriter.getInstance(doc, out);
            writer.setPageEvent(new FooterEvent("Confidential GMP Record | APQR " + a.getApqrNumber()));
            doc.open();

            addHeader(doc, "ANNUAL PRODUCT QUALITY REVIEW", a.getApqrNumber());
            addMeta(doc, generatedBy);

            addSection(doc, "REVIEW IDENTITY");
            addRow(doc, "APQR Number", a.getApqrNumber());
            addRow(doc, "Product Name", a.getProductName());
            addRow(doc, "Review Year", String.valueOf(a.getReviewYear()));
            addRow(doc, "Status", fmt(a.getStatus()));
            addRow(doc, "Period", (a.getPeriodStart() != null ? a.getPeriodStart().format(D_FMT) : "—") + " → " + (a.getPeriodEnd() != null ? a.getPeriodEnd().format(D_FMT) : "—"));
            addRow(doc, "Prepared By", a.getPreparedBy());
            addRow(doc, "Created By", a.getCreatedBy());
            addRow(doc, "Created At", a.getCreatedAt() != null ? a.getCreatedAt().format(DT_FMT) : "—");

            if (a.getApprovedAt() != null) {
                addSection(doc, "APPROVAL");
                addRow(doc, "Approved By", a.getApprovedBy());
                addRow(doc, "Approved At", a.getApprovedAt().format(DT_FMT));
                addRow(doc, "E-Signature ID", a.getApprovalESignatureId() != null ? a.getApprovalESignatureId().toString() : "—");
            }

            addSection(doc, "QUALITY SUMMARY");
            addRow(doc, "Batches Manufactured", String.valueOf(a.getTotalBatchesManufactured() != null ? a.getTotalBatchesManufactured() : 0));
            addRow(doc, "GRNs Received", String.valueOf(a.getTotalGrnReceived() != null ? a.getTotalGrnReceived() : 0));
            addRow(doc, "GRN Rejections", String.valueOf(a.getGrnRejectionCount() != null ? a.getGrnRejectionCount() : 0));
            addRow(doc, "OOS Results", String.valueOf(a.getOosCount() != null ? a.getOosCount() : 0));
            addRow(doc, "OOT Results", String.valueOf(a.getOotCount() != null ? a.getOotCount() : 0));
            addRow(doc, "Deviations", String.valueOf(a.getDeviationCount() != null ? a.getDeviationCount() : 0));
            addRow(doc, "Open CAPAs", String.valueOf(a.getOpenCapaCount() != null ? a.getOpenCapaCount() : 0));
            addRow(doc, "Change Controls", String.valueOf(a.getChangeControlCount() != null ? a.getChangeControlCount() : 0));
            addRow(doc, "Complaints", String.valueOf(a.getComplaintCount() != null ? a.getComplaintCount() : 0));
            addRow(doc, "Process In Control", a.getProcessInControl() != null ? (a.getProcessInControl() ? "Yes" : "No") : "—");

            addSection(doc, "CONCLUSIONS");
            addTextBlockLabelled(doc, "Trends Identified", a.getTrendsIdentified());
            addTextBlockLabelled(doc, "Recommendations", a.getRecommendations());

            doc.close();
        } catch (Exception e) {
            throw new RuntimeException("PDF generation failed: " + e.getMessage(), e);
        }
        return out.toByteArray();
    }

    // -- Controlled Document Lifecycle Packet --------------------------------

    public byte[] generateControlledDocumentReport(ControlledDocumentResponse d,
                                                   List<DocumentDistributionResponse> distributions,
                                                   String generatedBy) {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        Document doc = new Document(PageSize.A4, 40, 40, 60, 50);
        try {
            PdfWriter writer = PdfWriter.getInstance(doc, out);
            writer.setPageEvent(new FooterEvent("Confidential GMP Record | Document " + d.getDocumentNumber()));
            doc.open();

            addHeader(doc, "CONTROLLED DOCUMENT LIFECYCLE PACKET", d.getDocumentNumber());
            addMeta(doc, generatedBy);

            addSection(doc, "DOCUMENT IDENTITY");
            addRow(doc, "Document Number", d.getDocumentNumber());
            addRow(doc, "Title", d.getTitle());
            addRow(doc, "Type", fmt(d.getDocumentType()));
            addRow(doc, "Category", d.getCategory());
            addRow(doc, "Department", d.getDepartment());
            addRow(doc, "Status", fmt(d.getStatus()));
            addRow(doc, "Current Revision", d.getCurrentRevision() != null ? d.getCurrentRevision().getRevision() : "-");
            addRow(doc, "Linked Material", d.getLinkedMaterialCode());
            addRow(doc, "Linked MoA", d.getLinkedMoaCode());

            addSection(doc, "REVIEW CONTROL");
            addRow(doc, "Effective Date", d.getEffectiveDate() != null ? d.getEffectiveDate().format(D_FMT) : "-");
            addRow(doc, "Review Cycle", d.getReviewCycleMonths() != null ? d.getReviewCycleMonths() + " months" : "-");
            addRow(doc, "Next Review Date", d.getNextReviewDate() != null ? d.getNextReviewDate().format(D_FMT) : "-");
            addRow(doc, "Review Status", fmt(d.getReviewStatus()));

            addSection(doc, "REVISION HISTORY");
            for (DocumentRevisionResponse revision : d.getRevisions()) {
                addRow(doc, "Revision", revision.getRevision() + " / " + fmt(revision.getRevisionStatus()));
                addRow(doc, "Created", nvl(revision.getCreatedBy()) + " at " + fmtDateTime(revision.getCreatedAt()));
                addRow(doc, "Submitted", nvl(revision.getSubmittedBy()) + " at " + fmtDateTime(revision.getSubmittedAt()));
                addRow(doc, "Approved", nvl(revision.getApprovedBy()) + " at " + fmtDateTime(revision.getApprovedAt()));
                addTextBlockLabelled(doc, "Change Summary", revision.getChangeSummary());
                if (revision.getFileName() != null) {
                    addRow(doc, "Controlled File", revision.getFileName());
                }
                addApprovalTable(doc, revision.getApprovals());
            }

            addSection(doc, "DISTRIBUTION AND ACKNOWLEDGEMENT");
            if (distributions == null || distributions.isEmpty()) {
                addTextBlock(doc, "No distribution records.");
            } else {
                for (DocumentDistributionResponse distribution : distributions) {
                    addRow(doc, "Assigned User", distribution.getAssignedUsername());
                    addRow(doc, "Revision / Status", distribution.getRevision() + " / " + fmt(distribution.getStatus()));
                    addRow(doc, "Due Date", distribution.getDueDate() != null ? distribution.getDueDate().format(D_FMT) : "-");
                    addRow(doc, "Assigned", nvl(distribution.getAssignedBy()) + " at " + fmtDateTime(distribution.getAssignedAt()));
                    addRow(doc, "Acknowledged", nvl(distribution.getAcknowledgedBy()) + " at " + fmtDateTime(distribution.getAcknowledgedAt()));
                    addRow(doc, "Acknowledgement E-Signature ID", distribution.getAcknowledgementESignatureId() != null ? distribution.getAcknowledgementESignatureId().toString() : "-");
                    addTextBlockLabelled(doc, "Comments", distribution.getComments());
                }
            }

            addSection(doc, "RECORD INFORMATION");
            addRow(doc, "Created By", d.getCreatedBy());
            addRow(doc, "Created At", fmtDateTime(d.getCreatedAt()));
            addRow(doc, "Last Updated By", d.getUpdatedBy());
            addRow(doc, "Last Updated At", fmtDateTime(d.getUpdatedAt()));

            doc.close();
        } catch (Exception e) {
            throw new RuntimeException("PDF generation failed: " + e.getMessage(), e);
        }
        return out.toByteArray();
    }

    // ── Sampling Lot Release Package ─────────────────────────────────────────

    public byte[] generateSamplingReport(SamplingRequestResponse s, String generatedBy) {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        Document doc = new Document(PageSize.A4, 40, 40, 60, 50);
        try {
            PdfWriter writer = PdfWriter.getInstance(doc, out);
            String refNum = s.getId() != null ? s.getId().toString().substring(0, 8).toUpperCase() : "UNKNOWN";
            writer.setPageEvent(new FooterEvent("Confidential GMP Record | Sampling " + refNum));
            doc.open();

            addHeader(doc, "LOT RELEASE PACKAGE", refNum);
            addMeta(doc, generatedBy);

            addSection(doc, "SAMPLING REQUEST");
            addRow(doc, "Request ID", s.getId() != null ? s.getId().toString() : "—");
            addRow(doc, "Status", fmt(s.getRequestStatus()));
            addRow(doc, "GRN ID", s.getGrnId() != null ? s.getGrnId().toString() : "—");
            addRow(doc, "Material ID", s.getMaterialId() != null ? s.getMaterialId().toString() : "—");
            addRow(doc, "Total Containers", String.valueOf(s.getTotalContainers()));
            addRow(doc, "Cycle Number", String.valueOf(s.getCycleNumber()));

            addSection(doc, "QC DECISION");
            addRow(doc, "QC Decision Remarks", nvl(s.getQcDecisionRemarks()));
            addRow(doc, "Decided By", nvl(s.getQcDecidedBy()));
            addRow(doc, "Decided At", s.getQcDecidedAt() != null ? s.getQcDecidedAt().format(DT_FMT) : "—");
            addRow(doc, "Confirmed By", nvl(s.getQcDecisionConfirmedBy()));
            addRow(doc, "Confirmation Text", nvl(s.getQcDecisionConfirmationText()));
            addRow(doc, "Confirmed At", s.getQcDecisionConfirmationAt() != null ? s.getQcDecisionConfirmationAt().format(DT_FMT) : "—");

            if (s.getQcDisposition() != null) {
                addSection(doc, "QC DISPOSITION");
                addRow(doc, "Disposition", fmt(s.getQcDisposition().getStatus()));
                addRow(doc, "Decision By", nvl(s.getQcDisposition().getDecisionBy()));
                addRow(doc, "Decision At", s.getQcDisposition().getDecisionAt() != null ? s.getQcDisposition().getDecisionAt().format(DT_FMT) : "—");
                addTextBlockLabelled(doc, "Decision Remarks", s.getQcDisposition().getDecisionRemarks());
            }

            addSection(doc, "RECORD INFORMATION");
            addRow(doc, "Created By", nvl(s.getCreatedBy()));
            addRow(doc, "Created At", s.getCreatedAt() != null ? s.getCreatedAt().format(DT_FMT) : "—");
            addRow(doc, "Last Updated By", nvl(s.getUpdatedBy()));
            addRow(doc, "Last Updated At", s.getUpdatedAt() != null ? s.getUpdatedAt().format(DT_FMT) : "—");

            doc.close();
        } catch (Exception e) {
            throw new RuntimeException("PDF generation failed: " + e.getMessage(), e);
        }
        return out.toByteArray();
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private void addHeader(Document doc, String title, String docNumber) throws Exception {
        PdfPTable header = new PdfPTable(2);
        header.setWidthPercentage(100);
        header.setWidths(new float[]{3f, 1f});

        PdfPCell left = new PdfPCell();
        left.setBackgroundColor(HEADER_BG);
        left.setBorder(Rectangle.NO_BORDER);
        left.setPadding(12);

        Paragraph p = new Paragraph();
        p.add(new Chunk("BatchSphere\n", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 11, Color.WHITE)));
        p.add(new Chunk(title, TITLE_FONT));
        left.addElement(p);

        PdfPCell right = new PdfPCell();
        right.setBackgroundColor(HEADER_BG);
        right.setBorder(Rectangle.NO_BORDER);
        right.setPaddingTop(12);
        right.setPaddingRight(12);
        right.setHorizontalAlignment(Element.ALIGN_RIGHT);
        right.setVerticalAlignment(Element.ALIGN_MIDDLE);

        Paragraph rp = new Paragraph();
        rp.add(new Chunk("Document No.\n", SUBTITLE_FONT));
        rp.add(new Chunk(docNumber, FontFactory.getFont(FontFactory.HELVETICA_BOLD, 11, Color.WHITE)));
        rp.setAlignment(Element.ALIGN_RIGHT);
        right.addElement(rp);

        header.addCell(left);
        header.addCell(right);
        doc.add(header);
        doc.add(new Paragraph(" "));
    }

    private void addMeta(Document doc, String generatedBy) throws Exception {
        PdfPTable meta = new PdfPTable(3);
        meta.setWidthPercentage(100);
        metaCell(meta, "Generated By", generatedBy);
        metaCell(meta, "Generated At", LocalDateTime.now().format(DT_FMT));
        metaCell(meta, "System", "BatchSphere GMP Platform");
        doc.add(meta);
        doc.add(new Paragraph(" "));
    }

    private void metaCell(PdfPTable table, String label, String value) {
        PdfPCell cell = new PdfPCell();
        cell.setBackgroundColor(SECTION_BG);
        cell.setBorderColor(BORDER_COLOR);
        cell.setPadding(6);
        Paragraph p = new Paragraph();
        p.add(new Chunk(label + "\n", LABEL_FONT));
        p.add(new Chunk(nvl(value), VALUE_FONT));
        cell.addElement(p);
        table.addCell(cell);
    }

    private void addSection(Document doc, String title) throws Exception {
        doc.add(new Paragraph(" "));
        PdfPTable t = new PdfPTable(1);
        t.setWidthPercentage(100);
        PdfPCell cell = new PdfPCell(new Phrase(title, SECTION_FONT));
        cell.setBackgroundColor(SECTION_BG);
        cell.setBorderColor(BORDER_COLOR);
        cell.setPadding(6);
        t.addCell(cell);
        doc.add(t);
    }

    private void addRow(Document doc, String label, String value) throws Exception {
        PdfPTable t = new PdfPTable(2);
        t.setWidthPercentage(100);
        t.setWidths(new float[]{1.5f, 3.5f});

        PdfPCell lc = new PdfPCell(new Phrase(label, LABEL_FONT));
        lc.setBorderColor(BORDER_COLOR);
        lc.setPadding(5);

        PdfPCell vc = new PdfPCell(new Phrase(nvl(value), VALUE_FONT));
        vc.setBorderColor(BORDER_COLOR);
        vc.setPadding(5);

        t.addCell(lc);
        t.addCell(vc);
        doc.add(t);
    }

    private void addTextBlock(Document doc, String text) throws Exception {
        Paragraph p = new Paragraph(nvl(text), VALUE_FONT);
        p.setIndentationLeft(8);
        p.setSpacingBefore(4);
        p.setSpacingAfter(4);
        doc.add(p);
    }

    private void addTextBlockLabelled(Document doc, String label, String text) throws Exception {
        if (text == null || text.isBlank()) return;
        addRow(doc, label, "");
        addTextBlock(doc, text);
    }

    private void addApprovalTable(Document doc, List<DocumentApprovalResponse> approvals) throws Exception {
        if (approvals == null || approvals.isEmpty()) {
            return;
        }
        PdfPTable table = new PdfPTable(5);
        table.setWidthPercentage(100);
        table.setWidths(new float[]{1.4f, 1.2f, 1.3f, 1.4f, 1.7f});
        addTableHeader(table, "Step");
        addTableHeader(table, "Status");
        addTableHeader(table, "Approved By");
        addTableHeader(table, "Approved At");
        addTableHeader(table, "E-Signature ID");
        for (DocumentApprovalResponse approval : approvals) {
            addTableCell(table, fmt(approval.getApprovalStep()));
            addTableCell(table, fmt(approval.getStatus()));
            addTableCell(table, approval.getApprovedBy());
            addTableCell(table, fmtDateTime(approval.getApprovedAt()));
            addTableCell(table, approval.getESignatureId() != null ? approval.getESignatureId().toString() : "-");
        }
        doc.add(table);
    }

    private void addTableHeader(PdfPTable table, String value) {
        PdfPCell cell = new PdfPCell(new Phrase(value, LABEL_FONT));
        cell.setBackgroundColor(SECTION_BG);
        cell.setBorderColor(BORDER_COLOR);
        cell.setPadding(5);
        table.addCell(cell);
    }

    private void addTableCell(PdfPTable table, String value) {
        PdfPCell cell = new PdfPCell(new Phrase(nvl(value), VALUE_FONT));
        cell.setBorderColor(BORDER_COLOR);
        cell.setPadding(5);
        table.addCell(cell);
    }

    private String fmt(Object o) {
        if (o == null) return "—";
        return o.toString().replace("_", " ");
    }

    private String nvl(String s) {
        return (s == null || s.isBlank()) ? "—" : s;
    }

    private String fmtDateTime(LocalDateTime value) {
        return value != null ? value.format(DT_FMT) : "-";
    }

    // ── Footer page event ─────────────────────────────────────────────────────

    private static class FooterEvent extends PdfPageEventHelper {
        private final String label;
        FooterEvent(String label) { this.label = label; }

        @Override
        public void onEndPage(PdfWriter writer, Document document) {
            try {
                PdfPTable footer = new PdfPTable(2);
                footer.setTotalWidth(document.getPageSize().getWidth() - 80);
                footer.setLockedWidth(true);

                PdfPCell left = new PdfPCell(new Phrase(label, FOOTER_FONT));
                left.setBorder(Rectangle.TOP);
                left.setBorderColor(new Color(226, 232, 240));
                left.setPaddingTop(4);

                PdfPCell right = new PdfPCell(new Phrase("Page " + writer.getPageNumber(), FOOTER_FONT));
                right.setBorder(Rectangle.TOP);
                right.setBorderColor(new Color(226, 232, 240));
                right.setHorizontalAlignment(Element.ALIGN_RIGHT);
                right.setPaddingTop(4);

                footer.addCell(left);
                footer.addCell(right);
                footer.writeSelectedRows(0, -1, 40, 40, writer.getDirectContent());
            } catch (Exception ignored) {}
        }
    }
}
