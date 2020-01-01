"use strict";
import {
  workspace, 
  window, 
  commands, 
  ExtensionContext,
  Disposable,
  QuickPickItem, 
  Uri, 
  ViewColumn, 
  TextDocument,
  TextDocumentChangeEvent, 
	WebviewOptions,
	WebviewPanel
} from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as config from './config';
import {Logger, LogLevel} from './logger';
import {MapView, MapViewSerializer} from './map.view';
import {viewManager} from './view.manager';
import {Template, ITemplateManager, TemplateManager} from './template.manager';

const logger: Logger = new Logger('geo.data.viewer:', config.logLevel);

/**
 * Activates this extension per rules set in package.json.
 * @param context vscode extension context.
 * @see https://code.visualstudio.com/api/references/activation-events for more info.
 */
export function activate(context: ExtensionContext) {
  const extensionPath: string = context.extensionPath;
	// logger.logMessage(LogLevel.Info, 'activate(): activating from extPath:', context.extensionPath);
	
	// initialize charts preview webview panel templates
	const templateManager: ITemplateManager = new TemplateManager(context.asAbsolutePath('templates'));
	const mapViewTemplate: Template | undefined = templateManager.getTemplate('map.view.html');

	// register map view serializer for restore on vscode restart
  window.registerWebviewPanelSerializer('map.view', 
    new MapViewSerializer('map.view', extensionPath, mapViewTemplate));

	// add Geo: View Map command
  const mapWebview: Disposable = 
    createViewMapCommand('view.map', extensionPath, mapViewTemplate);
	context.subscriptions.push(mapWebview);

	// refresh associated map view on geo data file save
	workspace.onDidSaveTextDocument((document: TextDocument) => {
		if (isGeoDataFile(document)) {
			const uri: Uri = document.uri.with({scheme: 'map'});
			const mapView: MapView | undefined = viewManager.find(uri);
			if (mapView) {
				mapView.refresh();
			}
		}
	});

	// reset associated preview on chart config file change
	workspace.onDidChangeTextDocument((changeEvent: TextDocumentChangeEvent) => {
		if (isGeoDataFile(changeEvent.document)) {
			const uri: Uri = changeEvent.document.uri.with({scheme: 'map'});
			const mapView: MapView | undefined = viewManager.find(uri);
			if (mapView && changeEvent.contentChanges.length > 0) {
				// TODO: add refresh interval before enabling this
				// mapView.refresh();
			}
		}
	});

	// reset all views on config change
	workspace.onDidChangeConfiguration(() => {
		viewManager.configure();
	});

	logger.info('activate(): activated! extPath:', context.extensionPath);
} // end of activate()

/**
 * Deactivates this vscode extension to free up resources.
 */
export function deactivate() {
  // TODO: add extension cleanup code, if needed
}

/**
 * Creates view.map command.
 * @param viewType View command type.
 * @param extensionPath Extension path for loading scripts, examples and data.
 * @param viewTemplate View html template.
 */
function createViewMapCommand(viewType: string, 
	extensionPath: string, viewTemplate: Template | undefined): Disposable {
  const mapWebview: Disposable = commands.registerCommand(viewType, (uri) => {
    let resource: any = uri;
    let viewColumn: ViewColumn = getViewColumn();
    if (!(resource instanceof Uri)) {
      if (window.activeTextEditor) {
        resource = window.activeTextEditor.document.uri;
      } else {
        window.showInformationMessage('Open a geo data file to view map.');
        return;
      }
		}
    const mapView: MapView = new MapView(viewType,
      extensionPath, resource, viewColumn, viewTemplate);		
    viewManager.add(mapView);
    return mapView.webview;
  });
  return mapWebview;
}

/**
 * Gets 2nd panel view column if chart json config document is open.
 */
function getViewColumn(): ViewColumn {
	let viewColumn: ViewColumn = ViewColumn.One;
	const activeEditor = window.activeTextEditor;
	if (activeEditor && activeEditor.viewColumn) {
		viewColumn = activeEditor.viewColumn + 1;
	}
	return viewColumn;
}

/**
 * Checks if the vscode text document is a geo data file.
 * @param document The vscode text document to check.
 */
function isGeoDataFile(document: TextDocument): boolean {
  return path.basename(document.uri.fsPath).endsWith('.geojson');
}