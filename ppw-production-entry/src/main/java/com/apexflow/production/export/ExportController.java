package com.apexflow.production.export;

import com.apexflow.production.production.Shift;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/export")
public class ExportController {

    private final ExcelExportService exportService;

    public ExportController(
            ExcelExportService exportService
    ) {
        this.exportService = exportService;
    }

    @GetMapping("/excel")
    @PreAuthorize(
            "hasAnyRole('SUPERVISOR', 'MANAGER')"
    )
    public ResponseEntity<byte[]> exportExcel(

            @RequestParam
            @DateTimeFormat(
                    iso = DateTimeFormat.ISO.DATE
            )
            LocalDate date,

            @RequestParam
            Shift shift
    ) {

        byte[] file =
                exportService.export(
                        date,
                        shift
                );

        String filename =
                "production-entries-"
                        + date
                        + "-"
                        + shift
                        + ".xlsx";

        return ResponseEntity.ok()
                .header(
                        HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" +
                                filename +
                                "\""
                )
                .contentType(
                        MediaType.parseMediaType(
                                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                        )
                )
                .body(file);
    }
}