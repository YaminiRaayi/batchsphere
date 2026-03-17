ALTER TABLE material
    ADD COLUMN photosensitive BOOLEAN;

ALTER TABLE material
    ADD COLUMN hygroscopic BOOLEAN;

ALTER TABLE material
    ADD COLUMN hazardous BOOLEAN;

ALTER TABLE material
    ADD COLUMN selective_material BOOLEAN;

ALTER TABLE material
    ADD COLUMN vendor_coa_release_allowed BOOLEAN;

UPDATE material
SET photosensitive = FALSE,
    hygroscopic = FALSE,
    hazardous = FALSE,
    selective_material = FALSE,
    vendor_coa_release_allowed = FALSE
WHERE photosensitive IS NULL
   OR hygroscopic IS NULL
   OR hazardous IS NULL
   OR selective_material IS NULL
   OR vendor_coa_release_allowed IS NULL;

ALTER TABLE material
    ALTER COLUMN photosensitive SET NOT NULL;

ALTER TABLE material
    ALTER COLUMN hygroscopic SET NOT NULL;

ALTER TABLE material
    ALTER COLUMN hazardous SET NOT NULL;

ALTER TABLE material
    ALTER COLUMN selective_material SET NOT NULL;

ALTER TABLE material
    ALTER COLUMN vendor_coa_release_allowed SET NOT NULL;
