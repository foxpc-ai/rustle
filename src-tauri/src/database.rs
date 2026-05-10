use crate::AppState;
use rusqlite::{params, Connection};
use std::collections::HashMap;
use std::fs;
use tauri::{AppHandle, Manager, State};

pub struct Db {
    pub conn: Connection,
}

impl Db {
    pub fn init(app_handle: &AppHandle) -> Result<Self, Box<dyn std::error::Error>> {
        let app_dir = app_handle.path().app_data_dir()?;

        let cover_dir = app_dir.join("covers");
        fs::create_dir_all(cover_dir)?;

        let sqlite_path = app_dir.join("library.db");

        let conn = Connection::open(sqlite_path)?;

        conn.execute(
            "CREATE TABLE IF NOT EXISTS books (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                author TEXT,
                file_path TEXT NOT NULL UNIQUE,
                cover_path TEXT,
                last_position TEXT,
                opened_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )",
            [],
        )?;

        conn.execute(
            "CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT
            )",
            [],
        )?;

        Ok(Db { conn })
    }
}

#[tauri::command]
pub fn save_settings(
    state: State<'_, AppState>,
    settings: HashMap<String, String>,
) -> Result<(), String> {
    let db = state.db.lock().unwrap();

    for (key, value) in settings {
        db.conn
            .execute(
                "INSERT OR REPLACE INTO settings (key, value) VALUES (?1, ?2)",
                params![key, value],
            )
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn load_settings(state: State<'_, AppState>) -> Result<HashMap<String, String>, String> {
    let db = state.db.lock().unwrap();

    let mut stmt = db
        .conn
        .prepare("SELECT key, value FROM settings")
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
        })
        .map_err(|e| e.to_string())?;
    let mut map = HashMap::new();
    for row in rows {
        let (k, v) = row.map_err(|e| e.to_string())?;
        map.insert(k, v);
    }
    Ok(map)
}

#[tauri::command]
pub fn update_last_position(
    state: State<'_, AppState>,
    file_path: String,
    position: String,
) -> Result<(), String> {
    let db = state.db.lock().unwrap();

    db.conn
        .execute(
            "UPDATE books SET last_position = ?1 WHERE file_path = ?2",
            params![position, file_path],
        )
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn get_last_position(
    state: State<'_, AppState>,
    file_path: String,
) -> Result<Option<String>, String> {
    let db = state.db.lock().unwrap();

    let mut stmt = db
        .conn
        .prepare("SELECT last_position FROM books WHERE file_path = ?1")
        .map_err(|e| e.to_string())?;

    let position = stmt
        .query_row(params![file_path], |row| row.get::<_, Option<String>>(0))
        .map_err(|e| e.to_string())?;

    Ok(position)
}
