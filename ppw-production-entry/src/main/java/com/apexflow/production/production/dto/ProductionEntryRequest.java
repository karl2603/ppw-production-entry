package com.apexflow.production.production.dto;

import com.apexflow.production.production.Shift;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public record ProductionEntryRequest(

        String entryDate,

        @NotNull(message = "Shift is required")
        Shift shift,

        @NotNull(message = "Hour slot is required")
        @Min(value = 1, message = "Hour slot must be at least 1")
        @Max(value = 8, message = "Hour slot must be at most 8")
        Integer hourSlot,

        @NotBlank(message = "Machine is required")
        String machine,

        @NotBlank(message = "Part number is required")
        String partNumber,

        @NotNull(message = "Planned quantity is required")
        @Min(value = 0, message = "Planned quantity cannot be negative")
        Integer plannedQuantity,

        @NotNull(message = "Produced quantity is required")
        @Min(value = 0, message = "Produced quantity cannot be negative")
        Integer producedQuantity,

        @NotNull(message = "Rejected quantity is required")
        @Min(value = 0, message = "Rejected quantity cannot be negative")
        Integer rejectedQuantity,

        String rejectionReason,

        @NotNull(message = "Downtime minutes are required")
        @Min(value = 0, message = "Downtime cannot be negative")
        @Max(value = 60, message = "Downtime cannot exceed 60 minutes")
        Integer downtimeMinutes,

        String downtimeReason,

        String remarks,

        @NotBlank(message = "Client ID is required")
        String clientId
) {

    public LocalDate parsedEntryDate() {

        if (entryDate == null || entryDate.isBlank()) {
            return LocalDate.now();
        }

        return LocalDate.parse(entryDate);
    }
}