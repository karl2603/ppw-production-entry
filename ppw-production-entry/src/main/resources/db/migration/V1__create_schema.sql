CREATE TABLE users (
                       id BIGINT NOT NULL AUTO_INCREMENT,
                       username VARCHAR(100) NOT NULL,
                       password VARCHAR(255) NOT NULL,
                       role VARCHAR(30) NOT NULL,
                       name VARCHAR(150) NOT NULL,

                       PRIMARY KEY (id),

                       CONSTRAINT uk_users_username
                           UNIQUE (username)
);

CREATE TABLE production_entries (
                                    id BIGINT NOT NULL AUTO_INCREMENT,

                                    client_id VARCHAR(100) NOT NULL,

                                    entry_date DATE NOT NULL,
                                    shift VARCHAR(10) NOT NULL,
                                    hour_slot INT NOT NULL,

                                    machine VARCHAR(50) NOT NULL,
                                    part_number VARCHAR(50) NOT NULL,

                                    operator_id BIGINT NOT NULL,

                                    planned_quantity INT NOT NULL,
                                    produced_quantity INT NOT NULL,
                                    rejected_quantity INT NOT NULL,

                                    rejection_reason VARCHAR(100),

                                    downtime_minutes INT NOT NULL,
                                    downtime_reason VARCHAR(500),

                                    remarks VARCHAR(1000),

                                    status VARCHAR(30) NOT NULL,

                                    version BIGINT NOT NULL DEFAULT 0,

                                    created_at TIMESTAMP(6) NOT NULL,
                                    updated_at TIMESTAMP(6) NOT NULL,

                                    PRIMARY KEY (id),

                                    CONSTRAINT uk_production_client_id
                                        UNIQUE (client_id),

                                    CONSTRAINT uk_production_slot
                                        UNIQUE (
                                                entry_date,
                                                shift,
                                                hour_slot,
                                                machine
                                            ),

                                    CONSTRAINT fk_production_operator
                                        FOREIGN KEY (operator_id)
                                            REFERENCES users(id),

                                    INDEX idx_production_operator (
        operator_id
    ),

                                    INDEX idx_production_date_shift (
        entry_date,
        shift
    ),

                                    INDEX idx_production_status (
        status
    )
);

CREATE TABLE approval_history (
                                  id BIGINT NOT NULL AUTO_INCREMENT,

                                  production_entry_id BIGINT NOT NULL,

                                  from_status VARCHAR(30),

                                  to_status VARCHAR(30) NOT NULL,

                                  changed_by BIGINT NOT NULL,

                                  changed_at TIMESTAMP(6) NOT NULL,

                                  remark VARCHAR(1000),

                                  PRIMARY KEY (id),

                                  CONSTRAINT fk_history_entry
                                      FOREIGN KEY (production_entry_id)
                                          REFERENCES production_entries(id),

                                  CONSTRAINT fk_history_user
                                      FOREIGN KEY (changed_by)
                                          REFERENCES users(id),

                                  INDEX idx_history_entry (
        production_entry_id
    ),

                                  INDEX idx_history_changed_at (
        changed_at
    )
);