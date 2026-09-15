package com.apexflow.production.production;

import com.apexflow.production.production.dto.*;
import com.apexflow.production.user.User;
import com.apexflow.production.user.UserRepository;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/entries")
public class ProductionEntryController {

    private final ProductionEntryService service;
    private final UserRepository userRepository;

    public ProductionEntryController(
            ProductionEntryService service,
            UserRepository userRepository
    ) {
        this.service = service;
        this.userRepository = userRepository;
    }

    @PostMapping
    public ProductionEntryResponse create(
            @Valid
            @RequestBody ProductionEntryRequest request,
            Authentication authentication
    ) {

        return service.create(
                request,
                currentUser(authentication)
        );
    }

    @PutMapping("/{id}")
    public ProductionEntryResponse update(
            @PathVariable Long id,
            @Valid
            @RequestBody ProductionEntryRequest request,
            Authentication authentication
    ) {

        return service.update(
                id,
                request,
                currentUser(authentication)
        );
    }

    @GetMapping
    public List<ProductionEntryResponse> search(
            @RequestParam(required = false)
            @DateTimeFormat(iso =
                    DateTimeFormat.ISO.DATE)
            LocalDate date,

            @RequestParam(required = false)
            Shift shift,

            Authentication authentication
    ) {

        return service.search(
                date,
                shift,
                currentUser(authentication)
        );
    }

    @GetMapping("/{id}")
    public ProductionEntryResponse getById(
            @PathVariable Long id,
            Authentication authentication
    ) {

        return service.getById(
                id,
                currentUser(authentication)
        );
    }

    @PostMapping("/{id}/submit")
    public ProductionEntryResponse submit(
            @PathVariable Long id,
            Authentication authentication
    ) {

        return service.submit(
                id,
                currentUser(authentication)
        );
    }

    @PostMapping("/{id}/approve")
    public ProductionEntryResponse approve(
            @PathVariable Long id,
            Authentication authentication
    ) {

        return service.approve(
                id,
                currentUser(authentication)
        );
    }

    @PostMapping("/{id}/return")
    public ProductionEntryResponse returnEntry(
            @PathVariable Long id,
            @Valid
            @RequestBody ReturnEntryRequest request,
            Authentication authentication
    ) {

        return service.returnEntry(
                id,
                request.remark(),
                currentUser(authentication)
        );
    }

    @GetMapping("/{id}/history")
    public List<ApprovalHistoryResponse> history(
            @PathVariable Long id,
            Authentication authentication
    ) {

        return service.history(
                id,
                currentUser(authentication)
        );
    }

    @PostMapping("/sync")
    public SyncResponse sync(
            @Valid
            @RequestBody List<@Valid SyncEntryRequest> requests,
            Authentication authentication
    ) {

        return service.sync(
                requests,
                currentUser(authentication)
        );
    }

    private User currentUser(
            Authentication authentication
    ) {

        return userRepository
                .findByUsername(
                        authentication.getName()
                )
                .orElseThrow();
    }
}