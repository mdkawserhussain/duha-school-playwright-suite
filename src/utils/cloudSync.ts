/**
 * Cloud Sync — uploads XLSX reports to Google Drive and syncs dues JSON to Google Sheets.
 *
 * Requires a Google Cloud service account with:
 *   - Drive API scope for file uploads
 *   - Sheets API scope for spreadsheet writes
 *
 * Env vars:
 *   GOOGLE_SERVICE_ACCOUNT_JSON — path to service account JSON key file
 *   GOOGLE_DRIVE_FOLDER_ID — target Drive folder ID
 *   GOOGLE_SHEETS_SPREADSHEET_ID — target Sheets spreadsheet ID
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { google } from 'googleapis';
import { log } from './logger';

function getAuth() {
  const keyPath = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!keyPath) return null;

  try {
    const keyFile = fs.readFileSync(path.resolve(keyPath), 'utf-8');
    const credentials = JSON.parse(keyFile);
    return new google.auth.GoogleAuth({
      credentials,
      scopes: [
        'https://www.googleapis.com/auth/drive.file',
        'https://www.googleapis.com/auth/spreadsheets',
      ],
    });
  } catch (err) {
    log.warn(`Failed to load Google service account: ${(err as Error).message}`);
    return null;
  }
}

/**
 * Uploads a file to Google Drive.
 */
export async function uploadToDrive(filePath: string): Promise<string | null> {
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (!folderId) {
    log.warn('Google Drive sync skipped: GOOGLE_DRIVE_FOLDER_ID not set');
    return null;
  }

  const auth = getAuth();
  if (!auth) return null;

  try {
    const drive = google.drive({ version: 'v3', auth });
    const fileName = path.basename(filePath);
    const fileMedia = { body: fs.createReadStream(filePath) };

    const response = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [folderId],
      },
      media: fileMedia,
      fields: 'id, webViewLink',
    });

    const fileId = response.data.id || '';
    log.info(`Uploaded to Google Drive: ${fileName} (id=${fileId})`);
    return response.data.webViewLink || `https://drive.google.com/file/d/${fileId}`;
  } catch (err) {
    log.error(`Google Drive upload failed: ${(err as Error).message}`);
    return null;
  }
}

/**
 * Syncs dues JSON data to a Google Sheets spreadsheet.
 * Clears existing data and writes the current dues records.
 */
export async function syncToSheets(duesData: Array<Record<string, any>>): Promise<boolean> {
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  if (!spreadsheetId) {
    log.warn('Google Sheets sync skipped: GOOGLE_SHEETS_SPREADSHEET_ID not set');
    return false;
  }

  if (duesData.length === 0) {
    log.warn('Google Sheets sync skipped: no dues data to sync');
    return false;
  }

  const auth = getAuth();
  if (!auth) return false;

  try {
    const sheets = google.sheets({ version: 'v4', auth });

    // Extract headers from first record
    const headers = Object.keys(duesData[0]);
    const rows = [headers, ...duesData.map(record => headers.map(h => String(record[h] ?? '')))];

    // Clear existing data
    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: 'Sheet1!A:Z',
    });

    // Write new data
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Sheet1!A1',
      valueInputOption: 'RAW',
      requestBody: { values: rows },
    });

    log.info(`Synced ${duesData.length} records to Google Sheets`);
    return true;
  } catch (err) {
    log.error(`Google Sheets sync failed: ${(err as Error).message}`);
    return false;
  }
}

/**
 * Main entry point — runs all configured cloud sync operations.
 */
export async function runCloudSync(xlsxPath?: string, duesData?: Array<Record<string, any>>): Promise<void> {
  if (process.env.ENABLE_CLOUD_SYNC !== 'true') return;

  log.info('Running cloud sync...');

  if (xlsxPath && fs.existsSync(xlsxPath)) {
    await uploadToDrive(xlsxPath);
  }

  if (duesData && duesData.length > 0) {
    await syncToSheets(duesData);
  }

  log.info('Cloud sync complete');
}
