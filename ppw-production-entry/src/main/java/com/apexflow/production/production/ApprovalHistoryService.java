package com.apexflow.production.production;

import com.apexflow.production.user.User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Service
public class ApprovalHistoryService {

    private final ApprovalHistoryRepository repository;

    public ApprovalHistoryService(
            ApprovalHistoryRepository repository
    ) {
        this.repository = repository;
    }

    @Transactional
    public void record(
            ProductionEntry entry,
            EntryStatus from,
            EntryStatus to,
            User changedBy,
            String remark
    ) {

        ApprovalHistory history =
                new ApprovalHistory(
                        entry,
                        from,
                        to,
                        changedBy,
                        Instant.now(),
                        remark
                );

        repository.save(history);
    }

    @Transactional(readOnly = true)
    public List<ApprovalHistory> getHistory(Long entryId) {
        return repository
                .findByProductionEntryIdOrderByChangedAtDesc(entryId);
    }

    @Transactional(readOnly = true)
    public ApprovalHistory getLatest(Long entryId) {
        return repository
                .findFirstByProductionEntryIdOrderByChangedAtDesc(entryId)
                .orElse(null);
    }
}