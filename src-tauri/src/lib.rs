use light_epub::book::Book;
use memmap2::Mmap;
use std::sync::Mutex;
use tauri::{http::Response, Manager};

use crate::{
    book_view::{get_book_resource, get_chapter_content, open_book},
    database::{load_settings, save_settings, Db},
    lib_view::{add_book, get_library, sync_library},
    utils::{extract_query_param, sanitize_css},
};

pub mod book_view;
pub mod database;
pub mod lib_view;
pub mod utils;

pub struct BookSession {
    pub mmap: Mmap,
    pub book: Book,
}

pub struct AppState {
    pub db: Mutex<Db>,
    pub current_book: Mutex<Option<BookSession>>,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let app_handle = app.handle();

            let db = Db::init(app_handle)?;

            app.manage(AppState {
                db: Mutex::new(db),
                current_book: Mutex::new(None),
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_library,
            add_book,
            sync_library,
            open_book,
            get_chapter_content,
            get_book_resource,
            save_settings,
            load_settings,
        ])
        .register_asynchronous_uri_scheme_protocol("epub-asset", |ctx, request, responder| {
            let uri = request.uri().to_string();

            let ch_idx = extract_query_param(&uri, "ch").and_then(|v| v.parse::<usize>().ok());
            let rel_path = extract_query_param(&uri, "path");

            if let (Some(idx), Some(path)) = (ch_idx, rel_path) {
                let state = ctx.app_handle().state::<AppState>();
                let session_guard = state.current_book.lock().unwrap();

                if let Some(session) = session_guard.as_ref() {
                    match session.book.get_resource(&session.mmap, idx, &path, None) {
                        Ok(bytes) => {
                            let mime_type = match path
                                .split('.')
                                .next_back()
                                .unwrap_or("")
                                .to_lowercase()
                                .as_str()
                            {
                                "css" => {
                                    let original_css = String::from_utf8_lossy(&bytes).into_owned();

                                    let clean_css = sanitize_css(original_css);

                                    let response = Response::builder()
                                        .header("Access-Control-Allow-Origin", "*")
                                        .header("Content-Type", "text/css")
                                        .body(clean_css.into_bytes())
                                        .unwrap();
                                    return responder.respond(response);
                                }
                                "jpg" | "jpeg" => "image/jpeg",
                                "png" => "image/png",
                                "gif" => "image/gif",
                                "svg" => "image/svg+xml",
                                _ => "application/octet-stream",
                            };

                            let response = Response::builder()
                                .header("Access-Control-Allow-Origin", "*")
                                .header("Content-Type", mime_type)
                                .body(bytes.to_vec())
                                .unwrap();
                            responder.respond(response)
                        }
                        Err(e) => {
                            println!("Parser Error: {:?}", e);
                        }
                    }
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
