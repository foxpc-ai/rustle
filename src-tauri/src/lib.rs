use light_epub::book::Book;
use memmap2::Mmap;
use std::sync::Mutex;
use tauri::Manager;
use tauri_plugin_log::{Builder, RotationStrategy, Target, TargetKind};

use crate::{
    book_view::{get_book_resource, get_chapter_content, open_book},
    database::{get_last_position, load_settings, save_settings, update_last_position, Db},
    lib_view::{add_book, get_library, sync_library},
    utils::handle_epub_asset_request,
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
        .plugin(Builder::new().targets([
            Target::new(TargetKind::Stdout),
            Target::new(TargetKind::LogDir {
                file_name: Some("rustle".into()),
            }),
        ]).rotation_strategy(RotationStrategy::KeepOne).build())
        .setup(|app| {
            let app_handle = app.handle();
            let db = Db::init(app_handle)?;
            app.manage(AppState {
                db: Mutex::new(db),
                current_book: Mutex::new(None),
            });
            Ok(())
        })
        .register_asynchronous_uri_scheme_protocol("epub-asset", |ctx, request, responder| {
            let app_handle = ctx.app_handle().clone();

            tauri::async_runtime::spawn(async move {
                let response = handle_epub_asset_request(&app_handle, request);
                responder.respond(response);
            });
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
            get_last_position,
            update_last_position,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
