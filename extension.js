// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require("vscode");
const fs = require("fs");
var request = require("request");

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
	vscode.workspace.onDidSaveTextDocument((document) => {
		if (document.languageId === "html" || document.languageId === "css" || document.languageId === "javascript" || document.languageId === "json") {
			const minifyonsave = vscode.workspace.getConfiguration().get("minifier.minifyonsave");
			if (minifyonsave) {
				console.log(vscode.window.activeTextEditor.document.uri.fsPath);
				minify(document.getText(), document.languageId, document.uri.fsPath, false);
			}
		}
	});

	let disposable = vscode.commands.registerCommand("minifier.minify", function (args) {
		console.log(vscode.window.activeTextEditor.document.uri.fsPath);
		const fsPath = args ? args.fsPath : vscode.window.activeTextEditor.document.uri.fsPath;
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
	switch (extension) {
		case "js":
			minifier = "javascript-minifier";
			break;
		case "css":
			minifier = "cssminifier";
			break;
		case "html":
			minifier = "html-minifier";
			break;
		case "json":
			minifier = "json";
			break;
	}
	
	vscode.window.withProgress(
		{
			location: vscode.ProgressLocation.Notification,
			title: "Minifying...",
			cancellable: false,
		},
		async (progress) => {
			progress.report({ increment: 0 });
			if (minifier === "json") {
				console.log("json");
				const wsedit = new vscode.WorkspaceEdit();
				const folder = fsPath.split(/\\/g);
				const file = folder.pop();
				const fileArray = file.split(/\./g);
				const fileExt = fileArray[fileArray.length - 1];
				fileArray.pop();
				const fileName = fileArray.join(".");
				const newFilePath = folder.join("\\") + "\\" + fileName + ".min." + fileExt;
				console.log(newFilePath);
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
				console.log(response);
				if (extension === "html") response = response.replace(/\n/g, "");
				fs.writeFileSync(newFilePath, response);
				progress.report({ increment: 90 });
				vscode.window.showTextDocument(filePath);
				progress.report({ increment: 100 });
			} catch (e) {
				console.log(e);
				vscode.window.showErrorMessage("Hubo un error procesando el archivo");
				return;
			}
		}
	);
}

function doRequest(url) {
	return new Promise(function (resolve, reject) {
		request(url, function (error, res, body) {
			if (!error && res.statusCode == 200) {
				resolve(body);
			} else {
				reject(error);
			}
		});
	});
}

// this method is called when your extension is deactivated
function deactivate() {}

module.exports = {
	activate,
	deactivate,
};
