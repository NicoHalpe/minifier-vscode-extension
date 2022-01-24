const vscode = require("vscode");
const fs = require("fs");
var request = require("request");

const supportedLanguages = new Map([
	["html", { minifier: "html-minifier", extension: "html" }],
	["css", { minifier: "cssminifier", extension: "css" }],
	["javascript", { minifier: "javascript-minifier", extension: "js" }],
	["json", { minifier: "json", extension: "json" }],
]);

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
	vscode.workspace.onDidSaveTextDocument((document) => {
		if (!supportedLanguages.has(document.languageId)) return;

		const minifyonsave = vscode.workspace.getConfiguration().get("minifier.minifyonsave");

		if (!minifyonsave) return;

		minify(document.getText(), document.languageId, document.uri.fsPath, false);
	});

	let disposable = vscode.commands.registerCommand("minifier.minify", function (args) {
		const fsPath = args
			? args.fsPath
			: vscode.window.activeTextEditor.document.uri.fsPath;
		const fileNameSplit = fsPath.split(/\./g);
		const extension = fileNameSplit[fileNameSplit.length - 1];
		const data = fs.readFileSync(fsPath, "utf8");
		minify(data, extension, fsPath, true);
	});

	context.subscriptions.push(disposable);
}

/**
 *
 * @param {String} text
 * @param {String} extension
 * @param {String} fsPath
 * @param {Boolean} open
 */
function minify(text, extension, fsPath, open) {
	let minifier = "";
	supportedLanguages.forEach((language) => {
		if (language.extension !== extension) return;
		minifier = language.minifier;
	});

	vscode.window.withProgress(
		{
			location: vscode.ProgressLocation.Notification,
			title: "Minifying...",
			cancellable: false,
		},
		async (progress) => {
			progress.report({ increment: 0 });
			if (minifier === "json") {
				const wsedit = new vscode.WorkspaceEdit();
				const folder = fsPath.split(/\\/g);
				const file = folder.pop();
				const fileArray = file.split(/\./g);
				const fileExt = fileArray[fileArray.length - 1];
				fileArray.pop();
				const fileName = fileArray.join(".");
				const newFilePath = folder.join("\\") + "\\" + fileName + ".min." + fileExt;
				const filePath = vscode.Uri.file(newFilePath);
				wsedit.createFile(filePath, { ignoreIfExists: true });
				progress.report({ increment: 70 });
				vscode.workspace.applyEdit(wsedit);
				progress.report({ increment: 80 });
				fs.writeFileSync(newFilePath, JSON.stringify(JSON.parse(text)));
				progress.report({ increment: 90 });
				if (open) vscode.window.showTextDocument(filePath);
				progress.report({ increment: 100 });
				return;
			}

			var options = {
				method: "POST",
				url: `https://www.toptal.com/developers/${minifier}/raw`,
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
				},
				form: {
					input: text,
				},
			};
			try {
				let response = await doRequest(options);
				progress.report({ increment: 50 });
				const wsedit = new vscode.WorkspaceEdit();
				const folder = fsPath.split(/\\/g);
				const file = folder.pop();
				const fileArray = file.split(/\./g);
				const fileExt = fileArray[fileArray.length - 1];
				fileArray.pop();
				const fileName = fileArray.join(".");
				const newFilePath = folder.join("\\") + "\\" + fileName + ".min." + fileExt;
				const filePath = vscode.Uri.file(newFilePath);
				wsedit.createFile(filePath, { ignoreIfExists: true });
				progress.report({ increment: 70 });
				vscode.workspace.applyEdit(wsedit);
				progress.report({ increment: 80 });
				if (extension === "html") response = response.replace(/\n/g, "");
				fs.writeFileSync(newFilePath, response);
				progress.report({ increment: 90 });
				vscode.window.showTextDocument(filePath);
				progress.report({ increment: 100 });
			} catch (e) {
				vscode.window.showErrorMessage("Hubo un error procesando el archivo");
				return;
			}
		}
	);
}

/**
 *
 * @param {String | Object} options
 * @returns {Promise<string>|Promise<any>}
 */
function doRequest(options) {
	return new Promise(function (resolve, reject) {
		request(options, function (error, res, body) {
			if (!error && res.statusCode === 200) {
				resolve(body);
			} else {
				reject(error);
			}
		});
	});
}

function deactivate() {}

module.exports = {
	activate,
	deactivate,
};
