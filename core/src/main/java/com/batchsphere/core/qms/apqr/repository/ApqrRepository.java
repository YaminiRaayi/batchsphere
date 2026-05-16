package com.batchsphere.core.qms.apqr.repository;

import com.batchsphere.core.qms.apqr.entity.Apqr;
import com.batchsphere.core.qms.apqr.entity.Apqr.ApqrStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ApqrRepository extends JpaRepository<Apqr, UUID> {

  Page<Apqr> findByIsActiveTrue(Pageable pageable);

  Page<Apqr> findByReviewYearAndIsActiveTrue(Integer reviewYear, Pageable pageable);

  Page<Apqr> findByMaterialIdAndIsActiveTrue(UUID materialId, Pageable pageable);

  Page<Apqr> findByStatusAndIsActiveTrue(ApqrStatus status, Pageable pageable);

  Optional<Apqr> findByMaterialIdAndReviewYearAndIsActiveTrue(UUID materialId, Integer reviewYear);

  @Query("SELECT a FROM Apqr a WHERE a.isActive = true AND a.status IN :statuses")
  List<Apqr> findInProgressApqrs(@Param("statuses") List<ApqrStatus> statuses);

  default List<Apqr> findInProgressApqrs() {
    return findInProgressApqrs(List.of(ApqrStatus.DRAFT, ApqrStatus.UNDER_REVIEW));
  }

  @Query("SELECT a FROM Apqr a WHERE a.isActive = true AND a.status IN :statuses AND a.reviewYear = :year")
  List<Apqr> findInProgressApqrsByYear(@Param("year") Integer year, @Param("statuses") List<ApqrStatus> statuses);

  default List<Apqr> findInProgressApqrsByYear(Integer year) {
    return findInProgressApqrsByYear(year, List.of(ApqrStatus.DRAFT, ApqrStatus.UNDER_REVIEW));
  }

  @Query("SELECT a FROM Apqr a WHERE a.id = :id AND a.isActive = true")
  Optional<Apqr> findByIdAndIsActiveTrue(@Param("id") UUID id);

  @Query("SELECT COUNT(a) FROM Apqr a WHERE a.isActive = true AND a.reviewYear = :year AND a.status = :status")
  long countByYearAndStatus(@Param("year") Integer year, @Param("status") ApqrStatus status);

  @Query("SELECT a.materialId, a.productName, a.reviewYear, a.status, " +
         "COALESCE(a.totalBatchesManufactured, 0), COALESCE(a.oosCount, 0), " +
         "COALESCE(a.deviationCount, 0), COALESCE(a.openCapaCount, 0) " +
         "FROM Apqr a WHERE a.isActive = true ORDER BY a.reviewYear DESC, a.productName")
  List<Object[]> findAllActiveSummaries();

}
