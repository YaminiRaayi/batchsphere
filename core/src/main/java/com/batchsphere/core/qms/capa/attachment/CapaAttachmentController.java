package com.batchsphere.core.qms.capa.attachment;

import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/capas/{capaId}/attachments")
@RequiredArgsConstructor
public class CapaAttachmentController {

    private final CapaAttachmentService attachmentService;

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<CapaAttachmentResponse> upload(@PathVariable UUID capaId,
                                                         @RequestParam CapaAttachmentStage stage,
                                                         @RequestParam MultipartFile file) {
        return ResponseEntity.ok(attachmentService.uploadAttachment(capaId, stage, file));
    }

    @GetMapping
    public ResponseEntity<List<CapaAttachmentResponse>> list(@PathVariable UUID capaId) {
        return ResponseEntity.ok(attachmentService.listAttachments(capaId));
    }

    @DeleteMapping("/{attachmentId}")
    public ResponseEntity<Void> remove(@PathVariable UUID capaId, @PathVariable UUID attachmentId) {
        attachmentService.removeAttachment(capaId, attachmentId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{attachmentId}/file")
    public ResponseEntity<Resource> download(@PathVariable UUID capaId, @PathVariable UUID attachmentId) {
        Resource resource = attachmentService.downloadAttachment(capaId, attachmentId);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + resource.getFilename() + "\"")
                .body(resource);
    }
}
