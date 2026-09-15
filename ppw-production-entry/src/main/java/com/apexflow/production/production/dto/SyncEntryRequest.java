package com.apexflow.production.production.dto;

import com.apexflow.production.production.Shift;
import jakarta.validation.constraints.*;

public record SyncEntryRequest(

        @NotBlank
        String clientId,

        String entryDate,

        @NotNull
        Shift shift,

        @NotNull
        @Min(1)
        @Max(8)
        Integer hourSlot,

        @NotBlank
        String machine,

        @NotBlank
        String partNumber,

        @NotNull
        @Min(0)
        Integer plannedQuantity,

        @NotNull
        @Min(0)
        Integer producedQuantity,

        @NotNull
        @Min(0)
        Integer rejectedQuantity,

        String rejectionReason,

        @NotNull
        @Min(0)
        @Max(60)
        Integer downtimeMinutes,

        String downtimeReason,

        String remarks
) {
}