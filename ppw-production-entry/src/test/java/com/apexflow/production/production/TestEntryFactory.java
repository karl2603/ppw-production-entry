package com.apexflow.production.production;

public final class TestEntryFactory {

    private TestEntryFactory() {
    }

    public static ProductionEntry create(
            int planned,
            int produced,
            int rejected,
            int downtime
    ) {

        ProductionEntry entry =
                new ProductionEntry();

        entry.setPlannedQuantity(planned);
        entry.setProducedQuantity(produced);
        entry.setRejectedQuantity(rejected);
        entry.setDowntimeMinutes(downtime);

        return entry;
    }
}