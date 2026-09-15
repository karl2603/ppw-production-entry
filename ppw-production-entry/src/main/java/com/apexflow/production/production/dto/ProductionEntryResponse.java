package com.apexflow.production.production.dto;

import com.apexflow.production.production.EntryStatus;
import com.apexflow.production.production.Shift;

import java.time.Instant;
import java.time.LocalDate;

public record ProductionEntryResponse(

        Long id,

        String clientId,

        LocalDate entryDate,

        Shift shift,

        Integer hourSlot,

        String machine,

        String partNumber,

        Long operatorId,

        String operatorName,

        Integer plannedQuantity,

        Integer producedQuantity,

        Integer rejectedQuantity,

        String rejectionReason,

        Integer downtimeMinutes,

        String downtimeReason,

        String remarks,

        Integer acceptedQuantity,

        double rejectionPercentage,

        double achievementPercentage,

        Integer runningTime,

        EntryStatus status,

        Instant createdAt,

        Instant updatedAt,

        String latestWorkflowRemark,

        String latestChangedBy,

        Instant latestChangedAt
) {
}