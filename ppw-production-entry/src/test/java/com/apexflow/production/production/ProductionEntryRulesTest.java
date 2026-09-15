package com.apexflow.production.production;

import com.apexflow.production.common.BadRequestException;
import com.apexflow.production.production.dto.ProductionEntryRequest;
import com.apexflow.production.reference.ReferenceDataService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

class ProductionEntryRulesTest {

    private ProductionEntryRules rules;

    @BeforeEach
    void setUp() {

        rules =
                new ProductionEntryRules(
                        new ReferenceDataService()
                );
    }

    @Test
    void rejectedQuantityCannotExceedProducedQuantity() {

        ProductionEntryRequest request =
                request(
                        100,
                        50,
                        60,
                        0,
                        null,
                        null
                );

        assertThrows(
                BadRequestException.class,
                () -> rules.validateForSave(request)
        );
    }

    @Test
    void rejectionReasonIsRequired() {

        ProductionEntryRequest request =
                request(
                        100,
                        100,
                        10,
                        0,
                        null,
                        null
                );

        assertThrows(
                BadRequestException.class,
                () -> rules.validateForSave(request)
        );
    }

    @Test
    void downtimeReasonIsRequired() {

        ProductionEntryRequest request =
                request(
                        100,
                        100,
                        0,
                        15,
                        null,
                        null
                );

        assertThrows(
                BadRequestException.class,
                () -> rules.validateForSave(request)
        );
    }

    @Test
    void validRequestPasses() {

        ProductionEntryRequest request =
                request(
                        100,
                        100,
                        5,
                        10,
                        "Dimensional",
                        "Machine stopped"
                );

        assertDoesNotThrow(
                () -> rules.validateForSave(request)
        );
    }

    @Test
    void rejectionAboveTenPercentNeedsRemarkOnSubmit() {

        ProductionEntry entry =
                TestEntryFactory.create(
                        100,
                        100,
                        20,
                        0
                );

        assertThrows(
                BadRequestException.class,
                () -> rules.validateForSubmit(entry)
        );
    }

    private ProductionEntryRequest request(
            int planned,
            int produced,
            int rejected,
            int downtime,
            String rejectionReason,
            String downtimeReason
    ) {

        return new ProductionEntryRequest(
                null,
                Shift.A,
                1,
                "PPW-CNC-01",
                "PN-4471-A",
                planned,
                produced,
                rejected,
                rejectionReason,
                downtime,
                downtimeReason,
                null,
                "test-client-id"
        );
    }
}