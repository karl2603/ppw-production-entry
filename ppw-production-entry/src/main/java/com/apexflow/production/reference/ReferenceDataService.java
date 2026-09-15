package com.apexflow.production.reference;

import com.apexflow.production.production.Shift;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ReferenceDataService {

    private static final List<String> MACHINES = List.of(
            "PPW-CNC-01",
            "PPW-CNC-02",
            "PPW-VMC-03",
            "PPW-LATHE-04",
            "PPW-GRIND-05"
    );

    private static final List<String> PARTS = List.of(
            "PN-4471-A",
            "PN-4471-B",
            "PN-8802",
            "PN-9130-X",
            "PN-2256"
    );

    private static final List<String> REJECTION_REASONS = List.of(
            "Dimensional",
            "Surface finish",
            "Burr",
            "Material defect",
            "Setup error",
            "Other"
    );

    public List<String> machines() {
        return MACHINES;
    }

    public List<String> parts() {
        return PARTS;
    }

    public List<String> rejectionReasons() {
        return REJECTION_REASONS;
    }

    public List<Shift> shifts() {
        return List.of(Shift.values());
    }

    public List<Integer> hourSlots() {
        return List.of(1, 2, 3, 4, 5, 6, 7, 8);
    }

    public boolean isValidMachine(String machine) {
        return MACHINES.contains(machine);
    }

    public boolean isValidPart(String part) {
        return PARTS.contains(part);
    }

    public boolean isValidRejectionReason(String reason) {
        return REJECTION_REASONS.contains(reason);
    }
}