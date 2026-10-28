//! Live tail of Claude Code session jsonl (`<projects>/<encoded>/<id>.jsonl`).
//!
//! The SDK writes the full turn to this file while stdout may carry a slimmer
//! stream (or close early). After stdout EOF we keep polling the transcript
//! until the child exits so tool rows and late assistant text are not lost
//! before `result` arrives on stdout.

use std::fs::File;
use std::io::{Read, Seek, SeekFrom};
use std::path::{Path, PathBuf};

/// One run's session log tail: byte offset already consumed.
#[derive(Debug)]
pub struct ClaudeTranscriptTail {
    file: File,
    offset: u64,
}

impl ClaudeTranscriptTail {
    /// Open the session jsonl for `session_id` under `workspace`, starting at
    /// the file's end so only records appended during this run are replayed.
    pub fn open(workspace: &Path, session_id: &str) -> Option<Self> {
        let path = claude_session_jsonl_path(workspace, session_id)?;
        eprintln!(
            "[claude-transcript] session_id={session_id} jsonl={}",
            path.display()
        );
        let mut file = File::open(&path).ok()?;
        let offset = file.seek(SeekFrom::End(0)).ok()?;
        Some(Self { file, offset })
    }

    /// Complete lines appended since the previous poll, oldest first.
    pub fn poll_lines(&mut self) -> Vec<String> {
        let mut out = Vec::new();
        if self.file.seek(SeekFrom::Start(self.offset)).is_err() {
            return out;
        }
        let mut text = String::new();
        if self.file.read_to_string(&mut text).is_err() {
            return out;
        }
        let Some(last_newline) = text.rfind('\n') else {
            return out;
        };
        self.offset += last_newline as u64 + 1;
        out.extend(
            text[..last_newline]
                .lines()
                .map(str::trim)
                .filter(|line| !line.is_empty())
                .map(str::to_string),
        );
        out
    }
}

/// Resolve `<claude home>/projects/<encoded-cwd>/<session_id>.jsonl`.
pub(crate) fn claude_session_jsonl_path(workspace: &Path, session_id: &str) -> Option<PathBuf> {
    let base = crate::engine::engine_home(Some("CLAUDE_CONFIG_DIR"), ".claude").join("projects");
    for dir in crate::history::discovery::claude_project_dirs(&base, workspace) {
        let path = dir.join(format!("{session_id}.jsonl"));
        if path.is_file() {
            return Some(path);
        }
    }
    None
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;

    #[test]
    fn poll_reads_only_appended_lines() {
        let path = std::env::temp_dir().join(format!(
            "ccgui-claude-tail-{}",
            std::process::id()
        ));
        let _ = std::fs::remove_file(&path);
        std::fs::write(&path, "{\"type\":\"user\"}\n").unwrap();
        let mut tail = ClaudeTranscriptTail {
            file: File::open(&path).unwrap(),
            offset: path.metadata().unwrap().len(),
        };
        assert!(tail.poll_lines().is_empty());
        let mut file = std::fs::OpenOptions::new().append(true).open(&path).unwrap();
        writeln!(file, "{{\"type\":\"assistant\"}}").unwrap();
        let lines = tail.poll_lines();
        assert_eq!(lines.len(), 1);
        assert!(lines[0].contains("assistant"));
        let _ = std::fs::remove_file(&path);
    }
}
