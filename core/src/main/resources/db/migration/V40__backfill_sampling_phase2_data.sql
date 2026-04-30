INSERT INTO qc_sample (
    id,
    sample_number,
    sampling_request_id,
    batch_id,
    material_id,
    sample_type,
    sample_status,
    sample_quantity,
    uom,
    collected_by,
    collected_at,
    sampling_location,
    handoff_to_qc_by,
    handoff_to_qc_at,
    remarks,
    is_active,
    created_by,
    created_at,
    updated_by,
    updated_at
)
SELECT
    RANDOM_UUID(),
    'SMP-HIST-' || upper(substr(replace(CAST(sr.id AS VARCHAR), '-', ''), 1, 8)),
    sr.id,
    sr.batch_id,
    sr.material_id,
    sp.sample_type,
    CASE
        WHEN sr.request_status = 'APPROVED' THEN 'APPROVED'
        WHEN sr.request_status = 'REJECTED' THEN 'REJECTED'
        WHEN sr.request_status = 'COMPLETED' THEN 'HANDED_TO_QC'
        WHEN sr.request_status = 'HANDED_TO_QC' THEN 'HANDED_TO_QC'
        WHEN sr.request_status = 'SAMPLED' THEN 'COLLECTED'
        ELSE 'COLLECTED'
    END,
    COALESCE(sum(scs.sampled_quantity), 0),
    gi.uom,
    COALESCE(max(gc.sampled_by), sr.updated_by, sr.created_by),
    COALESCE(max(gc.sampled_at), sr.updated_at, sr.created_at),
    sp.sampling_location,
    CASE
        WHEN sr.request_status IN ('APPROVED', 'REJECTED', 'COMPLETED', 'HANDED_TO_QC') THEN COALESCE(sr.updated_by, sr.created_by)
        ELSE NULL
    END,
    CASE
        WHEN sr.request_status IN ('APPROVED', 'REJECTED', 'COMPLETED', 'HANDED_TO_QC') THEN COALESCE(sr.updated_at, sr.created_at)
        ELSE NULL
    END,
    'Backfilled historical sample record',
    true,
    sr.created_by,
    sr.created_at,
    sr.updated_by,
    sr.updated_at
FROM sampling_request sr
JOIN sampling_plan sp ON sp.sampling_request_id = sr.id
LEFT JOIN sampling_container_sample scs ON scs.sampling_plan_id = sp.id
LEFT JOIN grn_container gc ON gc.id = scs.grn_container_id
LEFT JOIN grn_item gi ON gi.id = sr.grn_item_id
LEFT JOIN qc_sample existing_sample ON existing_sample.sampling_request_id = sr.id
WHERE existing_sample.id IS NULL
  AND (
      sr.request_status IN ('APPROVED', 'REJECTED', 'COMPLETED', 'HANDED_TO_QC', 'SAMPLED')
      OR EXISTS (
          SELECT 1
          FROM sampling_container_sample has_sample
          WHERE has_sample.sampling_plan_id = sp.id
      )
  )
GROUP BY
    sr.id,
    sr.batch_id,
    sr.material_id,
    sp.sample_type,
    gi.uom,
    sp.sampling_location,
    sr.request_status,
    sr.updated_by,
    sr.created_by,
    sr.updated_at,
    sr.created_at;

INSERT INTO qc_sample_container_link (
    id,
    sample_id,
    grn_container_id,
    container_number,
    sampled_quantity,
    created_by,
    created_at,
    updated_by,
    updated_at
)
SELECT
    RANDOM_UUID(),
    qs.id,
    scs.grn_container_id,
    scs.container_number,
    scs.sampled_quantity,
    scs.created_by,
    scs.created_at,
    scs.updated_by,
    scs.updated_at
FROM sampling_container_sample scs
JOIN sampling_plan sp ON sp.id = scs.sampling_plan_id
JOIN qc_sample qs ON qs.sampling_request_id = sp.sampling_request_id
LEFT JOIN qc_sample_container_link existing_link
    ON existing_link.sample_id = qs.id
   AND existing_link.grn_container_id = scs.grn_container_id
WHERE existing_link.id IS NULL;

INSERT INTO qc_disposition (
    id,
    sample_id,
    sampling_request_id,
    status,
    decision_remarks,
    decision_by,
    decision_at,
    is_active,
    created_by,
    created_at,
    updated_by,
    updated_at
)
SELECT
    RANDOM_UUID(),
    qs.id,
    sr.id,
    CASE
        WHEN sr.request_status = 'APPROVED' THEN 'APPROVED'
        WHEN sr.request_status = 'REJECTED' THEN 'REJECTED'
        ELSE 'PENDING'
    END,
    sr.qc_decision_remarks,
    sr.qc_decided_by,
    sr.qc_decided_at,
    true,
    sr.created_by,
    sr.created_at,
    sr.updated_by,
    sr.updated_at
FROM sampling_request sr
LEFT JOIN qc_sample qs ON qs.sampling_request_id = sr.id
LEFT JOIN qc_disposition existing_disposition ON existing_disposition.sampling_request_id = sr.id
WHERE existing_disposition.id IS NULL
  AND sr.request_status IN ('APPROVED', 'REJECTED', 'HANDED_TO_QC', 'COMPLETED');

UPDATE sampling_request
SET request_status = 'COMPLETED',
    updated_at = COALESCE(updated_at, CURRENT_TIMESTAMP)
WHERE request_status IN ('APPROVED', 'REJECTED');
