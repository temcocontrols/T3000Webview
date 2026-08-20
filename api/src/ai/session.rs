// AI Chat — In-memory conversation session store.
//
// Sessions hold the full message history so the tool-call loop can
// append assistant + tool_result messages between LLM calls.
//
// Cleanup task prunes sessions idle > 1 hour, every 5 minutes.

use std::collections::HashMap;
use std::sync::Arc;
use std::time::{Duration, Instant};

use tokio::sync::Mutex;
use uuid::Uuid;

use super::types::{ChatRequest, Message};

const MAX_SESSIONS: usize = 100;
const SESSION_IDLE_TIMEOUT: Duration = Duration::from_secs(3600); // 1 hour
const CLEANUP_INTERVAL: Duration = Duration::from_secs(300); // 5 minutes

/// A single conversation session.
#[derive(Debug, Clone)]
pub struct Session {
    pub id: String,
    pub provider: String,
    pub model: String,
    pub endpoint: String,
    pub api_key: Option<String>,
    pub messages: Vec<Message>,
    pub created_at: Instant,
    pub last_active: Instant,
}

/// Thread-safe session store.
#[derive(Clone)]
pub struct SessionManager {
    sessions: Arc<Mutex<HashMap<String, Session>>>,
}

impl SessionManager {
    /// Create a new empty session manager and spawn the background cleanup task.
    pub fn new() -> Self {
        let mgr = Self {
            sessions: Arc::new(Mutex::new(HashMap::new())),
        };
        mgr.spawn_cleanup_task();
        mgr
    }

    /// Create a new session from a chat request, or resume an existing one.
    pub async fn create_or_resume(&self, req: &ChatRequest) -> Session {
        let mut sessions = self.sessions.lock().await;

        // Resume an existing session if requested — from the in-memory cache,
        // or (if it was evicted or the server restarted) from the JSON file
        // store so that continuing a loaded conversation keeps writing to the
        // same session file.
        if let Some(ref sid) = req.session_id {
            let existing = if let Some(s) = sessions.get_mut(sid) {
                s.last_active = Instant::now();
                Some(s.clone())
            } else {
                super::session_store::load_session(sid)
                    .ok()
                    .flatten()
                    .map(|f| Session {
                        id: f.id.clone(),
                        provider: f.provider.clone(),
                        model: f.model.clone(),
                        endpoint: req
                            .settings
                            .as_ref()
                            .and_then(|s| s.endpoint.clone())
                            .unwrap_or_default(),
                        api_key: req
                            .settings
                            .as_ref()
                            .and_then(|s| s.api_key.clone())
                            .filter(|k| !k.is_empty()),
                        messages: f.messages,
                        created_at: Instant::now(),
                        last_active: Instant::now(),
                    })
            };

            if let Some(mut session) = existing {
                // The frontend sends the FULL message history, so append only
                // the user turns we don't already have — this keeps the new
                // user message while avoiding duplicating earlier turns.
                let user_count = session.messages.iter().filter(|m| m.role == "user").count();
                let mut seen = 0usize;
                for msg in &req.messages {
                    if msg.role == "user" {
                        seen += 1;
                        if seen > user_count {
                            session.messages.push(msg.clone());
                        }
                    }
                }
                session.last_active = Instant::now();
                sessions.insert(session.id.clone(), session.clone());
                return session.clone();
            }
        }

        // Enforce max sessions — evict the oldest
        while sessions.len() >= MAX_SESSIONS {
            if let Some(oldest_id) = sessions
                .iter()
                .min_by_key(|(_, s)| s.last_active)
                .map(|(id, _)| id.clone())
            {
                sessions.remove(&oldest_id);
            } else {
                break;
            }
        }

        // Create new session
        let endpoint = req
            .settings
            .as_ref()
            .and_then(|s| s.endpoint.clone())
            .unwrap_or_default();

        let api_key = req
            .settings
            .as_ref()
            .and_then(|s| s.api_key.clone())
            .filter(|k| !k.is_empty());

        let session = Session {
            id: Uuid::new_v4().to_string(),
            provider: req.provider.clone(),
            model: req.model.clone(),
            endpoint,
            api_key,
            messages: req.messages.clone(),
            created_at: Instant::now(),
            last_active: Instant::now(),
        };

        sessions.insert(session.id.clone(), session.clone());
        session
    }

    /// Get a session by ID.
    pub async fn get(&self, id: &str) -> Option<Session> {
        let sessions = self.sessions.lock().await;
        sessions.get(id).cloned()
    }

    /// Replace the full message history for a session.
    pub async fn update_messages(&self, id: &str, messages: Vec<Message>) {
        let mut sessions = self.sessions.lock().await;
        if let Some(session) = sessions.get_mut(id) {
            session.messages = messages;
            session.last_active = Instant::now();
        }
    }

    /// Delete a session.
    pub async fn delete(&self, id: &str) {
        let mut sessions = self.sessions.lock().await;
        sessions.remove(id);
    }

    /// Remove sessions that have been idle longer than the timeout.
    async fn cleanup_expired(&self) {
        let mut sessions = self.sessions.lock().await;
        let now = Instant::now();
        sessions.retain(|_, s| now.duration_since(s.last_active) < SESSION_IDLE_TIMEOUT);
    }

    /// Spawn a background task that periodically prunes expired sessions.
    fn spawn_cleanup_task(&self) {
        let mgr = self.clone();
        tokio::spawn(async move {
            loop {
                tokio::time::sleep(CLEANUP_INTERVAL).await;
                mgr.cleanup_expired().await;
            }
        });
    }
}
