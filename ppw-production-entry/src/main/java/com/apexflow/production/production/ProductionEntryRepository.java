package com.apexflow.production.production;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface ProductionEntryRepository
        extends JpaRepository<ProductionEntry, Long> {

    Optional<ProductionEntry> findByClientId(String clientId);

    boolean existsByEntryDateAndShiftAndHourSlotAndMachine(
            LocalDate entryDate,
            Shift shift,
            Integer hourSlot,
            String machine
    );

    boolean existsByEntryDateAndShiftAndHourSlotAndMachineAndIdNot(
            LocalDate entryDate,
            Shift shift,
            Integer hourSlot,
            String machine,
            Long id
    );

    @Query("""
        SELECT e
        FROM ProductionEntry e
        WHERE (:operatorId IS NULL OR e.operator.id = :operatorId)
          AND (:entryDate IS NULL OR e.entryDate = :entryDate)
          AND (:shift IS NULL OR e.shift = :shift)
        ORDER BY e.entryDate DESC, e.hourSlot ASC, e.machine ASC
    """)
    List<ProductionEntry> search(
            @Param("operatorId") Long operatorId,
            @Param("entryDate") LocalDate entryDate,
            @Param("shift") Shift shift
    );

    List<ProductionEntry> findByEntryDateAndShiftOrderByMachineAsc(
            LocalDate entryDate,
            Shift shift
    );
}