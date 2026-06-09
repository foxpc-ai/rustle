use rusqlite::{Connection};
use rusqlite_migration::{Migrations, M};
use std::{fs, sync::LazyLock};
use tauri::{AppHandle, Manager};

pub struct Db {
    pub conn: Connection,
}

static MIGRATION_FILES: &[M<'static>] = &[
    M::up(include_str!(concat!(
        env!("CARGO_MANIFEST_DIR"),
        "/migrations/01_init.sql"
    ))),
];

static MIGRATIONS: LazyLock<Migrations<'static>> =
    LazyLock::new(|| Migrations::new(MIGRATION_FILES.to_vec()));

impl Db {
    pub fn init(app_handle: &AppHandle) -> Result<Self, Box<dyn std::error::Error>> {
        let app_dir = app_handle.path().app_data_dir()?;

        let cover_dir = app_dir.join("covers");
        fs::create_dir_all(cover_dir)?;

        let sqlite_path = app_dir.join("library.db");

        let mut conn = Connection::open(sqlite_path)?;

        MIGRATIONS.to_latest(&mut conn)?;

        Ok(Db { conn })
    }
}
