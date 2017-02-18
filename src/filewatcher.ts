import * as fs from 'fs';
import { Observable } from 'rxjs/Observable';
import { Subject } from 'rxjs/Subject';


export class FileWatcher{

    fileNameSource = new Subject<string>();
    fileName$ = this.fileNameSource.asObservable();


    private _currentStats:fs.Stats;

    constructor(public fileName:string){

        fs.watch(this.fileName,(e,fn)=>{
            this.fileNameSource.next(this.fileName);    
        })
    }


}