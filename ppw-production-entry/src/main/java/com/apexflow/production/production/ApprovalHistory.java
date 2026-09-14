package com.apexflow.production.production;

import com.apexflow.production.user.User;
import jakarta.persistence.*;

import java.time.Instant;

@Entity
@Table(name = "approval_history")
public class ApprovalHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "production_entry_id", nullable = false)
    private ProductionEntry productionEntry;

    @Enumerated(EnumType.STRING)
    @Column(name = "from_status", length = 30)
    private EntryStatus fromStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "to_status", nullable = false, length = 30)
    private EntryStatus toStatus;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "changed_by", nullable = false)
    private User changedBy;

    @Column(name = "changed_at", nullable = false)
    private Instant changedAt;

    @Column(length = 1000)
    private String remark;

    protected ApprovalHistory() {
    }

    public ApprovalHistory(
            ProductionEntry productionEntry,
            EntryStatus fromStatus,
            EntryStatus toStatus,
            User changedBy,
            Instant changedAt,
            String remark
    ) {
        this.productionEntry = productionEntry;
        this.fromStatus = fromStatus;
        this.toStatus = toStatus;
        this.changedBy = changedBy;
        this.changedAt = changedAt;
        this.remark = remark;
    }

    public Long getId() {
        return id;
    }

    public ProductionEntry getProductionEntry() {
        return productionEntry;
    }

    public EntryStatus getFromStatus() {
        return fromStatus;
    }

    public EntryStatus getToStatus() {
        return toStatus;
    }

    public User getChangedBy() {
        return changedBy;
    }

    public Instant getChangedAt() {
        return changedAt;
    }

    public String getRemark() {
        return remark;
    }
}