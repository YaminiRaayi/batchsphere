# QC Container Sampling Rules

Last updated: 2026-04-25

## Purpose

This note defines how BatchSphere should think about sampling from individual containers during inbound raw-material quality control.

It focuses on:

- what GMP-style expectations exist
- what should become BatchSphere product rules
- what can be implemented earlier vs later

This is a design note to support the phased Sampling and QC implementation plan.

## Short Answer

Yes, container-level sampling has real rules.

But the rules are not always one fixed formula.

They usually come from a combination of:

- GMP expectations
- material risk and type
- supplier qualification level
- approved internal SOP
- validated reduced-sampling policy, if any

So BatchSphere should not hardcode one universal rule for every material.

It should support a controlled sampling-policy model.

## Regulatory Expectations

### EU GMP Chapter 6

Sampling must follow approved written procedures that define:

- method of sampling
- equipment used
- amount sampled
- identification of sampled containers
- special precautions
- storage conditions
- cleaning and storage of sampling equipment

Samples must be representative of the batch, and the sampling plan must be justified.

Sample containers should be labeled with:

- contents
- batch number
- sampling date
- the containers from which samples were drawn

Source:
https://health.ec.europa.eu/system/files/2016-11/mallet_gmp_chapter_6_0.pdf

### EU GMP Annex 8

For starting materials:

- batch identity is normally ensured by taking individual samples from all containers and performing identity testing on each
- sampling only a proportion of containers is acceptable only when a validated procedure exists
- the representative sample size and any composite blending rule should be defined in the sampling plan

Annex 8 also emphasizes:

- training of personnel
- risks of cross-contamination
- precautions for unstable or sterile materials
- recording unusual circumstances

Source:
https://health.ec.europa.eu/system/files/2016-11/anx08_en_0.pdf

### WHO Quality Control Laboratory Guidance

WHO guidance reinforces that sampling should involve:

- trained personnel
- aseptic technique where required
- maintained sample integrity
- controlled transport and storage
- receipt-condition checks
- documented sampling date, time, and conditions

Source:
https://www.who.int/publications/m/item/who-good-practices-for-pharmaceutical-quality-control-laboratories

## What These Rules Mean In Practice

For BatchSphere, container-level sampling should eventually answer these questions for every sampling workflow:

1. Which containers must be sampled?
2. Is identity testing required from every container or only some?
3. Is reduced sampling allowed?
4. Is reduced sampling validated for this material/supplier combination?
5. Can samples from multiple containers be composited?
6. How much sample should be taken from each selected container?
7. Does the material require special precautions while sampling?
8. Must the sampled container be resealed or relabeled?
9. Must the sample be transported under controlled conditions?
10. Does QC need to record condition on receipt?

## Recommended BatchSphere Rule Model

### Rule Group 1: Container Selection Rule

BatchSphere should support rules such as:

- `ALL_CONTAINERS`
- `SQRT_N_PLUS_1`
- `RISK_BASED_REDUCED`
- `COA_BASED_NO_PHYSICAL_SAMPLING`

Meaning:

- `ALL_CONTAINERS`
  use when identity from each container is required
- `SQRT_N_PLUS_1`
  use where the business follows that internal rule for representative sampling
- `RISK_BASED_REDUCED`
  use only where reduced sampling is justified and validated
- `COA_BASED_NO_PHYSICAL_SAMPLING`
  use only where supplier and material policy allow it

### Rule Group 2: Sample Type Rule

BatchSphere should distinguish:

- `IDENTITY_SAMPLE`
- `COMPOSITE_QC_SAMPLE`
- `RETENTION_SAMPLE`

This matters because one sampling event may withdraw more than one logical sample type.

### Rule Group 3: Composite Rule

BatchSphere should capture whether:

- compositing is allowed
- compositing is prohibited
- maximum number of containers per composite is limited

### Rule Group 4: Special Precaution Rule

BatchSphere should support flags such as:

- `photosensitive`
- `hygroscopic`
- `hazardous`
- `sterile`
- `cold_chain`
- `use_dedicated_sampling_area`

### Rule Group 5: Supplier Qualification Rule

Reduced sampling should not be enabled only by material type.

It should also depend on:

- approved supplier status
- direct manufacturer vs broker/intermediary
- sealed original container
- audit history / reliability

This aligns with the logic of EU GMP Annex 8.

## Recommended Data To Capture Per Container

For every sampled container, the system should eventually store:

- `grnContainerId`
- `containerNumber`
- `selectedForSampling`
- `sampleType`
- `sampledQuantity`
- `sampledAt`
- `sampledBy`
- `samplingLocation`
- `containerCondition`
- `resealed`
- `samplingLabelApplied`
- `remarks`

Later optional:

- `temperatureAtSampling`
- `humidityAtSampling`
- `tamperSealStatus`

## Recommended Data To Capture Per Sample

At sample level, not only container level:

- `sampleNumber`
- `sampleType`
- `totalSampleQuantity`
- `derivedFromContainers`
- `collectedAt`
- `collectedBy`
- `handoffToQcAt`
- `handoffToQcBy`
- `receivedAtQc`
- `receivedByQc`
- `receiptCondition`
- `storageCondition`

## Product Rules Recommended For BatchSphere

### Minimum rule set

BatchSphere should at least support:

- a sampling method per material/spec
- container count calculation rule
- per-container sampled quantity capture
- prevention of duplicate container selection
- prevention of sampling quantity beyond container balance
- record of who sampled and when
- explicit indication of which containers were sampled

### Stronger rule set

BatchSphere should next support:

- special handling flags
- identity-vs-composite sample distinction
- reduced sampling eligibility flags
- handoff to QC
- QC receipt condition

### Advanced rule set

BatchSphere can later support:

- supplier-qualified reduced sampling policy
- separate retained-sample flow
- temperature/humidity capture during sampling
- rule-driven sampling area restriction

## What The Current Code Already Supports

Current backend already supports:

- container-level sample quantity capture
- selected container validation
- duplicate container prevention
- quantity cannot exceed container quantity
- sampling method logic

Relevant code:

- [SamplingServiceImpl.java](/Users/induraghav/gitrepo/batchsphere/core/src/main/java/com/batchsphere/core/transactions/sampling/service/SamplingServiceImpl.java:339)
- [SamplingServiceImpl.java](/Users/induraghav/gitrepo/batchsphere/core/src/main/java/com/batchsphere/core/transactions/sampling/service/SamplingServiceImpl.java:417)

Current gaps:

- no separate identity sample vs composite sample modeling
- no validated reduced-sampling rule model
- no supplier-risk-based container selection rule
- no QC receipt-condition record
- no first-class sample entity
- no retained-sample lifecycle

## Recommended Phase Mapping

### Phase 1

Cover these container-sampling capabilities:

- explicit container selection for sampling
- explicit physical sampling start and completion
- clear sampled-container status visibility
- sampled quantity capture per selected container
- sampler, timestamp, and sampling-location capture
- basic special precaution notes on the plan

### Phase 2

Cover these stronger container-sampling capabilities:

- first-class `Sample` entity
- sample-to-container linkage
- identity sample vs composite sample distinction
- QC receipt and sample condition capture
- better custody trail from warehouse to QC

### Phase 3

Cover advanced rule-driven quality behavior:

- resample and retest cycles
- investigation-linked container/sample traceability
- reduced sampling policy based on validated risk rules
- supplier-qualified reduced sampling support

### Phase 4

Cover compliance hardening:

- retained sample lifecycle
- approval/e-sign hooks for exception sampling
- deviation / CAPA linkage for sampling anomalies

## Recommendation For Implementation

Do not try to build the full reduced-sampling policy engine in Phase 1.

Phase 1 should focus on making physical container sampling explicit and auditable.

Then Phase 2 should introduce proper sample modeling.

Then Phase 3 can add risk-based and supplier-qualified reduced sampling logic once the core custody model is stable.
