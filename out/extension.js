"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_1 = require("vscode");
const path = require("path");
const config = require("./config");
const logger_1 = require("./logger");
const map_view_1 = require("./map.view");
const view_manager_1 = require("./view.manager");
const template_manager_1 = require("./template.manager");
const logger = new logger_1.Logger('geo.data.viewer:', config.logLevel);
/**
 * Activates this extension per rules set in package.json.
 * @param context vscode extension context.
 * @see https://code.visualstudio.com/api/references/activation-events for more info.
 */
function activate(context) {
    const extensionPath = context.extensionPath;
    // logger.logMessage(LogLevel.Info, 'activate(): activating from extPath:', context.extensionPath);
    // initialize charts preview webview panel templates
    const templateManager = new template_manager_1.TemplateManager(context.asAbsolutePath('templates'));
    const mapViewTemplate = templateManager.getTemplate('map.view.html');
    // register map view serializer for restore on vscode restart
    vscode_1.window.registerWebviewPanelSerializer('map.view', new map_view_1.MapViewSerializer('map.view', extensionPath, mapViewTemplate));
    // add Geo: View Map command
    const mapWebview = createViewMapCommand('view.map', extensionPath, mapViewTemplate);
    context.subscriptions.push(mapWebview);
    // refresh associated map view on geo data file save
    vscode_1.workspace.onDidSaveTextDocument((document) => {
        if (isGeoDataFile(document)) {
            const uri = document.uri.with({ scheme: 'map' });
            const mapView = view_manager_1.viewManager.find(uri);
            if (mapView) {
                mapView.refresh();
            }
        }
    });
    // reset associated preview on chart config file change
    vscode_1.workspace.onDidChangeTextDocument((changeEvent) => {
        if (isGeoDataFile(changeEvent.document)) {
            const uri = changeEvent.document.uri.with({ scheme: 'map' });
            const mapView = view_manager_1.viewManager.find(uri);
            if (mapView && changeEvent.contentChanges.length > 0) {
                // TODO: add refresh interval before enabling this
                // mapView.refresh();
            }
        }
    });
    // reset all views on config change
    vscode_1.workspace.onDidChangeConfiguration(() => {
        view_manager_1.viewManager.configure();
    });
    logger.info('activate(): activated! extPath:', context.extensionPath);
} // end of activate()
exports.activate = activate;
/**
 * Deactivates this vscode extension to free up resources.
 */
function deactivate() {
    // TODO: add extension cleanup code, if needed
}
exports.deactivate = deactivate;
/**
 * Creates view.map command.
 * @param viewType View command type.
 * @param extensionPath Extension path for loading scripts, examples and data.
 * @param viewTemplate View html template.
 */
function createViewMapCommand(viewType, extensionPath, viewTemplate) {
    const mapWebview = vscode_1.commands.registerCommand(viewType, (uri) => {
        let resource = uri;
        let viewColumn = getViewColumn();
        if (!(resource instanceof vscode_1.Uri)) {
            if (vscode_1.window.activeTextEditor) {
                resource = vscode_1.window.activeTextEditor.document.uri;
            }
            else {
                vscode_1.window.showInformationMessage('Open a geo data file to view map.');
                return;
            }
        }
        const mapView = new map_view_1.MapView(viewType, extensionPath, resource, viewColumn, viewTemplate);
        view_manager_1.viewManager.add(mapView);
        return mapView.webview;
    });
    return mapWebview;
}
/**
 * Gets 2nd panel view column if chart json config document is open.
 */
function getViewColumn() {
    let viewColumn = vscode_1.ViewColumn.One;
    const activeEditor = vscode_1.window.activeTextEditor;
    if (activeEditor && activeEditor.viewColumn) {
        viewColumn = activeEditor.viewColumn + 1;
    }
    return viewColumn;
}
/**
 * Checks if the vscode text document is a geo data file.
 * @param document The vscode text document to check.
 */
function isGeoDataFile(document) {
    return path.basename(document.uri.fsPath).endsWith('.geojson');
}
//# sourceMappingURL=extension.js.map