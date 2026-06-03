// src-tauri/src/main.rs
// Tauri desktop wrapper — bundles Express server, bootstraps on first launch.

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs;
use std::path::PathBuf;
use std::process::Command;
use tauri::Manager;

fn resource_dir(app: &tauri::App) -> PathBuf {
    app.path()
        .resource_dir()
        .expect("failed to resolve resource dir")
}

fn app_data_dir(app: &tauri::App) -> PathBuf {
    app.path()
        .app_data_dir()
        .expect("failed to resolve app data dir")
}

fn copy_dir_all(src: &PathBuf, dst: &PathBuf) -> std::io::Result<()> {
    fs::create_dir_all(dst)?;
    for entry in fs::read_dir(src)? {
        let entry = entry?;
        let ty = entry.file_type()?;
        let dst_path = dst.join(entry.file_name());
        if ty.is_dir() {
            copy_dir_all(&entry.path(), &dst_path)?;
        } else {
            fs::copy(entry.path(), &dst_path)?;
        }
    }
    Ok(())
}

fn bootstrap_server(res_dir: &PathBuf, data_dir: &PathBuf) -> Result<PathBuf, String> {
    let server_dir = data_dir.join("server");

    if !server_dir.join("src").exists() {
        eprintln!("[tauri] First launch — setting up server in {:?}", server_dir);
        fs::create_dir_all(&server_dir).map_err(|e| format!("create dir: {e}"))?;

        // Tauri maps "../src/" to "_up_/src/" in the resource dir
        // Copy the entire src/ directory (server + CLI + utils + extractors + etc.)
        let src = res_dir.join("_up_").join("src");
        if src.exists() {
            copy_dir_all(&src, &server_dir.join("src"))
                .map_err(|e| format!("copy src: {e}"))?;
        } else {
            let src_direct = res_dir.join("src");
            if src_direct.exists() {
                copy_dir_all(&src_direct, &server_dir.join("src"))
                    .map_err(|e| format!("copy src: {e}"))?;
            } else {
                return Err(format!(
                    "Server source files not found. Looked for {:?} and {:?}",
                    src, src_direct
                ));
            }
        }

        // Copy web/dist/ for the built frontend
        let web_dist = res_dir.join("_up_").join("web").join("dist");
        if web_dist.exists() {
            let dst_web = server_dir.join("web").join("dist");
            copy_dir_all(&web_dist, &dst_web)
                .map_err(|e| format!("copy web/dist: {e}"))?;
            eprintln!("[tauri] Copied web/dist frontend");
        } else {
            eprintln!("[tauri] WARNING: web/dist not found in resources — frontend may not load");
        }

        // Copy package.json (mapped from server-package.json)
        let pkg = res_dir.join("package.json");
        if pkg.exists() {
            fs::copy(&pkg, server_dir.join("package.json"))
                .map_err(|e| format!("copy package.json: {e}"))?;
        }

        // Create runtime directories
        for dir in &["user-data/logs", "output", "errors"] {
            fs::create_dir_all(server_dir.join(dir)).ok();
        }
    }

    let node_modules = server_dir.join("node_modules");
    if !node_modules.exists() {
        eprintln!("[tauri] Installing server dependencies (first launch)...");
        let status = Command::new("npm")
            .arg("install")
            .arg("--production")
            .arg("--no-fund")
            .arg("--no-audit")
            .current_dir(&server_dir)
            .status()
            .map_err(|e| format!("npm not found: {e}. Please install Node.js."))?;

        if !status.success() {
            return Err(format!("npm install failed with status: {status}"));
        }
        eprintln!("[tauri] Server dependencies installed.");
    }

    Ok(server_dir)
}

fn start_server(server_dir: &PathBuf) {
    match Command::new("npx")
        .args(["tsx", "src/server/index.ts"])
        .current_dir(server_dir)
        .spawn()
    {
        Ok(_child) => {
            eprintln!("[tauri] Express server started on port 3001");
        }
        Err(e) => {
            eprintln!("[tauri] ERROR: failed to start node: {e}");
            eprintln!("[tauri] Make sure Node.js is installed and on PATH.");
        }
    }
}

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let res_dir = resource_dir(app);
            let data_dir = app_data_dir(app);

            eprintln!("[tauri] Resource dir: {:?}", res_dir);
            eprintln!("[tauri] Data dir: {:?}", data_dir);

            match bootstrap_server(&res_dir, &data_dir) {
                Ok(server_dir) => {
                    start_server(&server_dir);
                }
                Err(e) => {
                    eprintln!("[tauri] ERROR: server bootstrap failed: {e}");
                }
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
