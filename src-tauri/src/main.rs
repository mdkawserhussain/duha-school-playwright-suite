// src-tauri/src/main.rs
// Tauri desktop wrapper with Express server sidecar.

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri_plugin_shell::ShellExt;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            // Start the Express server as a sidecar process.
            // Gracefully handle missing sidecar binary (e.g. during CI builds).
            if let Ok(sidecar_command) = app.shell().sidecar("node") {
                match sidecar_command
                    .args(["src/server/index.ts"])
                    .spawn()
                {
                    Ok((_rx, _child)) => {
                        // Optionally listen to sidecar output
                        // tauri::async_runtime::spawn(async move {
                        //     while let Some(event) = _rx.recv().await {
                        //         println!("sidecar: {:?}", event);
                        //     }
                        // });
                    }
                    Err(e) => {
                        eprintln!("Warning: failed to spawn Express server sidecar: {e}");
                    }
                }
            } else {
                eprintln!("Warning: node sidecar binary not found, skipping Express server");
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
