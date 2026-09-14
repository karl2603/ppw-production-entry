package com.apexflow.production.production;

public enum Shift {

    A("06:00-14:00"),
    B("14:00-22:00"),
    C("22:00-06:00");

    private final String timeRange;

    Shift(String timeRange) {
        this.timeRange = timeRange;
    }

    public String getTimeRange() {
        return timeRange;
    }
}