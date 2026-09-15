package com.apexflow.production.reference;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/reference")
public class ReferenceDataController {

    private final ReferenceDataService service;

    public ReferenceDataController(
            ReferenceDataService service
    ) {
        this.service = service;
    }

    @GetMapping
    public Map<String, Object> getReferenceData() {
        return Map.of(
                "machines", service.machines(),
                "parts", service.parts(),
                "rejectionReasons", service.rejectionReasons(),
                "shifts", service.shifts(),
                "hourSlots", service.hourSlots()
        );
    }
}