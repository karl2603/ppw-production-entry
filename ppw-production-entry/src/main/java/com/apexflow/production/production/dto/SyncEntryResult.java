package com.apexflow.production.production.dto;

public record SyncEntryResult(

        String clientId,

        String result,

        Long serverEntryId,

        String message

) {
}