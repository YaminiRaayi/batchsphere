ALTER TABLE grn_container ADD COLUMN IF NOT EXISTS remaining_quantity NUMERIC(18,3);

UPDATE grn_container
SET remaining_quantity = COALESCE(remaining_quantity, quantity)
WHERE remaining_quantity IS NULL;

ALTER TABLE grn_container ALTER COLUMN remaining_quantity SET NOT NULL;

ALTER TABLE sampling_container_sample ADD COLUMN IF NOT EXISTS draw_purpose VARCHAR(50);
ALTER TABLE sampling_container_sample ADD COLUMN IF NOT EXISTS container_condition VARCHAR(255);
ALTER TABLE sampling_container_sample ADD COLUMN IF NOT EXISTS resealed BOOLEAN;
ALTER TABLE sampling_container_sample ADD COLUMN IF NOT EXISTS label_applied BOOLEAN;

UPDATE sampling_container_sample
SET draw_purpose = COALESCE(draw_purpose, 'COMPOSITE_ASSAY'),
    resealed = COALESCE(resealed, TRUE),
    label_applied = COALESCE(label_applied, TRUE)
WHERE draw_purpose IS NULL
   OR resealed IS NULL
   OR label_applied IS NULL;

ALTER TABLE sampling_container_sample ALTER COLUMN draw_purpose SET NOT NULL;
ALTER TABLE sampling_container_sample ALTER COLUMN resealed SET NOT NULL;
ALTER TABLE sampling_container_sample ALTER COLUMN label_applied SET NOT NULL;

CREATE TABLE IF NOT EXISTS sampling_container_draw (
    id UUID PRIMARY KEY,
    sampling_plan_id UUID NOT NULL,
    grn_container_id UUID NOT NULL,
    draw_purpose VARCHAR(50) NOT NULL,
    planned_quantity NUMERIC(18,3) NOT NULL,
    actual_quantity NUMERIC(18,3) NOT NULL,
    uom VARCHAR(50) NOT NULL,
    balance_before NUMERIC(18,3) NOT NULL,
    balance_after NUMERIC(18,3) NOT NULL,
    sampled_by VARCHAR(100) NOT NULL,
    sampled_at TIMESTAMP NOT NULL,
    container_condition VARCHAR(255),
    resealed BOOLEAN NOT NULL DEFAULT TRUE,
    label_applied BOOLEAN NOT NULL DEFAULT TRUE,
    created_by VARCHAR(100) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    CONSTRAINT fk_sampling_container_draw_plan
        FOREIGN KEY (sampling_plan_id) REFERENCES sampling_plan(id),
    CONSTRAINT fk_sampling_container_draw_container
        FOREIGN KEY (grn_container_id) REFERENCES grn_container(id)
);

CREATE INDEX IF NOT EXISTS idx_sampling_container_draw_plan ON sampling_container_draw(sampling_plan_id);
CREATE INDEX IF NOT EXISTS idx_sampling_container_draw_container ON sampling_container_draw(grn_container_id);
