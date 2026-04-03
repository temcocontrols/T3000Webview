use sea_orm_migration::{async_trait::async_trait, prelude::*};

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let db = manager.get_connection();

        // Add raw C++ calibration fields to INPUTS table
        // C++ sends: calibration_h (uint8), calibration_l (uint8), calibration_sign (uint8)
        // Frontend will compute display: value = ((h << 8) | l) / 10.0, sign: 0="+", 1="-"
        //
        // We use "IF NOT EXISTS" pattern via SQLite's tolerance of duplicate ADD COLUMN errors.
        // Each ALTER TABLE is wrapped in its own statement so one failure doesn't block others.

        // INPUTS table: Add Calibration_H, Calibration_L, Calibration_Sign, Control
        let inputs_columns = vec![
            ("Calibration_H", "Raw calibration high byte from C++ (uint8)"),
            ("Calibration_L", "Raw calibration low byte from C++ (uint8)"),
            ("Calibration_Sign", "Raw calibration sign from C++ (0=positive, 1=negative)"),
            ("Control", "Raw control field from C++ (0=OFF, 1=ON)"),
        ];

        for (col, _comment) in &inputs_columns {
            let sql = format!("ALTER TABLE INPUTS ADD COLUMN {} TEXT", col);
            // Ignore error if column already exists (SQLite: duplicate column name)
            let _ = db.execute_unprepared(&sql).await;
        }

        // OUTPUTS table: Add Calibration_H, Calibration_L, Calibration_Sign, Control
        for (col, _comment) in &inputs_columns {
            let sql = format!("ALTER TABLE OUTPUTS ADD COLUMN {} TEXT", col);
            let _ = db.execute_unprepared(&sql).await;
        }

        // VARIABLES table: Add Calibration_H, Calibration_L, Calibration_Sign, Control
        for (col, _comment) in &inputs_columns {
            let sql = format!("ALTER TABLE VARIABLES ADD COLUMN {} TEXT", col);
            let _ = db.execute_unprepared(&sql).await;
        }

        // Clear incorrect data in existing columns:
        // - Filter_Field was wrongly populated with 'control' values
        // - Calibration was wrongly populated with only calibration_h
        // - Sign had calibration_sign (this was correct, keep it)
        // After clearing, next device sync will populate all columns correctly.
        let clear_stmts = vec![
            "UPDATE INPUTS SET Filter_Field = NULL, Calibration = NULL",
            "UPDATE OUTPUTS SET Filter_Field = NULL, Calibration = NULL",
            "UPDATE VARIABLES SET Filter_Field = NULL, Calibration = NULL",
        ];

        for sql in clear_stmts {
            let _ = db.execute_unprepared(sql).await;
        }

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let _db = manager.get_connection();
        // SQLite doesn't support DROP COLUMN easily.
        // The new columns are harmless if left in place.
        // Next device sync will repopulate data.
        Ok(())
    }
}
