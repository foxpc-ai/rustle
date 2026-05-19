ALTER TABLE books ADD COLUMN progress REAL DEFAULT 0.0;

CREATE TABLE annotations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    book_id INTEGER NOT NULL,
    type TEXT CHECK( type IN ('bookmark', 'highlight', 'note') ) NOT NULL,
    content TEXT,
    location_start TEXT NOT NULL,
    location_end TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (book_id) REFERENCES books (id) ON DELETE CASCADE
);