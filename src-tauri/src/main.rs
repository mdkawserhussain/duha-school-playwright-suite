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
        let src = res_dir.join("_up_").join("src");
        if src.exists() {
            copy_dir_all(&src, &server_dir.join("src"))
                .map_err(|e| format!("copy src: {e}"))?;
        } else {
            // Fallback: try direct path (some platforms may not use _up_ prefix)
            let src_direct = res_dir.join("src");
            if src_direct.exists() {
                copy_dir_all(&src_direct, &server_dir.join("src"))
                    .map_err(|e| format!("copy src: {e}"))?;
            } else {
                return Err(format!(
                    "Server source files not found in resource dir. Looked for {:?} and {:?}",
                    src, src_direct
                ));
            }
        }

        // Copy config.ts and utils
        for (rel, name) in [
            ("_up_/src/config.ts", "config.ts"),
            ("_up_/src/utils/historyDb.ts", "utils/historyDb.ts"),
            ("_up_/src/utils/logger.ts", "utils/logger.ts"),
        ] {
            let src_path = res_dir.join(rel);
            if src_path.exists() {
                let dst_path = server_dir.join(name);
                fs::create_dir_all(dst_path.parent().unwrap()).ok();
                fs::copy(&src_path, &dst_path)
                    .map_err(|e| format!("copy {rel}: {e}"))?;
            }
        }

        // Copy package.json (mapped from server-package.json)
        let pkg = res_dir.join("package.json");
        if pkg.exists() {
            fs::copy(&pkg, server_dir.join("package.json"))
                .map_err(|e| format!("copy package.json: {e}"))?;
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
    match Command::new("node")
        .arg("src/server/index.ts")
        .current_dir(server_dir)
        .spawn()
    {
        Ok(_child) => {
            eprintln!("[tauri] Express server started on port 3000");
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
