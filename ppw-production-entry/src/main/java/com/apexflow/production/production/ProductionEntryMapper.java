package com.apexflow.production.production;

import com.apexflow.production.production.dto.ProductionEntryResponse;
import org.springframework.stereotype.Component;

@Component
public class ProductionEntryMapper {

    public ProductionEntryResponse toResponse(
            ProductionEntry entry,
            ApprovalHistory latestHistory
    ) {

        String latestRemark =
                latestHistory != null
                        ? latestHistory.getRemark()
                        : null;

        String latestChangedBy =
                latestHistory != null
                        ? latestHistory.getChangedBy().getName()
                        : null;

        var latestChangedAt =
                latestHistory != null
                        ? latestHistory.getChangedAt()
                        : null;

        return new ProductionEntryResponse(
                entry.getId(),
                entry.getClientId(),
                entry.getEntryDate(),
                entry.getShift(),
                entry.getHourSlot(),
                entry.getMachine(),
                entry.getPartNumber(),
                entry.getOperator().getId(),
                entry.getOperator().getName(),
                entry.getPlannedQuantity(),
                entry.getProducedQuantity(),
                entry.getRejectedQuantity(),
                entry.getRejectionReason(),
                entry.getDowntimeMinutes(),
                entry.getDowntimeReason(),
                entry.getRemarks(),
                entry.getAcceptedQuantity(),
                roundOneDecimal(
                        entry.getRejectionPercentage()
                ),
                roundOneDecimal(
                        entry.getAchievementPercentage()
                ),
                entry.getRunningTime(),
                entry.getStatus(),
                entry.getCreatedAt(),
                entry.getUpdatedAt(),
                latestRemark,
                latestChangedBy,
                latestChangedAt
        );
    }

    private double roundOneDecimal(double value) {

        return Math.round(value * 10.0) / 10.0;
    }
}