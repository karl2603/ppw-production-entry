package com.apexflow.production.production.dto;

import jakarta.validation.constraints.NotBlank;

public record ReturnEntryRequest(

        @NotBlank(message = "Return remark is mandatory")
        String remark

) {
}