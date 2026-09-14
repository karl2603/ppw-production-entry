package com.apexflow.production.production;

import com.apexflow.production.user.User;
import jakarta.persistence.*;

import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(
        name = "production_entries",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_production_client_id",
                        columnNames = "client_id"
                ),
                @UniqueConstraint(
                        name = "uk_production_slot",
                        columnNames = {
                                "entry_date",
                                "shift",
                                "hour_slot",
                                "machine"
                        }
                )
        }
)
public class ProductionEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(
            name = "client_id",
            nullable = false,
            unique = true,
            length = 100
    )
    private String clientId;

    @Column(name = "entry_date", nullable = false)
    private LocalDate entryDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private Shift shift;

    @Column(name = "hour_slot", nullable = false)
    private Integer hourSlot;

    @Column(nullable = false, length = 50)
    private String machine;

    @Column(name = "part_number", nullable = false, length = 50)
    private String partNumber;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "operator_id", nullable = false)
    private User operator;

    @Column(name = "planned_quantity", nullable = false)
    private Integer plannedQuantity;

    @Column(name = "produced_quantity", nullable = false)
    private Integer producedQuantity;

    @Column(name = "rejected_quantity", nullable = false)
    private Integer rejectedQuantity;

    @Column(name = "rejection_reason", length = 100)
    private String rejectionReason;

    @Column(name = "downtime_minutes", nullable = false)
    private Integer downtimeMinutes;

    @Column(name = "downtime_reason", length = 500)
    private String downtimeReason;

    @Column(length = 1000)
    private String remarks;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private EntryStatus status;

    @Version
    private Long version;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected ProductionEntry() {
    }

    @PrePersist
    private void onCreate() {
        Instant now = Instant.now();

        if (createdAt == null) {
            createdAt = now;
        }

        if (updatedAt == null) {
            updatedAt = now;
        }

        if (status == null) {
            status = EntryStatus.DRAFT;
        }
    }

    @PreUpdate
    private void onUpdate() {
        updatedAt = Instant.now();
    }

    public int getAcceptedQuantity() {
        return producedQuantity - rejectedQuantity;
    }

    public double getRejectionPercentage() {

        if (producedQuantity == 0) {
            return 0.0;
        }

        return (
                ((double) rejectedQuantity / producedQuantity) * 100.0
        );
    }

    public double getAchievementPercentage() {

        if (plannedQuantity == 0) {
            return 0.0;
        }

        return (
                ((double) getAcceptedQuantity() / plannedQuantity) * 100.0
        );
    }

    public int getRunningTime() {
        return 60 - downtimeMinutes;
    }

    public Long getId() {
        return id;
    }

    public String getClientId() {
        return clientId;
    }

    public LocalDate getEntryDate() {
        return entryDate;
    }

    public Shift getShift() {
        return shift;
    }

    public Integer getHourSlot() {
        return hourSlot;
    }

    public String getMachine() {
        return machine;
    }

    public String getPartNumber() {
        return partNumber;
    }

    public User getOperator() {
        return operator;
    }

    public Integer getPlannedQuantity() {
        return plannedQuantity;
    }

    public Integer getProducedQuantity() {
        return producedQuantity;
    }

    public Integer getRejectedQuantity() {
        return rejectedQuantity;
    }

    public String getRejectionReason() {
        return rejectionReason;
    }

    public Integer getDowntimeMinutes() {
        return downtimeMinutes;
    }

    public String getDowntimeReason() {
        return downtimeReason;
    }

    public String getRemarks() {
        return remarks;
    }

    public EntryStatus getStatus() {
        return status;
    }

    public Long getVersion() {
        return version;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setClientId(String clientId) {
        this.clientId = clientId;
    }

    public void setEntryDate(LocalDate entryDate) {
        this.entryDate = entryDate;
    }

    public void setShift(Shift shift) {
        this.shift = shift;
    }

    public void setHourSlot(Integer hourSlot) {
        this.hourSlot = hourSlot;
    }

    public void setMachine(String machine) {
        this.machine = machine;
    }

    public void setPartNumber(String partNumber) {
        this.partNumber = partNumber;
    }

    public void setOperator(User operator) {
        this.operator = operator;
    }

    public void setPlannedQuantity(Integer plannedQuantity) {
        this.plannedQuantity = plannedQuantity;
    }

    public void setProducedQuantity(Integer producedQuantity) {
        this.producedQuantity = producedQuantity;
    }

    public void setRejectedQuantity(Integer rejectedQuantity) {
        this.rejectedQuantity = rejectedQuantity;
    }

    public void setRejectionReason(String rejectionReason) {
        this.rejectionReason = rejectionReason;
    }

    public void setDowntimeMinutes(Integer downtimeMinutes) {
        this.downtimeMinutes = downtimeMinutes;
    }

    public void setDowntimeReason(String downtimeReason) {
        this.downtimeReason = downtimeReason;
    }

    public void setRemarks(String remarks) {
        this.remarks = remarks;
    }

    public void setStatus(EntryStatus status) {
        this.status = status;
    }
}