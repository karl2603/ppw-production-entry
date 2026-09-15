package com.apexflow.production.production.dto;

import java.util.List;

public record SyncResponse(

        int total,
        int synced,
        int alreadySynced,
        int conflicts,
        List<SyncEntryResult> results

) {
}