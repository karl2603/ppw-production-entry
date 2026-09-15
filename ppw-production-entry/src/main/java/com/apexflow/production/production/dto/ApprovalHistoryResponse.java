package com.apexflow.production.production.dto;

import com.apexflow.production.production.EntryStatus;

import java.time.Instant;

public record ApprovalHistoryResponse(

        Long id,

        EntryStatus fromStatus,

        EntryStatus toStatus,

        String changedBy,

        Instant changedAt,

        String remark
) {
}