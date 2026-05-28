use crate::AppState;
use rusqlite::params;
use serde::{Deserialize, Serialize};
use tauri::State;
use tauri_plugin_log::log::error;

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum AnnotationType {
    Bookmark,
    Highlight,
    Note,
}

impl AnnotationType {
    fn as_str(&self) -> &'static str {
        match self {
            AnnotationType::Bookmark => "bookmark",
            AnnotationType::Highlight => "highlight",
            AnnotationType::Note => "note",
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Annotation {
    pub id: i64,
    pub book_id: i64,
    pub annotation_type: AnnotationType,
    pub content: Option<String>,
    pub location_start: String,
    pub location_end: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateAnnotationPayload {
    pub book_id: i64,
    pub annotation_type: AnnotationType,
    pub content: Option<String>,
    pub location_start: String,
    pub location_end: Option<String>,
}

#[tauri::command]
pub fn save_annotation(
    state: State<'_, AppState>,
    payload: CreateAnnotationPayload,
) -> Result<i64, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    db.conn
        .execute(
            "INSERT INTO annotations (book_id, type, content, location_start, location_end)
             VALUES (?1, ?2, ?3, ?4, ?5)",
            params![
                payload.book_id,
                payload.annotation_type.as_str(),
                payload.content,
                payload.location_start,
                payload.location_end,
            ],
        )
        .map_err(|e| {
            error!("Failed to save annotation: {}", e);
            e.to_string()
        })?;

    Ok(db.conn.last_insert_rowid())
}

#[tauri::command]
pub fn get_annotations(
    state: State<'_, AppState>,
    book_id: i64,
) -> Result<Vec<Annotation>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    let mut stmt = db
        .conn
        .prepare(
            "SELECT id, book_id, type, content, location_start, location_end, created_at
             FROM annotations WHERE book_id = ?1 ORDER BY location_start ASC",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map(params![book_id], |row| {
            let type_str: String = row.get(2)?;
            let annotation_type = match type_str.as_str() {
                "highlight" => AnnotationType::Highlight,
                "note" => AnnotationType::Note,
                _ => AnnotationType::Bookmark,
            };
            Ok(Annotation {
                id: row.get(0)?,
                book_id: row.get(1)?,
                annotation_type,
                content: row.get(3)?,
                location_start: row.get(4)?,
                location_end: row.get(5)?,
                created_at: row.get(6)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut annotations = Vec::new();
    for row in rows {
        annotations.push(row.map_err(|e| e.to_string())?);
    }

    Ok(annotations)
}

#[tauri::command]
pub fn delete_annotation(state: State<'_, AppState>, id: i64) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    db.conn
        .execute("DELETE FROM annotations WHERE id = ?1", params![id])
        .map_err(|e| {
            error!("Failed to delete annotation {}: {}", id, e);
            e.to_string()
        })?;

    Ok(())
}
