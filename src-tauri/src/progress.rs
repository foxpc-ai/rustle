use crate::AppState;
use rusqlite::params;
use tauri::State;

#[tauri::command]
pub fn update_last_position(
    state: State<'_, AppState>,
    file_path: String,
    position: String,
    progress: f64,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    db.conn
        .execute(
            "UPDATE books SET last_position = ?1, progress = ?2 WHERE file_path = ?3",
            params![position, progress, file_path],
        )
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn get_last_position(
    state: State<'_, AppState>,
    file_path: String,
) -> Result<Option<String>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    let mut stmt = db
        .conn
        .prepare("SELECT last_position FROM books WHERE file_path = ?1")
        .map_err(|e| e.to_string())?;

    let position = stmt
        .query_row(params![file_path], |row| row.get::<_, Option<String>>(0))
        .map_err(|e| e.to_string())?;

    Ok(position)
}
