use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[derive(DeriveIden)]
enum Files {
    Table,
    RemoteId,
}

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Add RemoteId column to the files table
        if !manager.has_column("files", "remote_id").await? {
            manager
                .alter_table(
                    Table::alter()
                        .table(Files::Table)
                        .add_column(ColumnDef::new(Files::RemoteId).integer())
                        .to_owned(),
                )
                .await?;
        }
        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .alter_table(
                Table::alter()
                    .table(Files::Table)
                    .drop_column(Files::RemoteId)
                    .to_owned(),
            )
            .await?;
        Ok(())
    }
}
