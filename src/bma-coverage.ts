import * as vscode from 'vscode';
import * as constants from './constants';
import * as fs from 'fs';
import * as path from 'path';
import {FileCoverage, Parser} from './parser';
import {FileWatcher} from './filewatcher'

export class BmaCoverage{


    private _coverage = {};

    private _isCoverageActive: boolean;

    private _statusBarItem:vscode.StatusBarItem;

    private _notCoveredDecoration: vscode.TextEditorDecorationType;

    private _coveredDecoration: vscode.TextEditorDecorationType;

    private _fileWatchers:FileWatcher[];

    constructor(private _context:vscode.ExtensionContext){

        
        this._statusBarItem = vscode.window.createStatusBarItem();
        this._statusBarItem.text = constants.ShowCodeCoverageText;
        this._statusBarItem.command = constants.ShowCodeCoverageCommand;
        this._statusBarItem.show();

        let hideCoverage = vscode.commands.registerCommand(constants.HideCodeCoverageCommand, _ => {
            this.hideCoverage();
        });
        this._context.subscriptions.push(hideCoverage);

        let showCoverage = vscode.commands.registerCommand(constants.ShowCodeCoverageCommand, _ => {
            this.showCoverage();
        });
        this._context.subscriptions.push(hideCoverage);

        vscode.window.onDidChangeActiveTextEditor((editor) => {
            this.checkCoverage();
        });

        this._notCoveredDecoration = vscode.window.createTextEditorDecorationType({
            gutterIconPath: _context.asAbsolutePath("./images/not-covered.svg"),
        });
        this._coveredDecoration = vscode.window.createTextEditorDecorationType({
            gutterIconPath: _context.asAbsolutePath("./images/covered.svg"),
        });
 
    }

    renderCoverage(editor:vscode.TextEditor ,coverage:FileCoverage){

        editor.setDecorations(this._notCoveredDecoration, coverage.notCovered.map((r)=>new vscode.Range(r-1,0,r-1,0)));

        editor.setDecorations(this._coveredDecoration, coverage.covered.map((r)=>new vscode.Range(r-1,0,r-1,0)));
    }


    dispose() {
		return vscode.Disposable.from(this._statusBarItem).dispose();
	}

    hideCoverage(){
        this._statusBarItem.text = constants.ShowCodeCoverageText;
        this._statusBarItem.command = constants.ShowCodeCoverageCommand;

        this._isCoverageActive = false;
        this.checkCoverage();
    }

    showCoverage(){
        let lcovs = vscode.workspace.getConfiguration("bma-coverage").get("lcovs") as string[];

        if(lcovs!=null){
            this.enableCoverage(lcovs);
            this._statusBarItem.text = constants.HideCodeCoverageText;
            this._statusBarItem.command = constants.HideCodeCoverageCommand;  
        }else{
            vscode.window.showErrorMessage(constants.NoConfigurationMessage);
        }

          
    }

    enableCoverage(lcovs:string[]){

        this._fileWatchers = [];

        lcovs.forEach((lcov)=>{

            let fileName = path.join(vscode.workspace.rootPath, lcov);

            this.parse(this.loadFileSync(fileName));

            let fw = new FileWatcher(fileName);
            this._fileWatchers.push(fw);
            fw.fileName$.subscribe((fn)=>{
                this.parse(this.loadFileSync(fn));
                if(this._isCoverageActive){
                    this.checkCoverage();
                }
            });
        });
        this._isCoverageActive = true;

        this.checkCoverage();
    }

    checkCoverage(){
        if(vscode.window.activeTextEditor){
            
            vscode.window.visibleTextEditors.forEach((editor)=>{
                var currentDocument = editor.document;
                if(currentDocument.languageId == "typescript"){
                    if(this._isCoverageActive){
                        if(this._coverage[currentDocument.fileName.toLowerCase()]){
                            this.renderCoverage(editor, this._coverage[currentDocument.fileName.toLowerCase()]);
                        }
                    }
                    else{
                        this.renderCoverage(editor, new FileCoverage());    
                    }
                }
            });
        }
    }

    loadFileSync(fileName:string){
        let data:string;
        try{
            data = fs.readFileSync(fileName, 'utf8')
        }catch(ex){
            vscode.window.showErrorMessage(constants.LoadFailedMessage.replace("[FILENAME]", fileName));
        }
        return data;
    }

    parse(data:string){
        let coverages = Parser.parse(data);
        coverages.forEach((cv)=>{
            this._coverage[cv.fileName] = cv;
        });

        
    }
}