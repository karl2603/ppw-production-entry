package com.apexflow.production.export;

import com.apexflow.production.production.ProductionEntry;
import com.apexflow.production.production.ProductionEntryRepository;
import com.apexflow.production.production.Shift;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDate;
import java.util.List;

@Service
public class ExcelExportService {

    private final ProductionEntryRepository entryRepository;

    public ExcelExportService(
            ProductionEntryRepository entryRepository
    ) {
        this.entryRepository = entryRepository;
    }

    public byte[] export(
            LocalDate date,
            Shift shift
    ) {

        List<ProductionEntry> entries =
                entryRepository
                        .findByEntryDateAndShiftOrderByMachineAsc(
                                date,
                                shift
                        );

        try (
                Workbook workbook =
                        new XSSFWorkbook();

                ByteArrayOutputStream output =
                        new ByteArrayOutputStream()
        ) {

            Sheet sheet =
                    workbook.createSheet(
                            "Production Entries"
                    );

            createHeader(sheet);

            int rowNumber = 1;

            for (ProductionEntry entry : entries) {

                Row row =
                        sheet.createRow(
                                rowNumber++
                        );

                writeEntry(row, entry);
            }

            for (int i = 0; i < 15; i++) {
                sheet.autoSizeColumn(i);
            }

            workbook.write(output);

            return output.toByteArray();

        } catch (IOException exception) {

            throw new IllegalStateException(
                    "Could not generate Excel export",
                    exception
            );
        }
    }

    private void createHeader(
            Sheet sheet
    ) {

        Row row =
                sheet.createRow(0);

        String[] headers = {
                "Date",
                "Shift",
                "Hour Slot",
                "Machine",
                "Part Number",
                "Operator",
                "Planned",
                "Produced",
                "Rejected",
                "Accepted",
                "Rejection %",
                "Achievement %",
                "Downtime Minutes",
                "Running Time",
                "Approval Status"
        };

        CellStyle style =
                sheet.getWorkbook()
                        .createCellStyle();

        Font font =
                sheet.getWorkbook()
                        .createFont();

        font.setBold(true);
        style.setFont(font);

        for (int i = 0;
             i < headers.length;
             i++) {

            Cell cell =
                    row.createCell(i);

            cell.setCellValue(
                    headers[i]
            );

            cell.setCellStyle(style);
        }
    }

    private void writeEntry(
            Row row,
            ProductionEntry entry
    ) {

        row.createCell(0)
                .setCellValue(
                        entry.getEntryDate()
                                .toString()
                );

        row.createCell(1)
                .setCellValue(
                        entry.getShift()
                                .name()
                );

        row.createCell(2)
                .setCellValue(
                        entry.getHourSlot()
                );

        row.createCell(3)
                .setCellValue(
                        entry.getMachine()
                );

        row.createCell(4)
                .setCellValue(
                        entry.getPartNumber()
                );

        row.createCell(5)
                .setCellValue(
                        entry.getOperator()
                                .getName()
                );

        row.createCell(6)
                .setCellValue(
                        entry.getPlannedQuantity()
                );

        row.createCell(7)
                .setCellValue(
                        entry.getProducedQuantity()
                );

        row.createCell(8)
                .setCellValue(
                        entry.getRejectedQuantity()
                );

        row.createCell(9)
                .setCellValue(
                        entry.getAcceptedQuantity()
                );

        row.createCell(10)
                .setCellValue(
                        roundOneDecimal(
                                entry.getRejectionPercentage()
                        )
                );

        row.createCell(11)
                .setCellValue(
                        roundOneDecimal(
                                entry.getAchievementPercentage()
                        )
                );

        row.createCell(12)
                .setCellValue(
                        entry.getDowntimeMinutes()
                );

        row.createCell(13)
                .setCellValue(
                        entry.getRunningTime()
                );

        row.createCell(14)
                .setCellValue(
                        entry.getStatus().name()
                );
    }

    private double roundOneDecimal(
            double value
    ) {

        return Math.round(value * 10.0) / 10.0;
    }
}