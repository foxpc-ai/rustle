use crate::{AppState, BookSession};
use light_epub::{book::Book, nav::NavItem};
use memmap2::Mmap;
use std::fs::File;
use std::io::ErrorKind;
use tauri::State;

#[tauri::command]
pub async fn open_book(state: State<'_, AppState>, path: String) -> Result<Vec<NavItem>, String> {
    let file = match File::open(&path) {
        Ok(f) => f,
        Err(e) => {
            return Err(match e.kind() {
                ErrorKind::NotFound => format!("File not found at path: {}", path),
                ErrorKind::PermissionDenied => {
                    "Permission denied while opening the file".to_string()
                }
                ErrorKind::Interrupted => {
                    "File opening was interrupted. Please try again.".to_string()
                }
                _ => format!("System error opening file: {}", e),
            })
        }
    };

    let mmap = unsafe { Mmap::map(&file).map_err(|e| e.to_string())? };

    let book = Book::new(&mmap).map_err(|_| "Failed to parse EPUB")?;
    let toc = book.get_toc(&mmap).map_err(|_| "Failed to get TOC")?;

    {
        let db_guard = state.db.lock().map_err(|e| e.to_string())?;
        db_guard
            .conn
            .execute(
                "UPDATE books SET opened_at = CURRENT_TIMESTAMP WHERE file_path = ?1",
                [&path],
            )
            .map_err(|e| e.to_string())?;
    }

    let mut session = state.current_book.lock().unwrap();
    *session = Some(BookSession { mmap, book });

    Ok(toc)
}

#[tauri::command]
pub async fn get_chapter_content(
    state: State<'_, AppState>,
    index: usize,
) -> Result<Vec<u8>, String> {
    let session_lock = state.current_book.lock().unwrap();
    let session = session_lock
        .as_ref()
        .ok_or_else(|| "No book open".to_string())?;

    let mut scratch = [0u8; 128 * 1024];

    let result = session
        .book
        .get_chapter(&session.mmap, index, Some(&mut scratch));

    match result {
        Ok(content) => Ok(content.to_vec()),

        Err(light_epub::errors::EpubError::ScratchBufferTooSmall) => {
            println!(
                "Chapter {} exceeds 128KB, retrying with auto-allocation",
                index
            );
            session
                .book
                .get_chapter(&session.mmap, index, None)
                .map(|content| content.to_vec())
                .map_err(|e| {
                    let log_msg = format!("Critical EPUB error after retry: {:?}", e);
                    eprintln!("{}", log_msg);
                    "Failed to process large chapter".to_string()
                })
        }

        Err(e) => {
            eprintln!(
                "Backend Error: get_chapter_content(index: {}) failed with: {:?}",
                index, e
            );

            Err(format!("Could not load chapter {}: {}", index, e))
        }
    }
}

#[tauri::command]
pub async fn get_book_resource(
    state: State<'_, AppState>,
    chapter_idx: usize,
    rel_path: String,
) -> Result<Vec<u8>, String> {
    let session_lock = state.current_book.lock().unwrap();
    let session = session_lock.as_ref().ok_or("No book open")?;

    let res = session
        .book
        .get_resource(&session.mmap, chapter_idx, &rel_path, None)
        .map_err(|_| "Resource not found")?;

    Ok(res.to_vec())
}
