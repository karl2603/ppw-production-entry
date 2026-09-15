package com.apexflow.production.production;

import com.apexflow.production.common.BadRequestException;
import com.apexflow.production.common.ConflictException;
import com.apexflow.production.common.ForbiddenException;
import com.apexflow.production.common.ResourceNotFoundException;
import com.apexflow.production.production.dto.*;
import com.apexflow.production.reference.ReferenceDataService;
import com.apexflow.production.user.Role;
import com.apexflow.production.user.User;
import com.apexflow.production.user.UserRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Service
public class ProductionEntryService {

    private final ProductionEntryRepository entryRepository;

    private final UserRepository userRepository;

    private final ApprovalHistoryService historyService;

    private final ProductionEntryRules rules;

    private final ProductionEntryMapper mapper;

    private final ReferenceDataService referenceDataService;

    public ProductionEntryService(
            ProductionEntryRepository entryRepository,
            UserRepository userRepository,
            ApprovalHistoryService historyService,
            ProductionEntryRules rules,
            ProductionEntryMapper mapper,
            ReferenceDataService referenceDataService
    ) {

        this.entryRepository = entryRepository;
        this.userRepository = userRepository;
        this.historyService = historyService;
        this.rules = rules;
        this.mapper = mapper;
        this.referenceDataService = referenceDataService;
    }

    // --------------------------------------------------------
    // CREATE
    // --------------------------------------------------------

    @Transactional
    @PreAuthorize("hasRole('OPERATOR')")
    public ProductionEntryResponse create(
            ProductionEntryRequest request,
            User currentUser
    ) {

        rules.validateForSave(request);

        if (entryRepository
                .findByClientId(request.clientId())
                .isPresent()) {

            throw new ConflictException(
                    "An entry with this client ID already exists"
            );
        }

        LocalDate entryDate =
                request.parsedEntryDate();

        ensureUniqueSlot(
                entryDate,
                request.shift(),
                request.hourSlot(),
                request.machine(),
                null
        );

        ProductionEntry entry =
                new ProductionEntry();

        applyRequest(entry, request, entryDate);

        entry.setOperator(currentUser);
        entry.setStatus(EntryStatus.DRAFT);

        try {

            ProductionEntry saved =
                    entryRepository.save(entry);

            historyService.record(
                    saved,
                    null,
                    EntryStatus.DRAFT,
                    currentUser,
                    null
            );

            return toResponse(saved);

        } catch (DataIntegrityViolationException exception) {

            throw new ConflictException(
                    "Another entry already exists for this machine, date, shift and hour slot"
            );
        }
    }

    // --------------------------------------------------------
    // UPDATE
    // --------------------------------------------------------

    @Transactional
    @PreAuthorize("hasRole('OPERATOR')")
    public ProductionEntryResponse update(
            Long id,
            ProductionEntryRequest request,
            User currentUser
    ) {

        rules.validateForSave(request);

        ProductionEntry entry =
                getEntry(id);

        verifyOwner(entry, currentUser);

        if (entry.getStatus() != EntryStatus.DRAFT &&
                entry.getStatus() != EntryStatus.RETURNED) {

            throw new BadRequestException(
                    "Only draft or returned entries can be edited"
            );
        }

        LocalDate entryDate =
                request.parsedEntryDate();

        ensureUniqueSlot(
                entryDate,
                request.shift(),
                request.hourSlot(),
                request.machine(),
                entry.getId()
        );

        applyRequest(
                entry,
                request,
                entryDate
        );

        ProductionEntry saved =
                entryRepository.save(entry);

        return toResponse(saved);
    }

    // --------------------------------------------------------
    // GET
    // --------------------------------------------------------

    @Transactional(readOnly = true)
    public ProductionEntryResponse getById(
            Long id,
            User currentUser
    ) {

        ProductionEntry entry =
                getEntry(id);

        if (currentUser.getRole() == Role.OPERATOR) {
            verifyOwner(entry, currentUser);
        }

        return toResponse(entry);
    }

    // --------------------------------------------------------
    // LIST
    // --------------------------------------------------------

    @Transactional(readOnly = true)
    public List<ProductionEntryResponse> search(
            LocalDate date,
            Shift shift,
            User currentUser
    ) {

        Long operatorId =
                currentUser.getRole() == Role.OPERATOR
                        ? currentUser.getId()
                        : null;

        return entryRepository
                .search(
                        operatorId,
                        date,
                        shift
                )
                .stream()
                .map(this::toResponse)
                .toList();
    }

    // --------------------------------------------------------
    // SUBMIT
    // --------------------------------------------------------

    @Transactional
    @PreAuthorize("hasRole('OPERATOR')")
    public ProductionEntryResponse submit(
            Long id,
            User currentUser
    ) {

        ProductionEntry entry =
                getEntry(id);

        verifyOwner(entry, currentUser);

        if (entry.getStatus() != EntryStatus.DRAFT &&
                entry.getStatus() != EntryStatus.RETURNED) {

            throw new BadRequestException(
                    "Only draft or returned entries can be submitted"
            );
        }

        rules.validateForSubmit(entry);

        EntryStatus previous =
                entry.getStatus();

        entry.setStatus(
                EntryStatus.SUBMITTED
        );

        ProductionEntry saved =
                entryRepository.save(entry);

        historyService.record(
                saved,
                previous,
                EntryStatus.SUBMITTED,
                currentUser,
                null
        );

        return toResponse(saved);
    }

    // --------------------------------------------------------
    // APPROVE
    // --------------------------------------------------------

    @Transactional
    @PreAuthorize("hasRole('SUPERVISOR')")
    public ProductionEntryResponse approve(
            Long id,
            User currentUser
    ) {

        ProductionEntry entry =
                getEntry(id);

        if (entry.getStatus() != EntryStatus.SUBMITTED) {

            throw new BadRequestException(
                    "Only submitted entries can be approved"
            );
        }

        EntryStatus previous =
                entry.getStatus();

        entry.setStatus(
                EntryStatus.APPROVED
        );

        ProductionEntry saved =
                entryRepository.save(entry);

        historyService.record(
                saved,
                previous,
                EntryStatus.APPROVED,
                currentUser,
                null
        );

        return toResponse(saved);
    }

    // --------------------------------------------------------
    // RETURN
    // --------------------------------------------------------

    @Transactional
    @PreAuthorize("hasRole('SUPERVISOR')")
    public ProductionEntryResponse returnEntry(
            Long id,
            String remark,
            User currentUser
    ) {

        if (remark == null ||
                remark.isBlank()) {

            throw new BadRequestException(
                    "Return remark is mandatory"
            );
        }

        ProductionEntry entry =
                getEntry(id);

        if (entry.getStatus() != EntryStatus.SUBMITTED) {

            throw new BadRequestException(
                    "Only submitted entries can be returned"
            );
        }

        EntryStatus previous =
                entry.getStatus();

        entry.setStatus(
                EntryStatus.RETURNED
        );

        ProductionEntry saved =
                entryRepository.save(entry);

        historyService.record(
                saved,
                previous,
                EntryStatus.RETURNED,
                currentUser,
                remark
        );

        return toResponse(saved);
    }

    // --------------------------------------------------------
    // HISTORY
    // --------------------------------------------------------

    @Transactional(readOnly = true)
    public List<ApprovalHistoryResponse> history(
            Long id,
            User currentUser
    ) {

        ProductionEntry entry =
                getEntry(id);

        if (currentUser.getRole() == Role.OPERATOR) {
            verifyOwner(entry, currentUser);
        }

        return historyService
                .getHistory(id)
                .stream()
                .map(history ->
                        new ApprovalHistoryResponse(
                                history.getId(),
                                history.getFromStatus(),
                                history.getToStatus(),
                                history.getChangedBy().getName(),
                                history.getChangedAt(),
                                history.getRemark()
                        )
                )
                .toList();
    }

    // --------------------------------------------------------
    // OFFLINE SYNC
    // --------------------------------------------------------

    @Transactional
    @PreAuthorize("hasRole('OPERATOR')")
    public SyncResponse sync(
            List<SyncEntryRequest> requests,
            User currentUser
    ) {

        List<SyncEntryResult> results =
                new ArrayList<>();

        int synced = 0;
        int alreadySynced = 0;
        int conflicts = 0;

        for (SyncEntryRequest request : requests) {

            try {

                var existing =
                        entryRepository
                                .findByClientId(
                                        request.clientId()
                                );

                if (existing.isPresent()) {

                    if (!existing.get()
                            .getOperator()
                            .getId()
                            .equals(currentUser.getId())) {

                        results.add(
                                new SyncEntryResult(
                                        request.clientId(),
                                        "CONFLICT",
                                        null,
                                        "Client ID belongs to another operator"
                                )
                        );

                        conflicts++;
                        continue;
                    }

                    results.add(
                            new SyncEntryResult(
                                    request.clientId(),
                                    "ALREADY_SYNCED",
                                    existing.get().getId(),
                                    "Entry was already synchronized"
                            )
                    );

                    alreadySynced++;
                    continue;
                }

                LocalDate date =
                        parseSyncDate(
                                request.entryDate()
                        );

                rules.validateForSync(
                        request.machine(),
                        request.partNumber(),
                        request.producedQuantity(),
                        request.rejectedQuantity(),
                        request.rejectionReason(),
                        request.downtimeMinutes(),
                        request.downtimeReason()
                );

                ensureUniqueSlot(
                        date,
                        request.shift(),
                        request.hourSlot(),
                        request.machine(),
                        null
                );

                ProductionEntry entry =
                        new ProductionEntry();

                entry.setClientId(
                        request.clientId()
                );

                entry.setEntryDate(date);
                entry.setShift(request.shift());
                entry.setHourSlot(request.hourSlot());
                entry.setMachine(request.machine());
                entry.setPartNumber(request.partNumber());
                entry.setOperator(currentUser);

                entry.setPlannedQuantity(
                        request.plannedQuantity()
                );

                entry.setProducedQuantity(
                        request.producedQuantity()
                );

                entry.setRejectedQuantity(
                        request.rejectedQuantity()
                );

                entry.setRejectionReason(
                        request.rejectionReason()
                );

                entry.setDowntimeMinutes(
                        request.downtimeMinutes()
                );

                entry.setDowntimeReason(
                        request.downtimeReason()
                );

                entry.setRemarks(
                        request.remarks()
                );

                entry.setStatus(
                        EntryStatus.DRAFT
                );

                ProductionEntry saved =
                        entryRepository.save(entry);

                historyService.record(
                        saved,
                        null,
                        EntryStatus.DRAFT,
                        currentUser,
                        null
                );

                results.add(
                        new SyncEntryResult(
                                request.clientId(),
                                "SYNCED",
                                saved.getId(),
                                "Entry synchronized successfully"
                        )
                );

                synced++;

            } catch (ConflictException exception) {

                results.add(
                        new SyncEntryResult(
                                request.clientId(),
                                "CONFLICT",
                                null,
                                exception.getMessage()
                        )
                );

                conflicts++;

            } catch (BadRequestException exception) {

                results.add(
                        new SyncEntryResult(
                                request.clientId(),
                                "CONFLICT",
                                null,
                                exception.getMessage()
                        )
                );

                conflicts++;
            }
        }

        return new SyncResponse(
                requests.size(),
                synced,
                alreadySynced,
                conflicts,
                results
        );
    }

    // --------------------------------------------------------
    // HELPERS
    // --------------------------------------------------------

    private void applyRequest(
            ProductionEntry entry,
            ProductionEntryRequest request,
            LocalDate date
    ) {

        entry.setEntryDate(date);
        entry.setShift(request.shift());
        entry.setHourSlot(request.hourSlot());
        entry.setMachine(request.machine());
        entry.setPartNumber(request.partNumber());

        entry.setPlannedQuantity(
                request.plannedQuantity()
        );

        entry.setProducedQuantity(
                request.producedQuantity()
        );

        entry.setRejectedQuantity(
                request.rejectedQuantity()
        );

        entry.setRejectionReason(
                request.rejectionReason()
        );

        entry.setDowntimeMinutes(
                request.downtimeMinutes()
        );

        entry.setDowntimeReason(
                request.downtimeReason()
        );

        entry.setRemarks(
                request.remarks()
        );
    }

    private void ensureUniqueSlot(
            LocalDate date,
            Shift shift,
            Integer hourSlot,
            String machine,
            Long currentId
    ) {

        boolean exists;

        if (currentId == null) {

            exists =
                    entryRepository
                            .existsByEntryDateAndShiftAndHourSlotAndMachine(
                                    date,
                                    shift,
                                    hourSlot,
                                    machine
                            );

        } else {

            exists =
                    entryRepository
                            .existsByEntryDateAndShiftAndHourSlotAndMachineAndIdNot(
                                    date,
                                    shift,
                                    hourSlot,
                                    machine,
                                    currentId
                            );
        }

        if (exists) {

            throw new ConflictException(
                    "An entry already exists for this machine, date, shift and hour slot"
            );
        }
    }

    private ProductionEntry getEntry(
            Long id
    ) {

        return entryRepository
                .findById(id)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Production entry not found"
                        )
                );
    }

    private void verifyOwner(
            ProductionEntry entry,
            User currentUser
    ) {

        if (!entry.getOperator()
                .getId()
                .equals(currentUser.getId())) {

            throw new ForbiddenException(
                    "You can only access your own production entries"
            );
        }
    }

    private LocalDate parseSyncDate(
            String date
    ) {

        if (date == null || date.isBlank()) {
            return LocalDate.now();
        }

        return LocalDate.parse(date);
    }

    private ProductionEntryResponse toResponse(
            ProductionEntry entry
    ) {

        ApprovalHistory latest =
                historyService.getLatest(
                        entry.getId()
                );

        return mapper.toResponse(
                entry,
                latest
        );
    }
}