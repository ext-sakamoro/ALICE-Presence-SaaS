use axum::{extract::{Path, State}, response::Json, routing::{get, post}, Router};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::time::Instant;
use tower_http::cors::{Any, CorsLayer};
use tower_http::trace::TraceLayer;

// ── State ───────────────────────────────────────────────────
struct AppState {
    start_time: Instant,
    presence: Mutex<PresenceState>,
}

struct PresenceState {
    sessions: HashMap<String, Session>,
    spaces: HashMap<String, Vec<String>>, // space_id -> [session_id]
    total_joins: u64,
    peak_concurrent: usize,
}

struct Session {
    session_id: String,
    user_id: String,
    space_id: String,
    display_name: String,
    status: String,
    privacy_level: u8,
    vivaldi: [f64; 2],
    zkp_token: String,
    joined_at: String,
    last_seen: String,
}

// ── Request / Response types ────────────────────────────────
#[derive(Serialize)]
struct Health { status: String, version: String, uptime_secs: u64, online_users: usize, total_sessions: u64 }

#[derive(Deserialize)]
struct JoinRequest { user_id: String, space_id: String, display_name: Option<String>, #[allow(dead_code)] metadata: Option<serde_json::Value> }
#[derive(Serialize)]
struct JoinResponse { session_id: String, space_id: String, user_id: String, vivaldi_coordinates: [f64; 2], zkp_token: String, joined_at: String, online_count: usize }

#[derive(Deserialize)]
struct LeaveRequest { session_id: String }
#[derive(Serialize)]
struct LeaveResponse { session_id: String, left_at: String, duration_secs: u64 }

#[derive(Deserialize)]
struct UpdateRequest { session_id: String, status: Option<String>, #[allow(dead_code)] position: Option<[f64; 3]>, #[allow(dead_code)] activity: Option<String>, privacy_level: Option<u8> }
#[derive(Serialize)]
struct UpdateResponse { session_id: String, status: String, updated_at: String, privacy_level: u8, zkp_proof: Option<String> }

#[derive(Serialize)]
struct SpaceResponse { space_id: String, online_count: usize, users: Vec<UserPresence> }
#[derive(Serialize)]
struct UserPresence { user_id: String, display_name: String, status: String, vivaldi_coordinates: Option<[f64; 2]>, distance_estimate: Option<f64>, last_seen: String }

#[derive(Deserialize)]
struct PingRequest { session_id: String, radius: f64, space_id: String }
#[derive(Serialize)]
struct PingResponse { nearby: Vec<NearbyUser>, count: usize, radius: f64 }
#[derive(Serialize)]
struct NearbyUser { user_id: String, distance: f64, status: String, vivaldi_distance: f64 }

#[derive(Serialize)]
struct StatsResponse { total_joins: u64, active_sessions: usize, active_spaces: usize, peak_concurrent: usize }

// ── Main ────────────────────────────────────────────────────
#[tokio::main]
async fn main() {
    tracing_subscriber::fmt()
        .with_env_filter(tracing_subscriber::EnvFilter::try_from_default_env()
            .unwrap_or_else(|_| "presence_engine=info".into()))
        .init();
    let state = Arc::new(AppState {
        start_time: Instant::now(),
        presence: Mutex::new(PresenceState {
            sessions: HashMap::new(), spaces: HashMap::new(), total_joins: 0, peak_concurrent: 0,
        }),
    });
    let cors = CorsLayer::new().allow_origin(Any).allow_methods(Any).allow_headers(Any);
    let app = Router::new()
        .route("/health", get(health))
        .route("/api/v1/presence/join", post(join))
        .route("/api/v1/presence/leave", post(leave))
        .route("/api/v1/presence/update", post(update))
        .route("/api/v1/presence/space/{space_id}", get(space))
        .route("/api/v1/presence/ping", post(ping))
        .route("/api/v1/presence/stats", get(stats))
        .layer(cors).layer(TraceLayer::new_for_http()).with_state(state);
    let addr = std::env::var("PRESENCE_ADDR").unwrap_or_else(|_| "0.0.0.0:8081".into());
    let listener = tokio::net::TcpListener::bind(&addr).await.unwrap();
    tracing::info!("Presence Engine on {addr}");
    axum::serve(listener, app).await.unwrap();
}

// ── Handlers ────────────────────────────────────────────────
async fn health(State(s): State<Arc<AppState>>) -> Json<Health> {
    let ps = s.presence.lock().unwrap();
    Json(Health {
        status: "ok".into(), version: env!("CARGO_PKG_VERSION").into(),
        uptime_secs: s.start_time.elapsed().as_secs(),
        online_users: ps.sessions.len(), total_sessions: ps.total_joins,
    })
}

async fn join(State(s): State<Arc<AppState>>, Json(req): Json<JoinRequest>) -> Json<JoinResponse> {
    let session_id = uuid::Uuid::new_v4().to_string();
    let now = chrono_now();

    // Generate Vivaldi 2D coordinates (random within unit circle using simple hash)
    let hash = simple_hash(&req.user_id);
    let angle = (hash as f64 / u64::MAX as f64) * std::f64::consts::TAU;
    let radius = ((hash >> 32) as f64 / u32::MAX as f64).sqrt() * 0.8;
    let vivaldi = [angle.cos() * radius, angle.sin() * radius];

    // ZKP token (simulated)
    let zkp_token = format!("{:016x}{:016x}", hash.wrapping_mul(0x517cc1b727220a95), hash.rotate_left(17));

    let display_name = req.display_name.unwrap_or_else(|| req.user_id.clone());

    let session = Session {
        session_id: session_id.clone(), user_id: req.user_id.clone(),
        space_id: req.space_id.clone(), display_name,
        status: "online".into(), privacy_level: 0,
        vivaldi, zkp_token: zkp_token.clone(),
        joined_at: now.clone(), last_seen: now.clone(),
    };

    let online_count;
    {
        let mut ps = s.presence.lock().unwrap();
        ps.sessions.insert(session_id.clone(), session);
        ps.spaces.entry(req.space_id.clone()).or_default().push(session_id.clone());
        ps.total_joins += 1;
        let current = ps.sessions.len();
        if current > ps.peak_concurrent { ps.peak_concurrent = current; }
        online_count = ps.spaces.get(&req.space_id).map(|v| v.len()).unwrap_or(0);
    }

    Json(JoinResponse {
        session_id, space_id: req.space_id, user_id: req.user_id,
        vivaldi_coordinates: vivaldi, zkp_token, joined_at: now, online_count,
    })
}

async fn leave(State(s): State<Arc<AppState>>, Json(req): Json<LeaveRequest>) -> Json<LeaveResponse> {
    let now = chrono_now();
    let mut ps = s.presence.lock().unwrap();
    let duration = if let Some(session) = ps.sessions.remove(&req.session_id) {
        if let Some(members) = ps.spaces.get_mut(&session.space_id) {
            members.retain(|id| id != &req.session_id);
            if members.is_empty() { ps.spaces.remove(&session.space_id); }
        }
        10 // simplified duration
    } else { 0 };

    Json(LeaveResponse { session_id: req.session_id, left_at: now, duration_secs: duration })
}

async fn update(State(s): State<Arc<AppState>>, Json(req): Json<UpdateRequest>) -> Json<UpdateResponse> {
    let now = chrono_now();
    let mut ps = s.presence.lock().unwrap();
    let (status, privacy_level, zkp_proof) = if let Some(session) = ps.sessions.get_mut(&req.session_id) {
        if let Some(st) = &req.status { session.status = st.clone(); }
        if let Some(pl) = req.privacy_level { session.privacy_level = pl; }
        session.last_seen = now.clone();
        let proof = if session.privacy_level >= 3 {
            Some(format!("zkp_{:016x}", simple_hash(&session.session_id)))
        } else { None };
        (session.status.clone(), session.privacy_level, proof)
    } else {
        ("unknown".into(), 0, None)
    };

    Json(UpdateResponse { session_id: req.session_id, status, updated_at: now, privacy_level, zkp_proof })
}

async fn space(State(s): State<Arc<AppState>>, Path(space_id): Path<String>) -> Json<SpaceResponse> {
    let ps = s.presence.lock().unwrap();
    let member_ids = ps.spaces.get(&space_id).cloned().unwrap_or_default();
    let mut users = Vec::new();
    for sid in &member_ids {
        if let Some(session) = ps.sessions.get(sid) {
            // Respect privacy: invisible users not shown
            if session.status == "invisible" { continue; }
            let show_vivaldi = session.privacy_level < 2;
            users.push(UserPresence {
                user_id: session.user_id.clone(),
                display_name: if session.privacy_level >= 3 { "anonymous".into() } else { session.display_name.clone() },
                status: if session.privacy_level >= 2 { "active".into() } else { session.status.clone() },
                vivaldi_coordinates: if show_vivaldi { Some(session.vivaldi) } else { None },
                distance_estimate: None,
                last_seen: session.last_seen.clone(),
            });
        }
    }
    Json(SpaceResponse { space_id, online_count: users.len(), users })
}

async fn ping(State(s): State<Arc<AppState>>, Json(req): Json<PingRequest>) -> Json<PingResponse> {
    let ps = s.presence.lock().unwrap();
    let caller_vivaldi = ps.sessions.get(&req.session_id).map(|s| s.vivaldi).unwrap_or([0.0, 0.0]);
    let member_ids = ps.spaces.get(&req.space_id).cloned().unwrap_or_default();
    let mut nearby = Vec::new();

    for sid in &member_ids {
        if sid == &req.session_id { continue; }
        if let Some(session) = ps.sessions.get(sid) {
            if session.status == "invisible" { continue; }
            let dx = session.vivaldi[0] - caller_vivaldi[0];
            let dy = session.vivaldi[1] - caller_vivaldi[1];
            let vivaldi_dist = (dx * dx + dy * dy).sqrt();
            // Map Vivaldi distance to estimated physical distance (scale factor)
            let distance = vivaldi_dist * 100.0;
            if distance <= req.radius {
                nearby.push(NearbyUser {
                    user_id: session.user_id.clone(),
                    distance, status: session.status.clone(),
                    vivaldi_distance: vivaldi_dist,
                });
            }
        }
    }
    nearby.sort_by(|a, b| a.distance.partial_cmp(&b.distance).unwrap_or(std::cmp::Ordering::Equal));
    let count = nearby.len();
    Json(PingResponse { nearby, count, radius: req.radius })
}

async fn stats(State(s): State<Arc<AppState>>) -> Json<StatsResponse> {
    let ps = s.presence.lock().unwrap();
    Json(StatsResponse {
        total_joins: ps.total_joins, active_sessions: ps.sessions.len(),
        active_spaces: ps.spaces.len(), peak_concurrent: ps.peak_concurrent,
    })
}

// ── Helpers ─────────────────────────────────────────────────
fn simple_hash(data: &str) -> u64 {
    let mut h: u64 = 0xcbf2_9ce4_8422_2325;
    for &b in data.as_bytes() {
        h ^= b as u64;
        h = h.wrapping_mul(0x0100_0000_01b3);
    }
    h
}

fn chrono_now() -> String {
    let secs = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    format!("2026-02-23T{:02}:{:02}:{:02}Z", (secs / 3600) % 24, (secs / 60) % 60, secs % 60)
}
