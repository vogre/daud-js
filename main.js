(function(){
var globals = {};

function mkAnalyser(ctx){
    return ctx.createAnalyser();
}

function mkAudioEnv(){
    var audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    console.log(audioCtx.sampleRate);
    var sp = audioCtx.createScriptProcessor(0, 0, 2);
    globals.actx = audioCtx;
    var t = 0;
    console.log(sp);
    globals.x = sp;
    globals.sr = audioCtx.sampleRate;
    return sp;
}

function mkPiano(){
    var a = [];
    for (var i=0; i<88; i++)
        a[i] = Math.pow(2, (i+1-49)/12)*440;
    return a;
}

mpiano = mkPiano();

var active = new Array(12);

function mkInputSys(){
    var line = 'AWSEDFTGYHUJ', kcodes = [];
    for (var i=0; i<line.length; i++)
        kcodes[i] = line.charCodeAt(i);
    document.body.onkeydown = function(e){
        var i = kcodes.indexOf(e.which);
        if (~i && !active[i])
        {
            var n = mpiano[39+i];
            var s = sinconst(n, 0.1);
            globals.ggraph.push(s);
            globals.ssum.n.push(s);
            globals.topo = topos(globals.ggraph);
            active[i] = s;
        }
    }
    document.body.onkeyup = function(e){
        var i = kcodes.indexOf(e.which);
        if (~i && active[i])
        {
            var t = active[i];
            rm(globals.ggraph, t);
            rm(globals.ssum.n, t);
            globals.topo = topos(globals.ggraph);
            active[i] = null;
        }
    }
}

function rm(arr, it)
{
    var i = arr.indexOf(it);
    if (i==-1)
        return;
    arr.splice(i, 1);
}

mkInputSys();

var L = [];

function v(n){
    if (n.tm)
        throw new Error('tm');
    if (n.p)
        return;
    n.tm = 1;
    if (n.n)
    {
        for (var i=0; i<n.n.length; i++)
            v(n.n[i]);
    }
    n.p = 'p';
    n.tm = null;
    L.push(n); // unshift in original algorithm
}

function topos(g){
    L = [];
    var  i = 0;
    while (i<g.length)
    {
        if (!g[i].p)
            v(g[i]);
        i++;
    }
    for (var i=0; i<g.length; i++)
        g[i].p = null;
    return L;
}

document.getElementById('stop').onclick = function(){
    if (globals.x)
    {
        globals.x.disconnect();
        globals.x = null;
    }
}

function chnode(n){
    var a1 = new Float32Array(globals.x.bufferSize);
    var a2 = new Float32Array(globals.x.bufferSize);
    return {
        r: function(){
            for (var i=0; i<a1.length; i++)
            {
                a1[i] = this.n[0][i];
                a2[i] = this.n[0][i];
            }
        },
        n: n,
    };
}

function sinconst(freq, mul, add){
    mul = mul||1;
    var len = 1/freq*globals.sr;
    var a = new Float32Array(len|0);
    for (var i=0; i<a.length; i++)
        a[i] = Math.sin(i/a.length*2*Math.PI)*mul;
    var o = new Float32Array(globals.x.bufferSize);
    var p = 0;
    return {
        r: function(){
            for (var i=0; i<o.length; i++)
                o[i] = a[(p+i)%a.length];
            p = (p+o.length)%a.length;
        },
        o: o,
        n: []
    };
}

function sum(n){
    var o = new Float32Array(globals.x.bufferSize);
    return {
        r: function(){
            var i, j;
            for (j=0; j<o.length; j++)
                o[j] = 0;
            for (i=0; i<this.n.length; i++)
            {
                var t = this.n[i];
                for (j=0; j<o.length; j++)
                    o[j] += t.o[j];
            }
        },
        o: o,
        n: n,
    };
}

function coolhead(){
    var o = globals.topo;
    for (var i=0; i<o.length; i++)
        o[i].r();
}

function main(){
    var sp = mkAudioEnv();
    var sc = sinconst(440, 0.2);
    var sc2 = sinconst(660, 0.2);
    var ssum = sum([]);
    var g = [sc, sc2, ssum];
    globals.topo = topos(g);
    globals.ggraph = g;
    globals.ssum = ssum;
    sp.onaudioprocess = function(e){
        var data = e.outputBuffer.getChannelData(0);
        var data2 = e.outputBuffer.getChannelData(1);
        coolhead();
        for (var i=0; i<data.length; i++)
        {
            data[i] = globals.ssum.o[i];
            data2[i] = globals.ssum.o[i];
        }
    };
    sp.connect(globals.actx.destination);
}

main();

})();
