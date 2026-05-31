// src-tauri/src/main.rs
// Tauri desktop wrapper with Express server sidecar.

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri_plugin_shell::ShellExt;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            // Start the Express server as a sidecar process
            let sidecar_command = app.shell().sidecar("node").unwrap();
            let (mut _rx, _child) = sidecar_command
                .args(["src/server/index.ts"])
                .spawn()
                .expect("Failed to spawn Express server sidecar");

            // Optionally listen to sidecar output
            // tauri::async_runtime::spawn(async move {
            //     while let Some(event) = _rx.recv().await {
            //         println!("sidecar: {:?}", event);
            //     }
            // });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
