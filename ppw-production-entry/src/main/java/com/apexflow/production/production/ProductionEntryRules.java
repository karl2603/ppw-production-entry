package com.apexflow.production.production;

import com.apexflow.production.common.BadRequestException;
import com.apexflow.production.production.dto.ProductionEntryRequest;
import com.apexflow.production.reference.ReferenceDataService;
import org.springframework.stereotype.Component;

@Component
public class ProductionEntryRules {

    private final ReferenceDataService referenceDataService;

    public ProductionEntryRules(
            ReferenceDataService referenceDataService
    ) {
        this.referenceDataService = referenceDataService;
    }

    public void validateForSave(
            ProductionEntryRequest request
    ) {

        if (!referenceDataService.isValidMachine(
                request.machine()
        )) {
            throw new BadRequestException(
                    "Invalid machine"
            );
        }

        if (!referenceDataService.isValidPart(
                request.partNumber()
        )) {
            throw new BadRequestException(
                    "Invalid part number"
            );
        }

        if (request.rejectedQuantity()
                > request.producedQuantity()) {

            throw new BadRequestException(
                    "Rejected quantity cannot exceed produced quantity"
            );
        }

        if (request.rejectedQuantity() > 0) {

            if (request.rejectionReason() == null ||
                    request.rejectionReason().isBlank()) {

                throw new BadRequestException(
                        "Rejection reason is required when rejected quantity is above zero"
                );
            }

            if (!referenceDataService.isValidRejectionReason(
                    request.rejectionReason()
            )) {
                throw new BadRequestException(
                        "Invalid rejection reason"
                );
            }

        } else if (
                request.rejectionReason() != null &&
                        !request.rejectionReason().isBlank()
        ) {

            throw new BadRequestException(
                    "Rejection reason should be empty when rejected quantity is zero"
            );
        }

        if (request.downtimeMinutes() > 0) {

            if (request.downtimeReason() == null ||
                    request.downtimeReason().isBlank()) {

                throw new BadRequestException(
                        "Downtime reason is required when downtime is above zero"
                );
            }

        } else if (
                request.downtimeReason() != null &&
                        !request.downtimeReason().isBlank()
        ) {

            throw new BadRequestException(
                    "Downtime reason should be empty when downtime is zero"
            );
        }
    }

    public void validateForSync(
            String machine,
            String partNumber,
            int produced,
            int rejected,
            String rejectionReason,
            int downtime,
            String downtimeReason
    ) {

        if (!referenceDataService.isValidMachine(machine)) {
            throw new BadRequestException("Invalid machine");
        }

        if (!referenceDataService.isValidPart(partNumber)) {
            throw new BadRequestException("Invalid part number");
        }

        if (rejected > produced) {
            throw new BadRequestException(
                    "Rejected quantity cannot exceed produced quantity"
            );
        }

        if (rejected > 0 &&
                (rejectionReason == null ||
                        rejectionReason.isBlank())) {

            throw new BadRequestException(
                    "Rejection reason is required"
            );
        }

        if (downtime > 0 &&
                (downtimeReason == null ||
                        downtimeReason.isBlank())) {

            throw new BadRequestException(
                    "Downtime reason is required"
            );
        }
    }

    public void validateForSubmit(
            ProductionEntry entry
    ) {

        if (entry.getRejectionPercentage() > 10.0) {

            if (entry.getRemarks() == null ||
                    entry.getRemarks().isBlank()) {

                throw new BadRequestException(
                        "A remark is required before submitting an entry with rejection above 10%"
                );
            }
        }
    }
}