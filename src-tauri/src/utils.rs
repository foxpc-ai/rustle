use memmap2::Mmap;
use std::io::ErrorKind;
use tauri::{
    http::{Request, Response},
    AppHandle, Manager, Url,
};

use crate::AppState;

pub const ALLOWED_PROPS: &[&str] = &[
    "color",
    "font-family",
    "font-size",
    "font-stretch",
    "font-style",
    "font-variant",
    "font-weight",
    "line-height",
    "text-align",
    "text-decoration",
    "text-indent",
];

pub(crate) fn sanitize_css(css_content: String) -> String {
    let mut sanitized = String::with_capacity(css_content.len());

    for block in css_content.split('}') {
        if let Some((selector, rules)) = block.split_once('{') {
            let clean_rules: Vec<String> = rules
                .split(';')
                .filter_map(|rule| {
                    let rule = rule.trim();
                    if rule.is_empty() {
                        return None;
                    }

                    let (prop, val) = rule.split_once(':')?;
                    let prop = prop.trim().to_lowercase();

                    if ALLOWED_PROPS.binary_search(&prop.as_str()).is_ok() {
                        Some(format!("{}: {}", prop, val.trim()))
                    } else {
                        None
                    }
                })
                .collect();

            if !clean_rules.is_empty() {
                sanitized.push_str(selector.trim());
                sanitized.push_str(" { ");
                sanitized.push_str(&clean_rules.join("; "));
                sanitized.push_str("; }\n");
            }
        }
    }
    sanitized
}

pub(crate) fn extract_query_param(uri: &str, key: &str) -> Option<String> {
    let url = Url::parse(uri).ok()?;
    url.query_pairs()
        .find(|(k, _)| k == key)
        .map(|(_, v)| v.into_owned())
}

pub(crate) fn handle_epub_asset_request(
    handle: &AppHandle,
    request: Request<Vec<u8>>,
) -> Response<Vec<u8>> {
    let uri = request.uri().to_string();
    let ch_idx = extract_query_param(&uri, "ch").and_then(|v| v.parse::<usize>().ok());
    let rel_path = extract_query_param(&uri, "path");

    let not_found = || {
        Response::builder()
            .status(404)
            .header("Access-Control-Allow-Origin", "*")
            .body(Vec::new())
            .unwrap()
    };

    let (Some(idx), Some(path)) = (ch_idx, rel_path) else {
        return not_found();
    };

    let asset_data = {
        let state = handle.state::<AppState>();
        let session_guard = state.current_book.lock().unwrap();

        let Some(session) = session_guard.as_ref() else {
            return not_found();
        };

        match session.book.get_resource(&session.mmap, idx, &path, None) {
            Ok(content) => content.into_owned(),
            Err(_) => return not_found(),
        }
    };

    let extension = path.split('.').next_back().unwrap_or("").to_lowercase();
    let builder = Response::builder().header("Access-Control-Allow-Origin", "*");

    if extension == "css" {
        let original_css = String::from_utf8_lossy(&asset_data).into_owned();
        let clean_css = sanitize_css(original_css);
        return builder
            .header("Content-Type", "text/css")
            .body(clean_css.into_bytes())
            .unwrap();
    }

    let mime_type = match extension.as_str() {
        "jpg" | "jpeg" => "image/jpeg",
        "png" => "image/png",
        "gif" => "image/gif",
        "svg" => "image/svg+xml",
        "woff" | "woff2" => "font/woff2",
        _ => "application/octet-stream",
    };

    builder
        .header("Content-Type", mime_type)
        .body(asset_data)
        .unwrap()
}

pub(crate) fn read_book(file_path: &str) -> Result<Mmap, String> {
    let data = match std::fs::File::open(file_path) {
        Ok(f) => f,
        Err(e) => {
            return Err(match e.kind() {
                ErrorKind::NotFound => format!("File not found at path: {}", file_path),
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

    Ok(unsafe { Mmap::map(&data).map_err(|e| e.to_string())? })
}
