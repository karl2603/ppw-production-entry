package com.apexflow.production.production;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ApprovalHistoryRepository
        extends JpaRepository<ApprovalHistory, Long> {

    List<ApprovalHistory>
    findByProductionEntryIdOrderByChangedAtDesc(Long productionEntryId);

    Optional<ApprovalHistory>
    findFirstByProductionEntryIdOrderByChangedAtDesc(
            Long productionEntryId
    );
}