ALTER TABLE grn_document
    ADD COLUMN grn_item_id UUID;

UPDATE grn_document gd
SET grn_item_id = (
    SELECT gi.id
    FROM grn_item gi
    WHERE gi.grn_id = gd.grn_id
      AND gi.line_number = (
          SELECT MIN(gi2.line_number)
          FROM grn_item gi2
          WHERE gi2.grn_id = gd.grn_id
      )
);

ALTER TABLE grn_document
    ALTER COLUMN grn_item_id SET NOT NULL;

ALTER TABLE grn_document
    ADD CONSTRAINT fk_grn_document_grn_item
        FOREIGN KEY (grn_item_id) REFERENCES grn_item(id);
