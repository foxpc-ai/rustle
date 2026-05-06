use light_epub::book::Book;
use std::sync::Mutex;
use tauri::Manager;

use std::collections::hash_map::DefaultHasher;
use std::hash::{Hash, Hasher};

use crate::database::Db;
use crate::AppState;

#[derive(serde::Serialize)]
pub struct LibraryItem {
    pub id: i64,
    pub title: String,
    pub author: String,
    pub path: String,
    cover: Option<String>,
}

async fn process_book_and_store(
    file_path: String,
    app: &tauri::AppHandle,
    db: &Mutex<Db>,
) -> Result<(), String> {
    let data = std::fs::read(&file_path).map_err(|e| e.to_string())?;
    let package = Book::get_metadata(&data).map_err(|_| "Metadata error")?;

    let app_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let covers_dir = app_dir.join("covers");

    let mut hasher = DefaultHasher::new();
    file_path.hash(&mut hasher);
    let cache_filename = format!("{:x}.jpg", hasher.finish());
    let local_cover_path = covers_dir.join(&cache_filename);

    if let Some(internal_path) = &package.cover {
        if let Ok(img) = Book::get_raw_content(&data, internal_path.as_bytes(), None, None) {
            let _ = std::fs::write(&local_cover_path, img);
        }
    }

    {
        let db_guard = db.lock().unwrap();
        db_guard
            .conn
            .execute(
                "INSERT INTO books (title, author, file_path, cover_path) VALUES (?1, ?2, ?3, ?4) 
         ON CONFLICT(file_path) DO NOTHING",
                (
                    &package.title,
                    &package.author,
                    &file_path,
                    local_cover_path.to_str(),
                ),
            )
            .map_err(|e| e.to_string())?;
    }

    Ok(())
}

#[tauri::command]
pub async fn get_library(state: tauri::State<'_, AppState>) -> Result<Vec<LibraryItem>, String> {
    let db_guard = state.db.lock().map_err(|e| e.to_string())?;

    let mut stmt = db_guard
        .conn
        .prepare(
            "SELECT rowid, title, author, file_path, cover_path FROM books ORDER BY opened_at DESC",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            Ok(LibraryItem {
                id: row.get(0)?,
                title: row.get(1)?,
                author: row.get(2)?,
                path: row.get(3)?,
                cover: row.get(4)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut library = Vec::new();
    for item in rows {
        library.push(item.map_err(|e| e.to_string())?);
    }

    Ok(library)
}

#[tauri::command]
pub async fn add_book(
    file_path: String,
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
) -> Result<String, String> {
    process_book_and_store(file_path, &app, &state.db).await?;
    Ok("Book added".into())
}

#[tauri::command]
pub async fn sync_library(
    folder_path: String,
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
) -> Result<Vec<LibraryItem>, String> {
    let entries = std::fs::read_dir(folder_path).map_err(|e| e.to_string())?;

    for entry in entries.flatten() {
        if entry.path().extension().is_some_and(|ext| ext == "epub") {
            let _ =
                process_book_and_store(entry.path().to_string_lossy().to_string(), &app, &state.db)
                    .await;
        }
    }
    get_library(state).await
}
