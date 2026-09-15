package com.apexflow.production.production;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class ProductionEntryCalculatorTest {

    @Test
    void acceptedQuantityIsProducedMinusRejected() {

        ProductionEntry entry =
                TestEntryFactory.create(
                        100,
                        90,
                        10,
                        5
                );

        assertEquals(
                80,
                entry.getAcceptedQuantity()
        );
    }

    @Test
    void rejectionPercentageIsCalculatedCorrectly() {

        ProductionEntry entry =
                TestEntryFactory.create(
                        100,
                        90,
                        9,
                        0
                );

        assertEquals(
                10.0,
                entry.getRejectionPercentage(),
                0.0001
        );
    }

    @Test
    void achievementPercentageIsCalculatedCorrectly() {

        ProductionEntry entry =
                TestEntryFactory.create(
                        100,
                        100,
                        10,
                        0
                );

        assertEquals(
                90.0,
                entry.getAchievementPercentage(),
                0.0001
        );
    }

    @Test
    void runningTimeIsSixtyMinusDowntime() {

        ProductionEntry entry =
                TestEntryFactory.create(
                        100,
                        100,
                        0,
                        15
                );

        assertEquals(
                45,
                entry.getRunningTime()
        );
    }
}