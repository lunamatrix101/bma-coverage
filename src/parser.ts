export class FileCoverage{
    fileName:string;
    covered:number[];
    notCovered:number[];

    constructor(){
        this.covered = [];
        this.notCovered = [];
    }
}

class Function{
    lineNumber:number;
    name:string;
    hits:number;
    constructor(lineNumber:number, name:string){
        this.lineNumber = lineNumber;
        this.name = name;
    }
}

class Line{
    constructor(public lineNumber:number, public hits:number){
    }
}

export class Parser{
    private static _regexCoverageEntry = /TN:[\s\S]*?end_of_record/g;

    private static _regexFileName =  /SF:(.+)/;

    private static _regexFN = /FN:(\d+),(.+)/g;

    private static  _regexFNDA = /FNDA:(\d+),(.+)/g;

    private static _regexDA = /\bDA:(\d+),(\d+)/g;

    static parse(data:string):FileCoverage[]{
        let fileCoverages = [];
        if(data){
            let entry:RegExpExecArray;
            while(entry = this._regexCoverageEntry.exec(data)){
                let fileCoverage = new FileCoverage();

                let fileName = this._regexFileName.exec(entry[0]);

                fileCoverage.fileName = fileName[1].toLowerCase();

                let functions:Function[] = [];

                let fns:RegExpExecArray;
                while(fns = this._regexFN.exec(entry[0])){
                    functions.push(new Function(parseInt(fns[1]),fns[2]))
                }
                
                let fndas:RegExpExecArray;
                while(fndas = this._regexFNDA.exec(entry[0])){
                    let fn = functions.find((fn)=>fn.name === fndas[2]);
                    fn.hits = parseInt(fndas[1]);
                }
                
                let lines:Line[] = [];
                let das:RegExpExecArray;
                while(das = this._regexDA.exec(entry[0])){
                    lines.push(new Line(parseInt(das[1]), parseInt(das[2])));
                }

                fileCoverage.notCovered = functions.filter((fn)=>fn.hits === 0).map((fn)=>fn.lineNumber)
                                        .concat(lines.filter((ln)=> ln.hits === 0).map((ln)=>ln.lineNumber)).sort((a,b)=>{return a -b;});

                fileCoverage.covered = functions.filter((fn)=>fn.hits > 0).map((fn)=>fn.lineNumber)
                                    .concat(lines.filter((ln)=>functions.every((fn)=>fn.lineNumber!=ln.lineNumber)).filter((ln)=> ln.hits > 0).map((ln)=>ln.lineNumber)).sort((a,b)=>{return a -b;});


                fileCoverages.push(fileCoverage);
                
            }
        }
        return fileCoverages;   
    }
}