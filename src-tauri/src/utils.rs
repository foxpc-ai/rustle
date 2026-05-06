use tauri::Url;

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

pub fn sanitize_css(css_content: String) -> String {
    let mut sanitized = String::with_capacity(css_content.len());

    for block in css_content.split('}') {
        if let Some((selector, rules)) = block.split_once('{') {
            let clean_rules: Vec<String> = rules
                .split(';')
                .filter_map(|rule| {
                    let rule = rule.trim();
                    if rule.is_empty() { return None; }

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

pub fn extract_query_param(uri: &str, key: &str) -> Option<String> {
    let url = Url::parse(uri).ok()?;
    url.query_pairs()
        .find(|(k, _)| k == key)
        .map(|(_, v)| v.into_owned())
}